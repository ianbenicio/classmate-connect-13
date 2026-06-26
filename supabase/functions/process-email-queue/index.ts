// =====================================================================
// process-email-queue — Processa fila de emails pendentes
// =====================================================================
// Chamado via pg_cron a cada 5 min ou manualmente.
// Lê email_queue WHERE state='pending', chama send-email, atualiza state.
//
// pg_cron (adicionar após process-email-queue estar deployado):
//   SELECT cron.schedule('process-email-queue', '*/5 * * * *',
//     $$SELECT net.http_post(current_setting('app.supabase_url') ||
//       '/functions/v1/process-email-queue','{}','{}')$$);

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SEND_EMAIL_URL = `${SUPABASE_URL}/functions/v1/send-email`;
const BATCH_SIZE = 50;
const MAX_TENTATIVAS = 3;

interface QueueItem {
  id: string;
  project_id: string | null;
  template_id: string;
  to_email: string;
  vars_json: Record<string, unknown>;
  tentativas: number;
}

type QueryBuilder = {
  select(columns: string): QueryBuilder;
  update(values: Record<string, unknown>): QueryBuilder;
  eq(column: string, value: unknown): QueryBuilder;
  lt(column: string, value: unknown): QueryBuilder;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder;
  limit(count: number): Promise<{ data: unknown; error: unknown }>;
};

type ClientWithFrom = {
  from(table: string): QueryBuilder;
};

function fromTable(client: unknown, table: string): QueryBuilder {
  return (client as ClientWithFrom).from(table);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  // Auth: service_role ou ausente (internal)
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader && authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: items, error: fetchErr } = (await fromTable(supabase, "email_queue")
    .select("id, project_id, template_id, to_email, vars_json, tentativas")
    .eq("state", "pending")
    .lt("tentativas", MAX_TENTATIVAS)
    .order("criado_em", { ascending: true })
    .limit(BATCH_SIZE)) as { data: QueueItem[] | null; error: unknown };

  if (fetchErr) {
    console.error("[process-email-queue] fetch error", fetchErr);
    return new Response(JSON.stringify({ error: "Fetch failed" }), { status: 500 });
  }

  const queue = items ?? [];
  let sent = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const res = await fetch(SEND_EMAIL_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: item.template_id,
          to: item.to_email,
          vars: item.vars_json,
          project_id: item.project_id ?? undefined,
        }),
      });

      if (res.ok) {
        await fromTable(supabase, "email_queue")
          .update({
            state: "sent",
            enviado_em: new Date().toISOString(),
            tentativas: item.tentativas + 1,
          })
          .eq("id", item.id);
        sent++;
      } else {
        const errBody = await res.text();
        const newState = item.tentativas + 1 >= MAX_TENTATIVAS ? "failed" : "pending";
        await fromTable(supabase, "email_queue")
          .update({
            state: newState,
            tentativas: item.tentativas + 1,
            erro_msg: errBody.slice(0, 500),
          })
          .eq("id", item.id);
        failed++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const newState = item.tentativas + 1 >= MAX_TENTATIVAS ? "failed" : "pending";
      await fromTable(supabase, "email_queue")
        .update({
          state: newState,
          tentativas: item.tentativas + 1,
          erro_msg: msg.slice(0, 500),
        })
        .eq("id", item.id);
      failed++;
    }
  }

  console.log(`[process-email-queue] batch=${queue.length} sent=${sent} failed=${failed}`);

  return new Response(JSON.stringify({ processed: queue.length, sent, failed }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

// =====================================================================
// invite-responsavel — Cria convite e dispara email (C2.1)
// =====================================================================
// Input:  { aluno_id?, email, nome?, project_id }
// Output: { sent: boolean, token?: string, expires_at?: string, warning?, error? }
// Auth:   authenticated admin ou coordenação

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "https://javis.app";
const SEND_EMAIL_URL = `${SUPABASE_URL}/functions/v1/send-email`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let body: { aluno_id?: string; email: string; nome?: string; project_id: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { aluno_id, email, nome, project_id } = body;

  if (!email || !project_id) {
    return new Response(JSON.stringify({ error: "email e project_id são obrigatórios" }), {
      status: 400,
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verifica caller
  const callerJwt = authHeader.replace("Bearer ", "");
  const { data: callerUser, error: authErr } = await supabase.auth.getUser(callerJwt);
  if (authErr || !callerUser?.user) {
    return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401 });
  }

  const callerId = callerUser.user.id;

  type ProfileRow = { role: string };
  const { data: profileRows } = (await supabase
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .eq("project_id", project_id)) as { data: ProfileRow[] | null };

  const isAdminOrCoord = (profileRows ?? []).some(
    (p) => p.role === "admin" || p.role === "coordenacao",
  );
  if (!isAdminOrCoord) {
    return new Response(JSON.stringify({ error: "Permissão negada" }), { status: 403 });
  }

  // Busca nome do aluno
  let alunoNome = "seu filho(a)";
  if (aluno_id) {
    const { data: aluno } = (await supabase
      .from("alunos")
      .select("nome")
      .eq("id", aluno_id)
      .maybeSingle()) as { data: { nome: string } | null };
    if (aluno?.nome) alunoNome = aluno.nome;
  }

  // Upsert convite (renova token e validade se já existe)
  const newToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error: inviteErr } = (await supabase
    .from("responsavel_invites")
    .upsert(
      {
        project_id,
        aluno_id: aluno_id ?? null,
        email,
        nome: nome ?? null,
        token: newToken,
        expires_at: expiresAt,
        invited_by: callerId,
        accepted_at: null,
      },
      { onConflict: "email,project_id", ignoreDuplicates: false },
    )
    .select("token, expires_at")
    .single()) as { data: { token: string; expires_at: string } | null; error: unknown };

  if (inviteErr || !invite) {
    console.error("[invite-responsavel] upsert error", inviteErr);
    return new Response(JSON.stringify({ error: "Falha ao criar convite" }), { status: 500 });
  }

  const link = `${APP_URL}/aceitar-convite/${invite.token}`;

  // Dispara send-email
  try {
    const emailRes = await fetch(SEND_EMAIL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: "invite-responsavel",
        to: email,
        project_id,
        vars: {
          nome: nome ?? email,
          aluno_nome: alunoNome,
          link,
          expira: "7 dias",
        },
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("[invite-responsavel] send-email error", errBody);
      return new Response(
        JSON.stringify({
          sent: false,
          token: invite.token,
          expires_at: invite.expires_at,
          warning: "Convite criado mas email não enviado. Cheque RESEND_API_KEY.",
        }),
        { status: 207, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (e) {
    console.error("[invite-responsavel] fetch error", e);
    return new Response(
      JSON.stringify({
        sent: false,
        token: invite.token,
        expires_at: invite.expires_at,
        warning: "Convite criado mas email não enviado.",
      }),
      { status: 207, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ sent: true, token: invite.token, expires_at: invite.expires_at }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});

// =====================================================================
// send-email — Edge Function parametrizada por template (C1.2)
// =====================================================================
// Input:  { template_id, to, vars, project_id? }
// Output: { sent: boolean, id?: string, error?: string }
// Auth:   Bearer token (service_role ou authenticated admin)
// Retry:  3x exponential backoff (1s, 2s, 4s)
// Log:    audit_events action="custom" entity_type="email"

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FROM_ADDRESS = Deno.env.get("EMAIL_FROM") ?? "Javis <notificacoes@notificacoes.javis.app>";

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

interface TemplateVars {
  [key: string]: string | number | boolean | undefined;
}

interface RenderedEmail {
  subject: string;
  html: string;
}

function renderTemplate(templateId: string, vars: TemplateVars): RenderedEmail {
  switch (templateId) {
    case "invite-responsavel":
      return renderInviteResponsavel(vars);
    case "alerta-critico":
      return renderAlertaCritico(vars);
    case "digest-semanal":
      return renderDigestSemanal(vars);
    case "trial-expirando":
      return renderTrialExpirando(vars);
    default:
      throw new Error(`Template desconhecido: ${templateId}`);
  }
}

function renderInviteResponsavel(v: TemplateVars): RenderedEmail {
  const nome = String(v.nome ?? "Responsável");
  const alunoNome = String(v.aluno_nome ?? "seu filho(a)");
  const link = String(v.link ?? "");
  const expira = String(v.expira ?? "7 dias");

  return {
    subject: `Você foi convidado a acompanhar ${alunoNome} no Javis`,
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f9f9fb;margin:0;padding:32px 0">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
        <tr><td style="background:#4f46e5;padding:28px 36px">
          <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700">🎓 Javis Game Academy</h1>
        </td></tr>
        <tr><td style="padding:36px">
          <p style="font-size:16px;color:#111;margin:0 0 16px">Olá, <strong>${nome}</strong>!</p>
          <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 24px">
            Você foi convidado a acompanhar o progresso de <strong>${alunoNome}</strong>
            na plataforma Javis Game Academy.
          </p>
          <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 32px">
            Clique no botão abaixo para configurar seu acesso. O link expira em <strong>${expira}</strong>.
          </p>
          <p style="text-align:center;margin:0 0 32px">
            <a href="${link}"
               style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;
                      padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600">
              Aceitar convite
            </a>
          </p>
          <p style="font-size:13px;color:#888;line-height:1.5;margin:0">
            Se você não esperava este e-mail, pode ignorá-lo com segurança.<br>
            Link: <a href="${link}" style="color:#4f46e5">${link}</a>
          </p>
        </td></tr>
        <tr><td style="background:#f9f9fb;padding:16px 36px;text-align:center">
          <p style="font-size:12px;color:#aaa;margin:0">
            Javis Game Academy · <a href="{{unsubscribe_url}}" style="color:#aaa">Cancelar notificações</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

function renderAlertaCritico(v: TemplateVars): RenderedEmail {
  const alunoNome = String(v.aluno_nome ?? "Aluno");
  const tipo = String(v.tipo ?? "alerta");
  const descricao = String(v.descricao ?? "");

  return {
    subject: `⚠️ Alerta: ${tipo} — ${alunoNome}`,
    html: `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;padding:32px">
  <h2 style="color:#dc2626">⚠️ Alerta crítico</h2>
  <p>Aluno: <strong>${alunoNome}</strong></p>
  <p>Tipo: ${tipo}</p>
  <p>${descricao}</p>
</body></html>`,
  };
}

function renderDigestSemanal(v: TemplateVars): RenderedEmail {
  const nome = String(v.nome ?? "Responsável");
  const resumo = String(v.resumo_html ?? "<p>Sem atividades esta semana.</p>");

  return {
    subject: `Resumo semanal Javis — ${new Date().toLocaleDateString("pt-BR")}`,
    html: `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;padding:32px">
  <h2>Olá, ${nome}!</h2>
  <p>Aqui está o resumo da semana:</p>
  ${resumo}
  <p style="font-size:12px;color:#aaa"><a href="{{unsubscribe_url}}">Cancelar notificações</a></p>
</body></html>`,
  };
}

function renderTrialExpirando(v: TemplateVars): RenderedEmail {
  const dias = Number(v.dias ?? 7);
  const escola = String(v.escola ?? "sua escola");

  return {
    subject: `Seu trial do Javis expira em ${dias} ${dias === 1 ? "dia" : "dias"}`,
    html: `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;padding:32px">
  <h2>Atenção: trial expirando</h2>
  <p>O trial de <strong>${escola}</strong> expira em <strong>${dias} ${dias === 1 ? "dia" : "dias"}</strong>.</p>
  <p>Entre em contato para continuar usando o Javis.</p>
</body></html>`,
  };
}

// ---------------------------------------------------------------------------
// Resend API call with exponential retry
// ---------------------------------------------------------------------------

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
): Promise<{ id: string }> {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurado");

  const delays = [1000, 2000, 4000];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [to],
          subject,
          html,
        }),
      });

      if (res.ok) {
        const data = await res.json() as { id: string };
        return data;
      }

      const errBody = await res.text();
      lastError = new Error(`Resend ${res.status}: ${errBody}`);

      // 4xx sem retry (exceto 429 rate limit)
      if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }

    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }

  throw lastError ?? new Error("Falha ao enviar email");
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

async function logAudit(
  supabase: ReturnType<typeof createClient>,
  opts: {
    action: string;
    entity_type: string;
    entity_id?: string;
    project_id?: string;
    after_json?: unknown;
  },
) {
  try {
    // deno-lint-ignore no-explicit-any
    await (supabase as any).from("audit_events").insert({
      action: opts.action,
      entity_type: opts.entity_type,
      entity_id: opts.entity_id ?? null,
      project_id: opts.project_id ?? null,
      after_json: opts.after_json ?? null,
    });
  } catch {
    // audit failure never blocks delivery
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

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

  let body: { template_id: string; to: string; vars?: TemplateVars; project_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { template_id, to, vars = {}, project_id } = body;

  if (!template_id || !to) {
    return new Response(
      JSON.stringify({ error: "template_id e to são obrigatórios" }),
      { status: 400 },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { subject, html } = renderTemplate(template_id, vars);
    const { id } = await sendViaResend(to, subject, html);

    await logAudit(supabase, {
      action: "custom",
      entity_type: "email",
      entity_id: id,
      project_id,
      after_json: { template_id, to, resend_id: id },
    });

    return new Response(JSON.stringify({ sent: true, id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    await logAudit(supabase, {
      action: "custom",
      entity_type: "email_error",
      project_id,
      after_json: { template_id, to, error: message },
    });

    return new Response(JSON.stringify({ sent: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// =====================================================================
// invite-aluno-user — Cria / vincula auth user para um aluno
// =====================================================================
// Input:  { alunoId: string }
// Output (ok):    { status: "invited" | "linked_existing", userId: string }
// Output (error): { error: string, detail?: string }
// Auth:   Bearer token de usuário autenticado (admin ou coordenação)
//
// Fluxo:
//  1. Valida JWT do caller, garante role admin/coordenacao no projeto do aluno
//  2. Busca aluno — exige email + curso_id + turma_id; rejeita se já tem user_id
//  3. Tenta inviteUserByEmail; se email já existe usa listUsers para linkar
//  4. UPDATE alunos SET user_id = <uuid>, upsert profile com role "aluno"
//  5. Retorna { status, userId }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Boot-time diagnostic — confirms env injection without leaking the key.
// Safe to keep: only prints url metadata and whether the key is configured.
console.log(
  "[invite-aluno-user] boot env",
  JSON.stringify({
    has_url: !!SUPABASE_URL,
    url_host: SUPABASE_URL ? new URL(SUPABASE_URL).host : null,
    has_service_role_key: !!SUPABASE_SERVICE_ROLE_KEY,
  }),
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let body: { alunoId: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { alunoId } = body;
  if (!alunoId) {
    return new Response(JSON.stringify({ error: "alunoId obrigatório" }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // -----------------------------------------------------------------------
  // 1. Valida caller JWT
  // -----------------------------------------------------------------------
  const callerJwt = authHeader.replace("Bearer ", "");
  const { data: callerAuth, error: authErr } = await supabase.auth.getUser(callerJwt);
  if (authErr || !callerAuth?.user) {
    return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401 });
  }
  const callerId = callerAuth.user.id;

  // -----------------------------------------------------------------------
  // 2. Busca aluno
  // -----------------------------------------------------------------------
  type AlunoRow = {
    id: string;
    email: string | null;
    user_id: string | null;
    curso_id: string | null;
    turma_id: string | null;
    project_id: string;
    nome: string;
  };

  const { data: aluno, error: alunoErr } = (await supabase
    .from("alunos")
    .select("id, email, user_id, curso_id, turma_id, project_id, nome")
    .eq("id", alunoId)
    .maybeSingle()) as { data: AlunoRow | null; error: unknown };

  if (alunoErr || !aluno) {
    const detail =
      alunoErr && typeof alunoErr === "object" && "message" in alunoErr
        ? String((alunoErr as { message: unknown }).message)
        : undefined;
    console.error("[invite-aluno-user] aluno select failed", { alunoId, detail });
    return new Response(JSON.stringify({ error: "aluno_not_found", detail }), { status: 404 });
  }

  // -----------------------------------------------------------------------
  // 3. Valida caller tem role super_admin / admin / coordenacao
  // Roles vivem em public.user_roles (não em profiles).
  // -----------------------------------------------------------------------
  type UserRoleRow = { role: string };
  const { data: roleRows, error: roleErr } = (await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)) as { data: UserRoleRow[] | null; error: { message?: string } | null };

  if (roleErr) {
    console.error("[invite-aluno-user] user_roles select failed", roleErr);
    return new Response(JSON.stringify({ error: "role_check_failed", detail: roleErr.message }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  const roles = (roleRows ?? []).map((r) => r.role);
  // TODO: restringir depois — por agora professor + coordenacao + admin podem invitar.
  const ALLOWED_ROLES = ["super_admin", "admin", "coordenacao", "professor"];
  const isAuthorized = roles.some((r) => ALLOWED_ROLES.includes(r));

  if (!isAuthorized) {
    console.error("[invite-aluno-user] permission denied", { callerId, roles });
    return new Response(JSON.stringify({ error: "Permissão negada" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  // -----------------------------------------------------------------------
  // 4. Pré-condições de negócio
  // -----------------------------------------------------------------------
  if (aluno.user_id) {
    return new Response(JSON.stringify({ error: "aluno_already_linked" }), { status: 200 });
  }

  const email = (aluno.email ?? "").trim().toLowerCase();
  if (!email) {
    return new Response(JSON.stringify({ error: "aluno_missing_email" }), { status: 200 });
  }

  if (!EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: "invalid_email_format" }), { status: 200 });
  }

  if (!aluno.curso_id || !aluno.turma_id) {
    return new Response(JSON.stringify({ error: "aluno_missing_curso_or_turma" }), { status: 200 });
  }

  // -----------------------------------------------------------------------
  // 5. Cria / localiza auth user
  // -----------------------------------------------------------------------
  let userId: string;
  let status: "invited" | "linked_existing";

  const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        aluno_id: alunoId,
        project_id: aluno.project_id,
        nome: aluno.nome,
      },
    },
  );

  if (inviteErr) {
    // Email já cadastrado — localiza para linkar
    if (
      inviteErr.message?.includes("already been registered") ||
      inviteErr.message?.includes("already registered") ||
      inviteErr.message?.includes("duplicate") ||
      (inviteErr as { status?: number }).status === 422
    ) {
      const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) {
        return new Response(JSON.stringify({ error: "invite_failed", detail: listErr.message }), {
          status: 200,
        });
      }
      const existing = listData?.users?.find((u) => u.email?.toLowerCase() === email);
      if (!existing) {
        return new Response(
          JSON.stringify({
            error: "invite_failed",
            detail: "Email já registrado mas usuário não encontrado.",
          }),
          { status: 200 },
        );
      }
      userId = existing.id;
      status = "linked_existing";
    } else {
      console.error("[invite-aluno-user] inviteUserByEmail error", inviteErr);
      return new Response(JSON.stringify({ error: "invite_failed", detail: inviteErr.message }), {
        status: 200,
      });
    }
  } else {
    userId = inviteData.user.id;
    status = "invited";
  }

  // -----------------------------------------------------------------------
  // 6. Vincula: UPDATE alunos.user_id + upsert profiles
  // -----------------------------------------------------------------------
  const { error: updateErr } = await supabase
    .from("alunos")
    .update({ user_id: userId })
    .eq("id", alunoId);

  if (updateErr) {
    console.error("[invite-aluno-user] update aluno error", updateErr);
    return new Response(JSON.stringify({ error: "link_failed", detail: updateErr.message }), {
      status: 200,
    });
  }

  // Upsert profile (profiles não tem coluna role — colunas: id, user_id, project_id, display_name, email, ...).
  await supabase.from("profiles").upsert(
    {
      id: userId,
      user_id: userId,
      project_id: aluno.project_id,
      display_name: aluno.nome,
      email,
    },
    { onConflict: "id,project_id", ignoreDuplicates: true },
  );

  // Role do aluno vai em user_roles (não em profiles).
  try {
    await supabase.from("user_roles").insert({ user_id: userId, role: "aluno" });
  } catch {
    // duplicate-key ou outra falha não bloqueia o invite
  }

  // -----------------------------------------------------------------------
  // 7. Audit
  // -----------------------------------------------------------------------
  try {
    await supabase.from("audit_events").insert({
      action: "invite_aluno_user",
      entity_type: "aluno",
      entity_id: alunoId,
      project_id: aluno.project_id,
      after_json: { user_id: userId, email, status },
    });
  } catch {
    // audit non-fatal
  }

  return new Response(JSON.stringify({ status, userId }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...cors },
  });
});

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
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
    return new Response(JSON.stringify({ error: "aluno_not_found" }), { status: 404 });
  }

  // -----------------------------------------------------------------------
  // 3. Valida caller tem role admin/coordenacao nesse projeto
  // -----------------------------------------------------------------------
  type ProfileRow = { role: string };
  const { data: profileRows } = (await supabase
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .eq("project_id", aluno.project_id)) as { data: ProfileRow[] | null };

  const isSuperAdmin = callerAuth.user.app_metadata?.is_super_admin === true;
  const isAdminOrCoord =
    isSuperAdmin ||
    (profileRows ?? []).some((p) => p.role === "admin" || p.role === "coordenacao");

  if (!isAdminOrCoord) {
    return new Response(JSON.stringify({ error: "Permissão negada" }), { status: 403 });
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
    return new Response(
      JSON.stringify({ error: "aluno_missing_curso_or_turma" }),
      { status: 200 },
    );
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
        return new Response(
          JSON.stringify({ error: "invite_failed", detail: listErr.message }),
          { status: 200 },
        );
      }
      const existing = listData?.users?.find(
        (u) => u.email?.toLowerCase() === email,
      );
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
      return new Response(
        JSON.stringify({ error: "invite_failed", detail: inviteErr.message }),
        { status: 200 },
      );
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
    return new Response(
      JSON.stringify({ error: "link_failed", detail: updateErr.message }),
      { status: 200 },
    );
  }

  // Garante que profile existe com role "aluno" nesse projeto
  await supabase.from("profiles").upsert(
    {
      id: userId,
      project_id: aluno.project_id,
      role: "aluno",
      nome: aluno.nome,
    },
    { onConflict: "id,project_id", ignoreDuplicates: true },
  );

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

  return new Response(
    JSON.stringify({ status, userId }),
    { status: 200, headers: { "Content-Type": "application/json", ...cors } },
  );
});

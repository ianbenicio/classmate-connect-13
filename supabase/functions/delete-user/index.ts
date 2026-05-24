// =====================================================================
// delete-user — Exclusão permanente de usuário (super_admin only)
// =====================================================================
// Apaga auth.users + dados em cascata via FK ON DELETE CASCADE/SET NULL.
// REQUER: chamador com role super_admin.
// BLOQUEIA: auto-exclusão (caller == target).
//
// Body: { target_user_id: string }
// Response 200: { deleted: true, user_id: string }
// Response 4xx: { error: string }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Extrai JWT do caller para verificar identidade.
  const authHeader = req.headers.get("Authorization") ?? "";
  const callerJwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!callerJwt) {
    return json(401, { error: "Unauthorized: missing token" });
  }

  // Cliente com JWT do caller — identidade real, sem bypass de RLS.
  const callerClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${callerJwt}` } },
  });

  // Verifica se caller é super_admin.
  const { data: isSuper, error: superErr } = await callerClient.rpc("is_super_admin");
  if (superErr || !isSuper) {
    return json(403, { error: "Forbidden: only super_admin can delete users" });
  }

  // Obtém caller user_id para bloquear auto-exclusão.
  const {
    data: { user: callerUser },
    error: meErr,
  } = await callerClient.auth.getUser(callerJwt);
  if (meErr || !callerUser) {
    return json(401, { error: "Unauthorized: invalid token" });
  }

  // Lê body.
  let body: { target_user_id?: string };
  try {
    body = (await req.json()) as { target_user_id?: string };
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const targetUserId = body.target_user_id?.trim();
  if (!targetUserId) {
    return json(400, { error: "target_user_id is required" });
  }

  // Bloqueia auto-exclusão.
  if (targetUserId === callerUser.id) {
    return json(400, { error: "Cannot delete your own account" });
  }

  // Cliente service_role para operações admin.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Busca dados do target antes de deletar (para log).
  // deno-lint-ignore no-explicit-any
  const { data: targetProfile } = (await (adminClient as any)
    .from("profiles")
    .select("display_name, email, project_id")
    .eq("user_id", targetUserId)
    .maybeSingle()) as {
    data: { display_name: string | null; email: string | null; project_id: string | null } | null;
  };

  // Deleta via auth.admin — aciona CASCADE no banco.
  const { error: deleteErr } = await adminClient.auth.admin.deleteUser(targetUserId);

  if (deleteErr) {
    console.error("[delete-user] auth.admin.deleteUser failed", deleteErr);
    return json(500, { error: deleteErr.message ?? "Delete failed" });
  }

  // Log de auditoria. Falha silenciosa — não reverter delete já feito.
  try {
    // deno-lint-ignore no-explicit-any
    await (adminClient as any).from("audit_events").insert({
      actor_id: callerUser.id,
      project_id: targetProfile?.project_id ?? null,
      action: "delete",
      entity_type: "user",
      entity_id: targetUserId,
      metadata: {
        deleted_email: targetProfile?.email ?? null,
        deleted_name: targetProfile?.display_name ?? null,
        deleted_by: callerUser.id,
      },
    });
  } catch (e) {
    console.warn("[delete-user] audit log failed (non-fatal)", e);
  }

  console.log(`[delete-user] user ${targetUserId} deleted by super_admin ${callerUser.id}`);

  return json(200, { deleted: true, user_id: targetUserId });
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

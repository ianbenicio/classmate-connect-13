-- Fix: invite-aluno-user Edge Function gets "permission denied for table alunos"
--
-- Root cause hypothesis (same family as 20260519000000_a3_fix_audit_trigger_grant):
-- Prior hardening migrations issued REVOKE ... FROM public (the pseudo-role),
-- which strips the default grant from ALL roles inherited from public — including
-- service_role. Subsequent supabase auto-grants restored authenticated but
-- not always service_role on every audited table.
--
-- Edge Function `invite-aluno-user` uses createClient(URL, SERVICE_ROLE_KEY) and
-- runs `SELECT id, email, ... FROM public.alunos WHERE id = $1`. PostgreSQL
-- responds with SQLSTATE 42501 "permission denied for table alunos" because
-- service_role lacks the table-level SELECT grant. The supabase-js client
-- surfaces this as `{ error: 'permission denied for table alunos' }` and the
-- function maps it to `aluno_not_found` (data is null).
--
-- Fix: explicit, idempotent GRANT to service_role on every table the Edge
-- Function reads/writes. Scoped narrowly to the invite flow.
--
-- Safety: service_role is the BYPASSRLS server-side key — it is expected to
-- have full DML on application tables. This GRANT restores the documented
-- supabase default and does not widen the surface for anon/authenticated.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alunos          TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles        TO service_role;
GRANT SELECT, INSERT                  ON public.audit_events   TO service_role;

-- Sequences (for any auto-id columns Edge Functions may insert into)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Belt-and-braces: ensure default privileges for future objects in `public`
-- include service_role. (Idempotent; only the owner's defaults matter.)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

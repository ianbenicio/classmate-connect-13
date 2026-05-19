-- A3 Fix: Restore EXECUTE grant on audit trigger functions
-- Root cause: prior migration revoked from `public` pseudo-role, which strips
-- the default grant from ALL roles including service_role. When Edge Functions
-- use admin/service_role client and mutate audited tables, the trigger fires and
-- PostgreSQL checks EXECUTE on tg_audit_row() for service_role — denied → error
-- propagates as "permission denied for table alunos".
--
-- Fix: explicit GRANT to authenticated + service_role; REVOKE only from anon.

GRANT EXECUTE ON FUNCTION public.tg_audit_row()
  TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, jsonb, jsonb, uuid, uuid, text, text)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.tg_audit_row()
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, jsonb, jsonb, uuid, uuid, text, text)
  FROM anon;

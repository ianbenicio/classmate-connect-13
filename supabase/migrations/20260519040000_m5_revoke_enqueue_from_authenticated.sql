-- =====================================================================
-- M5: REVOKE enqueue_email de authenticated
-- =====================================================================
-- enqueue_email() estava acessível por qualquer usuário autenticado,
-- permitindo injeção arbitrária de emails na fila.
-- Triggers rodam como service_role (SECURITY DEFINER);
-- pg_cron também usa service_role. authenticated não precisa deste grant.

REVOKE EXECUTE ON FUNCTION public.enqueue_email(uuid, text, text, jsonb, int)
  FROM authenticated;

-- service_role permanece (triggers, pg_cron, Edge Functions internas).

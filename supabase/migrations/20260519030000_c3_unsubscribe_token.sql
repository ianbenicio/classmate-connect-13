-- =====================================================================
-- C3.2: unsubscribe token + opt-out function
-- =====================================================================
-- Adiciona unsubscribe_token em responsaveis.
-- opt_out_responsavel(token) — acessível por anon via RPC (link de email).

-- ---------------------------------------------------------------------------
-- 1. Coluna unsubscribe_token
-- ---------------------------------------------------------------------------

ALTER TABLE public.responsaveis
  ADD COLUMN IF NOT EXISTS unsubscribe_token uuid
    NOT NULL DEFAULT gen_random_uuid()
    UNIQUE;

-- ---------------------------------------------------------------------------
-- 2. opt_out_responsavel(p_token) — acessível por anon (link de e-mail)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.opt_out_responsavel(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.responsaveis%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.responsaveis
  WHERE unsubscribe_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'token_not_found');
  END IF;

  UPDATE public.responsaveis
  SET
    email_status      = 'unsubscribed',
    preferencias_json = '{"digest":false,"alertas":false,"mensagens":false}'::jsonb
  WHERE unsubscribe_token = p_token;

  RETURN jsonb_build_object('ok', true, 'nome', v_row.nome);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.opt_out_responsavel(uuid) FROM public;
GRANT  EXECUTE ON FUNCTION public.opt_out_responsavel(uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. get_responsavel_prefs(p_token) — leitura de prefs para landing
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_responsavel_prefs(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.responsaveis%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.responsaveis
  WHERE unsubscribe_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'token_not_found');
  END IF;

  RETURN jsonb_build_object(
    'ok',           true,
    'nome',         v_row.nome,
    'email_status', v_row.email_status,
    'preferencias', v_row.preferencias_json
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_responsavel_prefs(uuid) FROM public;
GRANT  EXECUTE ON FUNCTION public.get_responsavel_prefs(uuid) TO anon, authenticated, service_role;

-- =====================================================================
-- Fix P0: lookup de coord/admin usava colunas inexistentes em profiles
-- =====================================================================
-- tg_alerta_ausencia e check_trial_expirando consultavam `profiles.role`
-- e `profiles.criado_em`, que NÃO existem (papéis vivem em user_roles;
-- o timestamp é created_at). Isso fazia o trigger AFTER de presencas
-- abortar com "column pr.role does not exist" em toda marcação de
-- ausência (presente=false) — bloqueando o registro de chamada — e
-- quebrava o cron de trial.
--
-- Correção: join profiles.user_id = user_roles.user_id, role via
-- user_roles, ordenação por created_at. digest_semanal_job não usa
-- profiles.role e fica inalterado.

CREATE OR REPLACE FUNCTION public.tg_alerta_ausencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aluno       record;
  v_coord_email text;
  v_vars        jsonb;
BEGIN
  IF NEW.presente IS TRUE THEN RETURN NEW; END IF;

  SELECT a.nome, a.contato_resp, a.project_id
  INTO v_aluno
  FROM public.alunos a
  WHERE a.id = NEW.aluno_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  v_vars := jsonb_build_object(
    'aluno_nome', v_aluno.nome,
    'tipo', 'Ausência registrada',
    'descricao', COALESCE(NEW.observacao, 'Ausência registrada no sistema.')
  );

  -- Notifica responsavel via contato_resp (email direto no cadastro do aluno)
  IF v_aluno.contato_resp IS NOT NULL AND v_aluno.contato_resp LIKE '%@%' THEN
    PERFORM public.enqueue_email(v_aluno.project_id,'alerta-critico',v_aluno.contato_resp,v_vars,24);
  END IF;

  -- Notifica também responsavel vinculado via responsaveis table
  PERFORM public.enqueue_email(r.project_id,'alerta-critico',r.email,v_vars,24)
  FROM public.responsaveis r
  JOIN public.viewer_dependentes vd ON vd.viewer_user_id = r.user_id
  WHERE vd.aluno_id = NEW.aluno_id
    AND r.email_status NOT IN ('bounced','complained','unsubscribed')
    AND (r.preferencias_json->>'alertas')::boolean IS NOT FALSE;

  -- Notifica primeiro coord/admin do projeto (papel via user_roles)
  SELECT pr.email INTO v_coord_email
  FROM public.profiles pr
  JOIN public.user_roles ur ON ur.user_id = pr.user_id
  WHERE pr.project_id = v_aluno.project_id
    AND ur.role IN ('admin','coordenacao')
  ORDER BY pr.created_at
  LIMIT 1;

  IF v_coord_email IS NOT NULL THEN
    PERFORM public.enqueue_email(v_aluno.project_id,'alerta-critico',v_coord_email,v_vars,24);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_trial_expirando()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proj    record;
  v_ends_at date;
  v_dias    int;
  v_email   text;
BEGIN
  FOR v_proj IN
    SELECT p.id AS project_id, p.nome AS escola_nome
    FROM public.projetos p
    WHERE EXISTS (
      SELECT 1 FROM public.system_settings ss
      WHERE ss.key = 'trial.ends_at'
    )
  LOOP
    SELECT (ss.value #>> '{}')::date INTO v_ends_at
    FROM public.system_settings ss
    WHERE ss.key = 'trial.ends_at';

    v_dias := (v_ends_at - now()::date);
    IF v_dias NOT IN (7, 1) THEN CONTINUE; END IF;

    SELECT pr.email INTO v_email
    FROM public.profiles pr
    JOIN public.user_roles ur ON ur.user_id = pr.user_id
    WHERE pr.project_id = v_proj.project_id
      AND ur.role = 'admin'
    ORDER BY pr.created_at
    LIMIT 1;

    IF v_email IS NULL THEN CONTINUE; END IF;

    PERFORM public.enqueue_email(
      v_proj.project_id,
      'trial-expirando',
      v_email,
      jsonb_build_object('escola', v_proj.escola_nome, 'dias', v_dias),
      20
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_trial_expirando() FROM public;
GRANT  EXECUTE ON FUNCTION public.check_trial_expirando() TO service_role;

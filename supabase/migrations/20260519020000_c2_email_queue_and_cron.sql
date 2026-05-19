-- =====================================================================
-- C2: email_queue + alertas críticos + digest pg_cron + trial (C2.2/C2.3/C2.4)
-- =====================================================================

-- ---------------------------------------------------------------------------
-- 1. email_queue — fila de emails assíncrona
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_queue (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid REFERENCES public.projetos(id) ON DELETE CASCADE,
  template_id   text NOT NULL,
  to_email      text NOT NULL,
  vars_json     jsonb NOT NULL DEFAULT '{}',
  state         text NOT NULL DEFAULT 'pending'
                CHECK (state IN ('pending', 'sent', 'failed')),
  tentativas    int  NOT NULL DEFAULT 0,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  enviado_em    timestamptz,
  erro_msg      text,
  throttle_key  text GENERATED ALWAYS AS (
    coalesce(project_id::text, '') || '|' || to_email || '|' || template_id
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_email_queue_state    ON public.email_queue(state, criado_em);
CREATE INDEX IF NOT EXISTS idx_email_queue_throttle ON public.email_queue(throttle_key, criado_em);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_queue_admin_read" ON public.email_queue
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    project_id = (current_setting('app.project_id', true))::uuid
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'coordenacao')
    )
  );

-- ---------------------------------------------------------------------------
-- 2. enqueue_email() — insere na fila com throttle
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enqueue_email(
  p_project_id   uuid,
  p_template_id  text,
  p_to_email     text,
  p_vars         jsonb,
  p_throttle_h   int DEFAULT 24
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := coalesce(p_project_id::text,'') || '|' || p_to_email || '|' || p_template_id;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.email_queue
    WHERE throttle_key = v_key
      AND state IN ('pending','sent')
      AND criado_em > now() - make_interval(hours => p_throttle_h)
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.email_queue (project_id, template_id, to_email, vars_json)
  VALUES (p_project_id, p_template_id, p_to_email, p_vars);

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(uuid,text,text,jsonb,int) FROM public;
GRANT  EXECUTE ON FUNCTION public.enqueue_email(uuid,text,text,jsonb,int) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. tg_alerta_ausencia — trigger em presencas (C2.3)
-- ---------------------------------------------------------------------------

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

  -- Notifica primeiro coord/admin do projeto
  SELECT pr.email INTO v_coord_email
  FROM public.profiles pr
  WHERE pr.project_id = v_aluno.project_id
    AND pr.role IN ('admin','coordenacao')
  ORDER BY pr.criado_em
  LIMIT 1;

  IF v_coord_email IS NOT NULL THEN
    PERFORM public.enqueue_email(v_aluno.project_id,'alerta-critico',v_coord_email,v_vars,24);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_alerta_ausencia ON public.presencas;
CREATE TRIGGER tg_alerta_ausencia
  AFTER INSERT OR UPDATE OF presente
  ON public.presencas
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_alerta_ausencia();

-- ---------------------------------------------------------------------------
-- 4. digest_semanal_job() — pg_cron domingo 18h (C2.2)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.digest_semanal_job()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resp         record;
  v_aluno        record;
  v_semana_ini   date := (date_trunc('week', now()) - interval '7 days')::date;
  v_semana_fim   date := (date_trunc('week', now()) - interval '1 day')::date;
  v_presencas_ok int;
  v_presencas_tot int;
  v_alunos_html  text;
BEGIN
  FOR v_resp IN
    SELECT r.id, r.email, r.nome, r.project_id, r.preferencias_json, r.user_id
    FROM public.responsaveis r
    WHERE (r.preferencias_json->>'digest') IS DISTINCT FROM 'false'
      AND r.email_status NOT IN ('bounced','complained','unsubscribed')
  LOOP
    v_alunos_html := '';

    FOR v_aluno IN
      SELECT a.id, a.nome
      FROM public.alunos a
      JOIN public.viewer_dependentes vd ON vd.aluno_id = a.id
      WHERE vd.viewer_user_id = v_resp.user_id
    LOOP
      SELECT
        COUNT(*) FILTER (WHERE p.presente = true),
        COUNT(*)
      INTO v_presencas_ok, v_presencas_tot
      FROM public.presencas p
      JOIN public.atividades at ON at.id = p.atividade_id
      WHERE p.aluno_id = v_aluno.id
        AND at.data BETWEEN v_semana_ini AND v_semana_fim;

      v_alunos_html := v_alunos_html
        || '<p><strong>' || v_aluno.nome || '</strong>: '
        || v_presencas_ok || '/' || COALESCE(v_presencas_tot, 0) || ' presenças</p>';
    END LOOP;

    IF v_alunos_html = '' THEN CONTINUE; END IF;

    PERFORM public.enqueue_email(
      v_resp.project_id,
      'digest-semanal',
      v_resp.email,
      jsonb_build_object('nome', v_resp.nome, 'resumo_html', v_alunos_html),
      144 -- 6 dias
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.digest_semanal_job() FROM public;
GRANT  EXECUTE ON FUNCTION public.digest_semanal_job() TO service_role;

-- ---------------------------------------------------------------------------
-- 5. check_trial_expirando() — pg_cron todo dia 9h (C2.4)
-- ---------------------------------------------------------------------------
-- Espera system_settings key='trial.ends_at' value='"YYYY-MM-DD"' (jsonb string).

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
    WHERE pr.project_id = v_proj.project_id
      AND pr.role = 'admin'
    ORDER BY pr.criado_em
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

-- ---------------------------------------------------------------------------
-- 6. pg_cron — registra jobs se extensão disponível
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('digest-semanal',      '0 18 * * 0', $$SELECT public.digest_semanal_job()$$);
    PERFORM cron.schedule('check-trial-expirando','0 9 * * *',  $$SELECT public.check_trial_expirando()$$);
  ELSE
    RAISE NOTICE 'pg_cron não habilitado — ative em Settings → Database → Extensions.';
  END IF;
END;
$$;

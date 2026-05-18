-- A3 Audit Log Infrastructure (PRD Q1 Sprint A)
-- - Tabela audit_events tenant-scoped
-- - Helper log_audit_event() SECURITY DEFINER
-- - Triggers em profiles, alunos, avaliacoes, system_settings
-- - RLS: admin/coord do projeto + super_admin

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projetos(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip text,
  user_agent text,
  action text NOT NULL CHECK (action IN ('insert','update','delete','login','logout','consent','export','custom')),
  entity_type text NOT NULL,
  entity_id uuid,
  before_json jsonb,
  after_json jsonb,
  ts timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_project_id ON public.audit_events(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON public.audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_ts ON public.audit_events(ts DESC);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_before jsonb DEFAULT NULL,
  p_after jsonb DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_id uuid;
  v_uid uuid;
  v_pid uuid;
BEGIN
  v_uid := COALESCE(p_user_id, auth.uid());
  v_pid := COALESCE(p_project_id, public.current_project_id());

  INSERT INTO public.audit_events
    (project_id, user_id, ip, user_agent, action, entity_type, entity_id, before_json, after_json)
  VALUES
    (v_pid, v_uid, p_ip, p_user_agent, p_action, p_entity_type, p_entity_id, p_before, p_after)
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[audit] log_audit_event failed: %', SQLERRM;
  RETURN NULL;
END
$fn$;

CREATE OR REPLACE FUNCTION public.tg_audit_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_action text;
  v_entity_id uuid;
  v_pid uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'insert';
    v_entity_id := (to_jsonb(NEW)->>'id')::uuid;
    BEGIN v_pid := (to_jsonb(NEW)->>'project_id')::uuid; EXCEPTION WHEN OTHERS THEN v_pid := NULL; END;
    PERFORM public.log_audit_event(v_action, TG_TABLE_NAME, v_entity_id, NULL, to_jsonb(NEW), v_pid);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_entity_id := (to_jsonb(NEW)->>'id')::uuid;
    BEGIN v_pid := (to_jsonb(NEW)->>'project_id')::uuid; EXCEPTION WHEN OTHERS THEN v_pid := NULL; END;
    PERFORM public.log_audit_event(v_action, TG_TABLE_NAME, v_entity_id, to_jsonb(OLD), to_jsonb(NEW), v_pid);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_entity_id := (to_jsonb(OLD)->>'id')::uuid;
    BEGIN v_pid := (to_jsonb(OLD)->>'project_id')::uuid; EXCEPTION WHEN OTHERS THEN v_pid := NULL; END;
    PERFORM public.log_audit_event(v_action, TG_TABLE_NAME, v_entity_id, to_jsonb(OLD), NULL, v_pid);
    RETURN OLD;
  END IF;
  RETURN NULL;
END
$fn$;

DROP TRIGGER IF EXISTS audit_profiles_aiud ON public.profiles;
CREATE TRIGGER audit_profiles_aiud
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

DROP TRIGGER IF EXISTS audit_alunos_aiud ON public.alunos;
CREATE TRIGGER audit_alunos_aiud
  AFTER INSERT OR UPDATE OR DELETE ON public.alunos
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

DROP TRIGGER IF EXISTS audit_avaliacoes_aiud ON public.avaliacoes;
CREATE TRIGGER audit_avaliacoes_aiud
  AFTER INSERT OR UPDATE OR DELETE ON public.avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

DROP TRIGGER IF EXISTS audit_system_settings_aiud ON public.system_settings;
CREATE TRIGGER audit_system_settings_aiud
  AFTER INSERT OR UPDATE OR DELETE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

CREATE POLICY "Project scope audit" ON public.audit_events
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (project_id IS NULL AND public.is_super_admin())
    OR public.has_project_access(project_id)
  );

CREATE POLICY "Admin coord read audit" ON public.audit_events
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('admin'::app_role, 'coordenacao'::app_role)
    )
  );

REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, jsonb, jsonb, uuid, uuid, text, text)
  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_audit_row()
  FROM anon, authenticated, public;

COMMENT ON TABLE public.audit_events IS 'A3 (PRD Q1 Sprint A): audit log tenant-scoped. INSERT via triggers/SERVICE_ROLE. SELECT admin/coord do projeto + super.';
COMMENT ON FUNCTION public.log_audit_event IS 'A3 helper: callable from triggers + Edge Functions. Falhas internas só RAISE WARNING.';

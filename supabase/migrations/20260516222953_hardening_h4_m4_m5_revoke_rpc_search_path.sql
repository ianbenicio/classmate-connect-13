-- M5: SET search_path nas 3 funcoes flagged pelo advisor
ALTER FUNCTION public.touch_professores_atualizado_em()      SET search_path = public;
ALTER FUNCTION public.validate_professor_avaliacao_tags()    SET search_path = public;
ALTER FUNCTION public.get_projeto_javis_id()                 SET search_path = public;

-- M4: REVOKE EXECUTE nas SECURITY DEFINER functions internas
REVOKE EXECUTE ON FUNCTION public.handle_new_user()              FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid)                 FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_viewer_of(uuid, uuid)       FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_super_admin()               FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.current_project_id()           FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_project_access(uuid)       FROM anon, authenticated, public;

COMMENT ON FUNCTION public.is_staff(uuid) IS 'SECURITY DEFINER. Internal use only.';
COMMENT ON FUNCTION public.has_project_access(uuid) IS 'SECURITY DEFINER. Internal use only.';

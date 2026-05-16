-- ROLLBACK: REVOKE EXECUTE quebrou RLS porque policies chamam essas
-- functions em USING/WITH CHECK. Restaurar GRANT.

GRANT EXECUTE ON FUNCTION public.handle_new_user()              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid)                 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_viewer_of(uuid, uuid)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin()               TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_project_id()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_project_access(uuid)       TO authenticated;

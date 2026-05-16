-- Fix recursão: helpers viram SECURITY DEFINER pra bypassar RLS quando
-- consultam profiles/user_roles internamente.

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'::app_role
  )
$fn$;

CREATE OR REPLACE FUNCTION public.current_project_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
  SELECT project_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$fn$;

CREATE OR REPLACE FUNCTION public.has_project_access(p uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
  SELECT public.is_super_admin() OR p IS NULL OR public.current_project_id() = p
$fn$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM public;
REVOKE ALL ON FUNCTION public.current_project_id() FROM public;
REVOKE ALL ON FUNCTION public.has_project_access(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_project_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_project_access(uuid) TO authenticated;

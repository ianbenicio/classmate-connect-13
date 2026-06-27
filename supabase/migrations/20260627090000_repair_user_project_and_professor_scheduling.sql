-- Repair user onboarding/project scope issues that make staff accounts load
-- empty data or fail scheduling after login.
--
-- Symptoms:
-- - authenticated professor/coordenacao/admin sees cursos/turmas/agendamentos as zero;
-- - schedule insert fails because current_project_id() is NULL;
-- - an auth user has roles but no profiles row/project_id.

INSERT INTO public.projetos (slug, nome, cor_primaria)
VALUES ('javis', 'Javis', '#3b82f6')
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_projeto_javis_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $func$
  SELECT id FROM public.projetos WHERE slug = 'javis' LIMIT 1
$func$;

ALTER TABLE public.profiles
  ALTER COLUMN project_id SET DEFAULT public.get_projeto_javis_id();

-- Recreate missing profile rows for users that still have app roles.
INSERT INTO public.profiles (user_id, project_id, display_name, email)
SELECT
  au.id,
  public.get_projeto_javis_id(),
  COALESCE(
    au.raw_user_meta_data->>'display_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ),
  au.email
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = au.id
  )
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = au.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = au.id
      AND ur.role = 'super_admin'::public.app_role
  )
ON CONFLICT (user_id) DO NOTHING;

-- Backfill users with profile but no project, preserving super_admin without
-- fixed tenant.
UPDATE public.profiles p
SET project_id = public.get_projeto_javis_id()
WHERE p.project_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p.user_id
      AND ur.role = 'super_admin'::public.app_role
  );

-- Keep the signup trigger aligned with the tenant model.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid := public.get_projeto_javis_id();
  v_meta_project text := NULLIF(NEW.raw_user_meta_data->>'project_id', '');
BEGIN
  IF v_meta_project IS NOT NULL THEN
    BEGIN
      v_project_id := v_meta_project::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_project_id := public.get_projeto_javis_id();
    END;
  END IF;

  INSERT INTO public.profiles (user_id, project_id, display_name, email)
  VALUES (
    NEW.id,
    v_project_id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    project_id = COALESCE(public.profiles.project_id, EXCLUDED.project_id),
    display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), public.profiles.display_name),
    email = COALESCE(EXCLUDED.email, public.profiles.email);

  RETURN NEW;
END;
$$;

-- Professors need to see project schedule rows so the UI can block duplicate
-- lessons, not just rows assigned to themselves.
DROP POLICY IF EXISTS "professor_select_agendamentos" ON public.agendamentos;
CREATE POLICY "professor_select_agendamentos"
  ON public.agendamentos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

-- Explicit own-insert fallback for professor scheduling. Existing staff policy
-- normally covers this, but keeping a narrow professor policy makes the intent
-- resilient if staff rules are tightened later.
DROP POLICY IF EXISTS "professor_insert_own_agendamentos" ON public.agendamentos;
CREATE POLICY "professor_insert_own_agendamentos"
  ON public.agendamentos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'professor')
    AND professor_user_id = auth.uid()
  );

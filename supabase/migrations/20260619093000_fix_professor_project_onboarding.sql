-- Fix: usuarios novos com role professor entravam no app, mas viam dados zerados.
--
-- Causa: o multi-tenant usa profiles.project_id para calcular
-- public.current_project_id(). O trigger original handle_new_user criava
-- profiles sem project_id. Assim, mesmo com role='professor', as policies
-- RESTRICTIVE de escopo por projeto bloqueavam cursos, turmas, alunos,
-- atividades e agendamentos.
--
-- Este patch:
-- 1. garante default de projeto para profiles novos;
-- 2. atualiza handle_new_user para gravar project_id;
-- 3. faz backfill de profiles sem projeto, preservando super_admin sem vinculo;
-- 4. re-aplica policies essenciais de visibilidade do professor, caso a
--    migration antiga tenha sido marcada como aplicada sem efetivar policies.

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

UPDATE public.profiles p
SET project_id = public.get_projeto_javis_id()
WHERE p.project_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p.user_id
      AND ur.role = 'super_admin'::public.app_role
  );

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

DROP POLICY IF EXISTS "professor_select_cursos" ON public.cursos;
CREATE POLICY "professor_select_cursos"
  ON public.cursos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

DROP POLICY IF EXISTS "professor_select_turmas" ON public.turmas;
CREATE POLICY "professor_select_turmas"
  ON public.turmas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

DROP POLICY IF EXISTS "professor_select_alunos" ON public.alunos;
CREATE POLICY "professor_select_alunos"
  ON public.alunos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

DROP POLICY IF EXISTS "professor_select_atividades" ON public.atividades;
CREATE POLICY "professor_select_atividades"
  ON public.atividades
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

DROP POLICY IF EXISTS "professor_select_agendamentos" ON public.agendamentos;
CREATE POLICY "professor_select_agendamentos"
  ON public.agendamentos
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'professor')
    AND professor_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "professor_select_grupos" ON public.grupos;
CREATE POLICY "professor_select_grupos"
  ON public.grupos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

DROP POLICY IF EXISTS "professor_select_habilidades" ON public.habilidades;
CREATE POLICY "professor_select_habilidades"
  ON public.habilidades
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT a.professor_user_id, 'professor'::public.app_role
FROM public.agendamentos a
WHERE a.professor_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = a.professor_user_id)
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT a.professor_user_id, 'professor'::public.app_role
FROM public.atividades a
WHERE a.professor_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = a.professor_user_id)
ON CONFLICT DO NOTHING;

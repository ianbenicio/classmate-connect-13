-- Fase J.1.2: policies RESTRICTIVE que escopam por projeto.

DO $blk$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'cursos', 'turmas', 'alunos', 'atividades', 'agendamentos',
    'presencas', 'tarefas_alunos', 'avaliacoes', 'formularios',
    'notificacoes', 'grupos', 'relatorios',
    'professor_avaliacoes', 'relatorios_exportados'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Project scope select" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Project scope write" ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY "Project scope select" ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (public.has_project_access(project_id))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Project scope write" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_project_access(project_id)) WITH CHECK (public.has_project_access(project_id))',
      tbl
    );
  END LOOP;
END $blk$;

DO $blk2$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'habilidades', 'comportamento_tags', 'system_settings'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Project scope select" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Project scope write" ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY "Project scope select" ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (public.has_project_access(project_id))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Project scope write" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_project_access(project_id)) WITH CHECK (public.has_project_access(project_id))',
      tbl
    );
  END LOOP;
END $blk2$;

DROP POLICY IF EXISTS "Project scope select profiles" ON public.profiles;
CREATE POLICY "Project scope select profiles" ON public.profiles
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin()
    OR project_id = public.current_project_id()
    OR project_id IS NULL
  );

DROP POLICY IF EXISTS "Project scope update profiles" ON public.profiles;
CREATE POLICY "Project scope update profiles" ON public.profiles
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin()
    OR project_id = public.current_project_id()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_super_admin()
    OR project_id = public.current_project_id()
  );

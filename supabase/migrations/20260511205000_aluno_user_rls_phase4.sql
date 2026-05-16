-- Phase 4: RLS policies so aluno-user sees only own data.

DROP POLICY IF EXISTS "aluno_select_own" ON public.alunos;
CREATE POLICY "aluno_select_own"
  ON public.alunos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "aluno_select_own_turma" ON public.agendamentos;
CREATE POLICY "aluno_select_own_turma"
  ON public.agendamentos
  FOR SELECT TO authenticated
  USING (turma_id IN (SELECT turma_id FROM public.alunos WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "aluno_select_own_presencas" ON public.presencas;
CREATE POLICY "aluno_select_own_presencas"
  ON public.presencas
  FOR SELECT TO authenticated
  USING (aluno_id IN (SELECT id FROM public.alunos WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "aluno_select_own_notifs" ON public.notificacoes;
CREATE POLICY "aluno_select_own_notifs"
  ON public.notificacoes
  FOR SELECT TO authenticated
  USING (destinatario_user_id = auth.uid());

DROP POLICY IF EXISTS "aluno_update_own_notifs" ON public.notificacoes;
CREATE POLICY "aluno_update_own_notifs"
  ON public.notificacoes
  FOR UPDATE TO authenticated
  USING (destinatario_user_id = auth.uid())
  WITH CHECK (destinatario_user_id = auth.uid());

DROP POLICY IF EXISTS "aluno_select_own_checklist" ON public.avaliacoes;
CREATE POLICY "aluno_select_own_checklist"
  ON public.avaliacoes
  FOR SELECT TO authenticated
  USING (
    tipo IN ('checklist_aluno', 'relatorio_aluno')
    AND aluno_id IN (SELECT id FROM public.alunos WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "aluno_insert_own_relatorio" ON public.avaliacoes;
CREATE POLICY "aluno_insert_own_relatorio"
  ON public.avaliacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    tipo = 'relatorio_aluno'
    AND aluno_id IN (SELECT id FROM public.alunos WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "aluno_select_own_curso" ON public.cursos;
CREATE POLICY "aluno_select_own_curso"
  ON public.cursos
  FOR SELECT TO authenticated
  USING (id IN (SELECT curso_id FROM public.alunos WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "aluno_select_own_turma_row" ON public.turmas;
CREATE POLICY "aluno_select_own_turma_row"
  ON public.turmas
  FOR SELECT TO authenticated
  USING (id IN (SELECT turma_id FROM public.alunos WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "aluno_select_own_atividades" ON public.atividades;
CREATE POLICY "aluno_select_own_atividades"
  ON public.atividades
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT (jsonb_array_elements_text(atividade_ids))::uuid
      FROM public.agendamentos
      WHERE turma_id IN (SELECT turma_id FROM public.alunos WHERE user_id = auth.uid())
    )
  );

-- Bug RLS: "Authenticated read X" policies (qual=true) liberavam tabelas inteiras
-- pra qualquer autenticado, anulando as restrições aluno-scoped.
-- Fix: dropa as broad reads; "Staff manage X" (is_staff(auth.uid())) cobre staff;
-- "aluno_select_*" cobre alunos.

DROP POLICY IF EXISTS "Authenticated read agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Authenticated read atividades" ON public.atividades;
DROP POLICY IF EXISTS "Authenticated read cursos" ON public.cursos;
DROP POLICY IF EXISTS "Authenticated read turmas" ON public.turmas;
DROP POLICY IF EXISTS "Authenticated read notificacoes" ON public.notificacoes;

DROP POLICY IF EXISTS "Authenticated insert notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "Authenticated update notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "Authenticated delete notificacoes" ON public.notificacoes;

CREATE POLICY "Staff insert notificacoes" ON public.notificacoes
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff update notificacoes" ON public.notificacoes
  FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff delete notificacoes" ON public.notificacoes
  FOR DELETE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff read notificacoes" ON public.notificacoes
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

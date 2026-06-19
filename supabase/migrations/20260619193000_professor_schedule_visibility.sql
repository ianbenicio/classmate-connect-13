-- Fix: o professor precisa ver os agendamentos da turma para impedir
-- reagendamento de aulas ja agendadas/finalizadas por coordenacao ou outro
-- professor.
--
-- O escopo multi-tenant continua protegido pela policy RESTRICTIVE
-- "Project scope select" em public.agendamentos.

DROP POLICY IF EXISTS "professor_select_agendamentos" ON public.agendamentos;

CREATE POLICY "professor_select_agendamentos"
  ON public.agendamentos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

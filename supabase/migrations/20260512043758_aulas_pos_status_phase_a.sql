-- Fase A: tracking de tarefas pós-aula
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS recursos_entregues_em timestamptz,
  ADD COLUMN IF NOT EXISTS recursos_drive_path   text,
  ADD COLUMN IF NOT EXISTS pais_notificados_em   timestamptz;

COMMENT ON COLUMN public.agendamentos.recursos_entregues_em IS 'Quando o professor marcou recursos entregues (manual; futuro: scanner Drive)';
COMMENT ON COLUMN public.agendamentos.recursos_drive_path   IS 'Path/URL da pasta Google Drive da aula (para futura verificação automática)';
COMMENT ON COLUMN public.agendamentos.pais_notificados_em   IS 'Auto-preenchido quando relatorio_prof é enviado com sugestoes_pais';

CREATE TABLE IF NOT EXISTS public.tarefas_alunos (
  agendamento_id uuid NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  aluno_id       uuid NOT NULL REFERENCES public.alunos(id)       ON DELETE CASCADE,
  atividade_id   uuid NOT NULL REFERENCES public.atividades(id)   ON DELETE CASCADE,
  completou      boolean NOT NULL DEFAULT false,
  observacao     text,
  registrado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agendamento_id, aluno_id, atividade_id)
);

ALTER TABLE public.tarefas_alunos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage tarefas_alunos" ON public.tarefas_alunos;
CREATE POLICY "Staff manage tarefas_alunos" ON public.tarefas_alunos
  FOR ALL TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Aluno select own tarefas" ON public.tarefas_alunos;
CREATE POLICY "Aluno select own tarefas" ON public.tarefas_alunos
  FOR SELECT TO authenticated
  USING (aluno_id IN (SELECT id FROM public.alunos WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Professor titular marca pos-aula" ON public.agendamentos;
CREATE POLICY "Professor titular marca pos-aula" ON public.agendamentos
  FOR UPDATE TO authenticated
  USING (professor_user_id = auth.uid())
  WITH CHECK (professor_user_id = auth.uid());

COMMENT ON TABLE public.tarefas_alunos IS 'Tracking de entrega/conclusão de atividades tipo=tarefa por aluno em cada agendamento';

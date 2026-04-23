-- Create presencas table to persist student attendance per activity
CREATE TABLE public.presencas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  atividade_id UUID NOT NULL REFERENCES public.atividades(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  presente BOOLEAN NOT NULL DEFAULT false,
  observacao TEXT,
  registrado_por_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_presencas_aluno ON public.presencas(aluno_id);
CREATE INDEX idx_presencas_atividade ON public.presencas(atividade_id);
CREATE INDEX idx_presencas_agendamento ON public.presencas(agendamento_id);

ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;

-- Staff manages everything
CREATE POLICY "Staff manage presencas"
ON public.presencas
FOR ALL
USING (public.is_staff(auth.uid()));

-- Aluno can read its own attendance
CREATE POLICY "Aluno reads own presencas"
ON public.presencas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.alunos a
    WHERE a.id = presencas.aluno_id AND a.user_id = auth.uid()
  )
);

-- Viewer can read dependent's attendance
CREATE POLICY "Viewer reads dependente presencas"
ON public.presencas
FOR SELECT
USING (public.is_viewer_of(aluno_id, auth.uid()));

-- timestamp trigger
CREATE TRIGGER update_presencas_updated_at
BEFORE UPDATE ON public.presencas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
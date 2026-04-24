-- Adicionar tipo de habilidade (geral por curso ou específica por atividade)
-- + vínculos opcionais
ALTER TABLE public.habilidades
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'geral' CHECK (tipo IN ('geral', 'especifica')),
  ADD COLUMN IF NOT EXISTS curso_id uuid REFERENCES public.cursos(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS atividade_id uuid REFERENCES public.atividades(id) ON DELETE CASCADE;

-- Validação por trigger (CHECK constraints com regras condicionais ficam mais claras como trigger)
CREATE OR REPLACE FUNCTION public.validar_habilidade_vinculo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo = 'geral' AND NEW.curso_id IS NULL THEN
    RAISE EXCEPTION 'Habilidade geral precisa de curso_id';
  END IF;
  IF NEW.tipo = 'especifica' AND NEW.atividade_id IS NULL THEN
    RAISE EXCEPTION 'Habilidade específica precisa de atividade_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_habilidade_vinculo ON public.habilidades;
CREATE TRIGGER trg_validar_habilidade_vinculo
  BEFORE INSERT OR UPDATE ON public.habilidades
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_habilidade_vinculo();

-- Índices p/ filtros frequentes
CREATE INDEX IF NOT EXISTS idx_habilidades_curso ON public.habilidades(curso_id) WHERE curso_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_habilidades_atividade ON public.habilidades(atividade_id) WHERE atividade_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_habilidades_tipo ON public.habilidades(tipo);

-- Índices p/ avaliacoes (vamos consultar muito por agendamento+tipo)
CREATE INDEX IF NOT EXISTS idx_avaliacoes_agendamento_tipo ON public.avaliacoes(agendamento_id, tipo);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_aluno_tipo ON public.avaliacoes(aluno_id, tipo);
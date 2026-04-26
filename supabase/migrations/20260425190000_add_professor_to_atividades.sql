-- =====================================================================
-- FASE 6: Adiciona professor_id FK a atividades (opcional, compatibilidade)
-- =====================================================================
-- Permite vincular atividades a professores via FK, mantendo compatibilidade
-- com campo "professor" (string) já existente. Ambos funcionam em paralelo.
--
-- Racional:
--   • Fase 3 cria professor como entidade com id UUID
--   • Fase 6 prepara atividades para referenciar professor.id
--   • Mantém "professor" string para backward-compatibility
--   • Fase 7 faz backfill de professor_id via matching de nomes
--
-- RLS: atividades já tem políticas em vigor. professor_id usa as mesmas.
-- =====================================================================

ALTER TABLE public.atividades
ADD COLUMN professor_id uuid REFERENCES public.professores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_atividades_professor_id
  ON public.atividades(professor_id);

-- Adiciona FK professor_id em agendamentos.
-- Espelha o que já existe em atividades — unifica o modelo de
-- "professor responsável" com lookup por UUID e backfill por match
-- case-insensitive contra professores.nome.
--
-- Idempotente: IF NOT EXISTS na coluna e index, ON CONFLICT desnecessário
-- no UPDATE (apenas atualiza linhas com NULL).

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS professor_id uuid
    REFERENCES public.professores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agendamentos_professor_id
  ON public.agendamentos(professor_id);

-- Backfill: associa agendamentos.professor (string) ao professor.id
-- correspondente. Match case-insensitive trim. Apenas linhas SEM
-- professor_id são atualizadas — preserva quem já tem FK.
UPDATE public.agendamentos AS ag
SET professor_id = p.id
FROM public.professores AS p
WHERE ag.professor_id IS NULL
  AND ag.professor IS NOT NULL
  AND LOWER(TRIM(ag.professor)) = LOWER(TRIM(p.nome));

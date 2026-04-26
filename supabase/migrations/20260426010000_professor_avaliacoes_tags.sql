-- Adiciona coluna `tags` em professor_avaliacoes.
-- Array de slugs de comportamento_tags (pos/neg) escolhidas pelo avaliador
-- (aluno, coordenação, admin) para etiquetar o professor.
-- Idempotente.

ALTER TABLE public.professor_avaliacoes
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Index GIN pra agregação rápida (count por tag) — pequeno mas útil
-- conforme a base cresce.
CREATE INDEX IF NOT EXISTS idx_prof_aval_tags
  ON public.professor_avaliacoes USING GIN (tags);

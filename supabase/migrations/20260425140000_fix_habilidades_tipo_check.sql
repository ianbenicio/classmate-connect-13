-- Corrige o CHECK constraint de `habilidades.tipo`.
--
-- Histórico do bug:
-- - Migration 20260424020624 criou a coluna `tipo` com
--     CHECK (tipo IN ('geral', 'especifica'))
-- - Migration 20260424024437 mudou o DEFAULT para 'curso' e o code-base
--   passou a inserir 'curso' / 'atividade', mas o CHECK não foi
--   atualizado. Resultado: todo INSERT/UPSERT do top-up de seed quebra
--   com erro 23514 ("violates check constraint habilidades_tipo_check").
--
-- Esta migration sincroniza o CHECK com o vocabulário atual.
-- 'geral' → tratado como 'curso' (compatibilidade retroativa caso haja
-- linhas antigas no banco com o valor anterior).

DO $$
BEGIN
  -- 1) Normaliza valores legados antes de aplicar o novo CHECK.
  UPDATE public.habilidades SET tipo = 'curso'      WHERE tipo = 'geral';
  UPDATE public.habilidades SET tipo = 'atividade'  WHERE tipo = 'especifica';
END $$;

-- 2) Substitui o CHECK. Em Postgres não há DROP/ADD CHECK genérico
-- garantindo o nome exato do constraint, então usamos o nome explícito
-- gerado pelo ADD CHECK original (`<tabela>_<coluna>_check`).
ALTER TABLE public.habilidades
  DROP CONSTRAINT IF EXISTS habilidades_tipo_check;

ALTER TABLE public.habilidades
  ADD CONSTRAINT habilidades_tipo_check
  CHECK (tipo IN ('curso', 'atividade'));

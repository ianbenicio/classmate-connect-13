-- Habilidades agora são entidades independentes; tipo é só classificação
-- Limpa dados existentes e remove vínculos diretos
DELETE FROM public.aluno_habilidades;
DELETE FROM public.habilidades;

-- Remove trigger de validação antigo
DROP TRIGGER IF EXISTS trg_validar_habilidade_vinculo ON public.habilidades;
DROP FUNCTION IF EXISTS public.validar_habilidade_vinculo();

-- Remove colunas de vínculo direto
ALTER TABLE public.habilidades DROP COLUMN IF EXISTS curso_id;
ALTER TABLE public.habilidades DROP COLUMN IF EXISTS atividade_id;

-- Atualiza o tipo para refletir o novo significado: 'curso' ou 'atividade'
ALTER TABLE public.habilidades ALTER COLUMN tipo SET DEFAULT 'curso';

-- Adiciona habilidade_ids em cursos (atividades já tem)
ALTER TABLE public.cursos ADD COLUMN IF NOT EXISTS habilidade_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
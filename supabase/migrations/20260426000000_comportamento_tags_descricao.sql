-- Adiciona coluna descricao em comportamento_tags.
-- Texto livre — usado na UI pra explicar o que cada tag representa.
-- Migração idempotente.

ALTER TABLE public.comportamento_tags
  ADD COLUMN IF NOT EXISTS descricao text;

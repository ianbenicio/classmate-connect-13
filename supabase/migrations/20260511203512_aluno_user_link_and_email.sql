-- Phase 1: aluno ↔ auth.users link + email column
-- Nullable initially to preserve 106 existing rows; app enforces required for new entries.

ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- One aluno per auth user (1:1) when linked
CREATE UNIQUE INDEX IF NOT EXISTS alunos_user_id_unique
  ON public.alunos(user_id) WHERE user_id IS NOT NULL;

-- Email unique (case-insensitive) when present
CREATE UNIQUE INDEX IF NOT EXISTS alunos_email_unique
  ON public.alunos(lower(email)) WHERE email IS NOT NULL;

COMMENT ON COLUMN public.alunos.email IS 'Email do aluno — usado p/ invite ao registrar como auth user';
COMMENT ON COLUMN public.alunos.user_id IS 'FK auth.users — preenchido após invite/link via Edge Function';

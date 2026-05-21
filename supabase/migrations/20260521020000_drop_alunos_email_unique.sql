-- Remove unique constraint em alunos.email
-- Motivo: muitos alunos não têm email próprio (crianças). Escola usa um único
-- email institucional/responsável compartilhado entre vários alunos para
-- cadastro. Exportar-como-usuário ainda exige email único de fato no
-- auth.users (constraint do Supabase Auth) — controle de duplicidade fica no
-- ato do invite, não no cadastro.

DROP INDEX IF EXISTS public.alunos_email_unique;

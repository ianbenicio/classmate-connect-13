-- Fix: invite-aluno-user precisa ler user_roles para validar caller
-- (super_admin / admin / coordenacao). Mesma causa da migration anterior
-- (hardening REVOKE FROM public stripou service_role).

GRANT SELECT, INSERT, DELETE ON public.user_roles TO service_role;

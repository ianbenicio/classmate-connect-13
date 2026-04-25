-- Relaxa as policies de `notificacoes` para a iteração atual.
-- Como o app endereça destinatários por `destinatario_ref` (id de aluno seed
-- ou nome de professor), e não por auth.uid(), as policies originais
-- bloqueavam todos os usuários não-admin de ler/atualizar/excluir
-- notificações. Esta migração libera CRUD para qualquer usuário autenticado;
-- um refactor futuro de auth poderá voltar a restringir por `destinatario_user_id`.

DROP POLICY IF EXISTS "Read own notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Update own notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Staff insert notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Admin delete notifications" ON public.notificacoes;

CREATE POLICY "Authenticated read notificacoes" ON public.notificacoes
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert notificacoes" ON public.notificacoes
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update notificacoes" ON public.notificacoes
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated delete notificacoes" ON public.notificacoes
FOR DELETE TO authenticated USING (true);

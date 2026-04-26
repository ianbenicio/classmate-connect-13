-- Endurece RLS de public.avaliacoes separando o "FOR ALL" original em
-- INSERT / UPDATE / DELETE distintos.
--
-- Antes (migration 20260423142524): a policy "Staff manage avaliacoes" usava
-- FOR ALL com is_staff(), o que significava que qualquer staff member
-- (coordenador, professor) podia UPDATE ou DELETE em avaliacao criada por
-- outro staff. Sem trilha de propriedade real.
--
-- Agora:
--   - INSERT: qualquer staff (mantém comportamento atual)
--   - UPDATE/DELETE: só o criador (criado_por_user_id = auth.uid())
--                    OU admin (escape hatch pra correção)
--
-- Mantém intactas:
--   - "Staff read avaliacoes"     (SELECT por is_staff)
--   - "Aluno reads own avaliacoes" (SELECT do próprio aluno)
--   - "Viewer reads dependente avaliacoes" (responsável vendo dependente)
--
-- Idempotente: usa DROP IF EXISTS + nomes únicos por verbo.

DROP POLICY IF EXISTS "Staff manage avaliacoes" ON public.avaliacoes;

-- Limpa nomes desta migration caso re-run após falha parcial.
DROP POLICY IF EXISTS "avaliacoes_insert_staff" ON public.avaliacoes;
DROP POLICY IF EXISTS "avaliacoes_update_owner_or_admin" ON public.avaliacoes;
DROP POLICY IF EXISTS "avaliacoes_delete_owner_or_admin" ON public.avaliacoes;

CREATE POLICY "avaliacoes_insert_staff"
  ON public.avaliacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "avaliacoes_update_owner_or_admin"
  ON public.avaliacoes
  FOR UPDATE
  TO authenticated
  USING (
    criado_por_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    criado_por_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "avaliacoes_delete_owner_or_admin"
  ON public.avaliacoes
  FOR DELETE
  TO authenticated
  USING (
    criado_por_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

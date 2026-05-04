-- =====================================================================
-- Fase 8 Final: Eliminação total da entidade "Professor" como tabela.
-- =====================================================================

-- 1. Atualizar policy prof_aval_select para usar professor_user_id direto
DROP POLICY IF EXISTS prof_aval_select ON professor_avaliacoes;
CREATE POLICY prof_aval_select ON professor_avaliacoes
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordenacao'::app_role)
    OR (avaliador_user_id = auth.uid())
    OR (professor_user_id = auth.uid())
  );

-- 2. Drop FKs que apontam para professores.id
ALTER TABLE agendamentos
  DROP CONSTRAINT IF EXISTS agendamentos_professor_id_fkey;
ALTER TABLE atividades
  DROP CONSTRAINT IF EXISTS atividades_professor_id_fkey;
ALTER TABLE professor_avaliacoes
  DROP CONSTRAINT IF EXISTS professor_avaliacoes_professor_id_fkey;

-- 3. Drop colunas professor_id legadas
ALTER TABLE agendamentos DROP COLUMN IF EXISTS professor_id;
ALTER TABLE atividades DROP COLUMN IF EXISTS professor_id;
ALTER TABLE professor_avaliacoes DROP COLUMN IF EXISTS professor_id;

-- 4. Drop tabela professores (dados já migrados para profiles)
DROP TABLE IF EXISTS professores CASCADE;

-- 5. Comentários de auditoria
COMMENT ON TABLE profiles IS 'Perfil unificado: dados básicos + específicos por papel (professor, etc.)';
COMMENT ON COLUMN agendamentos.professor_user_id IS 'Professor responsável (auth.users.id). Fonte única após Fase 8.';
COMMENT ON COLUMN atividades.professor_user_id IS 'Professor responsável (auth.users.id). Fonte única após Fase 8.';
COMMENT ON COLUMN professor_avaliacoes.professor_user_id IS 'Professor avaliado (auth.users.id). Fonte única após Fase 8.';

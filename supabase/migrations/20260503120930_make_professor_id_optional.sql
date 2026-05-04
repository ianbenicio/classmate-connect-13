-- Tornar professor_id opcional em todas as tabelas que ainda referenciam professores.id
-- (preparação para drop da tabela professores)
ALTER TABLE professor_avaliacoes
  ALTER COLUMN professor_id DROP NOT NULL;

-- professor_user_id passa a ser obrigatório em professor_avaliacoes
-- (já temos backfill 1/1)
ALTER TABLE professor_avaliacoes
  ALTER COLUMN professor_user_id SET NOT NULL;

-- Adiciona professor_user_id apontando direto para auth.users
ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS professor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE atividades
  ADD COLUMN IF NOT EXISTS professor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE professor_avaliacoes
  ADD COLUMN IF NOT EXISTS professor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE notificacoes
  ADD COLUMN IF NOT EXISTS professor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_professor_user_id
  ON agendamentos(professor_user_id);
CREATE INDEX IF NOT EXISTS idx_atividades_professor_user_id
  ON atividades(professor_user_id);
CREATE INDEX IF NOT EXISTS idx_professor_avaliacoes_professor_user_id
  ON professor_avaliacoes(professor_user_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_professor_user_id
  ON notificacoes(professor_user_id);

COMMENT ON COLUMN agendamentos.professor_user_id IS 'FK direta para auth.users (substitui professor_id)';
COMMENT ON COLUMN atividades.professor_user_id IS 'FK direta para auth.users (substitui professor_id)';
COMMENT ON COLUMN professor_avaliacoes.professor_user_id IS 'FK direta para auth.users (substitui professor_id)';
COMMENT ON COLUMN notificacoes.professor_user_id IS 'FK direta para auth.users (substitui campo professor texto)';

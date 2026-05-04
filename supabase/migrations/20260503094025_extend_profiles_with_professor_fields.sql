-- Estende profiles com campos antes específicos de professores
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS formacao TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS carga_horaria_semanal_min INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS habilidades_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

COMMENT ON COLUMN profiles.telefone IS 'Telefone do usuário (relevante para professores)';
COMMENT ON COLUMN profiles.cpf IS 'CPF do usuário (PII, relevante para professores)';
COMMENT ON COLUMN profiles.formacao IS 'Formação acadêmica (professores)';
COMMENT ON COLUMN profiles.bio IS 'Biografia (professores)';
COMMENT ON COLUMN profiles.foto_url IS 'URL da foto de perfil';
COMMENT ON COLUMN profiles.carga_horaria_semanal_min IS 'Carga horária semanal em minutos (professores)';
COMMENT ON COLUMN profiles.habilidades_ids IS 'Habilidades do professor';
COMMENT ON COLUMN profiles.ativo IS 'Se o perfil está ativo';

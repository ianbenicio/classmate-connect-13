-- =====================================================================
-- FASE 1: Entidade Professor (independente, gerenciada pela coordenação)
-- =====================================================================
-- Cria a tabela `professores` como recurso de primeira classe + tabela de
-- avaliações (`professor_avaliacoes`). Não toca em `atividades`, `agendamentos`,
-- `notificacoes` ou `user_roles` — fases seguintes farão a integração de forma
-- progressiva, com colunas opcionais e fallbacks para preservar compatibilidade.
--
-- Pontos importantes:
--   • `user_id` é OPCIONAL: coordenador pode cadastrar professor antes dele
--     criar conta no sistema. Ao cadastrar, o vínculo é feito por update.
--   • `ativo` permite "desligar" professor sem perder histórico.
--   • `habilidades_ids` reaproveita a tabela `habilidades` (uuid[]); não usamos
--     join table porque o array é pequeno e raramente alterado.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.professores (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid        UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nome                        text        NOT NULL,
  email                       text,
  telefone                    text,
  cpf                         text,
  formacao                    text,
  bio                         text,
  foto_url                    text,
  carga_horaria_semanal_min   int         NOT NULL DEFAULT 0,
  habilidades_ids             uuid[]      NOT NULL DEFAULT '{}',
  ativo                       boolean     NOT NULL DEFAULT true,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  atualizado_em               timestamptz NOT NULL DEFAULT now(),
  criado_por_user_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices úteis para a UI
CREATE INDEX IF NOT EXISTS idx_professores_ativo      ON public.professores(ativo);
CREATE INDEX IF NOT EXISTS idx_professores_user_id    ON public.professores(user_id);
CREATE INDEX IF NOT EXISTS idx_professores_nome_lower ON public.professores(lower(nome));

-- Trigger de updated_at (reaproveitando a função `update_updated_at_column`
-- já criada na migração inicial). A coluna usada é `atualizado_em`, então
-- precisamos de um trigger inline customizado (a função genérica usa updated_at).
CREATE OR REPLACE FUNCTION public.touch_professores_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_professores_touch ON public.professores;
CREATE TRIGGER trg_professores_touch
  BEFORE UPDATE ON public.professores
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_professores_atualizado_em();

-- =====================================================================
-- RLS: professores
--   • SELECT: qualquer staff (admin/coord/professor) — listagem geral
--   • INSERT/UPDATE/DELETE: só admin e coordenação
-- =====================================================================
ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "professores_select_staff" ON public.professores;
CREATE POLICY "professores_select_staff"
  ON public.professores
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'coordenacao'::public.app_role)
    OR public.has_role(auth.uid(), 'professor'::public.app_role)
  );

DROP POLICY IF EXISTS "professores_insert_admin_coord" ON public.professores;
CREATE POLICY "professores_insert_admin_coord"
  ON public.professores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'coordenacao'::public.app_role)
  );

DROP POLICY IF EXISTS "professores_update_admin_coord" ON public.professores;
CREATE POLICY "professores_update_admin_coord"
  ON public.professores
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'coordenacao'::public.app_role)
  );

DROP POLICY IF EXISTS "professores_delete_admin_coord" ON public.professores;
CREATE POLICY "professores_delete_admin_coord"
  ON public.professores
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'coordenacao'::public.app_role)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.professores TO authenticated;
GRANT SELECT                          ON public.professores TO anon;

-- =====================================================================
-- Tabela: professor_avaliacoes
--   1 linha = 1 avaliação feita por alguém (aluno/coord/admin/autoaval).
--   `notas` é JSONB livre para evoluir critérios sem migração de schema.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.professor_avaliacoes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id        uuid        NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
  avaliador_user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avaliador_tipo      text        NOT NULL
                        CHECK (avaliador_tipo IN ('aluno','coordenacao','admin','autoavaliacao')),
  agendamento_id      uuid        REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  notas               jsonb       NOT NULL DEFAULT '{}'::jsonb,
  comentario          text,
  criado_em           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prof_aval_professor      ON public.professor_avaliacoes(professor_id);
CREATE INDEX IF NOT EXISTS idx_prof_aval_avaliador      ON public.professor_avaliacoes(avaliador_user_id);
CREATE INDEX IF NOT EXISTS idx_prof_aval_agendamento    ON public.professor_avaliacoes(agendamento_id);

-- Evita o mesmo avaliador avaliar o mesmo professor pela mesma aula 2 vezes
-- (mantém possibilidade de avaliar SEM agendamento ou EM agendamentos diferentes)
CREATE UNIQUE INDEX IF NOT EXISTS uq_prof_aval_dedup
  ON public.professor_avaliacoes(professor_id, avaliador_user_id, agendamento_id)
  WHERE agendamento_id IS NOT NULL;

ALTER TABLE public.professor_avaliacoes ENABLE ROW LEVEL SECURITY;

-- SELECT:
--   • Staff (admin/coord) vê tudo.
--   • Professor vê avaliações dele mesmo (via professores.user_id = auth.uid()).
--   • Aluno vê apenas as avaliações que ele próprio fez (avaliador_user_id).
DROP POLICY IF EXISTS "prof_aval_select" ON public.professor_avaliacoes;
CREATE POLICY "prof_aval_select"
  ON public.professor_avaliacoes
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'coordenacao'::public.app_role)
    OR avaliador_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.professores p
      WHERE p.id = professor_avaliacoes.professor_id
        AND p.user_id = auth.uid()
    )
  );

-- INSERT: qualquer authenticated, contanto que avaliador_user_id = auth.uid().
-- Tipos restritos: aluno só pode usar 'aluno'; staff pode usar os outros.
DROP POLICY IF EXISTS "prof_aval_insert" ON public.professor_avaliacoes;
CREATE POLICY "prof_aval_insert"
  ON public.professor_avaliacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    avaliador_user_id = auth.uid()
    AND (
      (avaliador_tipo = 'aluno' AND public.has_role(auth.uid(), 'aluno'::public.app_role))
      OR (avaliador_tipo = 'coordenacao' AND public.has_role(auth.uid(), 'coordenacao'::public.app_role))
      OR (avaliador_tipo = 'admin' AND public.has_role(auth.uid(), 'admin'::public.app_role))
      OR (avaliador_tipo = 'autoavaliacao' AND public.has_role(auth.uid(), 'professor'::public.app_role))
    )
  );

-- UPDATE/DELETE: só o autor da avaliação ou admin/coord.
DROP POLICY IF EXISTS "prof_aval_update" ON public.professor_avaliacoes;
CREATE POLICY "prof_aval_update"
  ON public.professor_avaliacoes
  FOR UPDATE
  TO authenticated
  USING (
    avaliador_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'coordenacao'::public.app_role)
  );

DROP POLICY IF EXISTS "prof_aval_delete" ON public.professor_avaliacoes;
CREATE POLICY "prof_aval_delete"
  ON public.professor_avaliacoes
  FOR DELETE
  TO authenticated
  USING (
    avaliador_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'coordenacao'::public.app_role)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.professor_avaliacoes TO authenticated;

-- Tags de comportamento — gerenciáveis pela escola.
-- Substitui a constante COMPORTAMENTO_TAGS hardcoded em formularios-types.ts.
-- Permite à escola criar, renomear, desativar e acrescentar tags sem deploy.
--
-- Coluna `value` é o slug persistido em avaliacoes.dados -> comportamento[].
-- Coluna `label` é o texto exibido na UI (pode mudar sem quebrar dados históricos).
-- Coluna `tom`   é 'pos' (verde) ou 'neg' (âmbar) — define a cor do botão.
-- Coluna `ativo` permite ocultar uma tag sem deletá-la (preserva histórico).

CREATE TABLE IF NOT EXISTS public.comportamento_tags (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  value     text        NOT NULL,
  label     text        NOT NULL,
  emoji     text        NOT NULL DEFAULT '',
  tom       text        NOT NULL DEFAULT 'pos'
              CHECK (tom IN ('pos', 'neg')),
  ordem     smallint    NOT NULL DEFAULT 0,
  ativo     boolean     NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comportamento_tags_value_key UNIQUE (value)
);

ALTER TABLE public.comportamento_tags ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler (checklist precisa listar as tags).
CREATE POLICY "comportamento_tags_select"
  ON public.comportamento_tags
  FOR SELECT
  TO authenticated
  USING (true);

-- Apenas staff gerencia (criar / editar / deletar).
CREATE POLICY "comportamento_tags_insert_staff"
  ON public.comportamento_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "comportamento_tags_update_staff"
  ON public.comportamento_tags
  FOR UPDATE
  TO authenticated
  USING  (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "comportamento_tags_delete_staff"
  ON public.comportamento_tags
  FOR DELETE
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- GRANTs explícitos (alinhado com a migration de grants gerais).
GRANT SELECT ON public.comportamento_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comportamento_tags TO authenticated;

-- -----------------------------------------------------------------------
-- Seed — as 10 tags originais.
-- ON CONFLICT (value) DO NOTHING → idempotente em re-run.
-- -----------------------------------------------------------------------
INSERT INTO public.comportamento_tags (value, label, emoji, tom, ordem)
VALUES
  ('participativo', 'Participativo', '🙋', 'pos',  1),
  ('colaborativo',  'Colaborativo',  '🤝', 'pos',  2),
  ('concentrado',   'Concentrado',   '🎯', 'pos',  3),
  ('criativo',      'Criativo',      '💡', 'pos',  4),
  ('lider',         'Liderança',     '⭐', 'pos',  5),
  ('disperso',      'Disperso',      '🌀', 'neg',  6),
  ('agitado',       'Agitado',       '⚡', 'neg',  7),
  ('tímido',        'Tímido',        '🙊', 'neg',  8),
  ('ausente',       'Apático',       '😶', 'neg',  9),
  ('frustrado',     'Frustrado',     '😤', 'neg', 10)
ON CONFLICT (value) DO NOTHING;

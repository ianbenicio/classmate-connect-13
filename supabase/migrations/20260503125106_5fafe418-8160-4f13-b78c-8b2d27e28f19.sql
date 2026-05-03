-- 1) agendamentos.meta
ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2) notificacoes RLS relax
DROP POLICY IF EXISTS "Read own notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Update own notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Staff insert notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Admin delete notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Authenticated read notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "Authenticated insert notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "Authenticated update notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "Authenticated delete notificacoes" ON public.notificacoes;
CREATE POLICY "Authenticated read notificacoes" ON public.notificacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert notificacoes" ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update notificacoes" ON public.notificacoes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete notificacoes" ON public.notificacoes FOR DELETE TO authenticated USING (true);

-- 3) relatorios_exportados
CREATE TABLE IF NOT EXISTS public.relatorios_exportados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tipo TEXT NOT NULL, titulo TEXT NOT NULL,
  gerado_em TIMESTAMPTZ NOT NULL DEFAULT now(), gerado_por_user_id UUID, gerado_por_nome TEXT,
  formato TEXT NOT NULL DEFAULT 'json', size_bytes INTEGER NOT NULL DEFAULT 0,
  filename TEXT NOT NULL, conteudo TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.relatorios_exportados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read relatorios_exportados" ON public.relatorios_exportados;
DROP POLICY IF EXISTS "Authenticated insert relatorios_exportados" ON public.relatorios_exportados;
DROP POLICY IF EXISTS "Authenticated delete relatorios_exportados" ON public.relatorios_exportados;
CREATE POLICY "Authenticated read relatorios_exportados" ON public.relatorios_exportados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert relatorios_exportados" ON public.relatorios_exportados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated delete relatorios_exportados" ON public.relatorios_exportados FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_relatorios_exportados_gerado_em ON public.relatorios_exportados(gerado_em DESC);

-- 4) notificacoes dedup
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notificacoes_agendamento ON public.notificacoes(agendamento_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notificacoes_dedup_scanner
  ON public.notificacoes(destinatario_ref, agendamento_id, kind)
  WHERE agendamento_id IS NOT NULL AND kind IS NOT NULL;

-- 5) habilidades tipo check (drop antes de update)
ALTER TABLE public.habilidades DROP CONSTRAINT IF EXISTS habilidades_tipo_check;
UPDATE public.habilidades SET tipo = 'curso' WHERE tipo = 'geral';
UPDATE public.habilidades SET tipo = 'atividade' WHERE tipo = 'especifica';
ALTER TABLE public.habilidades ADD CONSTRAINT habilidades_tipo_check CHECK (tipo IN ('curso','atividade'));

-- 6) presencas unique
DELETE FROM public.presencas p USING public.presencas q
WHERE p.id < q.id AND p.agendamento_id IS NOT NULL
  AND p.agendamento_id = q.agendamento_id AND p.aluno_id = q.aluno_id AND p.atividade_id = q.atividade_id;
CREATE UNIQUE INDEX IF NOT EXISTS presencas_agendamento_aluno_atividade_uidx
  ON public.presencas (agendamento_id, aluno_id, atividade_id) WHERE agendamento_id IS NOT NULL;

-- 7) avaliacoes RLS owner_or_admin
DROP POLICY IF EXISTS "Staff manage avaliacoes" ON public.avaliacoes;
DROP POLICY IF EXISTS "avaliacoes_insert_staff" ON public.avaliacoes;
DROP POLICY IF EXISTS "avaliacoes_update_owner_or_admin" ON public.avaliacoes;
DROP POLICY IF EXISTS "avaliacoes_delete_owner_or_admin" ON public.avaliacoes;
CREATE POLICY "avaliacoes_insert_staff" ON public.avaliacoes FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "avaliacoes_update_owner_or_admin" ON public.avaliacoes FOR UPDATE TO authenticated
  USING (criado_por_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (criado_por_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "avaliacoes_delete_owner_or_admin" ON public.avaliacoes FOR DELETE TO authenticated
  USING (criado_por_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role));

-- 8) comportamento_tags
CREATE TABLE IF NOT EXISTS public.comportamento_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), value text NOT NULL, label text NOT NULL,
  emoji text NOT NULL DEFAULT '', tom text NOT NULL DEFAULT 'pos' CHECK (tom IN ('pos','neg')),
  ordem smallint NOT NULL DEFAULT 0, ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comportamento_tags_value_key UNIQUE (value)
);
ALTER TABLE public.comportamento_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comportamento_tags_select" ON public.comportamento_tags;
DROP POLICY IF EXISTS "comportamento_tags_insert_staff" ON public.comportamento_tags;
DROP POLICY IF EXISTS "comportamento_tags_update_staff" ON public.comportamento_tags;
DROP POLICY IF EXISTS "comportamento_tags_delete_staff" ON public.comportamento_tags;
CREATE POLICY "comportamento_tags_select" ON public.comportamento_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "comportamento_tags_insert_staff" ON public.comportamento_tags FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "comportamento_tags_update_staff" ON public.comportamento_tags FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "comportamento_tags_delete_staff" ON public.comportamento_tags FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
GRANT SELECT ON public.comportamento_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comportamento_tags TO authenticated;
INSERT INTO public.comportamento_tags (value,label,emoji,tom,ordem) VALUES
  ('participativo','Participativo','🙋','pos',1),('colaborativo','Colaborativo','🤝','pos',2),
  ('concentrado','Concentrado','🎯','pos',3),('criativo','Criativo','💡','pos',4),
  ('lider','Liderança','⭐','pos',5),('disperso','Disperso','🌀','neg',6),
  ('agitado','Agitado','⚡','neg',7),('tímido','Tímido','🙊','neg',8),
  ('ausente','Apático','😶','neg',9),('frustrado','Frustrado','😤','neg',10)
ON CONFLICT (value) DO NOTHING;

-- 9) professores
CREATE TABLE IF NOT EXISTS public.professores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nome text NOT NULL, email text, telefone text, cpf text, formacao text, bio text, foto_url text,
  carga_horaria_semanal_min int NOT NULL DEFAULT 0,
  habilidades_ids uuid[] NOT NULL DEFAULT '{}', ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(), atualizado_em timestamptz NOT NULL DEFAULT now(),
  criado_por_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_professores_ativo ON public.professores(ativo);
CREATE INDEX IF NOT EXISTS idx_professores_user_id ON public.professores(user_id);
CREATE INDEX IF NOT EXISTS idx_professores_nome_lower ON public.professores(lower(nome));
CREATE OR REPLACE FUNCTION public.touch_professores_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $f$ BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $f$;
DROP TRIGGER IF EXISTS trg_professores_touch ON public.professores;
CREATE TRIGGER trg_professores_touch BEFORE UPDATE ON public.professores
  FOR EACH ROW EXECUTE FUNCTION public.touch_professores_atualizado_em();
ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "professores_select_staff" ON public.professores;
DROP POLICY IF EXISTS "professores_insert_admin_coord" ON public.professores;
DROP POLICY IF EXISTS "professores_update_admin_coord" ON public.professores;
DROP POLICY IF EXISTS "professores_delete_admin_coord" ON public.professores;
CREATE POLICY "professores_select_staff" ON public.professores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'coordenacao'::public.app_role) OR public.has_role(auth.uid(),'professor'::public.app_role));
CREATE POLICY "professores_insert_admin_coord" ON public.professores FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'coordenacao'::public.app_role));
CREATE POLICY "professores_update_admin_coord" ON public.professores FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'coordenacao'::public.app_role));
CREATE POLICY "professores_delete_admin_coord" ON public.professores FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'coordenacao'::public.app_role));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professores TO authenticated;
GRANT SELECT ON public.professores TO anon;

-- 10) professor_avaliacoes
CREATE TABLE IF NOT EXISTS public.professor_avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
  avaliador_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avaliador_tipo text NOT NULL CHECK (avaliador_tipo IN ('aluno','coordenacao','admin','autoavaliacao')),
  agendamento_id uuid REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  notas jsonb NOT NULL DEFAULT '{}'::jsonb, comentario text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prof_aval_professor ON public.professor_avaliacoes(professor_id);
CREATE INDEX IF NOT EXISTS idx_prof_aval_avaliador ON public.professor_avaliacoes(avaliador_user_id);
CREATE INDEX IF NOT EXISTS idx_prof_aval_agendamento ON public.professor_avaliacoes(agendamento_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_prof_aval_dedup ON public.professor_avaliacoes(professor_id, avaliador_user_id, agendamento_id) WHERE agendamento_id IS NOT NULL;
ALTER TABLE public.professor_avaliacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prof_aval_select" ON public.professor_avaliacoes;
DROP POLICY IF EXISTS "prof_aval_insert" ON public.professor_avaliacoes;
DROP POLICY IF EXISTS "prof_aval_update" ON public.professor_avaliacoes;
DROP POLICY IF EXISTS "prof_aval_delete" ON public.professor_avaliacoes;
CREATE POLICY "prof_aval_select" ON public.professor_avaliacoes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'coordenacao'::public.app_role)
    OR avaliador_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.professores p WHERE p.id = professor_avaliacoes.professor_id AND p.user_id = auth.uid()));
CREATE POLICY "prof_aval_insert" ON public.professor_avaliacoes FOR INSERT TO authenticated
  WITH CHECK (avaliador_user_id = auth.uid() AND (
    (avaliador_tipo='aluno' AND public.has_role(auth.uid(),'aluno'::public.app_role))
    OR (avaliador_tipo='coordenacao' AND public.has_role(auth.uid(),'coordenacao'::public.app_role))
    OR (avaliador_tipo='admin' AND public.has_role(auth.uid(),'admin'::public.app_role))
    OR (avaliador_tipo='autoavaliacao' AND public.has_role(auth.uid(),'professor'::public.app_role))));
CREATE POLICY "prof_aval_update" ON public.professor_avaliacoes FOR UPDATE TO authenticated
  USING (avaliador_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'coordenacao'::public.app_role));
CREATE POLICY "prof_aval_delete" ON public.professor_avaliacoes FOR DELETE TO authenticated
  USING (avaliador_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'coordenacao'::public.app_role));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professor_avaliacoes TO authenticated;

-- 11) atividades.professor_id + backfill
ALTER TABLE public.atividades ADD COLUMN IF NOT EXISTS professor_id uuid REFERENCES public.professores(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_atividades_professor_id ON public.atividades(professor_id);
UPDATE public.atividades SET professor_id = (
  SELECT id FROM public.professores WHERE LOWER(TRIM(nome)) = LOWER(TRIM(public.atividades.professor)) LIMIT 1
) WHERE professor IS NOT NULL AND professor_id IS NULL;

-- 12) comportamento_tags.descricao
ALTER TABLE public.comportamento_tags ADD COLUMN IF NOT EXISTS descricao text;

-- 13) professor_avaliacoes.tags
ALTER TABLE public.professor_avaliacoes ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_prof_aval_tags ON public.professor_avaliacoes USING GIN (tags);

-- 14) agendamentos.professor_id
ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS professor_id uuid REFERENCES public.professores(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_agendamentos_professor_id ON public.agendamentos(professor_id);
UPDATE public.agendamentos AS ag SET professor_id = p.id FROM public.professores AS p
WHERE ag.professor_id IS NULL AND ag.professor IS NOT NULL AND LOWER(TRIM(ag.professor)) = LOWER(TRIM(p.nome));

-- 15) trigger validate tags
CREATE OR REPLACE FUNCTION public.validate_professor_avaliacao_tags()
RETURNS trigger LANGUAGE plpgsql AS $f$
DECLARE v_invalid text[];
BEGIN
  IF NEW.tags IS NULL OR cardinality(NEW.tags) = 0 THEN RETURN NEW; END IF;
  SELECT array_agg(t) INTO v_invalid FROM unnest(NEW.tags) AS t
    WHERE NOT EXISTS (SELECT 1 FROM public.comportamento_tags ct WHERE ct.value = t);
  IF v_invalid IS NOT NULL AND cardinality(v_invalid) > 0 THEN
    RAISE EXCEPTION 'professor_avaliacoes.tags contém slug(s) inválido(s): %.', v_invalid USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $f$;
DROP TRIGGER IF EXISTS trg_validate_prof_aval_tags ON public.professor_avaliacoes;
CREATE TRIGGER trg_validate_prof_aval_tags BEFORE INSERT OR UPDATE OF tags ON public.professor_avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.validate_professor_avaliacao_tags();
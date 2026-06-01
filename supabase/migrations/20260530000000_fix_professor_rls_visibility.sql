-- Fix: professores (role='professor') não conseguiam ver cursos, turmas,
-- alunos e atividades porque as broad "Authenticated read" policies foram
-- dropadas em 20260512011429 e nenhuma policy professor-scoped foi criada.
--
-- Solução:
-- 1. Criar policies SELECT para professor em cursos, turmas, alunos, atividades, agendamentos.
-- 2. Backfill: inserir role 'professor' para users referenciados em agendamentos
--    (professor_user_id) que não possuem a role ainda.

-- ─── 1. Policies SELECT para professor ───────────────────────────────────

-- Cursos: professor pode ver todos os cursos (precisa pra montar QuadroAulas, etc.)
DROP POLICY IF EXISTS "professor_select_cursos" ON public.cursos;
CREATE POLICY "professor_select_cursos"
  ON public.cursos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

-- Turmas: professor pode ver todas as turmas (precisa pra ver agendamentos)
DROP POLICY IF EXISTS "professor_select_turmas" ON public.turmas;
CREATE POLICY "professor_select_turmas"
  ON public.turmas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

-- Alunos: professor pode ver todos os alunos.
-- (Versão anterior usava subquery em agendamentos → infinite recursion com RLS de alunos.)
DROP POLICY IF EXISTS "professor_select_alunos" ON public.alunos;
CREATE POLICY "professor_select_alunos"
  ON public.alunos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

-- Atividades: professor pode ver todas as atividades (necessário pra agendar)
DROP POLICY IF EXISTS "professor_select_atividades" ON public.atividades;
CREATE POLICY "professor_select_atividades"
  ON public.atividades
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

-- Agendamentos: professor pode ver seus próprios agendamentos
DROP POLICY IF EXISTS "professor_select_agendamentos" ON public.agendamentos;
CREATE POLICY "professor_select_agendamentos"
  ON public.agendamentos
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'professor')
    AND professor_user_id = auth.uid()
  );

-- Grupos: professor precisa ver grupos pra navegar cursos
DROP POLICY IF EXISTS "professor_select_grupos" ON public.grupos;
CREATE POLICY "professor_select_grupos"
  ON public.grupos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

-- Habilidades: professor precisa ver habilidades dos alunos
DROP POLICY IF EXISTS "professor_select_habilidades" ON public.habilidades;
CREATE POLICY "professor_select_habilidades"
  ON public.habilidades
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

-- Presencas: professor pode ver presenças das turmas onde atua
DROP POLICY IF EXISTS "professor_select_presencas" ON public.presencas;
CREATE POLICY "professor_select_presencas"
  ON public.presencas
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'professor')
    AND agendamento_id IN (
      SELECT id FROM public.agendamentos
      WHERE professor_user_id = auth.uid()
    )
  );

-- Presencas: professor pode inserir/atualizar presenças nos seus agendamentos
DROP POLICY IF EXISTS "professor_upsert_presencas" ON public.presencas;
CREATE POLICY "professor_upsert_presencas"
  ON public.presencas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'professor')
    AND agendamento_id IN (
      SELECT id FROM public.agendamentos
      WHERE professor_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "professor_update_presencas" ON public.presencas;
CREATE POLICY "professor_update_presencas"
  ON public.presencas
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'professor')
    AND agendamento_id IN (
      SELECT id FROM public.agendamentos
      WHERE professor_user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'professor')
    AND agendamento_id IN (
      SELECT id FROM public.agendamentos
      WHERE professor_user_id = auth.uid()
    )
  );

-- Notificações: professor pode ver suas próprias notificações
DROP POLICY IF EXISTS "professor_select_notificacoes" ON public.notificacoes;
CREATE POLICY "professor_select_notificacoes"
  ON public.notificacoes
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'professor')
    AND destinatario_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "professor_update_notificacoes" ON public.notificacoes;
CREATE POLICY "professor_update_notificacoes"
  ON public.notificacoes
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'professor')
    AND destinatario_user_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'professor')
    AND destinatario_user_id = auth.uid()
  );

-- Avaliacoes: professor pode ver/criar/atualizar avaliações nos seus agendamentos
DROP POLICY IF EXISTS "professor_select_avaliacoes" ON public.avaliacoes;
CREATE POLICY "professor_select_avaliacoes"
  ON public.avaliacoes
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'professor')
    AND agendamento_id IN (
      SELECT id FROM public.agendamentos
      WHERE professor_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "professor_insert_avaliacoes" ON public.avaliacoes;
CREATE POLICY "professor_insert_avaliacoes"
  ON public.avaliacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'professor')
    AND agendamento_id IN (
      SELECT id FROM public.agendamentos
      WHERE professor_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "professor_update_avaliacoes" ON public.avaliacoes;
CREATE POLICY "professor_update_avaliacoes"
  ON public.avaliacoes
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'professor')
    AND agendamento_id IN (
      SELECT id FROM public.agendamentos
      WHERE professor_user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'professor')
    AND agendamento_id IN (
      SELECT id FROM public.agendamentos
      WHERE professor_user_id = auth.uid()
    )
  );

-- ─── 2. Backfill: garantir role 'professor' ──────────────────────────────

-- Users referenciados como professor em agendamentos sem a role
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT a.professor_user_id, 'professor'::public.app_role
FROM public.agendamentos a
WHERE a.professor_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = a.professor_user_id
      AND ur.role = 'professor'
  )
  AND EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = a.professor_user_id
  )
ON CONFLICT DO NOTHING;

-- Users referenciados em atividades como professor sem a role
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT a.professor_user_id, 'professor'::public.app_role
FROM public.atividades a
WHERE a.professor_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = a.professor_user_id
      AND ur.role = 'professor'
  )
  AND EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = a.professor_user_id
  )
ON CONFLICT DO NOTHING;

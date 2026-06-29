-- =====================================================================
-- RLS perf: eliminar auth_rls_initplan (re-eval de auth.uid() por linha)
-- =====================================================================
-- Causa de lentidão/timeout no boot: várias policies criadas em migrations
-- recentes (professor_* e Staff aula_evidencias) usam `auth.uid()` CRU no
-- predicado. Postgres re-avalia a função PARA CADA LINHA durante o scan RLS,
-- multiplicando o custo em tabelas com volume (ex.: alunos=132, atividades=196)
-- e saturando o compute do free-tier sob fan-out concorrente do frontend.
--
-- Fix (advisor `auth_rls_initplan`): envolver em subquery `(select auth.uid())`
-- para o planner avaliar UMA vez (InitPlan) em vez de por linha. Semântica
-- IDÊNTICA — apenas performance. Demais policies do schema já estavam wrapped.
--
-- Também cobre os 2 FKs sem índice em aula_evidencias (advisor
-- `unindexed_foreign_keys`).
-- =====================================================================

-- ---- agendamentos ---------------------------------------------------
ALTER POLICY professor_insert_own_agendamentos ON public.agendamentos
  WITH CHECK (
    public.has_role((select auth.uid()), 'professor'::app_role)
    AND professor_user_id = (select auth.uid())
  );

ALTER POLICY professor_select_agendamentos ON public.agendamentos
  USING (public.has_role((select auth.uid()), 'professor'::app_role));

-- ---- alunos ---------------------------------------------------------
ALTER POLICY professor_select_alunos ON public.alunos
  USING (public.has_role((select auth.uid()), 'professor'::app_role));

-- ---- atividades -----------------------------------------------------
ALTER POLICY professor_select_atividades ON public.atividades
  USING (public.has_role((select auth.uid()), 'professor'::app_role));

-- ---- avaliacoes -----------------------------------------------------
ALTER POLICY professor_insert_avaliacoes ON public.avaliacoes
  WITH CHECK (
    public.has_role((select auth.uid()), 'professor'::app_role)
    AND agendamento_id IN (
      SELECT agendamentos.id FROM public.agendamentos
      WHERE agendamentos.professor_user_id = (select auth.uid())
    )
  );

ALTER POLICY professor_select_avaliacoes ON public.avaliacoes
  USING (
    public.has_role((select auth.uid()), 'professor'::app_role)
    AND agendamento_id IN (
      SELECT agendamentos.id FROM public.agendamentos
      WHERE agendamentos.professor_user_id = (select auth.uid())
    )
  );

ALTER POLICY professor_update_avaliacoes ON public.avaliacoes
  USING (
    public.has_role((select auth.uid()), 'professor'::app_role)
    AND agendamento_id IN (
      SELECT agendamentos.id FROM public.agendamentos
      WHERE agendamentos.professor_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    public.has_role((select auth.uid()), 'professor'::app_role)
    AND agendamento_id IN (
      SELECT agendamentos.id FROM public.agendamentos
      WHERE agendamentos.professor_user_id = (select auth.uid())
    )
  );

-- ---- cursos ---------------------------------------------------------
ALTER POLICY professor_select_cursos ON public.cursos
  USING (public.has_role((select auth.uid()), 'professor'::app_role));

-- ---- grupos ---------------------------------------------------------
ALTER POLICY professor_select_grupos ON public.grupos
  USING (public.has_role((select auth.uid()), 'professor'::app_role));

-- ---- habilidades ----------------------------------------------------
ALTER POLICY professor_select_habilidades ON public.habilidades
  USING (public.has_role((select auth.uid()), 'professor'::app_role));

-- ---- notificacoes ---------------------------------------------------
ALTER POLICY professor_select_notificacoes ON public.notificacoes
  USING (
    public.has_role((select auth.uid()), 'professor'::app_role)
    AND destinatario_user_id = (select auth.uid())
  );

ALTER POLICY professor_update_notificacoes ON public.notificacoes
  USING (
    public.has_role((select auth.uid()), 'professor'::app_role)
    AND destinatario_user_id = (select auth.uid())
  )
  WITH CHECK (
    public.has_role((select auth.uid()), 'professor'::app_role)
    AND destinatario_user_id = (select auth.uid())
  );

-- ---- presencas ------------------------------------------------------
ALTER POLICY professor_upsert_presencas ON public.presencas
  WITH CHECK (
    public.has_role((select auth.uid()), 'professor'::app_role)
    AND agendamento_id IN (
      SELECT agendamentos.id FROM public.agendamentos
      WHERE agendamentos.professor_user_id = (select auth.uid())
    )
  );

ALTER POLICY professor_select_presencas ON public.presencas
  USING (
    public.has_role((select auth.uid()), 'professor'::app_role)
    AND agendamento_id IN (
      SELECT agendamentos.id FROM public.agendamentos
      WHERE agendamentos.professor_user_id = (select auth.uid())
    )
  );

ALTER POLICY professor_update_presencas ON public.presencas
  USING (
    public.has_role((select auth.uid()), 'professor'::app_role)
    AND agendamento_id IN (
      SELECT agendamentos.id FROM public.agendamentos
      WHERE agendamentos.professor_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    public.has_role((select auth.uid()), 'professor'::app_role)
    AND agendamento_id IN (
      SELECT agendamentos.id FROM public.agendamentos
      WHERE agendamentos.professor_user_id = (select auth.uid())
    )
  );

-- ---- turmas ---------------------------------------------------------
ALTER POLICY professor_select_turmas ON public.turmas
  USING (public.has_role((select auth.uid()), 'professor'::app_role));

-- ---- aula_evidencias (is_staff(auth.uid()) cru) ---------------------
ALTER POLICY "Staff delete aula evidencias" ON public.aula_evidencias
  USING (public.is_staff((select auth.uid())));

ALTER POLICY "Staff insert aula evidencias" ON public.aula_evidencias
  WITH CHECK (public.is_staff((select auth.uid())));

ALTER POLICY "Staff read aula evidencias" ON public.aula_evidencias
  USING (public.is_staff((select auth.uid())));

ALTER POLICY "Staff update aula evidencias" ON public.aula_evidencias
  USING (public.is_staff((select auth.uid())))
  WITH CHECK (public.is_staff((select auth.uid())));

-- ---- FKs sem índice de cobertura (advisor unindexed_foreign_keys) ----
CREATE INDEX IF NOT EXISTS idx_aula_evidencias_submetido_por
  ON public.aula_evidencias (submetido_por_user_id);

CREATE INDEX IF NOT EXISTS idx_aula_evidencias_aprovado_por
  ON public.aula_evidencias (aprovado_por_user_id);

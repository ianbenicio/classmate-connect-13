-- =====================================================================
-- RLS perf: consolidar policies permissivas duplicadas (multiple_permissive)
-- =====================================================================
-- 11 tabelas tinham 2-3 policies PERMISSIVE por (role=authenticated, cmd).
-- Postgres OR-combina permissivas, mas avalia CADA uma por linha. Reduzimos
-- para uma policy por (cmd) mesclando o predicado `professor_*` na policy-base
-- via OR. Semântica IDÊNTICA (já era OR implícito).
--
-- As policies RESTRICTIVE (`Project scope select/write`, `sa_secret_restrict`)
-- são tenant/secret isolation (AND) e NÃO são tocadas.
--
-- Casos:
--  - grupos/habilidades: base SELECT = `true` → professor já coberto, só DROP.
--  - notificacoes: predicado professor ⊆ base (destinatario = uid) → só DROP.
--  - system_settings SELECT: fundir "Admin read SA secret" em "Staff read
--    settings"; o gate do segredo continua na restrictive `sa_secret_restrict`.
--
-- Advisor alvo: multiple_permissive_policies (17 → 0).
-- =====================================================================

-- ---- agendamentos ---------------------------------------------------
ALTER POLICY agendamentos_insert_staff ON public.agendamentos
  WITH CHECK (
    public.is_staff((select auth.uid()))
    OR (public.has_role((select auth.uid()), 'professor'::app_role)
        AND professor_user_id = (select auth.uid()))
  );
DROP POLICY IF EXISTS professor_insert_own_agendamentos ON public.agendamentos;

ALTER POLICY agendamentos_select ON public.agendamentos
  USING (
    public.is_staff((select auth.uid()))
    OR (turma_id IN (SELECT alunos.turma_id FROM public.alunos
        WHERE alunos.user_id = (select auth.uid())))
    OR public.has_role((select auth.uid()), 'professor'::app_role)
  );
DROP POLICY IF EXISTS professor_select_agendamentos ON public.agendamentos;

-- ---- alunos ---------------------------------------------------------
ALTER POLICY alunos_select ON public.alunos
  USING (
    public.is_staff((select auth.uid()))
    OR (user_id = (select auth.uid()))
    OR public.is_viewer_of(id, (select auth.uid()))
    OR public.has_role((select auth.uid()), 'professor'::app_role)
  );
DROP POLICY IF EXISTS professor_select_alunos ON public.alunos;

-- ---- atividades -----------------------------------------------------
ALTER POLICY atividades_select ON public.atividades
  USING (
    public.is_staff((select auth.uid()))
    OR (id IN (SELECT (jsonb_array_elements_text(agendamentos.atividade_ids))::uuid
        FROM public.agendamentos
        WHERE agendamentos.turma_id IN (SELECT alunos.turma_id FROM public.alunos
            WHERE alunos.user_id = (select auth.uid()))))
    OR public.has_role((select auth.uid()), 'professor'::app_role)
  );
DROP POLICY IF EXISTS professor_select_atividades ON public.atividades;

-- ---- avaliacoes -----------------------------------------------------
ALTER POLICY avaliacoes_insert ON public.avaliacoes
  WITH CHECK (
    public.is_staff((select auth.uid()))
    OR ((tipo = 'relatorio_aluno'::text)
        AND (aluno_id IN (SELECT alunos.id FROM public.alunos
            WHERE alunos.user_id = (select auth.uid()))))
    OR (public.has_role((select auth.uid()), 'professor'::app_role)
        AND (agendamento_id IN (SELECT agendamentos.id FROM public.agendamentos
            WHERE agendamentos.professor_user_id = (select auth.uid()))))
  );
DROP POLICY IF EXISTS professor_insert_avaliacoes ON public.avaliacoes;

ALTER POLICY avaliacoes_select ON public.avaliacoes
  USING (
    public.is_staff((select auth.uid()))
    OR (EXISTS (SELECT 1 FROM public.alunos a
        WHERE a.id = avaliacoes.aluno_id AND a.user_id = (select auth.uid())))
    OR ((aluno_id IS NOT NULL) AND public.is_viewer_of(aluno_id, (select auth.uid())))
    OR (public.has_role((select auth.uid()), 'professor'::app_role)
        AND (agendamento_id IN (SELECT agendamentos.id FROM public.agendamentos
            WHERE agendamentos.professor_user_id = (select auth.uid()))))
  );
DROP POLICY IF EXISTS professor_select_avaliacoes ON public.avaliacoes;

ALTER POLICY avaliacoes_update_owner_or_admin ON public.avaliacoes
  USING (
    (criado_por_user_id = (select auth.uid()))
    OR public.has_role((select auth.uid()), 'admin'::app_role)
    OR (public.has_role((select auth.uid()), 'professor'::app_role)
        AND (agendamento_id IN (SELECT agendamentos.id FROM public.agendamentos
            WHERE agendamentos.professor_user_id = (select auth.uid()))))
  )
  WITH CHECK (
    (criado_por_user_id = (select auth.uid()))
    OR public.has_role((select auth.uid()), 'admin'::app_role)
    OR (public.has_role((select auth.uid()), 'professor'::app_role)
        AND (agendamento_id IN (SELECT agendamentos.id FROM public.agendamentos
            WHERE agendamentos.professor_user_id = (select auth.uid()))))
  );
DROP POLICY IF EXISTS professor_update_avaliacoes ON public.avaliacoes;

-- ---- cursos ---------------------------------------------------------
ALTER POLICY cursos_select ON public.cursos
  USING (
    public.is_staff((select auth.uid()))
    OR (id IN (SELECT alunos.curso_id FROM public.alunos
        WHERE alunos.user_id = (select auth.uid())))
    OR public.has_role((select auth.uid()), 'professor'::app_role)
  );
DROP POLICY IF EXISTS professor_select_cursos ON public.cursos;

-- ---- grupos / habilidades (base SELECT = true; professor já coberto) -
DROP POLICY IF EXISTS professor_select_grupos ON public.grupos;
DROP POLICY IF EXISTS professor_select_habilidades ON public.habilidades;

-- ---- notificacoes (professor ⊆ base; só remover) --------------------
DROP POLICY IF EXISTS professor_select_notificacoes ON public.notificacoes;
DROP POLICY IF EXISTS professor_update_notificacoes ON public.notificacoes;

-- ---- presencas ------------------------------------------------------
ALTER POLICY presencas_insert_staff ON public.presencas
  WITH CHECK (
    public.is_staff((select auth.uid()))
    OR (public.has_role((select auth.uid()), 'professor'::app_role)
        AND (agendamento_id IN (SELECT agendamentos.id FROM public.agendamentos
            WHERE agendamentos.professor_user_id = (select auth.uid()))))
  );
DROP POLICY IF EXISTS professor_upsert_presencas ON public.presencas;

ALTER POLICY presencas_select ON public.presencas
  USING (
    public.is_staff((select auth.uid()))
    OR (EXISTS (SELECT 1 FROM public.alunos a
        WHERE a.id = presencas.aluno_id AND a.user_id = (select auth.uid())))
    OR public.is_viewer_of(aluno_id, (select auth.uid()))
    OR (public.has_role((select auth.uid()), 'professor'::app_role)
        AND (agendamento_id IN (SELECT agendamentos.id FROM public.agendamentos
            WHERE agendamentos.professor_user_id = (select auth.uid()))))
  );
DROP POLICY IF EXISTS professor_select_presencas ON public.presencas;

ALTER POLICY presencas_update_staff ON public.presencas
  USING (
    public.is_staff((select auth.uid()))
    OR (public.has_role((select auth.uid()), 'professor'::app_role)
        AND (agendamento_id IN (SELECT agendamentos.id FROM public.agendamentos
            WHERE agendamentos.professor_user_id = (select auth.uid()))))
  )
  WITH CHECK (
    public.is_staff((select auth.uid()))
    OR (public.has_role((select auth.uid()), 'professor'::app_role)
        AND (agendamento_id IN (SELECT agendamentos.id FROM public.agendamentos
            WHERE agendamentos.professor_user_id = (select auth.uid()))))
  );
DROP POLICY IF EXISTS professor_update_presencas ON public.presencas;

-- ---- system_settings (fundir leitura admin-secret na leitura staff) -
ALTER POLICY "Staff read settings" ON public.system_settings
  USING (
    (public.is_staff((select auth.uid()))
      AND (key <> 'integration.drive.service_account_json'::text))
    OR (EXISTS (SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = (select auth.uid())
          AND user_roles.role = 'admin'::app_role))
  );
DROP POLICY IF EXISTS "Admin read SA secret" ON public.system_settings;

-- ---- turmas ---------------------------------------------------------
ALTER POLICY turmas_select ON public.turmas
  USING (
    public.is_staff((select auth.uid()))
    OR (id IN (SELECT alunos.turma_id FROM public.alunos
        WHERE alunos.user_id = (select auth.uid())))
    OR public.has_role((select auth.uid()), 'professor'::app_role)
  );
DROP POLICY IF EXISTS professor_select_turmas ON public.turmas;

-- Cursos: carga horária total e duração padrão da aula
ALTER TABLE public.cursos
  ADD COLUMN IF NOT EXISTS carga_horaria_total_min integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duracao_aula_min integer NOT NULL DEFAULT 60;

-- Atividades: carga horária própria (0 = livre, não consome blocos)
ALTER TABLE public.atividades
  ADD COLUMN IF NOT EXISTS carga_horaria_min integer NOT NULL DEFAULT 0;

-- Agendamentos: bloco dentro do slot + agrupamento multi-dia
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS bloco_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocos_total integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parte_grupo_id uuid,
  ADD COLUMN IF NOT EXISTS parte_num integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS partes_total integer NOT NULL DEFAULT 1;

-- Evita dois agendamentos no mesmo bloco do mesmo slot/dia da turma
CREATE UNIQUE INDEX IF NOT EXISTS uq_agendamentos_turma_data_inicio_bloco
  ON public.agendamentos (turma_id, data, inicio, bloco_index);

CREATE INDEX IF NOT EXISTS idx_agendamentos_parte_grupo
  ON public.agendamentos (parte_grupo_id) WHERE parte_grupo_id IS NOT NULL;
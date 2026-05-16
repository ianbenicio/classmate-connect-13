CREATE UNIQUE INDEX IF NOT EXISTS alunos_nome_turma_unique
  ON public.alunos (lower(trim(nome)), turma_id)
  WHERE turma_id IS NOT NULL;

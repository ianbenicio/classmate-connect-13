-- Adiciona UNIQUE INDEX em `presencas(agendamento_id, aluno_id, atividade_id)`.
--
-- Motivação:
-- - Antes não havia constraint, então `syncPresencas` (avaliacoes-store) usava
--   delete+insert da janela do agendamento, vulnerável a duplicação em
--   submissão concorrente (entre o DELETE e o INSERT).
-- - Com o índice, podemos trocar para `upsert(..., onConflict: ...)`, que é
--   atômico no Postgres.
--
-- Partial WHERE: só linhas com agendamento_id NÃO NULO (orphans não devem
-- conflitar com presenças "vivas"). aluno_id e atividade_id são NOT NULL na
-- definição da tabela (vide migration 20260423220701_*), então não precisam
-- de filtro.

-- 1) Limpa duplicatas eventuais (mantém a mais recente). Sem isso o CREATE
--    INDEX falha se houver duas linhas para o mesmo (ag, aluno, atividade).
DELETE FROM public.presencas p
USING public.presencas q
WHERE p.id < q.id
  AND p.agendamento_id IS NOT NULL
  AND p.agendamento_id = q.agendamento_id
  AND p.aluno_id       = q.aluno_id
  AND p.atividade_id   = q.atividade_id;

-- 2) Cria o índice único.
CREATE UNIQUE INDEX IF NOT EXISTS presencas_agendamento_aluno_atividade_uidx
  ON public.presencas (agendamento_id, aluno_id, atividade_id)
  WHERE agendamento_id IS NOT NULL;

-- #19 — Dedup de notificações ao nível do banco.
--
-- Antes: o agendamento-scanner mantinha um Set em localStorage com chaves
-- `${destinatario}|${agendamentoId}|${kind}` para evitar duplicatas. Isso
-- vazava entre abas (cada aba duplicava notificações), entre dispositivos
-- (cada login novo recriava o histórico todo) e crescia indefinidamente.
--
-- Agora: 1) coluna `agendamento_id` referenciando o agendamento de origem
-- (NULL = notificação manual sem origem em agendamento); 2) índice único
-- parcial sobre (destinatario_ref, agendamento_id, kind) que rejeita
-- inserções duplicadas. Combinado com `upsert(..., ignoreDuplicates: true)`
-- no client, o dedup vira responsabilidade do banco e fica consistente
-- entre todas as origens.

ALTER TABLE public.notificacoes
  ADD COLUMN IF NOT EXISTS agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notificacoes_agendamento
  ON public.notificacoes(agendamento_id);

-- Único parcial: só aplica quando agendamento_id e kind estão preenchidos.
-- Notificações manuais (sem agendamento) não são submetidas a dedup.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notificacoes_dedup_scanner
  ON public.notificacoes(destinatario_ref, agendamento_id, kind)
  WHERE agendamento_id IS NOT NULL AND kind IS NOT NULL;

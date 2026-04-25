-- Adiciona coluna `meta JSONB` em agendamentos para guardar campos extras
-- do tipo Agendamento que não têm coluna dedicada (ex.: slotInicio, slotFim).
-- Os demais campos do bloco/parte já existem como colunas próprias.

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb;

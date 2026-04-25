-- Tabela para histórico de exportações JSON geradas pelo app.
-- NÃO é a `relatorios` (relatórios de aula/agendamento) — é o histórico
-- de arquivos baixados (export completo, avaliações, frequência, etc.).
-- O conteúdo do arquivo é guardado em `conteudo` (TEXT, JSON serializado)
-- para permitir re-download a partir do histórico.

CREATE TABLE IF NOT EXISTS public.relatorios_exportados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  gerado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  gerado_por_user_id UUID,
  gerado_por_nome TEXT,
  formato TEXT NOT NULL DEFAULT 'json',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  filename TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.relatorios_exportados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read relatorios_exportados"
  ON public.relatorios_exportados
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert relatorios_exportados"
  ON public.relatorios_exportados
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated delete relatorios_exportados"
  ON public.relatorios_exportados
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_relatorios_exportados_gerado_em
  ON public.relatorios_exportados(gerado_em DESC);

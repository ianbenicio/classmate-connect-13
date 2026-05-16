-- Fase G: tabela de configurações dinâmicas do sistema.
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  category text NOT NULL,
  label text NOT NULL,
  description text,
  input_type text NOT NULL CHECK (input_type IN ('text','number','boolean','url','json','color')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read settings" ON public.system_settings;
CREATE POLICY "Staff read settings" ON public.system_settings
  FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admin coord manage settings" ON public.system_settings;
CREATE POLICY "Admin coord manage settings" ON public.system_settings
  FOR ALL TO authenticated
  USING (
    is_staff(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin','coordenacao')
    )
  )
  WITH CHECK (
    is_staff(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin','coordenacao')
    )
  );

INSERT INTO public.system_settings (key, value, category, label, description, input_type)
VALUES (
  'integration.drive.tarefas_folder_pattern',
  '"{professor}/{turma}/{data}-{aula_codigo}/{aluno}/"'::jsonb,
  'integration',
  'Drive — pasta de tarefas dos alunos',
  'Caminho na pasta raiz do Drive onde o sistema verifica entrega de tarefas. Placeholders: {professor}, {turma}, {data}, {aula_codigo}, {aula_nome}, {aluno}, {aluno_id}, {ano}, {mes}, {dia}.',
  'text'
)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.system_settings IS 'Configurações dinâmicas do sistema editáveis pela coordenação (key/value/jsonb).';

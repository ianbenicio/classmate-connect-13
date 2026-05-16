-- Settings para Google Service Account (Drive integration).
INSERT INTO public.system_settings (key, value, category, label, description, input_type) VALUES
  (
    'integration.drive.root_folder_id',
    '""'::jsonb,
    'integration',
    'Drive — ID da pasta raiz',
    'ID da pasta no Google Drive onde ficam as subpastas de tarefas. Encontre na URL: drive.google.com/drive/folders/ESSE_ID',
    'text'
  ),
  (
    'integration.drive.service_account_json',
    '""'::jsonb,
    'integration',
    'Drive — credencial Service Account (JSON)',
    'JSON completo da Service Account do Google Cloud. Cole o conteúdo do arquivo .json gerado em IAM & Admin > Service Accounts.',
    'json'
  ),
  (
    'integration.drive.service_account_email',
    '""'::jsonb,
    'integration',
    'Drive — email da Service Account',
    'Email derivado do JSON da SA. Compartilhe a pasta do Drive com este email.',
    'text'
  ),
  (
    'integration.drive.last_validated_at',
    'null'::jsonb,
    'integration',
    'Drive — última validação',
    'Timestamp da última validação bem-sucedida da credencial (apenas leitura).',
    'text'
  )
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Admin only SA secret" ON public.system_settings;
CREATE POLICY "Admin only SA secret" ON public.system_settings
  FOR ALL TO authenticated
  USING (
    key NOT IN ('integration.drive.service_account_json')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    key NOT IN ('integration.drive.service_account_json')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =====================================================================
-- E1/E3: Seed integration.storage.provider
-- =====================================================================
-- Provider de armazenamento ativo por tenant.
-- Valores: "google" | "onedrive" | "none"
-- Default: "google" (retrocompatível com escolas já configuradas).

INSERT INTO public.system_settings (key, value, category, label, description, input_type)
VALUES (
  'integration.storage.provider',
  '"google"'::jsonb,
  'integration',
  'Provider de armazenamento',
  'Define o backend de armazenamento de tarefas: "google" (Google Drive), "onedrive" (OneDrive M365) ou "none" (sem armazenamento).',
  'text'
)
ON CONFLICT (key) DO NOTHING;

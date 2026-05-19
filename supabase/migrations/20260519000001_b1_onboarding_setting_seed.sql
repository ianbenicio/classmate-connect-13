-- B1: Seed onboarding.completed setting per tenant
-- Inserts as false — wizard shows until admin marks done.
-- ON CONFLICT DO NOTHING: safe to re-run; existing tenants keep their value.

INSERT INTO public.system_settings (key, value, category, label, description, input_type)
VALUES (
  'onboarding.completed',
  'false'::jsonb,
  'onboarding',
  'Onboarding concluído',
  'Flag que controla exibição do wizard de primeiro uso. false = mostrar banner.',
  'boolean'
)
ON CONFLICT (key) DO NOTHING;

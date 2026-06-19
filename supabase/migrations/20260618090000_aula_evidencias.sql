-- Evidencias da aula: documento interno de estudo/plano de aula e chamada em arquivo.
CREATE TABLE IF NOT EXISTS public.aula_evidencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id uuid NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('plano_aula', 'chamada_arquivo')),
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'encontrado', 'valido', 'invalido', 'aprovado_manual')),
  arquivo_nome text,
  arquivo_mime_type text,
  arquivo_url text,
  drive_file_id text,
  drive_folder_id text,
  submetido_por_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submetido_por_nome text,
  aprovado_por_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aprovado_em timestamptz,
  verificado_em timestamptz,
  observacao text,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  project_id uuid NOT NULL DEFAULT public.current_project_id(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agendamento_id, tipo)
);

COMMENT ON TABLE public.aula_evidencias IS
  'Evidencias obrigatorias por agendamento: documento interno de estudo/plano de aula e chamada digitalizada.';
COMMENT ON COLUMN public.aula_evidencias.dados IS
  'Metadados estruturados, incluindo campos do documento de estudo e snapshot de codigo/data/professor da aula.';

DROP TRIGGER IF EXISTS aula_evidencias_updated_at ON public.aula_evidencias;
CREATE TRIGGER aula_evidencias_updated_at
BEFORE UPDATE ON public.aula_evidencias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_aula_evidencias_agendamento
  ON public.aula_evidencias(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_aula_evidencias_project_status
  ON public.aula_evidencias(project_id, status);

ALTER TABLE public.aula_evidencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read aula evidencias" ON public.aula_evidencias;
CREATE POLICY "Staff read aula evidencias" ON public.aula_evidencias
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff insert aula evidencias" ON public.aula_evidencias;
CREATE POLICY "Staff insert aula evidencias" ON public.aula_evidencias
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff update aula evidencias" ON public.aula_evidencias;
CREATE POLICY "Staff update aula evidencias" ON public.aula_evidencias
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff delete aula evidencias" ON public.aula_evidencias;
CREATE POLICY "Staff delete aula evidencias" ON public.aula_evidencias
  FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

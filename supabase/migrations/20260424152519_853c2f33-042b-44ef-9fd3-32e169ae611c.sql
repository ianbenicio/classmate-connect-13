CREATE TABLE public.formularios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  destinatario text NOT NULL CHECK (destinatario IN ('professor', 'aluno')),
  estrutura jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  criado_por_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.formularios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read formularios"
  ON public.formularios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff insert formularios"
  ON public.formularios FOR INSERT
  TO authenticated
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff update formularios"
  ON public.formularios FOR UPDATE
  TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff delete non-system formularios"
  ON public.formularios FOR DELETE
  TO authenticated
  USING (is_staff(auth.uid()) AND is_system = false);

CREATE TRIGGER update_formularios_updated_at
  BEFORE UPDATE ON public.formularios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- 1) Adiciona 'viewer' ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- 2) Tabela de vínculo viewer (responsável) ↔ aluno (N↔N)
CREATE TABLE IF NOT EXISTS public.viewer_dependentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_user_id uuid NOT NULL,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (viewer_user_id, aluno_id)
);

CREATE INDEX IF NOT EXISTS idx_viewer_dependentes_viewer ON public.viewer_dependentes(viewer_user_id);
CREATE INDEX IF NOT EXISTS idx_viewer_dependentes_aluno ON public.viewer_dependentes(aluno_id);

ALTER TABLE public.viewer_dependentes ENABLE ROW LEVEL SECURITY;

-- Viewer enxerga seus próprios vínculos; staff gerencia tudo
CREATE POLICY "Viewer reads own dependentes"
  ON public.viewer_dependentes FOR SELECT
  USING (auth.uid() = viewer_user_id OR public.is_staff(auth.uid()));

CREATE POLICY "Staff manage viewer_dependentes"
  ON public.viewer_dependentes FOR ALL
  USING (public.is_staff(auth.uid()));

-- 3) Função util: o uid é viewer do aluno?
CREATE OR REPLACE FUNCTION public.is_viewer_of(_aluno_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.viewer_dependentes
    WHERE aluno_id = _aluno_id AND viewer_user_id = _user_id
  )
$$;

-- 4) Estende RLS de leitura para incluir viewer (read-only do dependente)
CREATE POLICY "Viewer reads dependente aluno"
  ON public.alunos FOR SELECT
  USING (public.is_viewer_of(id, auth.uid()));

CREATE POLICY "Viewer reads dependente aluno_habilidades"
  ON public.aluno_habilidades FOR SELECT
  USING (public.is_viewer_of(aluno_id, auth.uid()));

CREATE POLICY "Viewer reads dependente avaliacoes"
  ON public.avaliacoes FOR SELECT
  USING (aluno_id IS NOT NULL AND public.is_viewer_of(aluno_id, auth.uid()));

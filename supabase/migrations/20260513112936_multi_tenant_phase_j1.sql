-- Fase J.1: multi-tenant infrastructure (1 user = 1 projeto)

CREATE TABLE IF NOT EXISTS public.projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nome text NOT NULL,
  logo_url text,
  cor_primaria text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;

INSERT INTO public.projetos (slug, nome, cor_primaria)
VALUES ('javis', 'Javis', '#3b82f6')
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_projeto_javis_id() RETURNS uuid LANGUAGE sql STABLE
AS $func$ SELECT id FROM public.projetos WHERE slug = 'javis' LIMIT 1 $func$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id);
UPDATE public.profiles SET project_id = public.get_projeto_javis_id() WHERE project_id IS NULL;

DO $blk$
DECLARE javis_id uuid := public.get_projeto_javis_id();
BEGIN
  EXECUTE format('ALTER TABLE public.cursos        ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id) DEFAULT %L', javis_id);
  EXECUTE format('ALTER TABLE public.turmas        ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id) DEFAULT %L', javis_id);
  EXECUTE format('ALTER TABLE public.alunos        ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id) DEFAULT %L', javis_id);
  EXECUTE format('ALTER TABLE public.atividades    ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id) DEFAULT %L', javis_id);
  EXECUTE format('ALTER TABLE public.agendamentos  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id) DEFAULT %L', javis_id);
  EXECUTE format('ALTER TABLE public.presencas     ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id) DEFAULT %L', javis_id);
  EXECUTE format('ALTER TABLE public.tarefas_alunos ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id) DEFAULT %L', javis_id);
  EXECUTE format('ALTER TABLE public.avaliacoes    ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id) DEFAULT %L', javis_id);
  EXECUTE format('ALTER TABLE public.formularios   ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id) DEFAULT %L', javis_id);
  EXECUTE format('ALTER TABLE public.notificacoes  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id) DEFAULT %L', javis_id);
  EXECUTE format('ALTER TABLE public.grupos        ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id) DEFAULT %L', javis_id);
  EXECUTE format('ALTER TABLE public.relatorios    ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id) DEFAULT %L', javis_id);
  EXECUTE format('ALTER TABLE public.professor_avaliacoes  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id) DEFAULT %L', javis_id);
  EXECUTE format('ALTER TABLE public.relatorios_exportados ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id) DEFAULT %L', javis_id);
END $blk$;

ALTER TABLE public.habilidades         ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id);
ALTER TABLE public.comportamento_tags  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id);
ALTER TABLE public.system_settings     ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projetos(id);

UPDATE public.cursos        SET project_id = public.get_projeto_javis_id() WHERE project_id IS NULL;
UPDATE public.turmas        SET project_id = public.get_projeto_javis_id() WHERE project_id IS NULL;
UPDATE public.alunos        SET project_id = public.get_projeto_javis_id() WHERE project_id IS NULL;
UPDATE public.atividades    SET project_id = public.get_projeto_javis_id() WHERE project_id IS NULL;
UPDATE public.agendamentos  SET project_id = public.get_projeto_javis_id() WHERE project_id IS NULL;
UPDATE public.presencas     SET project_id = public.get_projeto_javis_id() WHERE project_id IS NULL;
UPDATE public.tarefas_alunos SET project_id = public.get_projeto_javis_id() WHERE project_id IS NULL;
UPDATE public.avaliacoes    SET project_id = public.get_projeto_javis_id() WHERE project_id IS NULL;
UPDATE public.formularios   SET project_id = public.get_projeto_javis_id() WHERE project_id IS NULL;
UPDATE public.notificacoes  SET project_id = public.get_projeto_javis_id() WHERE project_id IS NULL;
UPDATE public.grupos        SET project_id = public.get_projeto_javis_id() WHERE project_id IS NULL;
UPDATE public.relatorios    SET project_id = public.get_projeto_javis_id() WHERE project_id IS NULL;
UPDATE public.professor_avaliacoes  SET project_id = public.get_projeto_javis_id() WHERE project_id IS NULL;
UPDATE public.relatorios_exportados SET project_id = public.get_projeto_javis_id() WHERE project_id IS NULL;

ALTER TABLE public.cursos        ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.turmas        ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.alunos        ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.atividades    ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.agendamentos  ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.presencas     ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.tarefas_alunos ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.avaliacoes    ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.formularios   ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.notificacoes  ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.grupos        ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.relatorios    ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.professor_avaliacoes  ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.relatorios_exportados ALTER COLUMN project_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean LANGUAGE sql STABLE
AS $isfunc$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'::app_role) $isfunc$;

CREATE OR REPLACE FUNCTION public.current_project_id() RETURNS uuid LANGUAGE sql STABLE
AS $cpfunc$ SELECT project_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1 $cpfunc$;

CREATE OR REPLACE FUNCTION public.has_project_access(p uuid) RETURNS boolean LANGUAGE sql STABLE
AS $hpafunc$
  SELECT
    public.is_super_admin()
    OR p IS NULL
    OR public.current_project_id() = p
$hpafunc$;

DROP POLICY IF EXISTS "Projeto: leitura" ON public.projetos;
CREATE POLICY "Projeto: leitura" ON public.projetos
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR id = public.current_project_id());

DROP POLICY IF EXISTS "Projeto: super gerencia" ON public.projetos;
CREATE POLICY "Projeto: super gerencia" ON public.projetos
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

COMMENT ON TABLE public.projetos IS 'Tenant principal — cada cliente é 1 projeto.';
COMMENT ON COLUMN public.profiles.project_id IS 'NULL = super-admin sem vinculo.';

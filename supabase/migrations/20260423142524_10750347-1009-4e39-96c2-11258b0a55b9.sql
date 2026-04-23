
-- =========================================
-- 1. ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'coordenacao', 'professor', 'aluno');
CREATE TYPE public.atividade_tipo AS ENUM ('aula', 'tarefa');
CREATE TYPE public.status_agendamento AS ENUM ('pendente', 'concluido');
CREATE TYPE public.dia_semana AS ENUM ('seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom');

-- =========================================
-- 2. UTILITY: updated_at trigger function
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================
-- 3. PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 4. USER ROLES + has_role function
-- =========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'coordenacao', 'professor')
  )
$$;

-- =========================================
-- 5. AUTO-CREATE profile on signup
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- 6. PROFILES + USER_ROLES POLICIES
-- =========================================
CREATE POLICY "Users view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all profiles" ON public.profiles
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins manage roles" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 7. HABILIDADES
-- =========================================
CREATE TABLE public.habilidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sigla TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  grupo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.habilidades ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER habilidades_updated_at BEFORE UPDATE ON public.habilidades
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated read habilidades" ON public.habilidades
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage habilidades" ON public.habilidades
FOR ALL USING (public.is_staff(auth.uid()));

-- =========================================
-- 8. CURSOS
-- =========================================
CREATE TABLE public.cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cod TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER cursos_updated_at BEFORE UPDATE ON public.cursos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated read cursos" ON public.cursos
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage cursos" ON public.cursos
FOR ALL USING (public.is_staff(auth.uid()));

-- =========================================
-- 9. GRUPOS (módulos por curso)
-- =========================================
CREATE TABLE public.grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  cod TEXT NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (curso_id, cod)
);
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER grupos_updated_at BEFORE UPDATE ON public.grupos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated read grupos" ON public.grupos
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage grupos" ON public.grupos
FOR ALL USING (public.is_staff(auth.uid()));

-- =========================================
-- 10. TURMAS
-- =========================================
CREATE TABLE public.turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cod TEXT NOT NULL UNIQUE,
  data DATE NOT NULL,
  horarios JSONB NOT NULL DEFAULT '[]'::jsonb,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER turmas_updated_at BEFORE UPDATE ON public.turmas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated read turmas" ON public.turmas
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage turmas" ON public.turmas
FOR ALL USING (public.is_staff(auth.uid()));

-- =========================================
-- 11. ALUNOS
-- =========================================
CREATE TABLE public.alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  idade INT,
  contato TEXT,
  cpf TEXT,
  curso_id UUID REFERENCES public.cursos(id) ON DELETE SET NULL,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  responsavel TEXT,
  contato_resp TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER alunos_updated_at BEFORE UPDATE ON public.alunos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Aluno reads own record" ON public.alunos
FOR SELECT USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "Staff manage alunos" ON public.alunos
FOR ALL USING (public.is_staff(auth.uid()));

-- =========================================
-- 12. ALUNO_HABILIDADES (M2M)
-- =========================================
CREATE TABLE public.aluno_habilidades (
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  habilidade_id UUID NOT NULL REFERENCES public.habilidades(id) ON DELETE CASCADE,
  PRIMARY KEY (aluno_id, habilidade_id)
);
ALTER TABLE public.aluno_habilidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read aluno_habilidades" ON public.aluno_habilidades
FOR SELECT USING (
  public.is_staff(auth.uid())
  OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aluno_id AND a.user_id = auth.uid())
);
CREATE POLICY "Staff manage aluno_habilidades" ON public.aluno_habilidades
FOR ALL USING (public.is_staff(auth.uid()));

-- =========================================
-- 13. ATIVIDADES
-- =========================================
CREATE TABLE public.atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo atividade_tipo NOT NULL,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  grupo TEXT NOT NULL,
  descricao TEXT,
  objetivo_resultados TEXT,
  prazo DATE,
  criado_por TEXT,
  professor TEXT,
  habilidade_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Aula campos
  descricao_conteudo TEXT,
  sugestoes_pais TEXT,
  resultados_esperados TEXT,
  notas_instrutor TEXT,
  pre_requisitos TEXT,
  niveis_alvo JSONB DEFAULT '[]'::jsonb,
  criterios_sucesso TEXT,
  metodologias TEXT,
  roteiro JSONB DEFAULT '[]'::jsonb,
  materiais JSONB DEFAULT '[]'::jsonb,
  referencias TEXT,
  formularios JSONB,
  rubricas JSONB DEFAULT '[]'::jsonb,
  -- Tarefa
  instrucoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER atividades_updated_at BEFORE UPDATE ON public.atividades
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated read atividades" ON public.atividades
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage atividades" ON public.atividades
FOR ALL USING (public.is_staff(auth.uid()));

-- =========================================
-- 14. AGENDAMENTOS
-- =========================================
CREATE TABLE public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  dia_semana dia_semana NOT NULL,
  inicio TEXT NOT NULL,
  fim TEXT NOT NULL,
  atividade_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status status_agendamento NOT NULL DEFAULT 'pendente',
  concluido_em TIMESTAMPTZ,
  observacao TEXT,
  professor TEXT,
  criado_por_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_por_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER agendamentos_updated_at BEFORE UPDATE ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated read agendamentos" ON public.agendamentos
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage agendamentos" ON public.agendamentos
FOR ALL USING (public.is_staff(auth.uid()));

-- =========================================
-- 15. RELATORIOS
-- =========================================
CREATE TABLE public.relatorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  professor TEXT,
  conteudo TEXT,
  observacoes TEXT,
  dados JSONB DEFAULT '{}'::jsonb,
  criado_por_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.relatorios ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER relatorios_updated_at BEFORE UPDATE ON public.relatorios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Staff read relatorios" ON public.relatorios
FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage relatorios" ON public.relatorios
FOR ALL USING (public.is_staff(auth.uid()));

-- =========================================
-- 16. AVALIACOES
-- =========================================
CREATE TABLE public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  atividade_id UUID REFERENCES public.atividades(id) ON DELETE CASCADE,
  aluno_id UUID REFERENCES public.alunos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_por_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER avaliacoes_updated_at BEFORE UPDATE ON public.avaliacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Staff read avaliacoes" ON public.avaliacoes
FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Aluno reads own avaliacoes" ON public.avaliacoes
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = aluno_id AND a.user_id = auth.uid())
);
CREATE POLICY "Staff manage avaliacoes" ON public.avaliacoes
FOR ALL USING (public.is_staff(auth.uid()));

-- =========================================
-- 17. NOTIFICACOES
-- =========================================
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  destinatario_tipo TEXT NOT NULL,
  destinatario_ref TEXT,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  curso_id UUID REFERENCES public.cursos(id) ON DELETE SET NULL,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  data DATE,
  inicio TEXT,
  fim TEXT,
  professor TEXT,
  atividade_ids JSONB DEFAULT '[]'::jsonb,
  kind TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own notifications" ON public.notificacoes
FOR SELECT USING (
  auth.uid() = destinatario_user_id OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Update own notifications" ON public.notificacoes
FOR UPDATE USING (auth.uid() = destinatario_user_id);
CREATE POLICY "Staff insert notifications" ON public.notificacoes
FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Admin delete notifications" ON public.notificacoes
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 18. INDEXES
-- =========================================
CREATE INDEX idx_grupos_curso ON public.grupos(curso_id);
CREATE INDEX idx_turmas_curso ON public.turmas(curso_id);
CREATE INDEX idx_alunos_turma ON public.alunos(turma_id);
CREATE INDEX idx_alunos_curso ON public.alunos(curso_id);
CREATE INDEX idx_alunos_user ON public.alunos(user_id);
CREATE INDEX idx_atividades_curso ON public.atividades(curso_id);
CREATE INDEX idx_agendamentos_turma_data ON public.agendamentos(turma_id, data);
CREATE INDEX idx_relatorios_agendamento ON public.relatorios(agendamento_id);
CREATE INDEX idx_avaliacoes_aluno ON public.avaliacoes(aluno_id);
CREATE INDEX idx_notificacoes_user ON public.notificacoes(destinatario_user_id, lida);

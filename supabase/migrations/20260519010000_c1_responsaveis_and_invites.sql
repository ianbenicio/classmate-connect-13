-- =====================================================================
-- C1/D1: responsaveis table + responsavel_invites (Sprint C + D1.1)
-- =====================================================================
-- responsaveis: pai/responsável vinculado a aluno(s) via viewer_dependentes
-- responsavel_invites: token de convite, expira em 7 dias

-- ---------------------------------------------------------------------------
-- 1. responsaveis
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.responsaveis (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nome           text NOT NULL,
  email          text NOT NULL,
  telefone       text,
  email_status   text NOT NULL DEFAULT 'unknown'
                 CHECK (email_status IN ('unknown', 'valid', 'bounced', 'complained', 'unsubscribed')),
  preferencias_json jsonb NOT NULL DEFAULT '{"digest":true,"alertas":true,"mensagens":true}'::jsonb,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, email)
);

CREATE INDEX IF NOT EXISTS idx_responsaveis_project ON public.responsaveis(project_id);
CREATE INDEX IF NOT EXISTS idx_responsaveis_email   ON public.responsaveis(email);
CREATE INDEX IF NOT EXISTS idx_responsaveis_user_id ON public.responsaveis(user_id);

-- RLS
ALTER TABLE public.responsaveis ENABLE ROW LEVEL SECURITY;

-- Admin/coordenação vê todos do projeto
CREATE POLICY "responsaveis_admin_all" ON public.responsaveis
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    project_id = (current_setting('app.project_id', true))::uuid
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'coordenacao')
    )
  )
  WITH CHECK (
    project_id = (current_setting('app.project_id', true))::uuid
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'coordenacao')
    )
  );

-- Pai vê apenas o próprio registro
CREATE POLICY "responsaveis_viewer_own" ON public.responsaveis
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. responsavel_invites
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.responsavel_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  aluno_id    uuid REFERENCES public.alunos(id) ON DELETE SET NULL,
  email       text NOT NULL,
  nome        text,
  token       uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  invited_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_responsavel_invites_token ON public.responsavel_invites(token);
CREATE INDEX IF NOT EXISTS idx_responsavel_invites_email ON public.responsavel_invites(email, project_id);

-- RLS
ALTER TABLE public.responsavel_invites ENABLE ROW LEVEL SECURITY;

-- Admin/coord gerencia convites
CREATE POLICY "invites_admin_all" ON public.responsavel_invites
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    project_id = (current_setting('app.project_id', true))::uuid
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'coordenacao')
    )
  )
  WITH CHECK (
    project_id = (current_setting('app.project_id', true))::uuid
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'coordenacao')
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Função: lookup_invite(token) — anon-safe, SECURITY DEFINER
-- ---------------------------------------------------------------------------
-- Retorna campos necessários para landing page sem expor todo o registro.

CREATE OR REPLACE FUNCTION public.lookup_invite(p_token uuid)
RETURNS TABLE (
  id          uuid,
  email       text,
  nome        text,
  aluno_id    uuid,
  project_id  uuid,
  expires_at  timestamptz,
  accepted    boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.email,
    i.nome,
    i.aluno_id,
    i.project_id,
    i.expires_at,
    (i.accepted_at IS NOT NULL) AS accepted
  FROM public.responsavel_invites i
  WHERE i.token = p_token
    AND i.expires_at > now()
    AND i.accepted_at IS NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.lookup_invite(uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.lookup_invite(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Função: accept_invite(token, user_id) — marca aceito e upsert responsavel
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.accept_invite(p_token uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.responsavel_invites;
  v_resp_id uuid;
BEGIN
  SELECT * INTO v_invite
  FROM public.responsavel_invites
  WHERE token = p_token
    AND expires_at > now()
    AND accepted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_invalid_or_expired');
  END IF;

  -- Upsert responsavel
  INSERT INTO public.responsaveis (project_id, user_id, nome, email)
  VALUES (
    v_invite.project_id,
    p_user_id,
    COALESCE(v_invite.nome, split_part(v_invite.email, '@', 1)),
    v_invite.email
  )
  ON CONFLICT (project_id, email) DO UPDATE
    SET user_id = EXCLUDED.user_id
  RETURNING id INTO v_resp_id;

  -- Mark accepted
  UPDATE public.responsavel_invites
  SET accepted_at = now()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object('ok', true, 'responsavel_id', v_resp_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_invite(uuid, uuid) FROM public;
GRANT  EXECUTE ON FUNCTION public.accept_invite(uuid, uuid) TO authenticated;

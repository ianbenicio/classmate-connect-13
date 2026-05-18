---
name: javis-supabase
description: Patterns Supabase específicos do Javis. Use quando user pedir nova migration, nova policy RLS, nova Edge Function, novo store, ou debug de policy. Cobre RESTRICTIVE policies, has_project_access helper, requireProjectIdForWrite, snapshot rollback, Edge Function input validation.
user-invocable: true
---

# javis-supabase

Patterns canônicos pra mexer em Supabase neste projeto.

## Quando invocar

- "Nova migration / nova tabela / nova policy RLS"
- "Nova Edge Function"
- "Debug RLS"
- "Stamp project_id em Y"

## Migration: tabela tenant-scoped

```sql
CREATE TABLE public.nova_tabela (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projetos(id)
    DEFAULT public.get_projeto_javis_id(),
  -- demais colunas...
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nova_tabela ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_nova_tabela_project_id
  ON public.nova_tabela(project_id);

CREATE POLICY "Project scope select" ON public.nova_tabela
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.has_project_access(project_id));

CREATE POLICY "Project scope write" ON public.nova_tabela
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_project_access(project_id))
  WITH CHECK (public.has_project_access(project_id));

CREATE POLICY "Staff manage nova_tabela" ON public.nova_tabela
  FOR ALL TO authenticated
  USING (is_staff((SELECT auth.uid())));
```

## Join table sem project_id

```sql
CREATE POLICY "Project scope nova_join" ON public.nova_join
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.alunos a
      WHERE a.id = nova_join.aluno_id
        AND public.has_project_access(a.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.alunos a
      WHERE a.id = nova_join.aluno_id
        AND public.has_project_access(a.project_id)
    )
  );
```

## Regras de policy

- Sempre `TO authenticated`, nunca `TO public`
- Sempre `(SELECT auth.uid())` em vez de `auth.uid()` direto
- Helpers SECURITY DEFINER plpgsql: `is_staff`, `has_role`, `is_super_admin`, `is_viewer_of`, `has_project_access`, `current_project_id`
- Anon: REVOKE EXECUTE de RPC functions (e.g. `is_staff`)
- Multi-permissive: 1 policy por (table, role, cmd) — consolide com OR

## Store pattern

```ts
import { requireProjectIdForWrite } from "./current-project";

function fooToRow(f: Foo) {
  return {
    id: toUuid(f.id),
    nome: f.nome,
    project_id: requireProjectIdForWrite() ?? undefined,
  };
}

export const fooStore = {
  async add(f: Foo) {
    const row = fooToRow(f);
    const local = { ...f, id: row.id };
    const snap = foos;
    foos = [local, ...foos];
    emit();
    const { error } = await supabase.from("foo").insert(row);
    if (error) {
      foos = snap;
      emit();
      console.error("[foo] add error", error);
      toast.error(`Erro ao salvar: ${error.message}`);
    }
  },
  // remove/update análogos — sempre snapshot+restore
};
```

## Edge Function pattern

```ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const MAX_BODY = 1024;

async function safeJson(req: Request) {
  const ct = (req.headers.get('content-type') ?? '').toLowerCase();
  if (!ct.includes('application/json')) return { ok: false, err: 'content_type_must_be_json' };
  const cl = Number(req.headers.get('content-length') ?? '0');
  if (cl > MAX_BODY) return { ok: false, err: 'payload_too_large' };
  const raw = await req.text();
  if (raw.length > MAX_BODY) return { ok: false, err: 'payload_too_large' };
  try { return { ok: true, data: JSON.parse(raw) }; }
  catch { return { ok: false, err: 'invalid_json' }; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'missing_auth' }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } }
  });
  const { data: callerUser } = await userClient.auth.getUser();
  if (!callerUser?.user) return json({ error: 'invalid_token' }, 401);

  const { data: roles } = await userClient.from('user_roles')
    .select('role').eq('user_id', callerUser.user.id);
  const isStaff = (roles ?? []).some(r => ['admin','coordenacao','professor'].includes(r.role));
  if (!isStaff) return json({ error: 'forbidden' }, 403);

  const parsed = await safeJson(req);
  if (!parsed.ok) return json({ error: parsed.err }, 400);
  const body = parsed.data as { someId?: unknown };
  const someId = typeof body.someId === 'string' ? body.someId : '';
  if (!someId) return json({ error: 'missing_someId' }, 400);
  if (!UUID_RE.test(someId)) return json({ error: 'invalid_someId_format' }, 400);

  // logic...
});
```

## Escape strings em queries externas (Drive/Graph)

```ts
function escapeDriveString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
```

## Smoke RLS via MCP `execute_sql`

```sql
BEGIN;
SELECT set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true);
SET LOCAL role authenticated;
-- queries...
ROLLBACK;
```

## Não fazer

- ❌ `auth.uid()` direto em policy → wrap em `(SELECT auth.uid())`
- ❌ `TO public` em policy → `TO authenticated`
- ❌ `USING (true)` em tabela tenant-scoped → leak
- ❌ Stamp via `getCurrentProjectId()` → use `requireProjectIdForWrite()`
- ❌ Optimistic update sem snapshot → rollback impossível
- ❌ Edge Function sem content-type + payload cap + UUID validation
- ❌ Drive query sem escape → injection
- ❌ REVOKE EXECUTE de helper plpgsql ainda quebra RLS (caller EXECUTE check) — usar private schema (M4 deferred)

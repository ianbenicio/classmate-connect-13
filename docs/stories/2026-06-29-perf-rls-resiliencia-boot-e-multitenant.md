# Story 2026-06-29 — Performance RLS, resiliência de boot e troca de tenant

Status: Done · Release: `v1.1` · Commits: `34c4add` → `270b4fa`

## Contexto

Usuários reclamavam de lentidão para entrar, dados que não carregavam e
impossibilidade de agendar aulas — sintomas que persistiram após um fix
anterior (`2e3db47`). A investigação encontrou **quatro causas independentes**,
da mais profunda (infra) à de UX, todas tratadas nesta release.

## Causas-raiz e correções

### 1. RLS re-avaliando `auth.uid()` por linha (`auth_rls_initplan`)

20 policies (todas as `professor_*` e as 4 `Staff ... aula_evidencias`) usavam
`auth.uid()` / `is_staff(auth.uid())` **cru** no predicado. Postgres re-avalia a
função para cada linha durante o scan RLS, multiplicando o custo no free-tier.

**Fix:** `ALTER POLICY` envolvendo em `(select auth.uid())` → avaliação única
(InitPlan). Semântica idêntica. Índices nas 2 FKs sem cobertura em
`aula_evidencias`.
Migration: `supabase/migrations/20260628090000_rls_initplan_perf.sql`.

### 2. Policies permissivas duplicadas (`multiple_permissive_policies`)

11 tabelas tinham 2-3 policies PERMISSIVE por (role, comando); cada uma é
avaliada por linha.

**Fix:** mesclar o predicado `professor_*` na policy-base via `OR` e remover as
redundantes. RESTRICTIVE de tenant (`Project scope`, `sa_secret_restrict`)
intocadas. Advisor `multiple_permissive_policies` 17 → 0.
Migration: `supabase/migrations/20260629090000_rls_consolidate_permissive.sql`.

### 3. PostgREST/pooler travado → 504 / "Carregando…" infinito

Conexões PostgREST (`authenticator`) ficaram presas ~3 dias (transações
abandonadas em `idle in transaction`, originadas de INSERTs de notificação que
penduraram no `ClientRead`). O pooler esgotou e **toda** query REST passou a
retornar 504 — inclusive `profiles`/`user_roles` do auth, deixando o app preso
no loading global do `AuthProvider`. DB e RLS estavam saudáveis (query
`profiles` sob RLS = ~7ms); o wedge era na camada de serviço.

**Fix (banco):**
- `ALTER ROLE authenticator/authenticated SET idle_in_transaction_session_timeout = '20000'`
  — transações abandonadas se auto-matam antes de esgotar o pooler.
- Terminar as conexões `authenticator` presas.
- Como o PostgREST não recuperou o pool sozinho, **restart do projeto** via
  `pause` → `restore` (Supabase). Pós-restart: REST `cursos`/`user_roles` 200.

**Fix (frontend, resiliência):**
- `retry-fetch.ts`: `AbortController` por tentativa (timeout 12s) + semáforo de
  concorrência (5 in-flight). Request pendurada vira erro em vez de pendurar pra
  sempre; boot não estoura o pool.
- `auth.tsx`: watchdog libera o shell após 8s mesmo se o bootstrap travar.

### 4. Super-admin não conseguia escolher o tenant

Super-admin é cross-projeto (`profiles.project_id` NULL). O seletor de projeto
estava enterrado no menu do usuário e o `auth.tsx` **ignorava o override** →
`currentProject` ficava null mesmo após escolher.

**Fix:**
- `auth.tsx/loadProfile` honra o override do super (`getSuperAdminOverride()`).
- Novo `ProjectSwitcher` visível no header (só super); seleciona → persiste em
  localStorage + reload.
- Removida a cópia duplicada do `AuthMenu`.
- Decisão de design: **header switcher**, não campo no perfil nem escolha no
  login (ver Engram). Usuário normal segue com `profiles.project_id`.

## Extras

- **VersionWatcher** (`src/components/VersionWatcher.tsx`): detecta deploy novo
  (fingerprint dos assets de `/`) e oferece toast "Atualizar" → `reload`.
  Resolve o cache de bundle antigo em abas já abertas.
- **Reparo de dados:** `professor01@nexa.com` estava sem linha em `profiles` →
  criado + vinculado ao projeto `javis` + role `professor`. Integridade:
  33 auth users = 33 profiles. (`awdonawdo@gmail.com` segue sem papel — conta
  suspeita de teste, decisão pendente.)

## Validação

- `npm test` → 162 testes (14 arquivos) passando.
- `npm run lint` → 0 erros (9 warnings antigos de Fast Refresh).
- `npm run build` → OK.
- Advisors Supabase (performance): `auth_rls_initplan` 0, `multiple_permissive_policies` 0,
  `unindexed_foreign_keys` 0.
- REST e site respondendo 200.

## Arquivos

- `supabase/migrations/20260628090000_rls_initplan_perf.sql` (novo)
- `supabase/migrations/20260629090000_rls_consolidate_permissive.sql` (novo)
- `src/integrations/supabase/retry-fetch.ts`
- `src/test/logic/retry-fetch.test.ts`
- `src/lib/auth.tsx`
- `src/components/ProjectSwitcher.tsx` (novo)
- `src/components/VersionWatcher.tsx` (novo)
- `src/components/AuthMenu.tsx`
- `src/routes/__root.tsx`

## Pendências

- `awdonawdo@gmail.com`: atribuir papel ou remover conta.
- Mudanças de config de banco fora de migration (`idle_in_transaction_session_timeout`,
  restart) não são versionadas — registradas no runbook de operação.

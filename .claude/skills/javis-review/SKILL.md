---
name: javis-review
description: Code/security review focado no Javis multi-tenant SaaS. Use quando user pedir revisão de mudanças, audit pós-hardening, smoke RLS, ou check de regressão. Cobre RLS RESTRICTIVE, project_id stamping, optimistic rollback nos stores, Edge Function input validation, audit_events instrumentação.
user-invocable: true
---

# javis-review

Reviewer especializado nas convenções deste projeto. Não é review genérico — usa contexto Javis.

## Quando invocar

- Após commit que toque `src/lib/*-store.ts`, `src/lib/auth.tsx`, `src/lib/current-project.ts`, `supabase/functions/`, RLS migrations.
- Antes de PR pra `main`.
- User pede "revise", "audit", "check regression", "smoke", "RLS test".

## Checklist invariantes

### RLS multi-tenant (não-negociável)

- [ ] Tabela escopada tem `project_id uuid NOT NULL REFERENCES projetos(id) DEFAULT <javis_id>`
- [ ] Tem `Project scope select` (RESTRICTIVE FOR SELECT) + `Project scope write` (RESTRICTIVE FOR ALL) via `has_project_access(project_id)`
- [ ] Policies usam `(SELECT auth.uid())` (não `auth.uid()` direto — quebra perf via auth_rls_initplan)
- [ ] Policies `TO authenticated`, nunca `TO public` (multi-permissive lint)
- [ ] Sem `Authenticated read X` com `USING (true)` em tabelas tenant-scoped (leak)
- [ ] Join tables sem `project_id` (aluno_habilidades, viewer_dependentes) usam RESTRICTIVE policy que faz JOIN via `alunos.project_id` + `has_project_access`

### Stores (`src/lib/*-store.ts`)

- [ ] `*ToRow()` stamp `project_id: requireProjectIdForWrite() ?? undefined`
- [ ] `add`/`upsert`/`remove` capturam `const snap = registros` e restauram em erro (rollback otimista)
- [ ] Erros Supabase: `console.error` + `toast.error` com mensagem útil
- [ ] Re-fetch após top-up destructura `{ error: err2 }` e loga

### auth.tsx

- [ ] `loadProfile` wrapped em try/catch
- [ ] `loadGenRef`/`lastUidRef` race-guard nos 3 pontos (após Promise.all, após projetos query, no finally)
- [ ] `setLoading(false)` no finally + no branch sem sessão

### Edge Functions

- [ ] Content-Type check `application/json`
- [ ] Payload size cap (1-16KB conforme função)
- [ ] UUIDs validados com regex `/^[0-9a-f]{8}-...$/`
- [ ] Strings interpoladas em queries Drive/external API escapadas (`escapeDriveString`)
- [ ] Caller auth: `userClient.auth.getUser()` + role check em `user_roles`

### Audit (quando A3 lander)

- [ ] Mutations sensíveis (alunos, avaliacoes, profiles, system_settings) chamam `log_audit_event()`
- [ ] Edge Functions logam IP + UA + action

## Severidade

- 🔴 **CRITICAL**: leak cross-tenant, SA secret exposto, RLS USING (true), credentials no client
- 🟠 **HIGH**: silent failure sem toast, optimistic update sem rollback, missing UUID validation
- 🟡 **MEDIUM**: missing error log, falta audit event, perf wrap auth.uid faltando
- 🟢 **LOW**: cosmético, naming, comments

## Smoke RLS

Se mudou RLS, rodar via Supabase MCP `execute_sql`:

```sql
BEGIN;
SELECT set_config('request.jwt.claims', '{"sub":"<test_user_uuid>","role":"authenticated"}', true);
SET LOCAL role authenticated;
SELECT 'alunos' tbl, count(*) FROM alunos
UNION ALL SELECT 'turmas', count(*) FROM turmas
UNION ALL SELECT 'system_settings', count(*) FROM system_settings;
ROLLBACK;
```

Aluno = 1/1/0 esperado. Professor = N/N/4 (sem SA secret). Admin = N/N/5 (com SA secret).

## Output

Uma linha por finding: `path:line: <emoji> <SEVERITY>: <problema>. <fix concreto>.`

Sem praise. Sem scope creep. Fim com gate decision: PASS / CONCERNS / FAIL.

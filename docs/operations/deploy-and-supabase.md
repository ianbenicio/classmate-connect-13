# Runbook: Deploy, Supabase e Operacao

Atualizado em: 2026-06-19

Registro externo no Engram:

```text
classmate-connect-13-operational-handoff-after-supabase-repa
```

## Estado confirmado

- App online: https://classmate-connect-13.vercel.app/
- A URL respondeu `200` via Vercel em 2026-06-19.
- Config Vercel versionada em `vercel.json`.
- Build command: `npm run build`.
- Output directory: `dist/client`.
- Rewrite SPA: `/(.*)` -> `/index.html`.
- Repositorio: `ianbenicio/classmate-connect-13`.
- Branch principal: `main`.
- Supabase project ref: `pbzkbwkzexhtdfuyaqiv`.

## Deploy frontend

O deploy frontend existe na Vercel, mas nao ha workflow GitHub Actions para ele.
O vinculo do projeto parece estar configurado no dashboard da Vercel.

Variaveis esperadas na Vercel:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Validacao rapida depois de push:

```powershell
Invoke-WebRequest -Uri "https://classmate-connect-13.vercel.app/" -Method Head
```

Resultado esperado:

```text
StatusCode: 200
Server: Vercel
```

## Supabase migrations

Workflow versionado:

```text
.github/workflows/supabase-migrations.yml
```

Ele roda em push para `main` quando ha mudanca em:

```text
supabase/migrations/**
.github/workflows/supabase-migrations.yml
```

Secrets necessarios no GitHub Actions:

```text
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_REF
SUPABASE_DB_PASSWORD
```

Comando principal do workflow:

```bash
supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
supabase db push --password "$SUPABASE_DB_PASSWORD"
```

## Reparo de historico Supabase feito

Em 2026-06-18/2026-06-19, o workflow normal falhou porque o historico remoto
do Supabase continha migrations que nao existiam localmente. Foi criado um
workflow temporario somente para reparar o historico, aplicar as migrations
novas e depois remover esse workflow.

Run de sucesso:

```text
https://github.com/ianbenicio/classmate-connect-13/actions/runs/27801407140
```

Commits relevantes:

```text
6ecd204 feat: add internal academic workflows and remove Lovable [Story 2026-06-18]
0764c23 ci: repair Supabase migration history
811bcf0 ci: include out-of-order Supabase migrations
ec3236e ci: mark superseded Supabase dump migration
8e2f6e5 ci: mark existing Supabase migrations applied
cb7dc3e ci: remove temporary Supabase repair workflow
```

Migrations remotas sem arquivo local marcadas como `reverted`:

```text
20260516232726
20260516232811
20260518173456
20260518181226
20260518223601
20260518225417
20260519032335
20260519035312
20260521105922
20260521112138
20260521133724
```

Migrations locais antigas, ja refletidas no banco, marcadas como `applied`:

```text
20260503125106
20260518040000
20260519000000
20260519000001
20260519010000
20260519020000
20260519030000
20260519040000
20260519050000
20260521000000
20260521010000
20260521020000
20260530000000
```

Migrations novas aplicadas com sucesso:

```text
20260618090000_aula_evidencias.sql
20260618113000_aula_chamadas_storage.sql
```

Comandos usados no workflow temporario:

```bash
supabase migration repair --status reverted <versoes-remotas-sem-arquivo>
supabase migration repair --status applied <versoes-locais-ja-presentes-no-banco>
supabase db push --include-all --password "$SUPABASE_DB_PASSWORD"
```

Nao reintroduza esse workflow temporario para o fluxo normal. Use somente em
novo reparo deliberado de historico.

## Edge Functions e APP_URL

Nao ha workflow versionado para deploy automatico de Supabase Edge Functions.
Se uma function for alterada, confirme o deploy manual/CLI antes de assumir que
esta em producao.

Variaveis esperadas no ambiente das Edge Functions:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_WEBHOOK_SECRET
EMAIL_FROM
APP_URL
```

Ponto de atencao: algumas functions usam fallback `https://javis.app`.
Para este deploy, `APP_URL` deve apontar para:

```text
https://classmate-connect-13.vercel.app
```

Sem isso, links de convite/preferencias podem sair com dominio errado.

## Seguranca de env

- `.env` existe localmente, mas esta ignorado por `.gitignore`.
- `.env.example` esta versionado e nao deve conter segredos.
- Como `.env` ja foi rastreado no passado, as chaves expostas devem permanecer
  rotacionadas no Supabase/Resend.
- Nunca usar `SUPABASE_SERVICE_ROLE_KEY` no frontend.

## Push com AIOX

O hook local de autoridade bloqueia `git push` sem agente DevOps.

Comando usado:

```powershell
cmd /c "set AIOX_AGENT=@devops&& git push origin main"
```

## Validacao atual

Executado em 2026-06-19:

```text
npm test       -> passou: 9 arquivos, 131 testes
npm run build  -> passou
```

`npm run lint` ainda falha globalmente:

```text
69 erros
13 warnings
25 arquivos com pendencias
```

Arquivos com maior concentracao de erros:

```text
src/lib/alunos-store.ts
src/components/FormularioBlocoEditor.tsx
supabase/functions/process-email-queue/index.ts
supabase/functions/send-email/index.ts
supabase/functions/delete-user/index.ts
src/lib/formularios-context.ts
```

## Lacunas conhecidas

- Nao havia `README.md`; criado em 2026-06-19.
- O deploy Vercel existia, mas nao estava documentado no repo.
- Nao ha documentacao de quem/time/projeto controla o dashboard Vercel.
- Nao ha workflow versionado para deploy automatico das Edge Functions.
- O workflow normal de Supabase cobre `db push`, mas nao cobre reparo de
  historico de migrations.
- O status exato das envs configuradas no dashboard Vercel nao e visivel pelo
  repo.
- O status exato dos secrets das Edge Functions nao e visivel pelo repo.
- O lint global ainda precisa de uma story dedicada de saneamento.

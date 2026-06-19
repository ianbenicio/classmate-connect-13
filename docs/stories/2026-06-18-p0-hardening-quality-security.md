# Story: P0 hardening de qualidade e seguranca

## Status

Ready for Review

## Contexto

A analise AIOX identificou riscos P0 antes de novas features: hooks condicionais em rotas principais, logs com material derivado da `service_role`, `.env` rastreado no Git e lint global quebrado. Esta story faz o primeiro slice seguro sem alterar `.claude/` nem schema do banco.

## Acceptance Criteria

- [x] Hooks em rotas principais deixam de ser chamados condicionalmente.
- [x] Edge Function `invite-aluno-user` nao registra prefixo/tamanho da `service_role`.
- [x] `.env` deixa de estar rastreado no Git sem remover o arquivo local.
- [x] Lint global passa ou fica com lista documentada de pendencias nao comportamentais.
- [x] Testes e build continuam passando apos este slice.
- [x] `.claude/` nao e alterado.

## Tasks

- [x] Mapear falhas P0 da analise AIOX.
- [x] Corrigir hooks condicionais em `/` e `/minha-area`.
- [x] Remover log sensivel de `invite-aluno-user`.
- [x] Definir procedimento seguro para untrack do `.env` e rotacao de chaves.
- [x] Documentar pendencias globais de lint restantes.
- [x] Validar com lint direcionado, testes e build.

## Validation

- `npm.cmd exec eslint -- src/routes/index.tsx src/routes/minha-area.tsx supabase/functions/invite-aluno-user/index.ts` passou.
- `npm.cmd test` passou: 7 arquivos, 120 testes.
- `npm.cmd run build` passou.
- `npm.cmd run lint` ainda falha globalmente: 431 problemas (417 erros, 14 warnings). Os erros de `react-hooks/rules-of-hooks` em `/` e `/minha-area` foram removidos; pendencias restantes sao principalmente Prettier, `any` em testes/functions, `prefer-const` e warnings de Fast Refresh/deps.
- `git rm --cached -- .env` removeu o `.env` do indice Git e `Test-Path .env` confirmou que o arquivo local continua existindo.
- Como `.env` ja foi rastreado, rotacionar chaves expostas no Supabase/Resend antes de push/deploy publico.
- `git diff -- .claude` sem alteracoes.

## File List

- docs/stories/2026-06-18-p0-hardening-quality-security.md
- .env
- .env.example
- src/routes/index.tsx
- src/routes/minha-area.tsx
- supabase/functions/invite-aluno-user/index.ts

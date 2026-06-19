# Story: Documentacao operacional e memoria de processo

## Status

Ready for Review

## Contexto

Depois do push das features e do reparo Supabase, ficaram decisoes e processos
fora do repositorio: URL Vercel, runbook de migrations, reparo de historico,
validacoes atuais, autoridade AIOX para push e lacunas conhecidas.

## Acceptance Criteria

- [x] README raiz registra links, stack, scripts e estado conhecido.
- [x] Runbook operacional registra Vercel, Supabase, migrations e Edge Functions.
- [x] Processo de reparo Supabase fica documentado sem expor segredos.
- [x] Lacunas conhecidas ficam explicitas.
- [x] Validacao atual de testes, build e lint fica registrada.
- [x] `.claude/` nao e alterado.

## Tasks

- [x] Auditar docs e configs existentes.
- [x] Confirmar URL publica da Vercel.
- [x] Confirmar status de `.env` fora do Git.
- [x] Validar testes/build/lint atuais.
- [x] Criar README raiz.
- [x] Criar runbook operacional.
- [x] Registrar handoff no Engram.

## Validation

- `Invoke-WebRequest -Uri "https://classmate-connect-13.vercel.app/" -Method Head` respondeu `200` com `Server: Vercel`.
- `git check-ignore -v .env` confirmou `.env` ignorado por `.gitignore`.
- `npm.cmd test` passou: 9 arquivos, 131 testes.
- `npm.cmd run build` passou, com warnings conhecidos.
- `npm.cmd exec eslint -- . --format json` indicou 69 erros, 13 warnings e 25 arquivos com pendencias.
- Engram salvo em `classmate-connect-13-operational-handoff-after-supabase-repa`.

## File List

- README.md
- docs/operations/deploy-and-supabase.md
- docs/stories/2026-06-19-operational-documentation.md

## Change Log

- 2026-06-19: Criada documentacao operacional de deploy, Supabase, validacao e lacunas conhecidas.

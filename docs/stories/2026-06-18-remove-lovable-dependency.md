# Story: Remover dependencia Lovable

## Status

Ready for Review

## Contexto

O projeto deve deixar de depender de pacotes, integrações e textos da Lovable, mantendo os fluxos existentes de autenticação, build e deploy sem quebrar o trabalho paralelo no Claude.

## Acceptance Criteria

- [x] OAuth Google usa Supabase Auth diretamente, sem wrapper Lovable.
- [x] `vite.config.ts` usa plugins oficiais do Vite/TanStack/Tailwind, sem `@lovable.dev/vite-tanstack-config`.
- [x] Dependencias Lovable removidas de `package.json` e `package-lock.json`.
- [x] Arquivos/textos Lovable substituidos por nomes neutros do produto.
- [x] Testes e build continuam passando.
- [x] `.claude/` nao e alterado.

## Tasks

- [x] Mapear ocorrencias de Lovable.
- [x] Remover integracao Lovable de auth.
- [x] Substituir preset Vite Lovable.
- [x] Remover dependencias e arquivo gerado Lovable.
- [x] Atualizar textos e metadados residuais.
- [x] Validar com testes/build/lint.

## Validation

- `npm.cmd test` passou: 6 arquivos, 115 testes.
- `npm.cmd run build` passou.
- `npm.cmd exec eslint -- vite.config.ts vitest.config.ts src/routes/auth.tsx src/routes/coordenacao.tsx src/components/academic/AlunoDetailDialog.tsx src/lib/db-export.functions.ts` passou.
- `npm.cmd run lint` foi executado e ainda falha por pendencias globais preexistentes fora deste escopo, incluindo hooks condicionais em `src/routes/index.tsx`, `any` em testes/functions e formatacao em arquivos nao alterados.
- `git diff -- .claude` sem alteracoes.

## File List

- docs/stories/2026-06-18-remove-lovable-dependency.md
- package.json
- package-lock.json
- .prettierrc
- vite.config.ts
- vitest.config.ts
- src/routes/auth.tsx
- src/routes/coordenacao.tsx
- src/components/academic/AlunoDetailDialog.tsx
- src/lib/db-export.functions.ts
- src/integrations/lovable/index.ts

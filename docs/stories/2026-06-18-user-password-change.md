# Story: Troca de senha no perfil do usuario

## Status

Ready for Review

## Contexto

Usuarios autenticados precisam conseguir trocar a propria senha dentro do app, sem depender do fluxo de recuperacao por email do Supabase. A mudanca deve preservar o trabalho paralelo no Claude e nao expor `service_role` no front-end.

## Acceptance Criteria

- [x] Menu de usuario mostra acesso ao perfil para qualquer usuario autenticado.
- [x] Perfil permite trocar a propria senha com senha atual, nova senha e confirmacao.
- [x] Troca de senha usa apenas Supabase Auth client-side para o usuario logado.
- [x] Validacoes impedem senha vazia, senha curta, confirmacao divergente e senha igual a atual.
- [x] A opcao de senha nao permite editar senha de outro usuario.
- [x] Testes/build/lint direcionado continuam passando.
- [x] `.claude/` nao e alterado.

## Tasks

- [x] Mapear fluxo atual de perfil e menu autenticado.
- [x] Expor perfil para todos os usuarios autenticados.
- [x] Adicionar secao de troca de senha no dialog de perfil.
- [x] Extrair e testar validacao de troca de senha.
- [x] Validar com testes/build/lint direcionado.

## Validation

- `npm.cmd exec eslint -- src/components/AuthMenu.tsx src/components/MeuPerfilProfessorDialog.tsx src/components/UserProfileEditDialog.tsx src/lib/password-change.ts src/test/logic/password-change.test.ts` passou.
- `npm.cmd test` passou: 7 arquivos, 120 testes.
- `npm.cmd run build` passou.
- `git diff -- .claude` sem alteracoes.

## File List

- docs/stories/2026-06-18-user-password-change.md
- src/components/AuthMenu.tsx
- src/components/MeuPerfilProfessorDialog.tsx
- src/components/UserProfileEditDialog.tsx
- src/lib/password-change.ts
- src/test/logic/password-change.test.ts

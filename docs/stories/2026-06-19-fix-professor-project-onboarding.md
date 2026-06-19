# Story: Corrigir acesso de professor novo ao projeto

## Status

Ready for Review

## Contexto

Um usuario novo recebeu role `professor`, conseguiu entrar na area de professor,
mas os cards e listas carregaram zerados. O role estava presente, mas o profile
do usuario novo podia estar sem `project_id`; com as policies RESTRICTIVE de
multi-tenant, `public.current_project_id()` ficava `NULL` e bloqueava os dados
do projeto.

## Acceptance Criteria

- [x] Profiles novos recebem `project_id` no trigger de signup.
- [x] Usuarios existentes sem projeto sao associados ao projeto Javis, exceto super_admin sem vinculo.
- [x] Cadastro admin envia `project_id` nos metadados do signup quando existir projeto ativo.
- [x] Policies essenciais de professor sao reaplicadas de forma idempotente.
- [x] A correcao fica em migration nova, para rodar no workflow normal do Supabase.
- [x] `.claude/` nao e alterado.

## Tasks

- [x] Mapear fluxo de auth, role, profile e current project.
- [x] Identificar bloqueio por `profiles.project_id`.
- [x] Criar migration de backfill/default/trigger.
- [x] Atualizar cadastro admin para mandar `project_id`.
- [x] Validar lint direcionado, testes e build.

## Dev Notes

- `user_roles.role = professor` controla a area do app.
- `profiles.project_id` controla o acesso aos dados por RLS multi-tenant.
- Sem `profiles.project_id`, professor entra, mas `cursos`, `turmas`, `alunos`,
  `atividades` e `agendamentos` podem retornar vazios.

## File List

- supabase/migrations/20260619093000_fix_professor_project_onboarding.sql
- src/lib/users-store.ts
- docs/stories/2026-06-19-fix-professor-project-onboarding.md

## Validation

- `npm.cmd exec eslint -- src/lib/users-store.ts` passou.
- `npm.cmd test` passou: 9 arquivos, 131 testes.
- `npm.cmd run build` passou, com warnings conhecidos de chunk grande e import dinamico/estatico em `relatorios-store`.

## Change Log

- 2026-06-19: Criada migration para corrigir onboarding de professor novo e backfill de profiles sem projeto.

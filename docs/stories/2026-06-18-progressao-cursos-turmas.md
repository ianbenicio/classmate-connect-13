# Story: Progressao por curso e turma para coordenacao

## Status

Ready for Review

## Contexto

Coordenacao e admin precisam visualizar a execucao do curso por turma: aulas dadas, atividades executadas, cobertura de relatorios do professor, retorno dos alunos, checklists individuais e alunos sem usuario. A primeira versao deve ser de leitura/exportacao, sem apagar dados automaticamente.

## Acceptance Criteria

- [x] Visao restrita a admin/coordenacao/super admin.
- [x] Dados organizados por curso -> turma.
- [x] Mostra alunos com usuario e alunos sem usuario por turma.
- [x] Mostra progresso de atividades, aulas concluidas, relatorios do professor, avaliacoes dos alunos e checklists.
- [x] Permite filtrar por curso.
- [x] Permite exportar CSV geral ou por curso.
- [x] Validacao local passa.
- [x] `.claude/` nao e alterado.

## Tasks

- [x] Criar agregador puro de progresso por curso/turma.
- [x] Adicionar testes de agregacao.
- [x] Criar tela de relatorio para coordenacao/admin.
- [x] Adicionar rota e atalho em Coordenacao.
- [x] Validar lint direcionado, testes e build.

## Validation

- `npm.cmd exec eslint -- src/lib/progresso-cursos.ts src/test/logic/progresso-cursos.test.ts src/components/relatorios/ProgressoCursosTurmasReport.tsx src/routes/coordenacao.relatorios.progresso-cursos-turmas.tsx src/routes/coordenacao.tsx` passou.
- `npm.cmd test` passou: 8 arquivos, 122 testes.
- `npm.cmd run build` passou.
- Build manteve warnings preexistentes de chunk grande e import dinamico/estatico de `relatorios-store`.
- `git diff -- .claude` sem alteracoes.

## File List

- docs/stories/2026-06-18-progressao-cursos-turmas.md
- src/lib/progresso-cursos.ts
- src/test/logic/progresso-cursos.test.ts
- src/components/relatorios/ProgressoCursosTurmasReport.tsx
- src/routes/coordenacao.relatorios.progresso-cursos-turmas.tsx
- src/routes/coordenacao.tsx

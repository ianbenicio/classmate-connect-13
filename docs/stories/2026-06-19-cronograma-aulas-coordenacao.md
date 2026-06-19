# Story: Cronograma de aulas da coordenacao

## Contexto

Coordenacao precisa revisar a progressao de uma turma por curso e ajustar o status de cada aula sem depender do fluxo operacional do professor. Em alguns casos a coordenacao sabe que uma aula deve aparecer como agendada ou finalizada, mas nao existe plano, chamada ou relatorios associados.

## Objetivo

Adicionar um botao "Cronograma de aulas" na area de coordenacao para escolher curso e turma, listar todas as aulas do curso e permitir definir status: livre, agendada ou finalizada.

## Criterios de Aceite

- [x] Existe botao "Cronograma de aulas" em Coordenacao.
- [x] O dialog permite escolher curso e turma.
- [x] A tela lista todas as aulas do curso selecionado.
- [x] Cada aula mostra status livre, agendada ou finalizada.
- [x] Coordenacao pode alterar o status por aula.
- [x] Ao marcar agendada/finalizada, o registro fica sob responsabilidade da coordenacao.
- [x] Aulas marcadas pela coordenacao dispensam plano de aula, chamada, relatorio do professor e retornos dos alunos.
- [x] Relatorios/KPIs/alertas principais respeitam a dispensa de requisitos.
- [x] Validacoes locais executadas.

## Tarefas

- [x] Persistir metadados de origem/dispensa no agendamento.
- [x] Criar logica de status do cronograma.
- [x] Criar dialog de cronograma de aulas.
- [x] Conectar botao na rota de coordenacao.
- [x] Ajustar scanner, alertas, KPIs e relatorios.
- [x] Adicionar testes de logica.
- [x] Rodar formatacao, lint direcionado, testes e build.

## Validacao

- `npm.cmd exec prettier -- --write ...` passou nos arquivos alterados.
- `npm.cmd exec eslint -- ...` passou nos arquivos alterados.
- `npm.cmd test -- src/test/logic/cronograma-aulas.test.ts src/test/logic/academic-types.test.ts src/test/logic/agendamento-scanner.test.ts src/test/logic/progresso-cursos.test.ts` passou: 86 testes.
- `npm.cmd test` passou: 140 testes.
- `npm.cmd run build` passou.
- `npm.cmd run lint` geral ainda falha por debitos pre-existentes fora desta story.

## File List

- `src/lib/academic-types.ts`
- `src/lib/agendamentos-store.ts`
- `src/lib/cronograma-aulas.ts`
- `src/lib/agendamento-scanner.ts`
- `src/lib/progresso-cursos.ts`
- `src/lib/relatorio-extrato-horas.ts`
- `src/components/academic/CronogramaAulasDialog.tsx`
- `src/components/academic/PendingReportsDialog.tsx`
- `src/components/admin/AlertasInteligentes.tsx`
- `src/components/admin/DashboardKPIs.tsx`
- `src/components/relatorios/ComparativoTurmasReport.tsx`
- `src/routes/coordenacao.tsx`
- `src/test/logic/academic-types.test.ts`
- `src/test/logic/agendamento-scanner.test.ts`
- `src/test/logic/cronograma-aulas.test.ts`
- `src/test/logic/progresso-cursos.test.ts`
- `docs/stories/2026-06-19-cronograma-aulas-coordenacao.md`

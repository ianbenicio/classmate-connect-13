# Story: Relatorio consolidado da coordenacao

## Contexto

Coordenacao precisa acompanhar, por periodo, tudo que acontece apos aulas finalizadas:
plano de aula, chamada, relatorio do professor, retorno dos alunos, presencas,
horas de professores e progresso dos alunos por curso/turma.

## Objetivo

Adicionar na area de relatorios dos coordenadores uma tela de relatorio consolidado
com cronograma configuravel de frequencia e exportacao registrada no historico.

## Criterios de Aceite

- [x] Existe atalho "Relatorio consolidado" na area de coordenacao.
- [x] A tela permite ajustar frequencia semanal, quinzenal, mensal ou personalizada.
- [x] A tela permite ajustar periodo manualmente.
- [x] O relatorio mostra aulas finalizadas e status de plano, chamada, relatorio do professor, relatorios dos alunos e presencas.
- [x] O relatorio mostra professores com aulas dadas, horas, notificacoes e avaliacoes.
- [x] O relatorio separa alunos por curso e turma.
- [x] O relatorio mostra frequencia, progresso e avaliacoes de habilidades dos alunos.
- [x] O relatorio pode ser gerado e registrado no historico como JSON.

## Tarefas

- [x] Criar gerador consolidado em `src/lib`.
- [x] Criar tela de relatorio em `src/components/relatorios`.
- [x] Criar rota protegida em `/coordenacao/relatorios/semanal`.
- [x] Adicionar atalho no dashboard de coordenacao.
- [x] Adicionar testes de logica.
- [x] Rodar formatacao, lint direcionado, testes e build.

## Validacao

- `npm.cmd exec prettier -- --write ...` passou nos arquivos alterados.
- `npm.cmd exec eslint -- ...` passou nos arquivos alterados.
- `npm.cmd test -- src/test/logic/relatorio-semanal-coordenacao.test.ts` passou: 2 testes.
- `npm.cmd test` passou: 142 testes.
- `npm.cmd run build` passou.
- `npm.cmd run lint` geral nao foi usado como gate desta story porque o projeto ainda tem debitos antigos fora destes arquivos.

## File List

- `src/lib/relatorio-semanal-coordenacao.ts`
- `src/components/relatorios/RelatorioSemanalCoordenacaoReport.tsx`
- `src/routes/coordenacao.relatorios.semanal.tsx`
- `src/routes/coordenacao.tsx`
- `src/routeTree.gen.ts`
- `src/test/logic/relatorio-semanal-coordenacao.test.ts`
- `docs/stories/2026-06-19-relatorio-consolidado-coordenacao.md`

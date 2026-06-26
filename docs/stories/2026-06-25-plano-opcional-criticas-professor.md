# Story: Plano de aula opcional no agendamento e criticas do professor

## Status

Done

## Contexto

O agendamento de aula exigia que o professor preenchesse e salvasse o plano de aula antes de criar a aula. A regra nova permite agendar sem plano, mas deixa uma pendencia visivel para o professor. Se o dia da aula chegar sem plano registrado, a pendencia vira critica.

## Criterios de aceite

- [x] Professor consegue agendar aula sem submeter plano de aula.
- [x] Agendamentos sem plano geram notificacao para o professor.
- [x] Calendario e lista de atividades do professor exibem icone de alerta quando o plano esta pendente.
- [x] Plano ausente no dia da aula conta como ponto de critica.
- [x] Relatorio do professor ausente apos a janela de relatorio conta como ponto de critica.
- [x] A cada 3 pontos de critica, o professor recebe 1 punicao exibida nos relatorios.
- [x] Relatorio de horas e relatorio consolidado da coordenacao mostram criticas e punicoes.

## Tasks

- [x] Remover obrigatoriedade do plano no dialog de agendamento.
- [x] Ajustar notificacoes e scanner para plano pendente.
- [x] Adicionar indicador visual de plano pendente no calendario e em Minhas Atividades.
- [x] Criar regra central de criticas/punicoes.
- [x] Expor criticas/punicoes nos relatorios.
- [x] Validar com testes e typecheck/build.

## File List

- `src/components/academic/AgendarAtividadeDialog.tsx`
- `src/components/academic/ScheduleCalendar.tsx`
- `src/components/professor/MinhasAtividadesTable.tsx`
- `src/lib/agendamento-scanner.ts`
- `src/lib/aula-evidencias.ts`
- `src/lib/notificacoes-store.ts`
- `src/lib/professor-criticas.ts`
- `src/lib/relatorio-extrato-horas.ts`
- `src/components/relatorios/ExtratoHorasProfessoresReport.tsx`
- `src/lib/relatorio-semanal-coordenacao.ts`
- `src/components/relatorios/RelatorioSemanalCoordenacaoReport.tsx`
- `src/routes/index.tsx`
- `src/test/logic/professor-criticas.test.ts`
- `src/test/logic/relatorio-semanal-coordenacao.test.ts`

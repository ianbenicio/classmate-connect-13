# Story: Atividade avulsa no calendario

## Status

Concluida

## Contexto

Professores, coordenadores e administradores precisam registrar atividades que nao pertencem ao cronograma oficial do curso, como aula de reposicao, reforco ou encontro extra. A atividade deve aparecer no calendario, gerar agendamento e permitir o mesmo acompanhamento operacional de relatorio, presenca e carga horaria, sem aumentar a progressao esperada do cronograma.

## Criterios de aceite

- [x] Adicionar botao de `+` na area do calendario para staff autorizado.
- [x] Permitir criar atividade avulsa para curso, turma, professor, data(s), horario e descricao.
- [x] Permitir uma ou mais datas no mesmo cadastro.
- [x] Criar uma atividade e um agendamento por data selecionada.
- [x] Mostrar atividades avulsas no calendario mesmo quando o horario nao existe na grade regular da turma.
- [x] Manter atividades avulsas fora dos quadros/cronogramas oficiais do curso.
- [x] Notificar professor e alunos envolvidos.
- [x] Validar build.

## Decisoes

- Atividades avulsas usam o grupo tecnico `AVULSA` e codigo `AV-...`.
- Cada data cria um registro de atividade proprio para preservar relatorios, presencas e carga horaria por aula dada.
- Agendamentos avulsos continuam como `origem: "professor"` para exigir o fluxo normal de relatorio/presenca, diferente dos status manuais da coordenacao.

## File List

- `docs/stories/2026-06-19-atividade-avulsa-calendario.md`
- `src/components/academic/AtividadeAvulsaDialog.tsx`
- `src/components/academic/AgendarAtividadeDialog.tsx`
- `src/components/academic/AlunoDetailDialog.tsx`
- `src/components/academic/CronogramaAulasDialog.tsx`
- `src/components/academic/QuadroAulasDialog.tsx`
- `src/components/academic/QuadroAulasPicker.tsx`
- `src/components/academic/ScheduleCalendar.tsx`
- `src/components/academic/TurmaDetailDialog.tsx`
- `src/lib/academic-types.ts`
- `src/lib/progresso-cursos.ts`
- `src/lib/relatorio-semanal-coordenacao.ts`
- `src/routes/index.tsx`

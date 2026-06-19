# Story: Bloquear aulas ja agendadas no agendamento

## Status

Done

## Contexto

Na janela de agendamento, o quadro de aulas mostrava todas as aulas como disponiveis para professor, mesmo quando ja existiam aulas agendadas ou finalizadas na turma. Isso permitia selecionar novamente a mesma aula.

## Criterios de Aceite

- [x] Aulas pendentes/agendadas da turma devem aparecer como "Agendada" no quadro.
- [x] Aulas concluidas/finalizadas da turma devem aparecer como "Concluida" no quadro.
- [x] Aulas agendadas ou concluidas nao podem ser selecionadas novamente.
- [x] A digitacao manual do codigo da aula deve bloquear aula ja agendada/concluida.
- [x] A regra deve tolerar IDs antigos e IDs UUID no historico de agendamentos.
- [x] Professores devem conseguir ler os agendamentos do projeto para detectar aulas ocupadas.

## Validacao

- [x] Teste unitario de status do cronograma com IDs mistos.
- [x] ESLint focado nos arquivos alterados.
- [x] Build de producao.

## File List

- `src/lib/cronograma-aulas.ts`
- `src/components/academic/AgendarAtividadeDialog.tsx`
- `src/components/academic/QuadroAulasPicker.tsx`
- `src/test/logic/cronograma-aulas.test.ts`
- `supabase/migrations/20260619193000_professor_schedule_visibility.sql`
- `docs/stories/2026-06-19-bloquear-aulas-ja-agendadas.md`

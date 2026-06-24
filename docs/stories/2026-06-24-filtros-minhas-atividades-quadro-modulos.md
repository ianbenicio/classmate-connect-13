Status: Concluida

# Filtros em Minhas Atividades e quadro por modulo

## Contexto

Quando um professor registra muitas aulas, a lista "Minhas Atividades" fica extensa e empurra o calendario para baixo da pagina. No agendamento, cursos longos tambem tornam o quadro de aulas dificil de percorrer quando todas as aulas aparecem em uma grade unica.

## Criterios de aceite

- [x] A lista "Minhas Atividades" deve oferecer filtros rapidos para hoje, semana, proxima aula, aulas dadas e todas do mes.
- [x] O filtro padrao deve reduzir a altura inicial da lista para nao empurrar o calendario em excesso.
- [x] A tabela deve ter altura maxima com rolagem propria quando houver muitas linhas.
- [x] O quadro de aulas no agendamento deve organizar as aulas por grupo/modulo do curso.
- [x] Aulas ja agendadas ou concluidas devem continuar marcadas e bloqueadas para nova selecao.

## Validacao

- [x] `npm.cmd exec eslint -- src/components/professor/MinhasAtividadesTable.tsx src/components/academic/QuadroAulasPicker.tsx`
- [x] `npm.cmd run build`

## File List

- `docs/stories/2026-06-24-filtros-minhas-atividades-quadro-modulos.md`
- `src/components/professor/MinhasAtividadesTable.tsx`
- `src/components/academic/QuadroAulasPicker.tsx`

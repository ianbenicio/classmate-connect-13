# Story: Ajuste do fluxo de avaliacao aluno/professor

## Status

Concluida

## Contexto

O botao `Avaliacao` estava aparecendo no calendario do perfil de professor, mas professor nao deve avaliar outro professor. A avaliacao da aula e do professor deve ser enviada aos alunos presentes como parte do relatorio do aluno, depois que o professor registrar o relatorio da aula.

## Criterios de aceite

- [x] Remover o botao solto de avaliacao do calendario do painel principal.
- [x] Enviar o relatorio do aluno apenas para alunos presentes com usuario vinculado.
- [x] Manter a aula concluida quando o professor salva o relatorio.
- [x] Manter falta de resposta de aluno/checklist como pendencia/notificacao, sem bloquear a conclusao operacional da aula.
- [x] Calcular respostas esperadas de alunos com base nos presentes, nao em toda a turma.
- [x] Validar lint direcionado e build.

## Decisoes

- O relatorio do aluno ja contempla avaliacao da aula e do professor no mesmo formulario `relatorio_aluno`.
- Alunos sem `userId` nao recebem tarefa de resposta, pois nao conseguem logar no sistema.
- Relatorio/checklist de aluno segue como indicador de pendencia/baixa resposta, nao como criterio para impedir que a aula seja considerada completa depois do relatorio do professor.

## Validacao

- `npm.cmd exec eslint -- src/routes/index.tsx src/components/academic/RelatorioProfessorDialog.tsx src/components/academic/AvaliacaoTipoPicker.tsx src/lib/aula-evidencias.ts src/lib/progresso-cursos.ts src/lib/relatorio-semanal-coordenacao.ts`
- `npm.cmd run build`
- `npm.cmd run lint` geral ainda falha em arquivos fora do escopo desta story, principalmente por Prettier e `any` em componentes/stores/functions existentes.
- `npm.cmd run typecheck` nao existe no `package.json`.

## File List

- `docs/stories/2026-06-20-ajuste-avaliacao-aluno-professor.md`
- `src/routes/index.tsx`
- `src/components/academic/RelatorioProfessorDialog.tsx`
- `src/components/academic/AvaliacaoTipoPicker.tsx`
- `src/lib/aula-evidencias.ts`
- `src/lib/progresso-cursos.ts`
- `src/lib/relatorio-semanal-coordenacao.ts`

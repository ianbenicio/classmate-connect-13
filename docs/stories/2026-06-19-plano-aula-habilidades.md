# Story: Plano de aula com selecao de habilidades

## Contexto

Na janela de agendamento, o professor preenche o plano de aula antes de concluir a atividade. O campo antigo de habilidades misturava dois conceitos: a dinamica/descricao de como a habilidade seria trabalhada e a selecao objetiva das habilidades do sistema.

## Objetivo

Separar esses conceitos para que o plano de aula registre:

- a dinamica de habilidades em texto livre;
- as habilidades do catalogo em checkboxes;
- as habilidades sugeridas a partir da aula/ementa ja selecionada.

## Criterios de Aceite

- [x] O campo textual antigo de habilidades aparece como "Dinamica de Habilidades".
- [x] O plano tem um novo campo obrigatorio `habilidadesIds`.
- [x] A lista de checkboxes e povoada pelas habilidades vinculadas ou mencionadas na ementa da aula.
- [x] O professor pode marcar e desmarcar quais habilidades serao trabalhadas.
- [x] A mesma estrutura aparece no agendamento e na janela de evidencias da aula.
- [x] O documento interno do plano persiste `habilidadesIds` junto com os demais dados.
- [x] Validacoes locais executadas.

## Tarefas

- [x] Atualizar modelo de dados do plano de aula.
- [x] Criar inferencia de habilidades a partir da aula/ementa.
- [x] Atualizar dialog de agendamento.
- [x] Atualizar dialog de evidencias.
- [x] Atualizar testes de logica.
- [x] Rodar formatacao, lint direcionado, testes e build.

## Validacao

- `npm.cmd exec prettier -- --write ...` passou nos arquivos alterados.
- `npm.cmd exec eslint -- src/lib/aula-evidencias.ts src/components/academic/AgendarAtividadeDialog.tsx src/components/academic/AulaEvidenciasDialog.tsx src/test/logic/aula-evidencias.test.ts` passou.
- `npm.cmd test -- src/test/logic/aula-evidencias.test.ts` passou: 9 testes.
- `npm.cmd test` passou: 132 testes.
- `npm.cmd run build` passou.
- `npm.cmd run lint` geral ainda falha por debitos pre-existentes fora desta story.

## File List

- `src/lib/aula-evidencias.ts`
- `src/components/academic/AgendarAtividadeDialog.tsx`
- `src/components/academic/AulaEvidenciasDialog.tsx`
- `src/test/logic/aula-evidencias.test.ts`
- `docs/stories/2026-06-19-plano-aula-habilidades.md`

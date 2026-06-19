# Story: Corrigir carregamento de habilidades no agendamento

## Status

Done

## Contexto

Na janela de agendamento, ao escolher uma aula como `ADDS04 Cartaz de Scrim/Torneio + Roteiro Minimo`, o campo "Habilidades trabalhadas" podia aparecer vazio mesmo quando a ementa indicava habilidades esperadas. Isso bloqueava o fluxo do plano de aula, porque o plano so fica disponivel depois da selecao das habilidades.

## Criterios de Aceite

- [x] O agendamento deve carregar habilidades estruturadas da aula quando existirem em `habilidadeIds`.
- [x] O agendamento deve considerar habilidades vindas de `niveisAlvo`.
- [x] Quando a aula nao tiver vinculo estruturado, a inferencia deve reconhecer termos pedagogicos da ementa, como cartaz, roteiro, scrim e torneio.
- [x] As habilidades inferidas devem aparecer antes do botao de plano de aula e habilitar o preenchimento do plano.
- [x] O plano de aula deve continuar recebendo as habilidades previamente selecionadas.

## Validacao

- [x] Teste unitario focado em `aula-evidencias`.
- [x] ESLint focado nos arquivos alterados.
- [x] Build de producao.

## File List

- `src/lib/aula-evidencias.ts`
- `src/test/logic/aula-evidencias.test.ts`
- `docs/stories/2026-06-19-corrige-habilidades-agendamento.md`

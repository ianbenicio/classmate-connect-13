# Story: Exclusao persistente de habilidades

## Status

Concluida

## Contexto

Quando superusuario, admin ou coordenador removia uma habilidade, ela sumia da tela imediatamente, mas voltava apos refresh. A causa era o `top-up` automatico do seed em `habilidades-store`, que recriava qualquer habilidade padrao ausente no banco.

## Criterios de aceite

- [x] Habilidade deletada nao deve ser recriada automaticamente no refresh.
- [x] Lista de habilidades deve refletir apenas o que existe no banco.
- [x] Delete continua otimista com rollback em caso de erro do Supabase.
- [x] Validar lint direcionado e build.

## Decisoes

- O banco passa a ser a fonte de verdade para habilidades.
- Seed de habilidades nao deve rodar como autocorrecao durante carregamento normal.
- Habilidades removidas podem permanecer referenciadas por historico/arrays antigos, mas nao aparecem como opcao porque deixam de existir na tabela `habilidades`.

## Validacao

- `npm.cmd exec eslint -- src/lib/habilidades-store.ts`
- `npm.cmd run build`

## File List

- `docs/stories/2026-06-23-habilidades-delete-persistente.md`
- `src/lib/habilidades-store.ts`

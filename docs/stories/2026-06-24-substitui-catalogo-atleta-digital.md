# Story: substituir catálogo do Atleta Digital

## Status

Concluída

## Contexto

O curso Atleta Digital recebeu novos arquivos JSON com o catálogo revisado de aulas. O catálogo anterior do curso deve ser removido/substituído, mantendo somente as atividades fornecidas agora.

## Critérios de aceitação

- [x] O seed local do Atleta Digital usa somente as atividades dos JSONs fornecidos.
- [x] Os módulos do Atleta Digital refletem somente os grupos presentes nos JSONs fornecidos.
- [x] Existe migration para atualizar/inserir as novas aulas e remover do banco as atividades antigas do curso AD que não fazem parte do novo catálogo.
- [x] A substituição preserva o ID de atividades existentes quando o código já existe no banco, para reduzir impacto em agendamentos já registrados.
- [x] Lint/build são executados ou o motivo da não execução fica documentado.

## Tarefas

- [x] Validar e consolidar os JSONs fornecidos.
- [x] Gerar catálogo TypeScript do Atleta Digital.
- [x] Atualizar seed principal para usar o novo catálogo.
- [x] Criar migration de sincronização do catálogo AD.
- [x] Validar alterações.

## Validação

- Catálogo importado via Node: 98 atividades, grupos `GP`, `DS`, `IA`, `ET`, `EN`, `PD`, `EC`, `BF`, `TO`.
- Checagem de códigos antigos: `ADPP`, `ADIA09-12` e `ADBF05-08` não aparecem no novo catálogo nem na migration.
- `npx.cmd eslint src\lib\academic-seed.ts src\lib\atleta-digital-catalog.ts`: sem erros.
- `npm.cmd run lint`: falha em pendências pré-existentes fora do escopo (`formularios-context`, Edge Functions, `RelatoriosCoordenacaoDialog`).
- `npm.cmd run build`: passou fora do sandbox após erro inicial de permissão do esbuild.

## File List

- `docs/stories/2026-06-24-substitui-catalogo-atleta-digital.md`
- `src/lib/academic-seed.ts`
- `src/lib/atleta-digital-catalog.ts`
- `supabase/migrations/20260624213000_sync_atleta_digital_catalog.sql`

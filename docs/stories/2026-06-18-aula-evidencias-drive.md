# Story: Evidencias Internas da Aula

Status: Ready for Review

## Story

Como professor, coordenador e admin, quero que cada aula agendada tenha evidencias obrigatorias de preparacao e pos-aula dentro do sistema, para garantir que documento de estudo/plano de aula, chamada, relatorios e feedbacks fiquem rastreados por curso, turma, aula e professor.

## Acceptance Criteria

- [ ] O sistema registra cada aula por codigo, data, horario, turma e professor executante.
- [ ] O plano de aula deve ser submetido ate 2h antes da aula; ausencia apos o prazo vira pendencia registrada.
- [ ] O professor pode registrar o documento de estudo/plano pelo sistema usando uma estrutura minima: objetivos, conteudo/ementa, estudo/preparacao do professor, roteiro, materiais, habilidades, avaliacao, observacoes e sugestao aos pais.
- [ ] O documento de estudo/plano valido fica salvo internamente no banco com snapshot do codigo da aula, data e professor.
- [ ] A chamada digital continua obrigatoria e a foto/arquivo da chamada em JPG, PNG ou PDF tambem vira evidencia obrigatoria com upload interno.
- [ ] Coordenador e admin podem aprovar manualmente evidencias invalidas ou excecoes.
- [ ] Uma aula completa exige plano valido, chamada registrada, evidencia da chamada, relatorio do professor, relatorio do aluno e feedback/checklists aplicaveis.
- [ ] O painel do professor mostra o status das evidencias das aulas agendadas.
- [ ] O processo fica pronto para relatorio final do curso, mantendo Drive como integracao opcional futura.

## Tasks / Subtasks

- [x] Modelar tipos e regras de evidencia da aula.
- [x] Criar testes unitarios para caminho, nomes, prazos e status.
- [x] Criar persistencia Supabase para evidencias.
- [x] Criar store client-side para evidencias.
- [x] Integrar dialog/status na tabela de atividades do professor.
- [x] Criar registro interno do documento de estudo/plano de aula.
- [x] Criar bucket Supabase Storage para upload da chamada em papel.
- [x] Integrar upload interno da chamada no dialog de evidencias.
- [x] Gerar notificacao automatica para plano ausente apos o prazo de 2h antes da aula.
- [x] Integrar submissao inicial do plano de aula na janela de agendamento.
- [x] Validar lint, testes e build.

## Dev Notes

Decisoes do processo:

- MVP inicial fica 100% dentro do sistema, sem depender de Google Drive/Google Cloud.
- Cada aula fica identificada por codigo da aula, data, horario, turma e professor executante.
- Documento de estudo/plano: salvo em `aula_evidencias.dados` com snapshot de codigo/data/professor.
- Chamada: JPG, PNG ou PDF com upload interno no bucket `aula-chamadas`.
- Professor substituto pode cumprir evidencias; registrar professor original e executante.
- Notificacoes automaticas devem ser geradas para plano ausente e outras pendencias.
- Drive fica como integracao opcional futura, nao como dependencia do fluxo inicial.
- Quando o agendamento contem aula, o professor deve preencher e salvar o plano antes de concluir o agendamento.
- Campos do plano sao pre-populados a partir da aula selecionada, incluindo ementa, roteiro, materiais, avaliacao e sugestao aos pais.

## Testing

- Testar regras puras com Vitest.
- Rodar lint nos arquivos tocados.
- Rodar suite de testes.
- Rodar build.

## Dev Agent Record

### Agent Model Used

Codex

### Debug Log References

- `npm.cmd exec eslint -- src/lib/aula-evidencias.ts src/lib/aula-evidencias-store.ts src/test/logic/aula-evidencias.test.ts src/components/academic/AulaEvidenciasDialog.tsx src/components/professor/MinhasAtividadesTable.tsx src/components/admin/AlertasInteligentes.tsx` passou.
- `npm.cmd test -- src/test/logic/aula-evidencias.test.ts` passou: 1 arquivo, 6 testes.
- `npm.cmd test` passou: 9 arquivos, 128 testes.
- `npm.cmd run build` passou.
- `npm.cmd exec prettier -- --write ...` formatou os arquivos TS/MD; SQL nao foi formatado porque nao ha parser SQL configurado no Prettier.
- `npm.cmd exec eslint -- src/components/academic/AulaEvidenciasDialog.tsx src/lib/aula-evidencias-drive.ts supabase/functions/aula-evidencias-drive/index.ts` passou.
- `npm.cmd test` passou novamente apos integracao Drive: 9 arquivos, 128 testes.
- `npm.cmd run build` passou novamente apos integracao Drive.
- `npm.cmd exec eslint -- src/lib/agendamento-scanner.ts src/lib/academic-types.ts src/test/logic/agendamento-scanner.test.ts` passou.
- `npm.cmd test -- src/test/logic/agendamento-scanner.test.ts` passou: 1 arquivo, 12 testes.
- `npm.cmd test` passou apos notificacao de plano pendente: 9 arquivos, 129 testes.
- `npm.cmd run build` passou apos notificacao de plano pendente; permaneceram avisos preexistentes de chunk grande/import dinamico.
- `deno --version` falhou porque Deno nao esta instalado localmente; typecheck Deno da Edge Function ainda precisa ser feito em ambiente com Deno/Supabase CLI.
- `npm.cmd exec eslint -- src/components/academic/AulaEvidenciasDialog.tsx src/lib/aula-evidencias.ts src/lib/aula-evidencias-storage.ts src/test/logic/aula-evidencias.test.ts` passou.
- `npm.cmd test -- src/test/logic/aula-evidencias.test.ts src/test/logic/agendamento-scanner.test.ts` passou: 2 arquivos, 20 testes.
- `npm.cmd test` passou apos fluxo interno: 9 arquivos, 131 testes.
- `npm.cmd run build` passou apos fluxo interno; permaneceram os mesmos avisos preexistentes de chunk grande/import dinamico.
- `npx.cmd supabase --version` instalou/executou Supabase CLI temporaria: 2.107.0.
- `npx.cmd supabase migration list` falhou porque nao ha `SUPABASE_ACCESS_TOKEN` configurado.
- `npx.cmd supabase db push --db-url <pooler-url>` falhou porque a senha do Postgres nao esta configurada/valida; precisa `SUPABASE_DB_PASSWORD`.
- `supabase/config.toml` corrigido para o project ref ativo `pbzkbwkzexhtdfuyaqiv`, igual ao `.env` e `supabase/.temp/project-ref`.
- `npm.cmd exec eslint -- src/components/academic/AgendarAtividadeDialog.tsx src/components/academic/AulaEvidenciasDialog.tsx src/lib/aula-evidencias.ts src/lib/aula-evidencias-store.ts` passou.
- `npm.cmd test -- src/test/logic/aula-evidencias.test.ts src/test/logic/agendamento-scanner.test.ts` passou: 2 arquivos, 20 testes.
- `npm.cmd test` passou: 9 arquivos, 131 testes.
- `npm.cmd run build` passou; permaneceram os avisos preexistentes de chunk grande/import dinamico.
- Chrome headless via Playwright carregou `http://127.0.0.1:5173/` com status 200 e tela de login.
- `npm.cmd run lint` global ainda falha por problemas preexistentes fora deste fluxo, incluindo formatacao em scripts/componentes/stores e `any` em Supabase Functions.

### Completion Notes List

- Criado modelo de evidencias por aula com tipos `plano_aula` e `chamada_arquivo`.
- Criado registro interno da aula com codigo, data, horario, turma e professor.
- Criadas regras de nomenclatura e validacao de formatos para chamada em JPG/PNG/PDF.
- Criado dialog para professor registrar documento de estudo/plano estruturado e fazer upload da chamada.
- Coordenador/admin conseguem aprovar manualmente excecoes pelo dialog.
- Card de alertas da coordenacao passa a mostrar planos de aula pendentes apos o prazo de 2h antes da aula.
- Documento de estudo/plano fica salvo em `aula_evidencias.dados` com snapshot do codigo da aula, data, horario, turma e professor.
- Chamada em papel passa a ser enviada para o bucket interno `aula-chamadas`.
- Scanner de agendamentos agora carrega evidencias e cria notificacao `plano_pendente` para o professor quando o plano valido nao existe apos o prazo de 2h antes da aula.
- A notificacao `plano_pendente` usa o mesmo contrato de dedup por `agendamento_id` + `kind` ja existente em `notificacoes`.
- Janela de agendamento passa a exigir plano salvo quando ha aula atribuida ao bloco.
- O botao "Preencher plano de aula" abre um dialog externo ao agendamento, com campos estruturados e valores iniciais vindos da aula.
- Ao salvar o agendamento, o sistema cria automaticamente a evidencia `plano_aula` valida para cada aula agendada, com snapshot de curso, turma, codigo, data, horario e professor.
- Proxima etapa: aplicar migrations no Supabase e testar upload real da chamada com usuario professor.

### File List

- docs/stories/2026-06-18-aula-evidencias-drive.md
- supabase/migrations/20260618090000_aula_evidencias.sql
- supabase/migrations/20260618113000_aula_chamadas_storage.sql
- supabase/config.toml
- src/lib/aula-evidencias.ts
- src/lib/aula-evidencias-storage.ts
- src/lib/aula-evidencias-store.ts
- src/lib/aula-evidencias-drive.ts
- src/lib/agendamento-scanner.ts
- src/lib/academic-types.ts
- src/test/logic/aula-evidencias.test.ts
- src/test/logic/agendamento-scanner.test.ts
- src/components/academic/AulaEvidenciasDialog.tsx
- src/components/academic/AgendarAtividadeDialog.tsx
- src/components/professor/MinhasAtividadesTable.tsx
- src/components/admin/AlertasInteligentes.tsx
- supabase/functions/aula-evidencias-drive/index.ts

### Change Log

- 2026-06-18: Story criada a partir das decisoes do processo.
- 2026-06-18: Implementado MVP de evidencias da aula com regras, persistencia, UI do professor, alerta da coordenacao e testes.
- 2026-06-18: Adicionada automacao Drive para criar pasta, gerar Google Docs do plano e verificar evidencias.
- 2026-06-18: Adicionada notificacao automatica de plano de aula pendente no scanner de agendamentos.
- 2026-06-18: Fluxo inicial alterado para armazenamento interno: documento de estudo/plano no banco e upload da chamada em Supabase Storage.
- 2026-06-18: Tentativa de aplicar migrations remotas bloqueada por ausencia/senha invalida do Postgres; config.toml alinhado ao projeto ativo.
- 2026-06-18: Plano de aula passou a ser submetido no proprio agendamento, antes de concluir a criacao da aula.

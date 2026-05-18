# PRD Q1 — Javis SaaS Educacional

**Produto:** classmate-connect-13 (Javis Game Academy SaaS)
**Versão:** 1.0
**Data:** 2026-05-18
**Autor:** @pm (Morgan) — handoff de @analyst (Atlas)
**Status:** Aprovado para execução — Caminho A confirmado
**Duração:** 12 semanas (Q1)
**Handoffs:** @architect (ADRs) · @sm (story breakdown) · @qa (test strategy)

---

## 1. Visão Geral

### 1.1 Produto

Sistema operacional para escolas pequenas/médias brasileiras (50–500 alunos) com foco em **metodologia ativa**. Substitui combinação de WhatsApp + Google Sheets + Drive caótico por ferramenta única que cobre:

- Registro estruturado de aulas e tarefas
- Avaliação formativa com snapshots históricos
- Comunicação automatizada com pais
- Visibilidade pedagógica para coordenação

### 1.2 Posicionamento

> "Substitui sua planilha de presença, seu grupo de WhatsApp das mães, e a organização caótica do seu Drive — sem o peso de um ERP escolar tradicional."

**Não compete com:** Google Classroom (gratuito, sem suporte BR), Sponte (ERP pesado), ClassApp (comunicação isolada).
**Compete com:** status quo de planilhas + apps de mensageria.

### 1.3 Decisão estratégica

**Caminho A** confirmado: comercializar para 5+ escolas externas em 6 meses. Single-DB multi-tenant via RLS continua válido para primeiros 5–20 clientes; revisão arquitetural prevista em Q3.

---

## 2. Personas

### 2.1 Buyer (decisor)

| Atributo | Valor |
|---|---|
| Cargo | Coordenador(a) Pedagógico(a) ou Diretor(a) |
| Idade | 35–55 |
| Tamanho da escola | 50–500 alunos |
| Dor principal | "Não sei o que está acontecendo nas salas de aula até a reunião com pais" |
| Stack atual | WhatsApp + Google Sheets + Drive |
| WTP esperado | R$ 300–1.500/mês |
| Decisor único? | 60% sim · 40% precisa mantenedor |

**Validação:** 5 entrevistas R1 nas primeiras 2 semanas (founder).

### 2.2 Usuários

| Persona | % uso esperado | Necessidade primária |
|---|---|---|
| **Professor** | DAU/MAU alvo 50% | Relatório pós-aula em <5 min; carga horária |
| **Coordenador** | Login diário | Dashboard turmas, alertas, extrato horas |
| **Pais/Responsáveis** | Login semanal | Ver relatórios e presença do(s) filho(s) |
| **Aluno** | Variável | Tarefas, autoavaliação |
| **Admin/Mantenedor** | Login mensal | Config tenant, billing, audit |
| **Super Admin** | Ad-hoc | Suporte cross-tenant (Javis ops) |

---

## 3. Objetivos & Métricas

### 3.1 Gate Q1→Q2

**Único e não-negociável:** 1 escola beta usando ≥ 4 semanas, com NPS coletado.

### 3.2 Meta 6 meses (Q1+Q2)

| Métrica | Meta | Fracasso |
|---|---|---|
| Tenants pagantes | ≥ 5 | < 3 |
| MRR | R$ 5–10k | < R$ 3k |
| Churn 1º tri | < 10% | > 25% |
| Time-to-value | < 2h | > 4h |
| NPS pais | ≥ 40 | < 20 |
| NPS coordenadores | ≥ 50 | < 30 |
| Onboarding completion | > 80% | < 60% |
| Pais ativos (login semanal) | ≥ 30% | < 15% |

### 3.3 Proxy por sprint

Via `audit_events` desde Sprint A:
- Tempo médio relatório (`relatorio_prof`)
- Taxa envio vs abertura email
- Tentativas CSV import com erro / sucesso
- Tempo médio wizard onboarding

---

## 4. Pricing

Modelo **flat com tiers**, sem per-aluno. Validar valor em entrevistas R1.

| Tier | Alunos | Preço/mês | Inclui |
|---|---|---|---|
| **Starter** | até 100 | R$ 397 | Core LMS, email pais, 1 admin, 1 coord |
| **Pro** | até 300 | R$ 897 | + Analytics, audit completo, branding, 3 coords |
| **Business** | até 800 | R$ 1.997 | + Multi-coord ilimitado, SSO, prioritário |
| **Enterprise** | 800+ | Sob consulta | + Schema isolado, SLA |

**Trial:** 14d sem cartão. Setup gratuito ≤ 100 alunos (CSV import + call 1h).
**Failed payment:** graceful — primeiro mês read-only antes de bloquear.
**Gateway:** ASAAS (Q2). PIX recorrente + cartão + boleto.

---

## 5. Escopo Q1 (12 semanas, 6 sprints)

### 5.1 Sprint A — Research + Foundation (semanas 1–2)

**Objetivo:** validar mercado + base compliance que permeia Q1.

**Epics:** A1 Persona Discovery · A2 LGPD Foundation · A3 Audit Log

#### EPIC-A1 — Persona Discovery

| ID | User Story | AC |
|---|---|---|
| A1.1 | Como **founder**, quero entrevistar 5 coordenadores/diretores de escolas-alvo, para validar persona buyer | 5 entrevistas concluídas · roteiro padronizado · transcrições em `docs/research/r1-interviews/` · síntese em `docs/research/r1-summary.md` |
| A1.2 | Como **PM**, quero documentar ICP, para guiar feature/marketing | `docs/research/icp.md` cobrindo: cargo, dor, stack atual, WTP, ciclo compra |

**Owner:** Founder/PM. **Métrica:** 5 entrevistas em 14d · padrão de dor #1 identificado.

#### EPIC-A2 — LGPD Foundation

| ID | User Story | AC |
|---|---|---|
| A2.1 | Como **escola contratante**, preciso aceitar Política de Privacidade clara antes de cadastrar alunos | Doc PT-BR revisado por advogado · accept em `audit_events` (IP, UA, ts) · versionado |
| A2.2 | Como **responsável legal**, quero registrar consentimento explícito para dados do menor | Termo por aluno · flow no portal pais ou onboarding · registro auditável |
| A2.3 | Como **escola**, quero exportar todos os dados do tenant em JSON, para portabilidade LGPD | Endpoint admin-only · JSON estruturado · log audit |
| A2.4 | Como **escola**, quero deletar dados de aluno em até 30 dias após pedido | Soft delete imediato · hard delete agendado `pg_cron` 30d · log audit |
| A2.5 | Como **admin Javis**, quero contrato DPA padrão, para fechar vendas | DPA template em `docs/legal/dpa-template.md` · revisado advogado · anexado ao paywall |

**Owner:** Founder (advogado) + Dev. **Custo externo:** R$ 3–8k.
**Bloqueia:** A3.1 (audit_events precisa schema antes de coletar), todas features com dados de menores.

#### EPIC-A3 — Audit Log

| ID | User Story | AC |
|---|---|---|
| A3.1 | Como **admin**, quero log auditável de ações sensíveis | Tabela `audit_events` (id, tenant, user_id, ip, ua, action, entity_type, entity_id, before_json, after_json, ts) · RLS RESTRICTIVE · triggers em profiles, alunos, avaliacoes, system_settings |
| A3.2 | Como **dev**, quero helper SQL `log_audit_event()` | Função PL/pgSQL SECURITY DEFINER · documentada · usada por triggers e Edge Functions |
| A3.3 | Como **coord**, quero tela "Histórico de Alterações" | Route `/admin/audit` · paginação · filtros · export CSV |

**Owner:** Dev. **Bloqueia:** todas features subsequentes (instrumentar audit).

---

### 5.2 Sprint B — Onboarding (semanas 3–4)

**Objetivo:** time-to-value < 2h para escola 100 alunos.

**Epics:** B1 Wizard · B2 CSV Import · B3 Templates de Curso

#### EPIC-B1 — Wizard Primeiro Uso

| ID | User Story | AC |
|---|---|---|
| B1.1 | Como **admin novo tenant**, quero wizard 4 passos no primeiro login | (1) branding, (2) importar alunos, (3) 1ª turma, (4) convidar profs · skip permitido · progress bar |
| B1.2 | Como **admin**, quero pular e retomar depois | Flag `onboarding_completed` em `system_settings` por tenant · banner persiste até concluir |

#### EPIC-B2 — CSV Import

| ID | User Story | AC |
|---|---|---|
| B2.1 | Como **admin**, quero baixar template CSV alunos | `/public/templates/alunos-template.csv` · campos: nome, email_aluno, email_responsavel, idade, turma_cod |
| B2.2 | Como **admin**, quero upload CSV com validação prévia | Papaparse client-side · Zod validation · preview com linhas inválidas destacadas · bloqueio se erros · override individual |
| B2.3 | Como **admin**, quero progresso em tempo real | Upsert em chunks de 50 · barra · toast sucesso · log audit |
| B2.4 | Como **admin**, quero importar turmas via CSV também | Template análogo · FK validation contra cursos existentes |
| B2.5 | Como **admin**, quero exportar alunos atuais | Botão "Exportar" · download `.csv` · log audit |

#### EPIC-B3 — Templates de Curso

| ID | User Story | AC |
|---|---|---|
| B3.1 | Como **admin**, quero template de curso pré-pronto | 3 seed: "Anos Iniciais", "Fundamental II", "Médio" · clona pro tenant atual |
| B3.2 | Como **coord**, quero customizar template sem afetar outros tenants | Templates clonados (não referenciados) · edição local |

**Bloqueia:** Sprint C (notificar exige alunos), Sprint F (beta exige onboarding).
**Métrica:** wizard completion rate ≥ 70% nos primeiros 5 betas.

---

### 5.3 Sprint C — Notificação Externa (semanas 5–6)

**Objetivo:** fechar G3. Pais recebem comunicação real.

**Epics:** C1 Resend · C2 Templates · C3 Preferências

#### EPIC-C1 — Resend Integration

| ID | User Story | AC |
|---|---|---|
| C1.1 | Como **Javis ops**, quero domínio `notificacoes.javis.app` validado DNS | DKIM + SPF + DMARC · score deliverability > 95 |
| C1.2 | Como **dev**, quero Edge Function `send-email` parametrizada por template | `send-email(template_id, to, vars)` · Resend SDK · retry 3x exp · log audit |
| C1.3 | Como **dev**, quero observabilidade bounces/complaints | Webhook Resend → Edge Function → `responsaveis.email_status` |

#### EPIC-C2 — Templates Transactional

| ID | User Story | AC |
|---|---|---|
| C2.1 | Como **pai**, quero email convite com link configurar senha | Template "invite-responsavel" · token 7d · landing `/aceitar-convite/<token>` · redirect login após senha |
| C2.2 | Como **pai**, quero digest semanal | Cron `pg_cron` domingo 18h · agrega presença + atividades + tags da semana · 1 email/responsável (não por filho) |
| C2.3 | Como **coord**, quero alertas críticos por email | Trigger SQL · email coord + opcional responsável · throttle 1/dia por (aluno, tipo) |
| C2.4 | Como **admin tenant**, quero alerta trial expirando (-7 e -1) | Trigger via `trial_ends_at` em system_settings |

#### EPIC-C3 — Preferências

| ID | User Story | AC |
|---|---|---|
| C3.1 | Como **pai**, quero opt-in/out por canal e tipo | UI "Preferências" · checkboxes (digest, alertas, mensagens) · persiste em `responsaveis.preferencias_json` |
| C3.2 | Como **Javis**, quero footer unsubscribe one-click | Link em todo email · landing `/preferencias?token=...` |

**Bloqueia:** Sprint D (portal consome convite via email).
**Métrica:** delivery rate > 95% · open rate digest > 30%.

---

### 5.4 Sprint D — Portal Pais MVP (semanas 7–8)

**Objetivo:** fechar G2. Pais têm experiência própria.

**Epics:** D1 Modelo Responsavel · D2 Dashboard Pais · D3 Vínculo via Convite

#### EPIC-D1 — Modelo `Responsavel`

| ID | User Story | AC |
|---|---|---|
| D1.1 | Como **dev**, quero tabela `responsaveis` | (id, user_id, tenant, nome, email, telefone, preferencias_json, criado_em) · FK auth.users ON DELETE SET NULL · RLS RESTRICTIVE |
| D1.2 | Como **dev**, quero `viewer_dependentes` continuar como relação N:N pai↔aluno | Reuso · policies M1 aplicam |

#### EPIC-D2 — Dashboard Pais

| ID | User Story | AC |
|---|---|---|
| D2.1 | Como **pai**, quero página inicial com filhos vinculados | Route `/responsavel` · cards com nome, turma, foto · click → detalhe |
| D2.2 | Como **pai**, quero ver últimos 10 relatórios do filho | Lista cronológica `avaliacoes` (relatorio_aluno + relatorio_prof filtrados por aluno) · preview + detalhe |
| D2.3 | Como **pai**, quero gráfico presença 8 semanas | Chart recharts · barras semanais · cor verde/vermelho |
| D2.4 | Como **pai**, quero comportamento_tags top do mês | Cloud tags ou lista top-5 com count |
| D2.5 | Como **pai**, NÃO quero conseguir editar nada | Queries SELECT-only via RLS (sem INSERT/UPDATE policies para viewer role) |

#### EPIC-D3 — Vínculo via Convite

| ID | User Story | AC |
|---|---|---|
| D3.1 | Como **coord**, quero importar responsáveis via CSV | Reusa pipeline B2 · schema próprio |
| D3.2 | Como **coord**, quero "Convidar responsável" no card do aluno | Botão UI · dispara C2.1 · valida email duplicado |
| D3.3 | Como **pai**, quero aceitar convite de múltiplos filhos com mesma conta | Mesmo `user_id` em N rows `viewer_dependentes` · dashboard agrega |

**Bloqueia:** Sprint F (beta inclui portal pais).
**Métrica:** ≥ 50% dos responsáveis cadastrados ativam conta nos primeiros 14 dias.

---

### 5.5 Sprint E — Storage Abstraction + OneDrive (semanas 9–11)

**Objetivo:** abrir mercado M365 (R5). 3 semanas dev (buffer 1 semana).

**Epics:** E1 Interface · E2 OneDrive Backend · E3 Config por Tenant

#### EPIC-E1 — Interface `IntegracaoStorage`

| ID | User Story | AC |
|---|---|---|
| E1.1 | Como **dev**, quero abstrair Drive em interface comum | TS interface: `navigateFolder(path)`, `listFiles(folderId)`, `validateCredentials()` · `GoogleDriveStorage` mantém comportamento |
| E1.2 | Como **dev**, quero Edge Function `check-tarefa-storage` parametrizada | Refator de `check-drive-tarefa` v3 · escolhe backend via `system_settings.integration.storage.provider` |

#### EPIC-E2 — OneDrive Backend

| ID | User Story | AC |
|---|---|---|
| E2.1 | Como **admin M365**, quero conectar OneDrive via OAuth2 | Edge `connect-onedrive` · token encrypted em `system_settings.integration.onedrive.token_json` (admin-only RLS) |
| E2.2 | Como **dev**, quero `OneDriveStorage` implementar interface comum | MS Graph SDK · paridade funcional com Google |
| E2.3 | Como **admin**, quero validar credenciais OneDrive em 1 clique | Botão "Validar" → Edge `validate-onedrive` · `last_validated_at` atualizado |

#### EPIC-E3 — Config por Tenant

| ID | User Story | AC |
|---|---|---|
| E3.1 | Como **admin**, quero escolher Google Drive ou OneDrive nas configurações | Settings UI radio · persiste `provider` · wizard correspondente |
| E3.2 | Como **dev**, quero permitir 0 storage (escola não usa nenhum) | Provider = `"none"` desabilita features Drive · não bloqueia essencial |

**Risco:** OneDrive nunca testado. Buffer 1 semana embutido.
**Bloqueia:** Sprint F (beta com cliente M365 opcional).
**Métrica:** OneDrive E2E test passa · 1 escola M365 piloto valida.

---

### 5.6 Sprint F — Beta Launch + 1ª Venda (semana 12)

**Objetivo:** colocar 1 escola não-Javis usando em produção.

**Epics:** F1 Hardening · F2 Onboarding Piloto · F3 Feedback

#### EPIC-F1 — Hardening Pré-Beta

| ID | User Story | AC |
|---|---|---|
| F1.1 | Como **PM**, quero suite E2E mínima para fluxos críticos | Playwright tests: login, criar aluno, registrar aula, enviar relatório, login pai · roda em CI |
| F1.2 | Como **PM**, quero RLS smoke em CI semanal | GitHub Actions cron semanal · alert Slack se falhar |
| F1.3 | Como **PM**, quero monitoring básico | Sentry frontend · Supabase logs alert por email |

#### EPIC-F2 — Onboarding Piloto

| ID | User Story | AC |
|---|---|---|
| F2.1 | Como **founder**, quero call 1h com escola piloto | Roteiro `docs/playbook/onboarding-call.md` · gravação |
| F2.2 | Como **escola piloto**, quero período promocional | 3 meses gratuitos · trial estendido manual · upgrade automático depois |

#### EPIC-F3 — Coleta de Feedback

| ID | User Story | AC |
|---|---|---|
| F3.1 | Como **PM**, quero NPS in-app aos 14d e 30d | Widget Tally/Typeform embedded · trigger SQL |
| F3.2 | Como **PM**, quero call semanal 30 min com escola piloto | Calendário · notas `docs/research/beta-1-weekly.md` |
| F3.3 | Como **PM**, quero dashboard interno de uso | Plausible/Umami self-hosted ou query direto Supabase |

**Gate Q1→Q2:** 1 escola usando ≥ 4 semanas · NPS coletado · feedback em `docs/research/beta-1-summary.md`.

---

## 6. Dependências Cross-Sprint

```
Sprint A (audit + LGPD) ──┐
                          ├─→ Sprint B (alunos = dados sensíveis)
                          ├─→ Sprint C (email cobra LGPD)
                          ├─→ Sprint D (portal cobra consent)
                          └─→ Sprint F (beta exige LGPD)

Sprint B (onboarding) ────┬─→ Sprint C (notificar exige alunos)
                          ├─→ Sprint D (portal exige alunos vinculados)
                          └─→ Sprint F

Sprint C (email) ─────────┬─→ Sprint D (D3.2 convite usa template C2.1)
                          └─→ Sprint F

Sprint D (pais) ──────────┴─→ Sprint F

Sprint E (storage) ───────── Sprint F (M365 opcional)
```

**Caminho crítico:** A → B → C → D → F. Sprint E paralelo parcial com D se houver bandwidth.

---

## 7. Fora de Escopo (Backlog Q2)

- **Billing/ASAAS** (G9) — trial estendido manual no beta
- **Analytics longitudinal** (G5) — versão básica em D2.3/D2.4; full em Q2
- **PWA offline** (R7) — Q2 (Sprint I)
- **WhatsApp Business API** — Q2/Q3 conforme custo
- **Feature flags por tenant** (P3) — Q2 (Sprint J)
- **Audit log UI avançado** (filtros, drill-down) — Q2
- **Self-service signup público** — Q2 (Q1 é manual via founder)
- **SSO M365/Google** — Q2/Q3

---

## 8. Riscos & Mitigações

| ID | Risco | Prob | Impacto | Mitigação |
|---|---|---|---|---|
| RK-01 | Entrevistas R1 não acontecem em 2 sem | Méd | Alto | Founder pré-agenda esta semana via LinkedIn |
| RK-02 | Revisão LGPD atrasa Sprint A | Alta | Crítico | Template ANPD genérico · revisão pontual ao final |
| RK-03 | OneDrive mais complexo que estimado | Méd | Alto | Buffer 1 sem · plano-B: postpone OneDrive pra Q2 |
| RK-04 | Beta piloto desiste antes 4 sem | Méd | Crítico | Acompanhamento semanal · R$ 0 nos 3 primeiros meses · suporte hands-on |
| RK-05 | Resend entra em spam | Baixa | Alto | DKIM+SPF+DMARC desde dia 1 · domain warming · monitorar bounce rate |
| RK-06 | RLS bug vaza dados cross-tenant | Baixa | Crítico | RLS smoke em CI · review pareada · pen-test antes do primeiro real |
| RK-07 | Founder gargalo (vendas+suporte+dev) | Alta | Crítico | Documentar tudo · VA part-time no Sprint F se necessário |
| RK-08 | Concorrente lança feature similar | Baixa | Médio | Velocidade > perfeição · capturar 5 escolas antes |

---

## 9. Stakeholders & Responsabilidades

| Stakeholder | Papel | Decisões |
|---|---|---|
| **Founder (Ian)** | Sponsor + Dev + Sales | Pricing · advogado · entrevistas R1 · beta · go/no-go gates |
| **@analyst (Atlas)** | Discovery | Entregue — disponível pra pivôs |
| **@pm (Morgan)** | PRD owner | Refino por sprint · priorização · gates |
| **@architect (Vinci)** | Architecture | ADRs A3, D1, E1 · revisão multi-tenant Q2 |
| **@sm (River)** | Sprint planning | Quebra PRD em stories · sprint backlog · daily |
| **@dev (Dex)** | Implementação | Code execution |
| **@qa (Quinn)** | Quality gates | Test design · regression · NFR |
| **@devops (Gage)** | Infra + CI/CD | GitHub Actions · monitoring · backup |
| **Advogado externo** | LGPD/contratos | Política · DPA · termo · contrato cliente |

---

## 10. Próximos Handoffs

1. **@architect (Vinci)** — produzir ADRs:
   - `docs/adr/001-audit-log-design.md` (schema, triggers, performance)
   - `docs/adr/002-storage-abstraction.md` (interface, OneDrive specifics)
   - `docs/adr/003-responsavel-portal.md` (modelo dados, RLS strategy)

2. **@sm (River)** — quebrar PRD em stories AIOX:
   - Story files em `docs/stories/Q1-sprint-A-*.md` etc.
   - Sprint backlog em `docs/sprints/sprint-A.md`

3. **@qa (Quinn)** — test strategy:
   - NFR matrix por sprint
   - E2E flows mínimos (F1.1)
   - Coverage targets por epic

---

## 11. Apêndices

### 11.1 Glossário

- **Tenant** = escola cliente · isolada via `project_id` + RLS
- **MRR** = Monthly Recurring Revenue
- **DPA** = Data Processing Agreement
- **ICP** = Ideal Customer Profile
- **WTP** = Willingness To Pay
- **NPS** = Net Promoter Score
- **DAU/MAU** = Daily / Monthly Active Users

### 11.2 Referências

- Atlas Discovery Report (sessão anterior)
- Hardening commits: `dff9b3c` → `7166011`
- Test infra: `vitest.config.ts`, `src/test/`
- AIOX template: prd-tmpl.yaml (adaptado)

---

**Sign-off:**
- @pm (Morgan): ✅ entregue
- Founder: ⏳ revisão pendente
- @architect, @sm, @qa: aguardando handoff

— Morgan, navegando o produto 🧭

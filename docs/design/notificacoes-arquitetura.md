# Design: Arquitetura de Notificações (derivadas + persistidas + snapshot)

Status: Proposta · Data: 2026-06-25

## Motivação

Em produção, o painel do professor quebrou com `503` em `profiles`/`user_roles`/`aula_evidencias`
e "Falha ao carregar perfil/papéis". Causa-raiz: o scanner (`useAgendamentoScanner`, 60s)
materializava notificações de pendência no banco via `notificacoesStore.addMany`, que inseria
**linha-por-linha em `Promise.all`** (centenas de requests concorrentes) e, quando o store local
falhava ao carregar, reinseria tudo → flood de `23505` em `uq_notificacoes_dedup_scanner` →
pool de conexões esgotado → `503` em todo o app.

O hotfix (PR #4, `fix/notificacoes-insert-storm`) trocou o storm por `1 SELECT + 1 INSERT em lote`.
Estanca o incidente, mas mantém o anti-padrão: pendências **derivadas** sendo persistidas e
varridas a cada 60s. Este doc define a arquitetura definitiva.

## Princípio central

Separar notificações em **três classes** por natureza, não por tela:

| Classe | Natureza | Persistência | Geração |
|--------|----------|--------------|---------|
| **1. Pendência derivada** | função pura de `(estado, asOf)` | **nenhuma** | calculada on-demand |
| **2. Evento real** | fato que aconteceu | tabela `notificacoes` | escrito no momento do fato |
| **3. Crítica/punição** | derivada ao vivo, **congelada** no fechamento | snapshot append-only | live + snapshot no fechamento |

Regra de ouro: **só persiste o que não dá pra recalcular.** Pendência é recalculável → não vira linha.

---

## Classe 1 — Pendências derivadas (sem banco)

### Tipos
- plano de aula pendente
- plano já crítico (prazo passou)
- relatório do professor pendente / atrasado
- relatório de aluno pendente
- checklist pendente
- chamada pendente

### Onde derivar: **no Postgres, não no browser**
Computar pendência no cliente exige carregar agendamentos + evidências + relatórios + presenças
(o mesmo `select("*")` de tudo). O cálculo vai para **view/RPC SQL**, que devolve só contadores e
páginas — não linhas brutas.

#### RPC `get_pendencias_resumo(p_user_id uuid)`
Retorna apenas a contagem por severidade (1 round-trip leve, alimenta sino + header + cards do dashboard):
```jsonc
{ "critical": 0, "urgent": 3, "warning": 7, "info": 2 }
```
- Escopo por papel: professor vê só as suas; coordenação/admin veem agregado do projeto.
- `SECURITY INVOKER` → RLS aplica o escopo de projeto automaticamente.

#### RPC `get_pendencias(p_user_id uuid, p_severidade text default null, p_limit int default 20, p_offset int default 0)`
Lista paginada, chamada **só quando o sino abre**:
```jsonc
[
  { "tipo": "plano_pendente", "severidade": "urgent", "agendamento_id": "...",
    "titulo": "Plano de aula pendente", "contexto": "Curso · Turma · 25/06 07:30–08:30",
    "as_of": "2026-06-25T22:00:00Z", "prazo": "2026-06-25T10:30:00Z" }
]
```
- `p_severidade` filtra; sem filtro, ordena por severidade desc.
- Cap por severidade (top N urgentes; warning/info lazy no scroll). Nunca computa milhares.

### Regra pura `(estado, asOf) → pendência`
A lógica de "está pendente / crítico?" é **uma função pura** parametrizada por um instante `asOf`:
- Live: `asOf = now()`.
- Snapshot (classe 3): `asOf = fechamento`.
- Mesma função nos dois → o que o professor vê ao vivo == o que congela. Sem duas lógicas divergindo.
- **Pré-requisito:** o cálculo de prazo precisa ser **timezone-correto**. O teste `aula-evidencias >
  calcula prazo do plano duas horas antes` falha hoje com 12h de diferença (parsing local-vs-UTC).
  Corrigir o TZ é fundação — sem isso, pendência e folha herdam o erro.

### Sem polling, sem read-state
- **Zero loop de fundo.** Recalcula o resumo: no mount, ao focar/navegar a aba, e otimisticamente
  nas ações que mudam estado (submeter plano, registrar relatório). Mais fresco e mais barato que poll.
- **Sem "lida" para derivadas.** Pendência acionável **some quando resolvida** → o badge é estado
  atual ("3 coisas pra fazer"), não "3 novas". Rastreio de leitura só na Classe 2.

---

## Classe 2 — Eventos reais (persistidos)

### Tipos
- convite enviado
- responsável vinculado
- mensagem administrativa
- relatório consolidado gerado
- alteração manual feita por coordenador/admin
- aviso institucional

### Persistência
- Continuam na tabela `notificacoes` — são fatos, não recalculáveis. **Raros** → sem flood.
- Escrita idempotente via RPC `insert_notificacoes_dedup(p_rows jsonb)` (set-based,
  `ON CONFLICT ... DO NOTHING` mirando o índice parcial — resolve o que o `upsert` do PostgREST
  não infere). Sem `Promise.all`, sem perda de atomicidade.
- **Unread via `last_seen`:** 1 linha por usuário (`notificacao_seen_at`); badge "novidades" =
  eventos com `created_at > last_seen`. Não rastreia leitura por linha.
- **Retenção:** eventos antigos lidos viram arquivados (flag/cold) — mantém a tabela pequena
  (já tem ~577 linhas).

---

## Classe 3 — Críticas / punições (snapshot auditável)

A "notificação" da crítica é **derivada** (Classe 1), mas o impacto em relatório/folha precisa de
**rastreabilidade imutável**.

- **Durante o período:** críticas calculadas ao vivo (`asOf = now`), só informativas.
- **No fechamento de relatório/folha:** grava um **snapshot append-only** com a regra pura
  (`asOf = fechamento`):

```sql
create table public.criticas_fechamento (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null,
  professor_id text not null,
  agendamento_id uuid,
  motivo       text not null,
  valor_impacto numeric,
  periodo      text not null,        -- ex.: '2026-06'
  as_of        timestamptz not null, -- instante de avaliação congelado
  fechado_em   timestamptz not null default now(),
  fechado_por  uuid not null
);
-- append-only: sem UPDATE/DELETE em produção
```

- **Correção pós-fechamento** (ex.: admin valida uma evidência atrasada depois) = **lançamento
  compensatório** (novo registro de ajuste), **nunca** edita o snapshot. É ledger → auditoria
  completa, história não reescrita, sem injustiça.
- O snapshot é a **fonte de verdade da folha**; a visão live é apenas advisory.

---

## Fluxo UX

```
Header/sino
  └─ get_pendencias_resumo()  →  badge: "3 urgentes" (+ critical/warning/info)
        │ (clique)
        ▼
Central de notificações
  ├─ Pendências derivadas (atuais)  ← get_pendencias(severidade, page)
  └─ Eventos reais (persistidos)    ← notificacoes (last_seen p/ unread)
```

- Sino carrega **só contadores**. Lista materializa **ao abrir**.
- Dashboard (cards AULAS/TAREFAS) sai do **mesmo** `get_pendencias_resumo` — 1 computação serve
  sino + header + dashboard.

## Taxonomia de severidade

Mapa **tipo → severidade** num único lugar (config/tabela, não `if` espalhado):

| Severidade | Significado | Exemplo |
|-----------|-------------|---------|
| `critical` | já gera crítica ou bloqueia processo | plano crítico (prazo passou e conta na folha) |
| `urgent` | precisa ação **hoje** | relatório atrasado, chamada do dia |
| `warning` | pendente, ainda no prazo | plano pendente com prazo futuro |
| `info` | informativo, sem ação | aviso institucional, responsável vinculado |

O usuário não vê ruído: vê "3 urgentes", entra e resolve.

---

## O que sai (deletar na refatoração)

- Caminho de **escrita do scanner** (`notificacoesStore.addMany` chamado pelo scanner).
- `cleanupOrphans` (não há linha órfã se não persiste pendência).
- Dependência do índice parcial `uq_notificacoes_dedup_scanner` para pendências (mantém só se
  os eventos da Classe 2 precisarem — chave de dedup própria).
- `useAgendamentoScanner` (intervalo 60s) → vira função utilitária pura `calcularPendencias(estado, asOf)`
  usada pela UI e espelhada na RPC SQL.

## Sequência de implementação

1. **[FEITO] Hotfix** `fix/notificacoes-insert-storm` (PR #4) — estanca o 503.
2. **Corrigir TZ do prazo** (`aula-evidencias`) — pré-requisito de 5. Teste 12h-off deve passar.
3. **Pendências derivadas on-demand**: RPCs `get_pendencias_resumo` + `get_pendencias`; UI consome;
   **apaga scanner-write + cleanupOrphans + dedup**. Severidade num mapa único.
4. **Eventos persistidos**: `insert_notificacoes_dedup` (RPC) + `last_seen` + retenção.
5. **Snapshot de críticas**: tabela `criticas_fechamento` append-only + lançamentos compensatórios,
   **somente após (2)**.

## Critérios de aceite

- [ ] Sino/header fazem **1** chamada leve de contadores (não carregam tabelas inteiras).
- [ ] Nenhum loop de fundo escrevendo no banco; pendência nunca vira `INSERT`.
- [ ] Pendência derivada e snapshot usam a **mesma** função `(estado, asOf)`.
- [ ] Cálculo de prazo timezone-correto (teste do prazo passa).
- [ ] `criticas_fechamento` é append-only; correção = ajuste, não edit.
- [ ] Eventos reais persistem via RPC idempotente; sem `Promise.all` de N inserts.
- [ ] Severidade definida num único mapa tipo→severidade.

## Riscos

- **TZ do prazo** entrar na folha errado (mitigado pelo passo 2 como pré-requisito).
- Custo das RPCs sob volume — paginar/cap por severidade; índices em `agendamentos(project_id, data)`,
  `aula_evidencias(agendamento_id)`.
- Coerência live↔snapshot — garantida pela função pura única; cobrir com teste que compara os dois.

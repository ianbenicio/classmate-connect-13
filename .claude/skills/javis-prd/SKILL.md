---
name: javis-prd
description: Template PRD enxuto pra Javis. Use quando user pedir PRD, plano de sprint, breakdown de epic, user stories com AC, ou roadmap por trimestre. Output salva em docs/prd-*.md. pt-BR. Sem elicitação interativa por padrão — entrega completo baseado em input.
user-invocable: true
---

# javis-prd

Product Manager pra Javis. Produz PRD direto. Sem cerimônia. pt-BR.

## Quando invocar

- "Faz PRD de Q2"
- "Documenta esse sprint"
- "Quebra essa feature em user stories"
- "Plano pra próximas 12 semanas"

## Estrutura padrão

```markdown
# PRD <escopo> — Javis

**Data:** YYYY-MM-DD
**Status:** Draft / Aprovado
**Duração:** N semanas
**Autor:** javis-prd

## 1. Visão Geral
1.1 Produto (1 parágrafo)
1.2 Posicionamento (1 frase)
1.3 Decisão estratégica (Caminho A/B/C)

## 2. Personas
2.1 Buyer (cargo, dor, WTP, decisor único?)
2.2 Usuários (tabela: persona · % uso · necessidade)

## 3. Objetivos & Métricas
3.1 Gate de saída (1 critério não-negociável)
3.2 Meta de período (tabela: métrica · meta · threshold fracasso)
3.3 Proxy por sprint

## 4. Pricing (se aplicável)
Tabela: tier · limite · preço · inclui
Trial, gateway, failed payment

## 5. Escopo (sprints)
Por sprint:
- Objetivo (1 frase)
- Epics
- User stories: ID | Story | AC

## 6. Dependências cross-sprint (ASCII)

## 7. Fora de Escopo (backlog)

## 8. Riscos (tabela: ID · risco · prob · impacto · mitigação)

## 9. Stakeholders

## 10. Próximos Handoffs
```

## User story format

```
Como **<persona>**, quero <ação>, para <benefício>
AC: <criterios mensuráveis separados por · >
```

## Princípios

- **MoSCoW por sprint**: Must = essenciais; Should = 2-3 bonus; Could/Won't = backlog
- **AC mensurável**: "função X retorna Y em Z ms" > "deve ser rápido"
- **Caminho crítico explícito**: identificar sprint-bloqueador
- **Não inventar requisito**: se input não cobre, pergunta ou flag `[REVISITAR]`

## Output

- Salvar em `docs/prd-<escopo>.md`
- Markdown puro · tabelas standard
- Numeração sequencial
- Fim: sign-off + signature (`— javis-prd 🧭`)

## Não fazer

- ❌ Código
- ❌ ADR arquitetural (delegate javis-supabase / architect)
- ❌ Discovery (já feito por javis-discover)
- ❌ AC vago tipo "a definir"
- ❌ Stories tipo "implementar feature X" — sempre "Como X quero Y para Z"

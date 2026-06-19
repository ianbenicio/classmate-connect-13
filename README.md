# ClassMate Connect 13

SaaS academico da Javis Game Academy para gestao de cursos, turmas, aulas,
professores, alunos, relatorios, evidencias de aula e acompanhamento de
progresso.

## Links

- App online: https://classmate-connect-13.vercel.app/
- Repositorio: https://github.com/ianbenicio/classmate-connect-13
- Supabase project ref: `pbzkbwkzexhtdfuyaqiv`

## Stack

- React 19 + TanStack Router/Start em modo SPA
- Vite
- Supabase Auth, Postgres, Storage e Edge Functions
- Vercel para o frontend
- GitHub Actions para migrations Supabase

## Desenvolvimento local

```powershell
cd C:\Users\ianfl\Documents\ClassMate\classmate-connect-13
npm install
npm run dev
```

Variaveis locais ficam em `.env`, que nao deve ser versionado. Use
`.env.example` como referencia.

## Scripts principais

```powershell
npm test
npm run build
npm run lint
```

Estado conhecido em 2026-06-19:

- `npm test` passa: 9 arquivos, 131 testes.
- `npm run build` passa, com warnings conhecidos de chunk grande e import
  dinamico/estatico em `relatorios-store`.
- `npm run lint` ainda falha globalmente com pendencias preexistentes.

## Documentacao operacional

O runbook principal esta em
[`docs/operations/deploy-and-supabase.md`](docs/operations/deploy-and-supabase.md).
Ele registra deploy Vercel, migrations Supabase, reparo de historico feito em
2026-06-18/2026-06-19, validacoes e lacunas conhecidas.

## Regras AIOX importantes

- Nao alterar `.claude/` sem pedido explicito.
- Desenvolvimento deve seguir stories em `docs/stories/`.
- Push deve ser feito com autoridade `@devops`; o hook local bloqueia `git push`
  sem `AIOX_AGENT=@devops`.

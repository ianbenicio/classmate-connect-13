# Story: Headers de seguranca no Vercel

## Status

Concluida

## Contexto

O sistema precisa de uma camada inicial de protecao HTTP para reduzir risco de injecao, clickjacking, indexacao publica e uso indevido de APIs do navegador. Como o projeto e uma SPA publicada na Vercel, os headers devem ser aplicados pelo `vercel.json` em todas as rotas.

## Criterios de aceite

- [x] Definir Content-Security-Policy global.
- [x] Bloquear uso do sistema dentro de iframe.
- [x] Ativar `X-Content-Type-Options: nosniff`.
- [x] Definir politica de referrer.
- [x] Restringir permissoes sensiveis do navegador.
- [x] Marcar o sistema como `noindex`.
- [x] Validar que o build continua funcionando.

## Implementacao

- `vercel.json` agora aplica headers globais para `/(.*)`.
- CSP permite conexao com Supabase via HTTPS/WSS e restringe objetos, frames e origem base.
- `script-src` e `style-src` mantem `'unsafe-inline'` porque o shell atual gerado pelo TanStack/Vite injeta scripts e estilos inline durante a hidratacao. Essa permissao deve ser endurecida futuramente com nonce/hash quando o pipeline suportar isso sem quebrar o app.

## File List

- `vercel.json`
- `docs/stories/2026-06-19-security-headers-vercel.md`

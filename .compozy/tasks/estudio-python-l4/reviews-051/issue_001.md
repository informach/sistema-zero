---
status: resolved
file: packages/members/src/interfaces/http/routes/live-workspaces.routes.ts
line: 119
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Rejeição assíncrona do poll escapa da fronteira HTTP

## Review Comment

O handler GET `/members/live/workspaces/:id` devolvia diretamente um ternário entre as Promises de `get` e `poll`, sem ser declarado `async`. Na compilação AOT atual de Elysia/Bun, a rejeição dessas Promises escapava de `onError`: `app.handle()` rejeitava com `LiveAccessError` em vez de produzir a resposta403 definida pelo mapeamento de domínio. O probe do navegador devolvia500/falha de GET nesse caminho. A interface interpreta500 como falha transitória e não executa a invalidação imediata reservada a401/403/404, além de apresentar recuperação de conexão indevida. A rota é compartilhada por projetos JavaScript e Python.

Reprodução permanente registrada pelo root: `l6-live-poll-http-1.log`,2pass/1fail/20expect. O caso de grant revogado recebeu a instância de `LiveAccessError` onde exigia `Response`. Reproduzido independentemente com o mesmo serviço real e um handler pré-correção de ambos os ramos em `.cache/studio-python-l0/review051-http-revalidate.ts`: tanto leitura integral quanto poll escapam do tratamento HTTP.

Declarar explicitamente o handler `async` preserva a semântica de leitura e permite que o compilador trate a rejeição pela fronteira HTTP existente. Não alterar `readOnlyAllowed`, política de acesso nem converter erro de autorização em sucesso/recuperação. Verificar403/404, biblioteca legitimamente somente leitura e ausência de alterações no workspace.

## Triage

- Decision: `FIXED`
- Notes: Root corrigiu exclusivamente a declaração `async` desse handler. A revalidação independente confirma a causa no pré-código e os dois ramos da rota real corrigida. Não houve edição de produção ou teste permanente pelo revisor. Nenhum novo bypass de autorização foi demonstrado.

## Revalidation

- `bun .cache/studio-python-l0/review051-http-revalidate.ts` — exit0,19 verificações. Pré-código: os dois ramos rejeitam fora de `onError`. Rota corrigida real: grant revogado produz403/`LIVE_ACCESS_DENIED`, projeto ausente produz404/`LIVE_NOT_FOUND`, ambos com fluxo HTTP resolvido; proprietário na biblioteca conserva200/readOnly. Respostas de recusa têm `private, no-store`; workspace integral permanece igual.
- `bun test tests/integration/studio-live-runtime.test.ts`, em Members —3pass/0fail/22expect,exit0. Revalidação fresca da negativa permanente e regressões de autorização/assistência.
- Biomecheck do arquivo da rota —exit0,nenhuma alteração. Sem browser,TSC,SQL ou qualificação de autenticação/desempenho nesta revisão. A hipótese de relação com os timeouts de handoff Edge exige repetição de navegador pelo executor principal; não foi tratada aqui como causa comprovada.

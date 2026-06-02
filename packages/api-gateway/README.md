# @sistemazero/api-gateway

**API Gateway** do sistema-zero: a porta de entrada única para os serviços internos.
Faz roteamento/proxy, autenticação plugável (HMAC, JWT, sessão), rate limiting, load
balancing, CORS e transformação de requisições — tudo dirigido por uma **config
declarativa** e de forma **stateless** (pronto para escalar em N réplicas).

> **Estado atual:** **BFF de pagamentos do funil** (HMAC de borda + re-assina ao
> `payments`) **e** ponto de verificação/autorização de usuários. A auth **JWT está
> ligada**: o gateway verifica tokens do **[@sistemazero/auth](../auth)** (HS256
> e/ou RS256 via JWKS), resolve o usuário das claims, aplica **RBAC** por rota
> (`authorize`) e injeta `X-Auth-User-*` confiável ao upstream. Sessão opaca segue
> pronta porém dormente.

## O que ele faz

- Recebe toda requisição de cliente na **borda** e aplica políticas antes de
  encaminhar: resolução de rota/versão, CORS, **autenticação**, **rate limit** e
  transformações.
- Encaminha (proxy) para o serviço upstream certo com **streaming** (sem
  bufferizar o corpo) e **resiliência**: load balancing, circuit breaker, health
  check (ativo + passivo) e retry (só métodos idempotentes).
- Autentica o cliente de borda e, quando configurado, **re-assina** a chamada ao
  upstream como seu próprio consumidor (`resign`) — o segredo do upstream nunca
  sai do gateway.
- Valida **webhooks** recebidos (assinatura HMAC), injeta um token interno e
  reescreve o caminho antes de repassar.
- Expõe `GET /health` (liveness), `GET /readyz` (readiness, com graceful drain) e
  `GET /metrics` (JSON ou Prometheus) para operação.

## Arquitetura

Hexagonal (Ports & Adapters). O caminho da requisição é uma **Chain of
Responsibility** explícita (não middleware do Elysia): um catch-all monta o
contexto e roda os estágios em ordem; os finalizers (log, métricas, headers,
refund) **sempre** rodam.

```
src/
├── domain/           # núcleo puro: portas (GatewayStore, LB, breaker…) + tipos
├── application/      # pipeline (CoR), auth chain, rate limiter, transforms
├── infrastructure/   # adapters: store (memory/redis), proxy (fetch), LB, breaker,
│                     #   health, config (Zod), routing, upstream (resign)
├── interfaces/http/  # app Elysia, rotas health/metrics, error-handler
└── composition-root  # fábrica que conecta tudo (sem container de DI)
```

Todo estado mutável compartilhado (rate limit, cache de sessão/JWKS, circuit
breaker) fica atrás de **uma** porta `GatewayStore` (adapter in-memory para dev;
Redis para escala) → o gateway é stateless e roda em N réplicas sem líder.

Detalhes profundos de arquitetura, armadilhas e decisões estão em
[`CLAUDE.md`](./CLAUDE.md).

## Setup rápido

```bash
# 1. Instale as dependências (na raiz do monorepo)
bun install

# 2. Configure o ambiente
cp .env.example .env
# edite .env: URLs dos upstreams e os segredos HMAC (>= 16 chars)

# 3. Suba o gateway em modo dev
bun run dev
```

As rotas/serviços expostos vivem em [`gateway.config.ts`](./gateway.config.ts) —
**adicionar/expor um serviço = editar esse arquivo**, não código. A config é
validada no boot (fail-fast).

## Variáveis de ambiente

Veja [`.env.example`](./.env.example) para a lista completa e comentada. As
principais:

| Variável | Descrição |
|----------|-----------|
| `PORT` | porta HTTP (default `3000`) |
| `STATE_BACKEND` | `memory` (1 réplica) ou `redis` (escala) |
| `REDIS_URL` | obrigatória quando `STATE_BACKEND=redis` |
| `TRUST_PROXY` / `TRUSTED_PROXY_HOPS` | resolução do IP do cliente atrás de proxy/LB |
| `PAYMENTS_URL` / `FUNNEL_URL` | URLs dos upstreams (lidas pela `gateway.config.ts`) |
| `GATEWAY_CONSUMER_ID` / `GATEWAY_HMAC_SECRET` | credenciais do gateway para re-assinar ao upstream (`resign`) |
| `FUNNEL_HMAC_SECRET` | segredo HMAC de borda do consumidor `funnel` |
| `FUNNEL_INTERNAL_TOKEN` | token interno injetado ao repassar o webhook |
| `RATE_LIMIT_*` | rate limit global default |
| `JWT_HS256_SECRET` | segredo HS256 compartilhado com o `auth` (verifica tokens HS256 sem JWKS) |
| `JWT_JWKS_URL` / `JWT_ISSUER` / `JWT_AUDIENCE` / `JWT_ALGORITHMS` | auth JWT via JWKS (RS256). Aponte p/ `<auth>/auth/.well-known/jwks.json` |
| `AUTH_URL` | URL do serviço de identidade `@sistemazero/auth` (lida pela `gateway.config.ts`) |

> ⚠️ Segredos HMAC precisam de **≥ 16 caracteres** — um valor vazio/curto **falha
> no boot** (evita auth com chave efetivamente vazia).

## Comandos

| Comando | O quê |
|---------|-------|
| `bun run dev` | servidor com hot reload |
| `bun run start` | servidor (produção) |
| `bun run typecheck` | checagem de tipos |
| `bun test` | testes (unit + integração via `app.handle`) |
| `bun run check` | Biome (lint + format) |
| `bun run check:fix` | Biome com correção automática |

Veja o [`CLAUDE.md`](./CLAUDE.md) para detalhes de cada estágio do pipeline,
gotchas e pontos em aberto.

## Deploy

Serviço Railway separado via [`railway.json`](./railway.json) (não repontar o
`railway.json` da raiz, que é do payments). Dockerfile `oven/bun:1`, build context
= raiz do repo. Para escalar: `STATE_BACKEND=redis` + `REDIS_URL` e alcance os
upstreams pela rede privada (ex.: `http://payments.railway.internal:3001`).

## Stack

- **Runtime:** Bun
- **Linguagem:** TypeScript (ESM)
- **HTTP:** Elysia
- **Auth:** jose (JWT/JWKS) + HMAC (core)
- **Estado:** in-memory ou Redis (cliente nativo do Bun)
- **Validação:** Zod

## Licença

Privado / proprietário. Uso interno do sistema-zero.

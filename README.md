# Sistema Zero

Monorepo (Bun + TypeScript) do **Sistema Zero**: um funil de vendas com checkout,
identidade e pagamentos, atrás de um API Gateway. Cada serviço é um pacote em
`packages/*`, deployável de forma independente (Railway), compartilhando uma lib
comum e **um único Postgres** (um schema por serviço).

## Arquitetura

```
            navegador / cliente
                    │
        ┌───────────▼───────────┐
        │   @sistemazero/funnel │  Astro 6 + ilhas React (landing/quiz/checkout/admin)
        └───────────┬───────────┘
                    │  HMAC de borda (consumer `funnel`)
        ┌───────────▼─────────────────────────────┐
        │        @sistemazero/api-gateway          │  borda (PEP): roteamento, auth (HMAC/JWT),
        │  proxy · rate-limit · LB · CORS · authz  │  RBAC, rate limit, LB, transforms, logging
        └───┬───────────────┬──────────────────┬───┘
            │ resign (HMAC)  │ verifica JWT      │ roteia /auth/*
   ┌────────▼──────┐  ┌──────▼───────┐   ┌───────▼────────┐
   │ @s/payments   │  │ (claims →    │   │  @s/auth (IdP) │  registro/login + JWT
   │ Pix/boleto/   │  │  X-Auth-*)   │   │  access+refresh│  (access carrega a identidade)
   │ cartão (Efí)  │  └──────────────┘   └────────────────┘
   └───────────────┘
```

- **funnel** nunca chama o payments direto — sempre via o gateway (BFF).
- O **gateway** é a borda: autentica (HMAC sistema-a-sistema **e** JWT de usuário),
  resolve o usuário das claims, aplica **RBAC** por rota e repassa identidade
  confiável (`X-Auth-User-*`) ao upstream. Não tem banco (stateless; Redis opcional).
- O **auth** é o emissor de identidade (IdP); o gateway verifica os tokens dele.

## Pacotes

| Pacote | Porta | O quê |
|---|---|---|
| [`@sistemazero/api-gateway`](packages/api-gateway) | 3000 | Borda/PEP: proxy, auth (HMAC+JWT), RBAC, rate limit, LB, CORS, transforms |
| [`@sistemazero/payments`](packages/payments) | 3001 | Pagamentos (Pix/boleto/cartão + assinaturas) via **Efí Pay** — DDD/Hexagonal |
| [`@sistemazero/auth`](packages/auth) | 3002 | Identidade (IdP): registro/login + emissão de JWT (access/refresh), RBAC |
| [`@sistemazero/catalog`](packages/catalog) | 3003 | Catálogo: produtos, combos e ofertas (fonte da verdade comercial) + entitlements — DDD/Hexagonal |
| [`@sistemazero/funnel`](packages/funnel) | 4321 | Funil de vendas (Astro 6 + ilhas React): quiz → vendas → checkout → admin |
| [`@sistemazero/core`](packages/core) | — | Lib compartilhada (security/logging/errors/result/http), sem framework |
| [`@sistemazero/tui`](packages/tui) | — | UI de terminal (React + OpenTUI) |

## Banco de dados (padrão do monorepo)

**Um único Postgres** (`sistemazero`), com **um schema por bounded context** —
isolado por `pgSchema` no Drizzle:

- `payments` → schema `payments` · `funnel` → schema `funil` · `auth` → schema `auth` ·
  `catalog` → schema `catalog`.
- O gateway/core/tui **não** têm banco.
- Cada serviço tem **journal de migrations próprio** (`<serviço>_migrations` no schema
  `drizzle`) — NÃO compartilhe `__drizzle_migrations` entre pacotes (a dedupe por
  `created_at` pularia migrations de outro pacote).

```bash
# Postgres local (Docker), 1 banco para todo o monorepo:
docker run -d --name pg-payments -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sistemazero -p 5433:5432 postgres:16

# Migrations (cada serviço cria o seu schema):
bun run --filter @sistemazero/payments db:migrate
bun run --filter @sistemazero/funnel   db:migrate
bun run --filter @sistemazero/auth     db:migrate
bun run --filter @sistemazero/catalog  db:migrate   # depois: db:seed (produto + oferta atuais)
```

## Setup

```bash
bun install                       # instala o workspace inteiro
# copie o .env.example → .env de cada pacote em packages/*/ e preencha
```

Segredos que precisam **bater entre serviços** (ver os `.env.example`):
`JWT_HS256_SECRET` (auth = gateway), `FUNNEL_HMAC_SECRET`/`FUNNEL_INTERNAL_TOKEN`
(funnel = gateway), `GATEWAY_HMAC_SECRET` (gateway = consumer `gateway` no payments).

## Comandos (raiz)

| Comando | O quê |
|---|---|
| `bun run dev:gateway` / `dev:payments` / `dev:auth` / `dev:catalog` / `dev:funnel` | sobe cada serviço |
| `bun run test:gateway` / `test:payments` / `test:auth` / `test:catalog` / `test:funnel` | testes por serviço |
| `bun run db:auth:migrate` / `db:funnel:migrate` / `db:catalog:migrate` / `db:catalog:seed` | migrations + seed (atalhos) |
| `bun run check` / `check:fix` | Biome (lint + format) no monorepo |

> Typecheck/testes por pacote: `bun run --filter <nome> typecheck` / `test`
> (rode `bun test` com o sandbox desabilitado — ver gotchas nos CLAUDE.md).

## Stack

Bun · TypeScript (ESM) · Elysia (HTTP) · Astro 6 + React 19 (funnel) ·
PostgreSQL + Drizzle · Zod · jose (JWT) · Biome.

Detalhes de cada serviço (arquitetura, decisões, gotchas) nos `README.md`/`CLAUDE.md`
de cada pacote.

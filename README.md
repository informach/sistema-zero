# Sistema Zero

Monorepo (Bun + TypeScript) do **Sistema Zero**: funil de vendas com checkout,
identidade, pagamentos, área do aluno, painel admin e mensageria, atrás de um API
Gateway. Cada serviço é um pacote em `packages/*`, deployável de forma independente
(Railway), compartilhando uma lib comum e **um único Postgres** (um schema por serviço).

## Arquitetura

```
                       navegador / cliente
                │                │                 │
    ┌───────────▼──────┐ ┌───────▼────────┐ ┌──────▼──────────┐
    │ @s/funnel (4321) │ │ @s/admin (3005)│ │ @s/community    │  frontends:
    │ Astro 6 + ilhas  │ │ Next.js (BFF)  │ │ (3007) Next.js  │  funil · painel ·
    └───────────┬──────┘ └───────┬────────┘ └──────┬──────────┘  área do aluno
                │ HMAC de borda  │ Bearer (cookie HttpOnly)
        ┌───────▼────────────────▼─────────────────▼───┐
        │           @sistemazero/api-gateway (3000)     │  borda (PEP): roteamento, auth
        │     proxy · rate-limit · LB · CORS · authz    │  (HMAC/JWT), RBAC, transforms
        └──┬─────────┬─────────┬─────────┬─────────┬───┘
           ▼         ▼         ▼         ▼         ▼
      @s/payments @s/auth  @s/catalog @s/members @s/messaging
        (3001)    (3002)    (3003)     (3004)     (3006)
      Pix/boleto/  IdP:JWT  produtos/  matrícula+ e-mail (SendGrid)
      cartão (Efí) +reset   ofertas    cursos     + WhatsApp (Evolution)
```

- Os **frontends nunca chamam os serviços direto** — sempre via o gateway (BFF).
- O **gateway** é a borda: autentica (HMAC sistema-a-sistema **e** JWT de usuário),
  resolve o usuário das claims, aplica **RBAC** por rota e repassa identidade
  confiável (`X-Auth-User-*`) ao upstream. Não tem banco (stateless; Redis opcional).
- O **auth** é o emissor de identidade (IdP); o gateway verifica os tokens dele.
  Também cuida do reset/definição de senha (tokens single-use por e-mail) e do
  **OTP por código** (login passwordless + recuperação de senha).
- **catalog** é a fonte de preço/inclusões (consumido pelo funil); **members**
  materializa o acesso do aluno (matrícula concedida por webhook pós-pagamento) e
  serve os cursos/aulas; **payments** expõe também "minhas compras" ao aluno
  (`GET /payments/my`); **messaging** envia os transacionais (boas-vindas/reset).

## Pacotes

| Pacote | Porta | O quê |
|---|---|---|
| [`@sistemazero/api-gateway`](packages/api-gateway) | 3000 | Borda/PEP: proxy, auth (HMAC+JWT), RBAC, rate limit, LB, CORS, transforms |
| [`@sistemazero/payments`](packages/payments) | 3001 | Pagamentos (Pix/boleto/cartão + assinaturas) via **Efí Pay** — DDD/Hexagonal |
| [`@sistemazero/auth`](packages/auth) | 3002 | Identidade (IdP): registro/login + JWT (access/refresh), RBAC, reset/definição de senha |
| [`@sistemazero/catalog`](packages/catalog) | 3003 | Catálogo: produtos, combos e ofertas (fonte da verdade comercial) + entitlements — DDD/Hexagonal |
| [`@sistemazero/members`](packages/members) | 3004 | Área de membros: matrícula/entitlement + cursos/aulas (blocos polimórficos) + progresso — DDD/Hexagonal |
| [`@sistemazero/admin`](packages/admin) | 3005 | Painel admin (Next.js 16, BFF via gateway): catálogo, usuários, pagamentos, membros |
| [`@sistemazero/messaging`](packages/messaging) | 3006 | Mensageria transacional: e-mail (SendGrid) + WhatsApp (Evolution), templates no banco — DDD/Hexagonal |
| [`@sistemazero/community`](packages/community) | 3007 | Área do aluno (Next.js 16, BFF via gateway): login (senha/OTP), cursos/player, catálogo "todos os cursos", perfil c/ foto, compras |
| [`@sistemazero/funnel`](packages/funnel) | 4321 | Funil de vendas (Astro 6 + ilhas React): quiz → vendas → checkout (Pix/cartão/boleto) → admin |
| [`@sistemazero/core`](packages/core) | — | Lib compartilhada (security/logging/errors/result/http), sem framework |
| [`@sistemazero/tui`](packages/tui) | — | UI de terminal (React + OpenTUI) |

## Banco de dados (padrão do monorepo)

**Um único Postgres** (`sistemazero`), com **um schema por bounded context** —
isolado por `pgSchema` no Drizzle:

- `payments` → schema `payments` · `funnel` → schema `funil` · `auth` → schema `auth` ·
  `catalog` → schema `catalog` · `members` → schema `members` · `messaging` → schema `messaging`.
- O gateway/admin/community/core/tui **não** têm banco (admin/community são BFFs do gateway).
- Cada serviço tem **journal de migrations próprio** (`<serviço>_migrations` no schema
  `drizzle`) — NÃO compartilhe `__drizzle_migrations` entre pacotes (a dedupe por
  `created_at` pularia migrations de outro pacote).

```bash
# Postgres local (Docker), 1 banco para todo o monorepo:
docker run -d --name pg-payments -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sistemazero -p 5433:5432 postgres:16

# Migrations (cada serviço cria o seu schema):
bun run --filter @sistemazero/payments  db:migrate
bun run --filter @sistemazero/funnel    db:migrate
bun run --filter @sistemazero/auth      db:migrate
bun run --filter @sistemazero/catalog   db:migrate   # depois: db:seed (produto + oferta atuais)
bun run --filter @sistemazero/members   db:migrate   # depois: db:seed (curso de exemplo)
bun run --filter @sistemazero/messaging db:migrate   # depois: templates:seed (welcome + password-reset + otp)
```

## Setup

```bash
bun install                       # instala o workspace inteiro
# copie o .env.example → .env de cada pacote em packages/*/ e preencha
```

Segredos que precisam **bater entre serviços** (ver os `.env.example`):
`JWT_HS256_SECRET` (auth = gateway = admin = community), `FUNNEL_HMAC_SECRET`/
`FUNNEL_INTERNAL_TOKEN` (funnel = gateway), `GATEWAY_HMAC_SECRET` (gateway = consumer
`gateway` no payments **e** = verificação de webhook no members),
`MEMBERS_INTERNAL_TOKEN` (gateway) = `INTERNAL_API_TOKEN` (members),
`MESSAGING_INTERNAL_TOKEN` (gateway = messaging) e `AUTH_HMAC_SECRET`/
`AUTH_INTERNAL_TOKEN` (auth = gateway — e-mail de reset + rotas internas S2S).

## Subir tudo (dev)

Para o dia a dia, o **orquestrador** (`scripts/dev.ts`) sobe todos os serviços de uma vez
em background — em vez de um terminal por serviço:

```bash
bun run dev:up         # sobe gateway/payments/auth/catalog/members/messaging/funnel/admin/community
bun run dev:status     # o que está de pé (pid/porta/escutando)
bun run dev:logs auth  # acompanha o log de um serviço (logs/<serviço>.log)
bun run dev:restart    # reinicia todos (ou um: dev:restart payments)
bun run dev:down       # para todos
```

Aceita subconjunto (`bun run dev:up auth payments`). Só para ambiente local.

## Comandos (raiz)

| Comando | O quê |
|---|---|
| `bun run dev:up` / `dev:down` / `dev:restart` / `dev:status` / `dev:logs <svc>` | orquestrador de dev (sobe/para/reinicia tudo em background) |
| `bun run dev:gateway` / `dev:payments` / `dev:auth` / `dev:catalog` / `dev:members` / `dev:messaging` / `dev:funnel` / `dev:admin` / `dev:community` | sobe cada serviço |
| `bun run test:gateway` / `test:payments` / `test:auth` / `test:catalog` / `test:members` / `test:messaging` / `test:funnel` | testes por serviço |
| `bun run build:admin` / `build:community` / `build:funnel` · `typecheck:admin` / `typecheck:community` | build/typecheck dos frontends |
| `bun run db:auth:migrate` / `db:funnel:migrate` / `db:catalog:migrate` / `db:members:migrate` / `db:messaging:migrate` / `db:catalog:seed` / `db:members:seed` | migrations + seed (atalhos) |
| `bun run check` / `check:fix` | Biome (lint + format) no monorepo |

> Typecheck/testes por pacote: `bun run --filter <nome> typecheck` / `test`
> (rode `bun test` com o sandbox desabilitado — ver gotchas nos CLAUDE.md).

## Stack

Bun · TypeScript (ESM) · Elysia (HTTP) · Astro 6 + React 19 (funnel) ·
Next.js 16 + React 19 + Tailwind v4 (admin/community) · PostgreSQL + Drizzle ·
Zod · jose (JWT) · Biome.

Detalhes de cada serviço (arquitetura, decisões, gotchas) nos `README.md`/`CLAUDE.md`
de cada pacote.

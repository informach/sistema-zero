# @sistemazero/auth

**Serviço de identidade (IdP)** do sistema-zero: cadastro/login de usuários,
papéis (RBAC) e emissão de **JWT** (access + refresh). Consumido via o
**[@sistemazero/api-gateway](../api-gateway)**, que verifica os tokens, resolve o
usuário e aplica autorização na borda.

> **Stack:** Bun + TypeScript + Elysia + PostgreSQL/Drizzle + Zod + jose.
> **Arquitetura:** DDD + Hexagonal (igual ao [payments](../payments)).

## O que ele faz

- **Registro** (`POST /auth/register`) e **login** (`POST /auth/login`) →
  retornam o usuário + um par `{ accessToken, refreshToken }`.
- **Emissão de JWT**: access curto (default 15 min) carregando a identidade nas
  claims (`sub, email, firstName, lastName, role, status` + opcionais
  `phone`/`signupSource`); refresh longo, opaco, **rotacionado** com
  **reuse-detection** (apresentar um refresh já usado revoga a família inteira).
- **`GET /auth/me`**: resolve o usuário do access token — **`null` se não existir**,
  senão a view `{ id, email, firstName, lastName, role, status, phone?, signupSource?, avatarUrl? }`.
- **Reset/definição de senha**: `POST /auth/forgot-password` (SEMPRE 200 —
  anti-enumeração; envia e-mail via gateway → messaging) e
  `POST /auth/reset-password` (token single-use, sha256 no banco, TTL 60 min;
  troca a senha e **revoga todas as sessões**). Mesmo mecanismo serve o **1º acesso
  pós-compra** (o funil pede o token via rota interna S2S e envia o link de boas-vindas).
- **OTP por e-mail**: `POST /auth/otp/request` (sempre 200, anti-enumeração; envia o
  código via messaging), `POST /auth/otp/verify` (login passwordless → tokens) e
  `POST /auth/password/reset-otp` (recuperação por código; revoga todas as sessões).
  Código só como sha256, single-use, TTL curto, tentativas limitadas.
- **Self-service de perfil**: `PATCH /auth/me` (nome/telefone/avatarUrl — **e-mail
  não**; o upload da foto é do app cliente, o auth guarda só a URL) e
  `POST /auth/me/password` (troca logado, exige a senha atual; revoga as sessões).
- **Admin de usuários** (`/auth/admin/users*`, p/ o painel): listar/detalhe/batch +
  editar papel/status/perfil com guards hierárquicos e concorrência otimista.
- **JWKS** (`GET /auth/.well-known/jwks.json`): chave pública (RS256) p/ o gateway
  verificar sem segurar a chave privada.

## Segurança

argon2id (`Bun.password`), erro de login genérico (anti-enumeração de contas +
equalização de timing), refresh rotation + reuse-detection + revogação, access TTL
curto, algoritmo **pinado** + `iss`/`aud`, e-mail único/normalizado, política de
senha, `passwordHash` nunca exposto.

## Assinatura dos tokens (`JWT_ALG`)

- **HS256** (default): segredo simétrico `JWT_HS256_SECRET` — o MESMO valor deve
  estar no gateway (`JWT_HS256_SECRET`). Simples; bom p/ começar.
- **RS256**: `JWT_PRIVATE_KEY` (PKCS#8 PEM) assina; a pública é exposta na JWKS e o
  gateway verifica via `JWT_JWKS_URL=<auth>/auth/.well-known/jwks.json`. O gateway
  nunca segura a chave privada (recomendado p/ produção). Em dev sem chave, um par
  efêmero é gerado no boot.

## Setup rápido (dev)

```bash
bun install                       # na raiz do monorepo
cp packages/auth/.env.example packages/auth/.env
# Usa o banco COMPARTILHADO do monorepo (database `sistemazero`, porta 5433) e cria
# o schema `auth` na própria migration — NÃO precisa criar banco novo.
bun run --filter @sistemazero/auth db:migrate
bun run --filter @sistemazero/auth db:seed --email admin@local --password "troque-esta-senha-1234" --role admin
bun run --filter @sistemazero/auth dev   # escuta em :3002
```

## Variáveis de ambiente

Veja [`.env.example`](./.env.example). Principais: `DATABASE_URL`, `DATABASE_POOL_MAX`,
`JWT_ALG`, `JWT_HS256_SECRET` (≥32 chars) **ou** `JWT_PRIVATE_KEY`, `JWT_ISSUER`,
`JWT_AUDIENCE`, `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS`,
`PASSWORD_MIN_LENGTH`, `TRUST_PROXY`/`TRUSTED_PROXY_HOPS`, `MAX_REQUEST_BODY_BYTES`.
Reset de senha/e-mail: `RESET_TOKEN_TTL_MINUTES`, `COMMUNITY_URL` (base dos links),
`GATEWAY_URL` + `AUTH_HMAC_SECRET` (envio via gateway → messaging; sem eles o envio
é no-op) e `AUTH_INTERNAL_TOKEN` (rotas internas S2S, injetado pelo gateway).

## Comandos

| Comando | O quê |
|---------|-------|
| `bun run dev` / `start` | servidor (watch / produção) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test` | testes (unit + integração via `app.handle`) |
| `bun run db:generate` / `db:migrate` | migrations (Drizzle) |
| `bun run db:seed --email <e> --password <p> [--first <n>] [--last <s>] [--role admin\|staff\|superadmin\|customer]` | cria/atualiza um usuário |
| `bun run check` / `check:fix` | Biome |

## Deploy

Serviço Railway separado via [`railway.json`](./railway.json) (Dockerfile
`oven/bun`, build context = raiz do repo, `preDeployCommand = db:migrate`). Defina
`DATABASE_URL` apontando para o **mesmo Postgres do payments/funnel** (o serviço é
dono do **schema `auth`**, criado na migration), `JWT_ALG` + chave/segredo,
`JWT_ISSUER/AUDIENCE`, `TRUST_PROXY=true` (atrás do gateway/Railway).

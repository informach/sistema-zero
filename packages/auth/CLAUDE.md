# CLAUDE.md — @sistemazero/auth

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Elysia, Drizzle, Zod, jose,
> Bun, etc.) — não confie só na memória; APIs mudam. Para **pesquisa, exploração e entender padrões**,
> use o **MCP do Octocode** em repositórios GitHub relevantes. Faça certo e atualizado — não "de cabeça".

Guia operacional para trabalhar neste package. Leia antes de editar.

## O que é

**Serviço de identidade (IdP)**: cadastro/login, usuários, papéis (RBAC) e
**emissão de JWT** (access + refresh). É o emissor que o
**[@sistemazero/api-gateway](../api-gateway)** verifica (o gateway resolve o
usuário das claims e autoriza por rota). Runtime: **Bun**. Linguagem: **TS (ESM)**.

> Estado: **slice completo e testado** (registro/login/refresh/logout/me + JWKS),
> 26 testes passando. Migration `0000_*` gerada (cria o **schema `auth`** no
> Postgres compartilhado). Ainda NÃO aplicada contra um Postgres real local.

## Arquitetura (DDD + Hexagonal)

Espelha o `payments`. A regra de dependência aponta sempre para dentro.

```
src/
├── domain/          # núcleo puro (SEM framework)
│   ├── shared/         # AggregateRoot, Entity, DomainEvent
│   ├── user/           # user.aggregate + role/status/events/errors
│   ├── value-objects/  # email (normaliza+valida), password-policy
│   └── ports/          # user-repository, password-hasher, token-issuer, refresh-token-repository
├── application/     # casos de uso: register, login, refresh, logout, get-me
│   ├── tokens/         # auth-token.service (emite access+refresh, rotação)
│   └── mappers/        # user-view (o contrato público; SEM passwordHash)
├── infrastructure/
│   ├── config/env      # Zod fail-fast
│   ├── persistence/drizzle/  # schema (users, refresh_tokens), db, repositórios, migrations
│   └── security/       # bun-password-hasher (argon2id), jose-token-issuer, keys (HS256/RS256+JWKS)
├── interfaces/http/ # Elysia: server, routes/auth.routes, dtos (TypeBox), auth (bearer/ip), error-handler
├── composition-root.ts  # injeção de dependências (ÚNICO lugar que instancia adapters) — ASSÍNCRONA
└── index.ts             # loadEnv → createApplication → start (+ sinais)
```

## Comandos (de dentro de `packages/auth`)

| Comando | O quê |
|---------|-------|
| `bun run dev` / `start` | servidor (watch / produção), porta 3002 |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test` | testes (rode com **sandbox off** — gotcha do monorepo) |
| `bun run db:generate` / `db:migrate` | migrations (Drizzle) |
| `bun run db:seed --email <e> --password <p> [--first <n>] [--last <s>] [--role admin\|staff\|superadmin\|customer]` | cria/atualiza usuário |
| `bun run check` / `check:fix` | Biome |

**Sempre** rode `typecheck` + `bun test` antes de concluir.

## Decisões & invariantes (leia antes de mexer)

1. **O contrato `null | usuário`** vive em dois lugares: `UserRepository.findById/findByEmail`
   (→ `null` no miss) e `GetMeService.execute` (→ `UserView | null`). A borda
   (`/auth/me`) traduz `null` em **401**. O `user-view` NUNCA expõe `passwordHash`.
2. **Senha:** `Bun.password` com **argon2id** (memory-hard). Verificação em tempo
   constante. O agregado guarda só o HASH (hashing é da infra). Login devolve erro
   **genérico** ("credenciais inválidas") + verifica um hash "isca" quando o e-mail
   não existe (anti-enumeração por timing).
3. **Refresh token:** valor opaco (32 bytes), guardado **só como sha256**. Rotação
   em cada `/refresh` (marca `rotated_at`+`revoked_at`). **Reuse-detection:**
   apresentar um refresh já rotacionado/revogado → revoga a **família** (`family_id`)
   inteira (mitiga roubo). Logout revoga o token (ou a família).
4. **Tokens (jose v6):** access JWT carrega `sub,email,firstName,lastName,role,status`
   (+ `phone`/`signupSource` opcionais). `JWT_ALG` = HS256 (segredo, default) ou
   RS256 (chave privada + JWKS público). O `verifyAccessToken` PINA o `alg` e valida
   `iss`/`aud`. JWKS só tem chaves em RS256.
5. **Papéis/Status:** `user_role` = superadmin/admin/staff/customer (default no
   cadastro: `customer`); `user_status` = active/pending/suspended/blocked (default:
   `active`; só `active` autentica/renova). `pending` reservado p/ verificação de
   e-mail (futuro).
6. **HTTP:** corpo validado por **TypeBox** (`t`, como o payments); erros de domínio
   → status no `error-handler` (EMAIL_ALREADY_IN_USE→409, INVALID_CREDENTIALS→401,
   USER_NOT_ACTIVE→403, etc.). `composition-root` é **async** (carrega chaves +
   hash isca no boot) → `index.ts` faz `await createApplication(env)`.
7. **Opcionais `phone`/`signupSource`:** fluem do DTO de registro → agregado →
   colunas nullable → claims do token → `user-view`. `signupSource` = app/canal do
   cadastro (funnel/web/mobile/admin).

## Integração com o gateway

- **HS256:** defina o MESMO `JWT_HS256_SECRET` aqui e no gateway. O gateway verifica
  sem JWKS.
- **RS256:** o gateway aponta `JWT_JWKS_URL=<auth>/auth/.well-known/jwks.json` +
  `JWT_ISSUER`/`JWT_AUDIENCE`. O gateway nunca segura a chave privada.
- O gateway resolve o usuário das claims, aplica RBAC (`route.authorize`) e injeta
  `X-Auth-User-*` confiável ao upstream (e remove os de entrada — anti-spoof). As
  rotas `/auth/*` no gateway são **públicas + `passthrough`** (o IdP cuida da própria
  auth; o `/me` precisa do Bearer passando direto).

## Dev local

- **Schema `auth` no Postgres compartilhado** (igual ao funnel com `funil`): banco
  COMPARTILHADO do monorepo (`sistemazero`, Docker porta **5433**), isolado por
  `pgSchema('auth')` + `schemaFilter:['auth']`. `.env`:
  `DATABASE_URL=postgres://postgres:postgres@localhost:5433/sistemazero`.
  **Não** precisa criar banco — a migration faz `CREATE SCHEMA "auth"`.
- `bun run db:migrate` aplica a migration; `bun run db:seed ...` cria o 1º admin.
- E2E manual: suba `auth` (3002) + `gateway` (3000) e:
  `POST /auth/register` → recebe tokens; rota protegida com `Authorization: Bearer
  <access>` → 200; token inválido → 401; role/status insuficientes → 403.

## Pontos em aberto (futuro)

Verificação de e-mail (status `pending`) · reset/forgot password · 2FA · admin CRUD
de usuários · lockout por conta · migrar o login admin hardcoded do funil p/ usar o
`auth` · cookies httpOnly p/ o refresh no browser.

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde (sandbox off) · `bun run check` limpo.
- [ ] Sem `any` novo; entradas validadas (Zod/TypeBox). `passwordHash` nunca exposto.
- [ ] Mudou schema? Gerou a migration (`db:generate`) e commitou.
- [ ] Mudou contrato de porta/claims/config? Atualizou este `CLAUDE.md`.

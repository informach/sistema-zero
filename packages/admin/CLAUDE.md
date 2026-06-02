# CLAUDE.md — @sistemazero/admin

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Next.js, React, Tailwind,
> jose, Zod, etc.) — não confie só na memória; APIs mudam (ex.: `middleware`→`proxy` no Next 16). Para
> **pesquisa, exploração e entender padrões**, use o **MCP do Octocode** em repositórios GitHub
> relevantes. Faça certo e atualizado — não "de cabeça".

Guia operacional do **painel administrativo** (full-stack). Leia antes de editar.

## O que é

Painel para o dono operar a plataforma: **usuários, pagamentos, produtos, ofertas, cupons e membros**.
Front-end **Next.js 16 (App Router) + React 19 + Tailwind v4**; o back-end é um **BFF agregador** que
**chama o API Gateway** (NUNCA os serviços direto). Espelha o design do projeto de referência
`comunidade-sistema-zero` (tokens OKLch dual light/dark, Base UI-like + lucide + sonner). Porta **3005**.

> Estado: **Fatia 1 — Catálogo ponta a ponta** (produtos/ofertas/cupons: listar/criar/editar).
> Login via IdP (`@sistemazero/auth`) com JWT/RBAC. Demais áreas (Usuários/Pagamentos/Membros) são
> placeholders "em breve" até suas fatias.

## Arquitetura (o padrão central — preserve-o)

```
Browser → /api/* (Route Handlers, mesma origem, cookie HttpOnly)
        → gatewayFetch (Bearer do cookie, refresh-on-401)
        → API Gateway (:3000) verifica JWT + RBAC → injeta X-Auth-User-* → serviço
```

- **Login:** `POST /api/admin/login` → gateway `/auth/login`; rejeita role ∉ {superadmin,admin,staff}
  (403); grava `sz_admin_access` (JWT) + `sz_admin_refresh` (opaco) em cookies **HttpOnly**.
- **Sessão (`src/server/session.ts`):** `getSession()` verifica o access JWT (HS256, MESMO
  `JWT_HS256_SECRET` do auth/gateway). Token expirado → a assinatura já foi validada (jose checa
  assinatura ANTES do exp) → decodifica p/ exibir; os dados renovam via refresh-on-401.
- **Refresh (`src/server/gateway.ts`):** `gatewayFetch` em 401 chama `/auth/refresh`, regrava os
  cookies e re-tenta UMA vez. **Só** roda em Route Handlers/Server Actions (lá pode escrever cookies).
- **Gate de UI:** `src/proxy.ts` (convenção `proxy` do Next 16, ex-`middleware`) bloqueia `/admin/*` sem cookie de refresh (redirect `/login`);
  `app/admin/layout.tsx` faz a checagem real (assinatura + role) e mostra "acesso negado" se preciso.

## Invariantes (NÃO quebrar)

1. **O admin nunca chama os serviços direto** — tudo via gateway (`src/server/gateway.ts`).
2. **Segredos só no servidor.** `src/lib/env.ts` é `server-only`; `src/server/*` idem. **Nunca**
   importe `env`/`server/*` de um Client Component (vaza p/ o bundle). Client fala só com `/api/*`.
3. **Tokens em cookie HttpOnly** (`sz_admin_*`), `SameSite=Lax`, `Secure` em prod. Nunca exponha ao JS.
4. **Dinheiro em centavos** (inteiro). Conversão só na borda (`src/lib/format.ts`: `formatCents`/`reaisToCents`).
5. **Cookies só se escrevem** em Route Handlers/Server Actions (limitação do Next). Refresh mora lá.

## Estrutura

```
src/
  app/
    layout.tsx            Root (Geist fonts, Providers: next-themes + Toaster)
    login/                Página + form (client) de login
    admin/                Shell autenticado (layout gate) + páginas
      page.tsx            Painel (overview cards via /api/catalog/*?limit=1)
      catalogo/{produtos,ofertas,cupons}/  page.tsx + *-client.tsx (tabela + dialog CRUD)
      {usuarios,pagamentos,membros}/        placeholders "em breve"
    api/
      admin/{login,logout}/route.ts
      catalog/{products,offers,coupons}/route.ts (+ [id]/route.ts p/ PATCH)
  server/   session.ts · gateway.ts · catalog.ts   (server-only)
  lib/      env.ts (server-only) · types.ts · format.ts · cn.ts · api.ts (client fetch)
  components/ ui/* (button/card/input/table/dialog/badge/select/…) · admin/* (topbar/header/tabs/…)
  proxy.ts              (ex-middleware; convenção Next 16, runtime nodejs)
```

## Comandos (de dentro de `packages/admin`)

| Comando | O quê |
|---------|-------|
| `bun run dev` | Next dev server :3005 |
| `bun run build` / `start` | build + produção |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run check` / `check:fix` | Biome |

Da raiz: `bun run dev:admin`, `bun run build:admin`, `bun run start:admin`.

## Env (`.env.example`)

- `GATEWAY_URL` (default `http://localhost:3000`).
- `JWT_HS256_SECRET` — **MESMO** do `@sistemazero/auth` e do gateway (verifica o access token).
- `JWT_ISSUER`/`JWT_AUDIENCE` opcionais (se o auth emitir, casar ativa a checagem).

## Setup local (e2e)

1. Postgres :5433 + migrations do auth/catalog (`db:auth:migrate`, `db:catalog:migrate`).
2. Suba auth :3002, catalog :3003, gateway :3000 (com `JWT_HS256_SECRET` igual em todos).
3. Crie um admin: `bun run --filter @sistemazero/auth db:seed --email <e> --password <p> --role admin`.
4. `bun run dev:admin` → `http://localhost:3005` → login → Catálogo.

## Contratos consumidos

- Auth: `POST /auth/login` → `{ user: UserView, tokens: { accessToken, refreshToken, expiresIn,
  refreshExpiresIn } }`; `POST /auth/refresh` `{ refreshToken }` → `{ tokens }`.
- Catálogo (via gateway, JWT+RBAC): `GET /catalog/admin/{products,offers,coupons}` (`?q&status&limit&offset`,
  offers `?productId`), `POST/PATCH /catalog/{products,offers,coupons}`. Views espelhadas em `src/lib/types.ts`.

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun run check` (Biome) limpo · `bun run build` passa.
- [ ] Nenhum `server/*`/`env` importado por Client Component. Sem `any` novo.
- [ ] Novo endpoint do gateway? Atualizou `src/server/*` + tipos + (se preciso) o `gateway.config.ts`.
```

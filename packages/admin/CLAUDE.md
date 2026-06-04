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

> Estado: **Fatia 1 — Catálogo** (produtos/ofertas/cupons: listar/criar/editar) + **Fatia 2 —
> Usuários** (listar com busca/filtros + editar status/papel/perfil, guards hierárquicos e
> concorrência otimista) + **Fatia Pagamentos** (transações + assinaturas: listar/filtrar/detalhe +
> **estornar**/**cancelar**, stats e saúde de webhooks/operações) + **Fatia Membros** (abas
> Alunos|Cursos — **Alunos**: listar + detalhe com matrículas/progresso + conceder manual
> (oferta/curso) + revogar/expirar/estender, identidade hidratada do auth via batch; **Cursos**:
> autoria — CRUD de cursos + editor de módulos/aulas (reordenar via ↑↓) + editor de blocos
> polimórficos (texto/vídeo/imagem/áudio/quiz/embed) e anexos). Login via IdP
> (`@sistemazero/auth`) com JWT/RBAC.

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
   O **payments** serializa valores como **string** (bigint) → use `formatCentsStr` (faz `Number()`).
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
      usuarios/             page.tsx (passa o operador p/ gating) + users-client.tsx (tabela + dialog edição)
      pagamentos/{transacoes,assinaturas,operacoes}/  page.tsx + *-client.tsx (lista/detalhe + estorno/cancelar; index redireciona p/ transacoes)
      membros/             (conforme a fatia de membros)
    api/
      admin/{login,logout}/route.ts · admin/users/route.ts (+ [id]/route.ts p/ PATCH)
      catalog/{products,offers,coupons}/route.ts (+ [id]/route.ts p/ PATCH)
      payments/{transactions,subscriptions,stats,ops}/… (GET; [id] GET, [id]/refund POST, subscriptions/[id] DELETE)
  server/   session.ts · gateway.ts · catalog.ts · users.ts · payments.ts   (server-only)
  lib/      env.ts (server-only) · types.ts · format.ts · cn.ts · api.ts (client fetch)
  components/ ui/* (button/card/input/table/dialog/badge/select/…) · admin/* (topbar/header/tabs/…)
  proxy.ts              (ex-middleware; convenção Next 16, runtime nodejs)
```

## Comandos (de dentro de `packages/admin`)

| Comando | O quê |
|---------|-------|
| `bun run dev` | Next dev server :3005 (**Turbopack** — ok, não pré-renderiza) |
| `bun run build` / `start` | build (**`next build`** — Turbopack) + produção |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run check` / `check:fix` | Biome |

Da raiz: `bun run dev:admin`, `bun run build:admin`, `bun run start:admin`.

> ⚠️ **Build = `next build` (Turbopack) + React `^19.2.4` + Next `^16.1.6`** — alinhado ao projeto de
> referência `comunidade-sistema-zero`. Havia o bug do Next 16 (`useContext null` no prerender estático
> de `/_global-error`//_not-found): a causa REAL **não** era versão/builder — era rodar o build via
> **`bun run --filter` a partir da RAIZ** do monorepo (o `next` hasteado na raiz + seus workers de
> static-export resolviam o React inconsistente → dispatcher nulo). **Fix:** os scripts da raiz
> (`build:admin`/`build:community`) rodam **package-local** (`cd packages/<app> && bun run build`),
> NÃO `--filter`. Builda limpo determinístico (admin 3× + community 3×). Sem `global-error.tsx` custom
> (usa o default do Next); `app/not-found.tsx` é página normal. (Issues: #84994/#85668/#86178.)

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
- Usuários (via gateway, JWT+RBAC): `GET /auth/admin/users` (`?q&role&status&limit&offset`) → `Paginated<UserView>`;
  `PATCH /auth/admin/users/:id` `{ role?, status?, firstName?, lastName?, phone?, version? }` → `{ user }`.
  Edição com `version` (concorrência otimista → 409 se defasada). Guards de papel/status são do `auth`
  (o client só faz gating de UX por `currentUser.role`).
- Pagamentos (via gateway, JWT+RBAC): `GET /payments/admin/payments` (`?q&status&method&consumerId&from&to&limit&offset`)
  → `Paginated<PaymentView>`; `GET /payments/admin/payments/:id`; `GET /payments/admin/subscriptions`
  (`?q&status&consumerId&limit&offset`) → `Paginated<SubscriptionView>`; `GET /payments/admin/subscriptions/:id`;
  `GET /payments/admin/stats` (`?from&to`) → `PaymentStats`; `GET /payments/admin/ops` → `PaymentOps`;
  **`POST /payments/admin/payments/:id/refund`** (estorno Pix/cartão) → `PaymentView`;
  **`DELETE /payments/admin/subscriptions/:id`** (cancela) → `SubscriptionView`. Valores em **string**
  (bigint, centavos) → `formatCentsStr`. Adapter em `src/server/payments.ts`; views em `src/lib/types.ts`.
- Membros (via gateway, JWT+RBAC): `GET /members/admin/members` (`?status&courseRef&limit&offset`) →
  `Paginated<MemberSummaryView>`; `GET /members/admin/members/:userId` → matrículas + progresso;
  `POST /members/admin/entitlements` (`{mode:'offer'|'course', userId, offerRef|courseRef, expiresAt?}`) →
  concessão manual; `PATCH /members/admin/entitlements/:id` (`{action:'revoke'|'expire'|'extend', expiresAt?}`).
  O **BFF agrega**: o handler `GET /api/members` hidrata nome/email do auth via
  `POST /auth/admin/users/batch` (`server/users.ts`: `batchGetUsers`/`getUser`). Adapter em
  `src/server/members.ts`; views em `src/lib/types.ts`.
- Membros — Autoria (via gateway, JWT+RBAC): `GET/POST /members/admin/courses`,
  `GET/PATCH/DELETE /members/admin/courses/:id` (GET = árvore curso+módulos+aulas); módulos/aulas
  via `…/modules`, `…/lessons` (+ `…/reorder`); blocos/anexos via `…/lessons/:id/blocks|attachments`
  (+ `…/reorder`) e `PATCH/DELETE /members/admin/{blocks,attachments}/:id`. Conteúdo de bloco é
  união por `kind`. Páginas em `app/admin/membros/cursos/*` (lista + editor de curso + editor de aula
  com formulários por tipo de bloco). Adapter em `src/server/members.ts`; views em `src/lib/types.ts`.

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun run check` (Biome) limpo · `bun run build` passa.
- [ ] Nenhum `server/*`/`env` importado por Client Component. Sem `any` novo.
- [ ] Novo endpoint do gateway? Atualizou `src/server/*` + tipos + (se preciso) o `gateway.config.ts`.
```

# CLAUDE.md — @sistemazero/community

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Next.js, React, Tailwind,
> jose, Zod, etc.) — não confie só na memória; APIs mudam (ex.: `middleware`→`proxy` no Next 16). Para
> **pesquisa, exploração e entender padrões**, use o **MCP do Octocode** em repositórios GitHub
> relevantes. Faça certo e atualizado — não "de cabeça".

Guia operacional da **área do aluno / comunidade** (full-stack). Leia antes de editar.

## O que é

App que o **aluno** acessa: login/recuperação de senha, **meus cursos** (consumo do "No Comando da
IA" via members — módulos, aulas em blocos, progresso), **perfil** (nome/telefone + trocar senha) e
**minhas compras**. Front-end **Next.js 16 (App Router) + React 19 + Tailwind v4**; o back-end é um
**BFF** que **chama o API Gateway** (NUNCA os serviços direto). Design/tema portado do projeto de
referência `comunidade-sistema-zero` (tokens OKLch dual light/dark + utilities `sz-*`). Porta **3007**.

> Estado: **MVP da área do aluno** (login/logout, esqueci/definir senha — mesma página serve o 1º
> acesso pós-compra —, home com grid de cursos, curso com módulos/aulas, player de aula com blocos
> polimórficos + anexos + concluir + navegação, perfil, compras). A COMUNIDADE (feed/fórum/etc.) é
> fatia futura.

## Arquitetura (o padrão central — preserve-o; espelha o @sistemazero/admin)

```
Browser → /api/* (Route Handlers, mesma origem, cookie HttpOnly)
        → gatewayFetch (Bearer do cookie, refresh-on-401)
        → API Gateway (:3000) verifica JWT → injeta X-Auth-User-* / x-internal-token → serviço
```

- **Login:** `POST /api/auth/login` → gateway `/auth/login`; **qualquer conta ATIVA entra**
  (inclusive `customer` — ≠ admin, que filtra papel); grava `sz_member_access` (JWT) +
  `sz_member_refresh` (opaco) em cookies **HttpOnly**.
- **Sessão (`src/server/session.ts`):** `getSession()` verifica o access JWT (HS256, MESMO
  `JWT_HS256_SECRET` do auth/gateway). Cookies `sz_member_*` (≠ `sz_admin_*` do painel).
- **Refresh (`src/server/gateway.ts`):** `gatewayFetch` em 401 chama `/auth/refresh`, regrava os
  cookies e re-tenta UMA vez. **Só** roda em Route Handlers/Server Actions.
- **Gate de UI:** `src/proxy.ts` bloqueia `/home|/cursos|/perfil|/compras` sem cookie de refresh
  (redirect `/login`); o layout do grupo `(app)` faz a checagem real. A CSP do proxy tem
  **`frame-src` allowlist** (youtube-nocookie + player.vimeo) p/ o player de aulas.
- **Senha:** `/esqueci-senha` → `POST /auth/forgot-password` (sempre 200, anti-enumeração);
  `/redefinir-senha?token=` → `POST /auth/reset-password` — serve o RESET e o **1º acesso
  pós-compra** (o funil envia o e-mail `welcome` com esse link). Trocar senha logado revoga TODAS
  as sessões → o handler limpa os cookies e a UI manda re-logar.

## Invariantes (NÃO quebrar)

1. **O community nunca chama os serviços direto** — tudo via gateway (`src/server/gateway.ts`).
2. **Segredos só no servidor.** `src/lib/env.ts` é `server-only`; `src/server/*` idem. **Nunca**
   importe `env`/`server/*` de um Client Component. Client fala só com `/api/*` (`src/lib/api.ts`).
3. **Tokens em cookie HttpOnly** (`sz_member_*`), `SameSite=Lax`, `Secure` em prod.
4. **Dinheiro em centavos**; o payments serializa como **string** (bigint) → `formatCentsStr`.
5. **Blocos de aula = conteúdo de terceiros.** NUNCA interpole `src` cru em iframe — extraia o ID e
   monte a URL canônica (`youtube-nocookie.com/embed/<id>`, `player.vimeo.com/video/<id>`); HTML de
   embed roda SÓ em `iframe sandbox` SEM `allow-same-origin` (`lesson-blocks.tsx`). `rich_text`
   renderiza `markdown` com conversor próprio controlado (sem HTML cru).
6. **Capas/imagens de curso usam `<img>`** (URLs externas arbitrárias da autoria — evita configurar
   `images.remotePatterns` por domínio). `noImgElement` está off no biome p/ este package.

## Estrutura

```
src/
  app/
    layout.tsx              Root (Geist fonts, Providers: next-themes + Toaster)
    page.tsx                / → redirect /home ou /login
    (auth)/                 Grupo público (AuthSplitShell: form + imagem da comunidade)
      login/ · esqueci-senha/ · redefinir-senha/   (page + *-form.tsx client)
    (app)/                  Grupo logado (layout gate + CommunityTopnav)
      home/                 Grid "Meus cursos" (CourseCard + .sz-progress)
      cursos/[slug]/        Módulos/aulas + "continuar de onde parei"
      cursos/[slug]/aulas/[lessonId]/  Player (blocos + anexos + concluir + prev/next + outline)
      perfil/               Editar nome/telefone + trocar senha (e-mail é IMUTÁVEL)
      compras/              Tabela paginada + dialog de detalhe
    api/
      auth/{login,logout,forgot-password,reset-password,me,me/password}/route.ts
      members/lessons/[lessonId]/complete/route.ts
      payments/my/route.ts
  server/   session.ts · gateway.ts · auth.ts · members.ts · payments.ts   (server-only)
  lib/      env.ts (server-only) · types.ts (views do ALUNO) · format.ts · cn.ts · api.ts
  components/ ui/* (copiados do admin + password-input) · community/* (topnav/user-menu/cards/blocos)
  proxy.ts                (ex-middleware; convenção Next 16, runtime nodejs)
```

## Comandos (de dentro de `packages/community`)

| Comando | O quê |
|---------|-------|
| `bun run dev` | Next dev server :3007 (Turbopack) |
| `bun run build` / `start` | build (**`next build --webpack`**) + produção |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run check` / `check:fix` | Biome |

Da raiz: `bun run dev:community`, `build:community`, `typecheck:community`.

> ⚠️ **Build = webpack + React pinada 19.1.0** (não `^19.2`) — mesmo workaround do admin para o bug
> de prerender do Next 16.x (`useContext null` em `/_global-error`/`/_not-found`, não-determinístico).
> Há um `app/global-error.tsx` autocontido. Reverter quando o Next corrigir
> (vercel/next.js #84994/#85668/#86178).

## Env (`.env.example`)

- `GATEWAY_URL` (default `http://localhost:3000`).
- `JWT_HS256_SECRET` — **MESMO** do `@sistemazero/auth` e do gateway.
- `JWT_ISSUER`/`JWT_AUDIENCE` opcionais.

## Setup local (e2e)

1. Postgres :5433 + migrations (`db:auth:migrate`, `db:members:migrate`, `db:payments` via package).
2. Suba auth :3002, catalog :3003, members :3004, payments :3001, messaging :3006, gateway :3000
   (MESMO `JWT_HS256_SECRET`; `MEMBERS_INTERNAL_TOKEN` casando gateway↔members).
3. Aluno de teste: `bun run --filter @sistemazero/auth db:seed --email aluno@teste.com --password
   <senha> --role customer` e matrícula:
   `bun run db:members:seed --grant-user <userId>` (curso "No Comando da IA").
4. `bun run dev:community` → `http://localhost:3007` → login → home → curso → aula.

## Contratos consumidos (via gateway)

- Auth: `POST /auth/login|refresh|logout`, `GET /auth/me`, `POST /auth/forgot-password` (5/min/IP),
  `POST /auth/reset-password`, `PATCH /auth/me` `{firstName?,lastName?,phone?}` (SEM e-mail),
  `POST /auth/me/password` `{currentPassword,newPassword}` (revoga todas as sessões).
- Members (JWT + x-internal-token injetados pelo gateway): `GET /members/courses` →
  `{courses: MyCourseView[]}`; `GET /members/courses/:slug` → `CourseDetailView` (módulos+outline);
  `GET /members/courses/:slug/lessons/:lessonId` → `LessonDetailView` (**busca por ID**, blocos
  `kind: rich_text|video|image|audio|quiz|embed` + anexos); `POST /members/lessons/:lessonId/complete`.
  Navegação prev/next é DERIVADA do outline (a API não fornece). Views em `src/lib/types.ts`
  (espelham `members/src/application/mappers/views.ts` — NÃO os tipos admin).
- Payments: `GET /payments/my` (`?limit&offset`) → `Paginated<PaymentView>` (PÚBLICA, sem dados do
  cliente; o backend filtra pelo e-mail das claims); `GET /payments/my/:id`. Valores em **string**
  (centavos) → `formatCentsStr`.

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun run check` (Biome) limpo · `bun run build` passa.
- [ ] Nenhum `server/*`/`env` importado por Client Component. Sem `any` novo.
- [ ] Bloco de aula novo? Renderer seguro (sem `src` cru em iframe; sandbox sem allow-same-origin).
- [ ] Novo endpoint do gateway? Atualizou `src/server/*` + tipos + este `CLAUDE.md`.

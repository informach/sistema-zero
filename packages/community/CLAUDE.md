# CLAUDE.md — @sistemazero/community

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Next.js, React, Tailwind,
> jose, Zod, etc.) — não confie só na memória; APIs mudam (ex.: `middleware`→`proxy` no Next 16). Para
> **pesquisa, exploração e entender padrões**, use o **MCP do Octocode** em repositórios GitHub
> relevantes. Faça certo e atualizado — não "de cabeça".

Guia operacional da **área do aluno / comunidade** (full-stack). Leia antes de editar.

## O que é

App que o **aluno** acessa: login/recuperação de senha, **meus cursos** (consumo do "No Comando da
IA" via members — módulos, aulas em blocos, progresso), **todos os cursos** (`/cursos` — catálogo
com cadeado), **perfil** (nome/telefone/**foto** + trocar senha) e **minhas compras**. Front-end
**Next.js 16 (App Router) + React 19 + Tailwind v4**; o back-end é um **BFF** que **chama o API
Gateway** (NUNCA os serviços direto). Design/tema portado do projeto de referência
`comunidade-sistema-zero` (tokens OKLch dual light/dark + utilities `sz-*`). Porta **3007**.

> Estado: **MVP da área do aluno** (login/logout, esqueci/definir senha — mesma página serve o 1º
> acesso pós-compra —, home na RAIZ `/` com grid de cursos, `/cursos` "Todos os cursos" com lock →
> página de vendas, curso com módulos/aulas, player de aula com blocos polimórficos + anexos +
> concluir + navegação, perfil com upload de avatar, compras). A COMUNIDADE (feed/fórum/etc.) é
> fatia futura.
>
> **Header (espelha a referência):** logo à esquerda (`w-[130px] md:w-[150px]`), menu CENTRALIZADO
> (Início `/` + Todos os cursos `/cursos` — `nav.ts`), avatar à direita. Compras/Perfil/Mudar tema/
> Sair vivem no **menu do avatar** (`user-menu.tsx`: cabeçalho com `UserAvatar` + nome + e-mail;
> regras de exibição em `lib/user-display.ts` — nome → handle do e-mail → "Membro"/"M"). NÃO existe
> rota `/home` (a referência era monolito com landing na raiz; aqui a home É a raiz). O layout do
> grupo `(app)` hidrata `avatarUrl` fresco via `getMe()` (claims não carregam foto).

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
- **Refresh — DOIS caminhos, UMA rotação (`src/server/refresh.ts`):** `refreshTokens()` faz a
  chamada `/auth/refresh` com **single-flight + cache 60s por refresh token** — obrigatório:
  requisições concorrentes (prefetch + navegação, proxy + handler) apresentando o MESMO refresh
  duas vezes disparariam a reuse-detection do auth e revogariam a família (logout). Estado em
  memória de módulo (community é single-réplica pré-MVP). Quem rotaciona:
  1. **`src/proxy.ts`** (caminho de PÁGINA): access com `exp` vencido (decodeJwt, folga 30s) →
     rotaciona ANTES do render, reescreve o cookie da request (`NextResponse.next({request})`)
     e grava na response. Páginas/layouts são Server Components e **NÃO podem escrever cookies**
     (`cookies().set()` LANÇA) — o proxy é o único lugar do caminho de página que pode.
     Refresh `invalid` → limpa cookies + `/login`; gateway fora (`unavailable`) → segue degradado.
  2. **`gatewayFetch`** (Route Handlers/Server Actions): em 401 rotaciona e re-tenta UMA vez;
     a escrita de cookie é try/catch (em RSC engole — o single-flight garante que a próxima
     request, ainda com o cookie antigo, receba os MESMOS tokens).
  Para dados em Server Component use **`gatewayFetchReadonly`/`getMeReadonly`** quando um 401
  puder ser degradado (ex.: avatar do header) — nunca tenta refresh nem toca cookies.
- **Gate de UI:** `src/proxy.ts` bloqueia `/` (exato) e `/cursos|/perfil|/compras` sem cookie de
  refresh (redirect `/login`); o layout do grupo `(app)` faz a checagem real. A CSP do proxy tem
  **`frame-src` allowlist** (youtube-nocookie + player.vimeo) p/ o player de aulas.
- **Senha:** `/esqueci-senha` → `POST /auth/forgot-password` (sempre 200, anti-enumeração);
  `/redefinir-senha?token=` → `POST /auth/reset-password` — serve o RESET e o **1º acesso
  pós-compra** (o funil envia o e-mail `welcome` com esse link). Trocar senha logado revoga TODAS
  as sessões → o handler limpa os cookies e a UI manda re-logar.

## Invariantes (NÃO quebrar)

1. **O community nunca chama os serviços direto** — tudo via gateway (`src/server/gateway.ts`).
   Exceção CONSCIENTE (igual ao admin): `/api/me/avatar` fala com o **R2** (provedor externo) e por
   isso tem guard de sessão próprio (`requireUploadSession` em `src/server/media.ts` — qualquer
   conta ATIVA, sem exigência de role). Pipeline: multipart ≤5MB png/jpg/webp → sharp→WebP 512×512
   (`image-optimizer.ts`, preset `avatar`) → R2 `community/avatars/<userId>/<uuid>.webp` (`r2.ts`)
   → `PATCH /auth/me { avatarUrl }` via gateway. Envs R2_* ausentes → 503 `MEDIA_NOT_CONFIGURED`
   amigável. `next.config.ts` tem `serverExternalPackages: ['sharp']`.
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
    (auth)/                 Grupo público (AuthSplitShell: form + imagem da comunidade)
      login/ · esqueci-senha/ · redefinir-senha/   (page + *-form.tsx client)
    (app)/                  Grupo logado (layout gate + avatar fresco + CommunityTopnav)
      page.tsx              / (HOME) — grid "Meus cursos" (CourseCard + .sz-progress)
      cursos/               /cursos "Todos os cursos" (catálogo c/ lock → página de vendas)
      cursos/[slug]/        Módulos/aulas + "continuar de onde parei"
      cursos/[slug]/aulas/[lessonId]/  Player (blocos + anexos + concluir + prev/next + outline)
      perfil/               Foto (upload R2) + editar nome/telefone + trocar senha (e-mail IMUTÁVEL)
      compras/              Tabela paginada + dialog de detalhe
    api/
      auth/{login,logout,forgot-password,reset-password,me,me/password}/route.ts
      me/avatar/route.ts    POST multipart → sharp→WebP → R2 → PATCH /auth/me
      members/lessons/[lessonId]/complete/route.ts
      payments/my/route.ts
  server/   session.ts · gateway.ts · auth.ts · members.ts · payments.ts
            r2.ts · image-optimizer.ts · media.ts (avatar→R2; exceção consciente)   (server-only)
  lib/      env.ts (server-only) · types.ts (views do ALUNO) · user-display.ts · format.ts · cn.ts · api.ts
  components/ ui/* (copiados do admin + password-input) · community/* (topnav/user-menu/user-avatar/cards/blocos)
  proxy.ts                (ex-middleware; convenção Next 16, runtime nodejs)
```

## Comandos (de dentro de `packages/community`)

| Comando | O quê |
|---------|-------|
| `bun run dev` | Next dev server :3007 (Turbopack) |
| `bun run build` / `start` | build (**`next build`** — Turbopack) + produção |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run check` / `check:fix` | Biome |

Da raiz: `bun run dev:community`, `build:community`, `typecheck:community`.

> ⚠️ **Build = `next build` (Turbopack) + React `^19.2.4` + Next `^16.1.6`** — alinhado ao projeto de
> referência `comunidade-sistema-zero` (builda limpo nesse combo). Havia o bug do Next 16
> (`useContext null` no prerender estático de `/_global-error`//_not-found): a causa REAL **não** era
> versão/builder — era rodar o build via **`bun run --filter` a partir da RAIZ** do monorepo. O `next`
> hasteado na raiz e seus **workers de static-export** resolviam o React de forma inconsistente
> (dispatcher nulo). **Fix:** os scripts da raiz (`build:community`/`build:admin`) rodam **package-local**
> (`cd packages/<app> && bun run build`), NÃO `--filter`. Builda limpo de forma determinística (12/12).
> NÃO há `global-error.tsx` custom (usa o default do Next, como a referência); `app/not-found.tsx` é
> página normal. (Issues: vercel/next.js #84994/#85668/#86178.)

## Env (`.env.example`)

- `GATEWAY_URL` (default `http://localhost:3000`).
- `JWT_HS256_SECRET` — **MESMO** do `@sistemazero/auth` e do gateway.
- `JWT_ISSUER`/`JWT_AUDIENCE` opcionais.
- `FUNNEL_URL` opcional — fallback da página de vendas em `/cursos` (curso sem
  `metadata.salesPageUrl`); sem ela e sem metadata, o card bloqueado fica não-clicável.
- `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET`/`R2_PUBLIC_URL`
  opcionais — upload de avatar (ausentes → 503 amigável; mesmo bucket do admin).

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
  `POST /auth/reset-password`, `PATCH /auth/me` `{firstName?,lastName?,phone?,avatarUrl?}` (SEM
  e-mail; `avatarUrl` setado pelo handler do upload), `POST /auth/me/password`
  `{currentPassword,newPassword}` (revoga todas as sessões).
- Members (JWT + x-internal-token injetados pelo gateway): `GET /members/courses` →
  `{courses: MyCourseView[]}` (+`continueLessonId`); `GET /members/catalog` →
  `{courses: CatalogCourseView[]}` ("Todos os cursos": published + `hasAccess` + `salesPageUrl` —
  a página `/cursos` resolve `salesPageUrl ?? FUNNEL_URL` no server e filtra/busca client-side
  com estado na URL `?q=&acesso=&ordem=`); `GET /members/courses/:slug` → `CourseDetailView`
  (módulos+outline + `continueLessonId`: última aula acessada > 1ª não concluída > 1ª);
  `GET /members/courses/:slug/lessons/:lessonId` → `LessonDetailView` (**busca por ID**, blocos
  `kind: rich_text|video|image|audio|quiz|embed` + anexos + `positionSeconds`; bloco quiz vem
  **SEM gabarito** e com `quizState`); `POST /members/lessons/:lessonId/complete` (→ **409
  `QUIZ_GATE_NOT_PASSED`** se houver quiz com `passingScore` não aprovado — a UI desabilita o
  botão e silencia o auto-complete); `PUT /members/courses/:slug/lessons/:lessonId/position`
  `{positionSeconds}` (BFF expõe como `POST /api/members/lessons/:id/position` com
  `{courseSlug, positionSeconds}` — POST porque `sendBeacon` não faz PUT; parse tolerante a
  text/plain); `POST /members/lessons/:lessonId/blocks/:blockId/quiz-attempts` `{answers}` →
  `{score, passed, passingScore, retryAvailableAt, questions[correções+explicações]}` (gabarito
  SÓ aqui; 429 `QUIZ_COOLDOWN` por 5min após reprovar — a UI mostra countdown MM:SS).
  Navegação prev/next é DERIVADA do outline (a API não fornece). Views em `src/lib/types.ts`
  (espelham `members/src/application/mappers/views.ts` — NÃO os tipos admin).
- **Player Vimeo** (`vimeo-player.tsx` + `@vimeo/player`, bundle local — postMessage com o
  iframe; a CSP `frame-src player.vimeo.com` já cobre, sem mudança no proxy): watermark com o
  e-mail do aluno, fullscreen custom no CONTAINER (mantém o watermark em tela cheia), retoma
  `positionSeconds` salvo (`setCurrentTime` no ready, ignora RangeError) e auto-conclui a ~90%
  assistido (uma vez). A posição persiste com throttle de ~12s + flush em pause/ended +
  `sendBeacon` em visibilitychange/pagehide/unmount (`lesson-player-client.tsx`). Os blocos
  recebem tudo via `LessonPlayerContext` (sem prop-drilling); YouTube/file seguem com embed
  simples. `player.destroy()` no cleanup (remove o iframe; o React só desmonta o container).
- Payments: `GET /payments/my` (`?limit&offset`) → `Paginated<PaymentView>` (PÚBLICA, sem dados do
  cliente; o backend filtra pelo e-mail das claims); `GET /payments/my/:id`. Valores em **string**
  (centavos) → `formatCentsStr`.

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun run check` (Biome) limpo · `bun run build` passa.
- [ ] Nenhum `server/*`/`env` importado por Client Component. Sem `any` novo.
- [ ] Bloco de aula novo? Renderer seguro (sem `src` cru em iframe; sandbox sem allow-same-origin).
- [ ] Novo endpoint do gateway? Atualizou `src/server/*` + tipos + este `CLAUDE.md`.

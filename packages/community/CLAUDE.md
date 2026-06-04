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
> página de vendas, curso com módulos/aulas, player de aula com blocos polimórficos + anexos
> (download autenticado com **marca d'água do e-mail do aluno** em PDF/imagem — bucket R2 privado) +
> concluir + navegação, perfil com upload de avatar, compras, **classificação do curso** —
> fluxo Udemy de 5 modais, ver Contratos). A COMUNIDADE (feed/fórum/etc.) é fatia futura.
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
- **Senha/OTP:** `/esqueci-senha` = recuperação por CÓDIGO (OTP por e-mail, 2 passos:
  `POST /auth/otp/request {purpose:'password_reset'}` — sempre 200, anti-enumeração — e
  `POST /auth/password/reset-otp` com código + senha nova). O login também tem modo **OTP
  passwordless** (`login-form.tsx`: `otp/request {purpose:'sign_in'}` → `otp/verify` → tokens).
  `/redefinir-senha?token=` → `POST /auth/reset-password` — reset por LINK, serve o **1º acesso
  pós-compra** (o funil envia o e-mail `welcome` com esse link). Trocar/redefinir senha revoga
  TODAS as sessões → o handler limpa os cookies e a UI manda re-logar.

## Invariantes (NÃO quebrar)

1. **O community nunca chama os serviços direto** — tudo via gateway (`src/server/gateway.ts`).
   Exceção CONSCIENTE (igual ao admin): `/api/me/avatar` fala com o **R2** (provedor externo) e por
   isso tem guard de sessão próprio (`requireUploadSession` em `src/server/media.ts` — qualquer
   conta ATIVA, sem exigência de role). Pipeline: multipart ≤5MB png/jpg/webp → sharp→WebP 512×512
   (`image-optimizer.ts`, preset `avatar`) → R2 `community/avatars/<userId>/<uuid>.webp` (`r2.ts`)
   → `PATCH /auth/me { avatarUrl }` via gateway. Envs R2_* ausentes → 503 `MEDIA_NOT_CONFIGURED`
   amigável. `next.config.ts` tem `serverExternalPackages: ['sharp']`. Mesma exceção:
   **`GET /api/cursos/:slug/aulas/:lessonId/anexos/:attachmentId`** (download de material) LÊ do
   bucket R2 **PRIVADO** (`R2_PRIVATE_BUCKET`, `r2GetObjectPrivate`) — mas a AUTORIZAÇÃO real
   (matrícula + aula publicada) vem do members via gateway (rota `/resolve`), que devolve a
   `storageRef` (`r2priv:<key>` ou URL externa→302). PDF/imagem ganham **marca d'água com o
   e-mail do aluno** (`server/watermark.ts`: pdf-lib rodapé em todas as páginas · sharp selo SVG
   no canto, GIF animado via tile por frame; falha → serve o original + warn); demais formatos
   passam sem marca. Resposta: `Content-Disposition: attachment` (label + extensão da key) e
   `Cache-Control: private, no-store` (conteúdo é POR aluno). A `storageRef` NUNCA vai ao browser.
2. **Segredos só no servidor.** `src/lib/env.ts` é `server-only`; `src/server/*` idem. **Nunca**
   importe `env`/`server/*` de um Client Component. Client fala só com `/api/*` (`src/lib/api.ts`).
3. **Tokens em cookie HttpOnly** (`sz_member_*`), `SameSite=Lax`, `Secure` em prod.
4. **Dinheiro em centavos**; o payments serializa como **string** (bigint) → `formatCentsStr`.
5. **Blocos de aula = conteúdo de terceiros.** NUNCA interpole `src` cru em iframe — extraia o ID e
   monte a URL canônica (`youtube-nocookie.com/embed/<id>`, `player.vimeo.com/video/<id>`); HTML de
   embed roda SÓ em `iframe sandbox` SEM `allow-same-origin` (`lesson-blocks.tsx`). `rich_text`
   renderiza `markdown` com conversor próprio controlado (sem HTML cru) — tokens suportados:
   headings 1-3, listas `-`/`*` e numeradas `1.`, citação `> `, código inline/fenced, negrito,
   itálico (`*x*`/`_x_`) e links http(s). É o ALVO do editor TipTap do admin (saída markdown) —
   token novo na toolbar de lá exige suporte aqui.
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
      auth/{otp/request,otp/verify,password/reset-otp}/route.ts   (login/reset por código)
      me/avatar/route.ts    POST multipart → sharp→WebP → R2 → PATCH /auth/me
      cursos/[slug]/aulas/[lessonId]/anexos/[attachmentId]/route.ts
                            GET download de material c/ MARCA D'ÁGUA do aluno (R2 privado)
      members/courses/[slug]/rating/route.ts   PUT classificação do curso (Zod espelha o TypeBox)
      members/lessons/[lessonId]/{complete,position}/route.ts
      members/lessons/[lessonId]/blocks/[blockId]/quiz-attempts/route.ts
      payments/my/route.ts
  server/   session.ts · gateway.ts · auth.ts · members.ts · payments.ts
            r2.ts · image-optimizer.ts · media.ts (avatar→R2; exceção consciente)
            watermark.ts (PDF pdf-lib + imagem sharp/SVG — puro, testado)   (server-only)
  lib/      env.ts (server-only) · types.ts (views do ALUNO) · user-display.ts · format.ts · cn.ts · api.ts
  components/ community/* (topnav/user-menu/user-avatar/cards/blocos)
            ⚠️ Primitivos de UI (button/input/card/dialog/password-input/…) vivem no
            **`@sistemazero/ui`** (packages/ui, compartilhado com o admin) — importe
            `@sistemazero/ui/<componente>`; NÃO recrie botões/controles ad-hoc (foi a causa do
            quiz fora do tema). Requisitos: `transpilePackages: ['@sistemazero/ui']` no
            next.config + `@source "../../../ui/src"` no globals.css.
  proxy.ts                (ex-middleware; convenção Next 16, runtime nodejs)
```

## Comandos (de dentro de `packages/community`)

| Comando | O quê |
|---------|-------|
| `bun run dev` | Next dev server :3007 (Turbopack) |
| `bun run build` / `start` | build (**`next build`** — Turbopack) + produção |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test` | testes (watermark — rode com **sandbox off**, gotcha do monorepo) |
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
  opcionais — upload de avatar (ausentes → 503 amigável; mesmo bucket do admin: dev = `testes`
  com `R2_PUBLIC_URL` r2.dev · prod = `comunidade-sistema-zero` com `cdn.sistemazero.com.br`).
- `R2_PRIVATE_BUCKET` opcional — leitura dos materiais didáticos p/ o download com marca d'água
  (mesmas credenciais; SEM acesso público: dev = `testes-privado` · prod =
  `comunidade-sistema-zero-privado`; ausente → download responde 503).

## Setup local (e2e)

1. Postgres :5433 + migrations (`db:auth:migrate`, `db:members:migrate`, `db:payments` via package).
2. Suba auth :3002, catalog :3003, members :3004, payments :3001, messaging :3006, gateway :3000
   (MESMO `JWT_HS256_SECRET`; `MEMBERS_INTERNAL_TOKEN` casando gateway↔members).
3. Aluno de teste: `bun run --filter @sistemazero/auth db:seed --email aluno@teste.com --password
   <senha> --role customer` e matrícula:
   `bun run db:members:seed --grant-user <userId>` (curso "No Comando da IA").
4. `bun run dev:community` → `http://localhost:3007` → login → home → curso → aula.
5. Materiais c/ marca d'água: exige `R2_*` + `R2_PRIVATE_BUCKET=testes-privado` no `.env`
   (bucket já criado na Cloudflare, 04/06/2026; o MESMO de `R2_PRIVATE_BUCKET` do admin —
   admin escreve, community lê; `packages/admin/scripts/verify-private-bucket.ts` valida o acesso).

## Contratos consumidos (via gateway)

- Auth: `POST /auth/login|refresh|logout`, `GET /auth/me`, `POST /auth/forgot-password` (5/min/IP),
  `POST /auth/reset-password`, `POST /auth/otp/request` `{email, purpose}` (5/min/IP, sempre 200),
  `POST /auth/otp/verify` `{email, code}` (→ tokens), `POST /auth/password/reset-otp`
  `{email, code, newPassword}`, `PATCH /auth/me` `{firstName?,lastName?,phone?,avatarUrl?}` (SEM
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
  **SEM gabarito** e com `quizState`; **anexo vem SEM `url`** — o download é pela rota BFF
  `/api/cursos/:slug/aulas/:lessonId/anexos/:id`, que resolve a localização real via
  `GET …/attachments/:attachmentId/resolve` → `AttachmentDownloadView{storageRef}` e aplica a
  marca d'água — ver invariante 1); `POST /members/lessons/:lessonId/complete` (→ **409
  `QUIZ_GATE_NOT_PASSED`** se houver quiz com `passingScore` não aprovado — a UI desabilita o
  botão e silencia o auto-complete); `PUT /members/courses/:slug/lessons/:lessonId/position`
  `{positionSeconds}` (BFF expõe como `POST /api/members/lessons/:id/position` com
  `{courseSlug, positionSeconds}` — POST porque `sendBeacon` não faz PUT; parse tolerante a
  text/plain); `POST /members/lessons/:lessonId/blocks/:blockId/quiz-attempts` `{answers}` →
  `{score, passed, passingScore, retryAvailableAt, questions[correções+explicações]}` (gabarito
  SÓ aqui; 429 `QUIZ_COOLDOWN` por 5min após reprovar — a UI mostra countdown MM:SS).
  Navegação prev/next é DERIVADA do outline (a API não fornece). Views em `src/lib/types.ts`
  (espelham `members/src/application/mappers/views.ts` — NÃO os tipos admin).
- **Classificação do curso (estilo Udemy)**: o detalhe do curso traz `myRating`
  (`CourseRatingView {rating 1..5 passo 0.5, comment, feedbackAnswers, …} | null`) e
  `salesPageUrl`. Na página da aula, link **"Deixe uma classificação"** na sidebar (abaixo do
  progresso) — renderizado SÓ com `myRating === null`; assim que a nota é salva o link some
  (sem edição posterior nesta fatia). Fluxo de 5 modais (`course-rating-flow.tsx`, Dialog do
  ui com `titleAlign='center'` + `onBack`): (1) estrelas com MEIA estrela (`StarRating` do
  `@sistemazero/ui` — clicar já persiste) → (2) frase pela nota + textarea → (3) 6 perguntas
  Sim/Não/Não sei opcionais (Pular) → (4) agradecimento (UserAvatar + nome + nota + comentário)
  → (5) compartilhar: input readonly com `shareUrl` (`salesPageUrl ?? FUNNEL_URL`, resolvido
  NO SERVIDOR pela page) + Copiar (clipboard + fallback execCommand + toast). CADA passo faz
  `PUT /api/members/courses/:slug/rating` com o estado ACUMULADO (fechar no meio não perde
  nada; gateway → `PUT /members/courses/:slug/rating`). "Salvar e sair"/fechar →
  `router.refresh()`. A page passa `viewer` (nome da session + avatar de `getMeReadonly`).
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

- [ ] `bun run typecheck` limpo · `bun test` verde (sandbox off) · `bun run check` (Biome) limpo · `bun run build` passa.
- [ ] Nenhum `server/*`/`env` importado por Client Component. Sem `any` novo.
- [ ] Bloco de aula novo? Renderer seguro (sem `src` cru em iframe; sandbox sem allow-same-origin).
- [ ] Novo endpoint do gateway? Atualizou `src/server/*` + tipos + este `CLAUDE.md`.

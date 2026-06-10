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
> fluxo Udemy de 5 modais, ver Contratos — e **bloco e-book = LIVRO 3D interativo**
> (react-three-fiber + pdf.js; PDF privado com marca d'água, ver §E-book)). A COMUNIDADE
> (feed/fórum/etc.) é fatia futura.
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
  `sz_member_refresh` (opaco) em cookies **HttpOnly**. ⚠️ **Transição de sessão (login/logout/
  troca de senha) navega com `window.location.replace(...)` — NUNCA `router.replace +
  router.refresh`**: o refresh não espera a navegação commitar (corrida vercel/next.js#54766) e
  re-renderizava `/login` já com sessão → `redirect('/')` no meio do refresh → aluno preso no
  login até um F5; o full load também descarta o router cache com dados RSC da sessão anterior.
- **Sessão (`src/server/session.ts`):** `getSession()` verifica o access JWT — a chave é escolhida
  pelo `alg` do token (espelha a jwt.strategy do gateway): **HS256** com `JWT_HS256_SECRET`
  (dev/local, MESMO segredo do auth/gateway) e/ou **RS256 via `JWT_JWKS_URL`** (PRODUÇÃO — o auth
  emite RS256; aponte p/ o gateway `<GATEWAY_URL>/auth/.well-known/jwks.json`). Pelo menos UM dos
  dois é obrigatório (refine no env). **Em PRODUÇÃO o boot EXIGE `JWT_JWKS_URL` e RECUSA
  `JWT_HS256_SECRET`** (full review 2, espelha o admin): um segredo HS256 fraco copiado de dev
  forjaria a sessão que autoriza LOCALMENTE as rotas de mídia/downloads (não passam pelo gateway).
  Os **nomes dos cookies** vivem em `src/lib/cookies.ts` (fonte ÚNICA — `session.ts` escreve,
  `proxy.ts` lê/regrava): `sz_member_*` (≠ `sz_admin_*` do painel), em prod com prefixo
  **`__Host-`** (browser exige Secure+Path=/+sem Domain — blinda contra fixation por subdomínio
  irmão); em dev (http) o prefixo é omitido. ⚠️ A **remoção** também obedece o prefixo: expirar
  usa `expireCookieOptions` (`set('', maxAge:0)` com `Secure`) — `cookies().delete()` pelado é
  REJEITADO pelo browser p/ `__Host-*` e o cookie SOBREVIVE (logout não deslogava em prod; e2e
  staging 07/06/2026).
- **Refresh — DOIS caminhos, UMA rotação (`src/server/refresh.ts`):** `refreshTokens()` faz a
  chamada `/auth/refresh` com **single-flight + cache 60s por refresh token** — obrigatório:
  requisições concorrentes (prefetch + navegação, proxy + handler, beacon + página) apresentando o
  MESMO refresh duas vezes disparariam a reuse-detection do auth e revogariam a família (logout).
  ⚠️ O estado vive em **`globalThis`** (Symbol.for), NÃO em escopo de módulo: o Turbopack separa
  proxy, páginas RSC e route handlers em TRÊS bundles com cópias próprias do módulo (verificado
  nos chunks do build) — um Map de módulo daria uma rotação concorrente por contexto. Os três
  rodam no mesmo processo, então o `globalThis` é o ponto de encontro (single-réplica pré-MVP;
  com N réplicas este cache precisa ir p/ um store compartilhado). Unit-testado em
  `tests/refresh.test.ts`. Quem rotaciona:
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
- **Prova de origem ao gateway:** TODA chamada de saída (dados, login, OTP, refresh — inclusive
  a do proxy) propaga **`x-forwarded-for`/`x-request-id`** do request de entrada
  (`clientForwardHeaders` no gateway.ts; o proxy extrai do `NextRequest`). Sem isso o rate limit
  POR IP das rotas públicas (login 20/min, **OTP 5/min**) e o log de login falho do auth veriam só
  o IP do host do community — um balde único p/ a base inteira de alunos. E toda saída tem
  **timeout** (`AbortSignal.timeout`: dados 60s, auth 15s) — espelha o admin.
- **Gate de UI + anti-CSRF:** `src/proxy.ts` (a) **barra mutação `/api/*` que não seja
  same-origin** (`requiresOriginCheck` + `isSameOriginRequest` de `lib/csrf.ts`, via
  `Sec-Fetch-Site` com fallback `Origin`×host) — defesa em profundidade além do `SameSite=Lax`,
  que NÃO barra um subdomínio IRMÃO (same-site) no domínio definitivo; `/api/me/avatar` fica FORA
  do matcher (o proxy buffeia o corpo) e tem a MESMA checagem dentro do `requireUploadSession`;
  e (b) bloqueia `/` (exato) e `/cursos|/perfil|/compras` sem cookie de refresh (redirect
  `/login`); o layout do grupo `(app)` faz a checagem real. ⚠️ Os **security headers NÃO ficam no
  proxy** — vivem em `next.config.ts` (`headers()`, cobre TODAS as respostas, incl. avatar/
  estáticos): CSP (frame-src allowlist youtube-nocookie+vimeo, worker-src blob p/ pdf.js,
  `https:` em script/style/font/connect/img/media porque o **iframe `srcDoc` do embed HERDA a CSP
  do pai** — a fronteira real do embed é o sandbox), XFO DENY, nosniff, Referrer-Policy,
  Permissions-Policy, `X-Robots-Tag: noindex` e **HSTS em prod**.
- **Impersonação (06/2026 — suporte "entra como" o aluno):** o painel admin abre
  **`GET /impersonar?token=...`** (route handler; fora dos prefixos protegidos do proxy) →
  `exchangeImpersonation` (gateway `POST /auth/impersonate/exchange`, token no CORPO, sem Bearer)
  → `setSessionCookies` (SUBSTITUI a sessão do browser) → redirect `/`; token inválido/expirado →
  `/login?erro=impersonacao`. A sessão vem com a claim **`act`** (RFC 8693 — `act.sub/email/name`
  = ADMIN; parse em `lib/act.ts`, puro/testado; `SessionUser.act?` em types) e refresh de TTL
  CURTO (2h, o auth preserva na rotação). UI: **`ImpersonationBanner`** (faixa âmbar persistente
  acima do topnav no layout `(app)`) com "Encerrar" = logout normal (revoga a família) +
  `window.location.replace('/login')`. **Sessão impersonada é SOMENTE-LEITURA p/ dados do aluno**:
  `PATCH /api/auth/me`, `POST /api/auth/me/password` e mutações de mídia (avatar — checagem no
  `requireUploadSession`) respondem **403 `IMPERSONATION_READONLY`**; GETs de download seguem
  (a marca d'água sai com o e-mail do ALUNO, dono do acesso). Além disso, contas
  superadmin/admin/staff logadas NORMALMENTE na community enxergam TODOS os cursos publicados
  (chave-mestra virtual do members — sem cadeado no catálogo; rascunho continua invisível).
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
   isso tem guard de sessão próprio (`requireUploadSession(req)` em `src/server/media.ts` —
   qualquer conta ATIVA, sem exigência de role; guard **ESTRITO**: token expirado NÃO autoriza —
   `verifyAccessToken` + UMA tentativa de `tryRefresh` e re-verificação, como o admin;
   `getSession` tolera exp SÓ p/ exibição; em MUTAÇÃO o guard também aplica a checagem
   **anti-CSRF same-origin** — a rota fica fora do matcher do proxy). Upload tem **pre-check de
   Content-Length** (`rejectOversizedRequest`) ANTES do `formData()` (o parse materializa o corpo
   em memória) — **Content-Length é OBRIGATÓRIO** (411 se ausente; sem isso um corpo chunked
   passaria sem teto), excedente → 413 — e `mediaErrorResponse` **não vaza** a mensagem interna em
   prod (o erro vai pro **Sentry** via `captureServerException`; o `r2.ts` preserva a `cause`). Pipeline: multipart ≤5MB
   png/jpg/webp → sharp→WebP 512×512 (`image-optimizer.ts`, preset `avatar`) → R2
   `community/avatars/<userId>/<uuid>.webp` (`r2.ts`) → `PATCH /auth/me { avatarUrl }` via gateway
   → **limpeza dos avatares ANTERIORES** do prefixo do usuário (`removeStaleAvatars`,
   best-effort — sem isso cada troca acumularia órfão no R2). Envs R2_* ausentes → 503
   `MEDIA_NOT_CONFIGURED` amigável. `next.config.ts` tem `serverExternalPackages: ['sharp']`.
   Mesma exceção: **`GET /api/cursos/:slug/aulas/:lessonId/anexos/:attachmentId`** (download de
   material) LÊ do bucket R2 **PRIVADO** (`R2_PRIVATE_BUCKET`, `r2GetObjectPrivate` — devolve
   STREAM + contentType/contentLength) — mas a AUTORIZAÇÃO real (matrícula + aula publicada) vem
   do members via gateway (rota `/resolve`), que devolve a `storageRef` (`r2priv:<key>` ou URL
   externa→302). O MIME e a decisão de marca vêm de **`resolveDownloadMedia`**
   (`src/lib/download-mime.ts`, puro/testado): sinais REAIS (Content-Type do R2 + extensão da
   key) decidem — o `fileType` do anexo é TEXTO LIVRE do admin e vale só como último recurso
   (um "PDF" digitado à mão não desliga a marca em silêncio). PDF/imagem ganham **marca d'água
   com o e-mail do aluno** (`server/watermark.ts`: pdf-lib rodapé em todas as páginas · sharp
   selo SVG no canto, GIF animado via tile por frame; falha → serve o original + warn); demais
   formatos vão em **STREAM direto** (sem materializar 200MB em memória) e arquivos marcáveis
   acima de `WATERMARK_MAX_BYTES` (200MB, casado com o teto de upload do admin) também caem p/ o
   original em stream + warn. **Marcar passa pelo GATE de concorrência**
   (`server/watermark-queue.ts`, **máx. 1 simultânea** — baixado de 2 quando o teto subiu de 50MB
   p/ 200MB p/ o pico não dobrar, ~600MB no pior caso; FIFO em `globalThis` — full review 2;
   ⚠️ RAM ≥2GB no community → dá p/ voltar a 2): bufferizar+marcar sem teto, uma turma baixando o
   mesmo PDF grande derrubaria o host por OOM; quem espera segura só um closure, não o buffer. Resposta:
   `Content-Disposition: attachment` (label + extensão da key) e `Cache-Control: private,
   no-store` (conteúdo é POR aluno). A `storageRef` NUNCA vai ao browser.
2. **Segredos só no servidor.** `src/lib/env.ts` é `server-only`; `src/server/*` idem. **Nunca**
   importe `env`/`server/*` de um Client Component. Client fala só com `/api/*` (`src/lib/api.ts`).
3. **Tokens em cookie HttpOnly** (`sz_member_*`; em prod prefixados **`__Host-`** — ver
   `lib/cookies.ts`, fonte única), `SameSite=Lax`, `Secure` em prod, `Path=/`, sem `Domain`.
4. **Dinheiro em centavos**; o payments serializa como **string** (bigint) → `formatCentsStr`.
5. **Blocos de aula = conteúdo de terceiros.** NUNCA interpole `src` cru em iframe — extraia o ID e
   monte a URL canônica (`youtube-nocookie.com/embed/<id>`, `player.vimeo.com/video/<id>`); HTML de
   embed roda SÓ em `iframe sandbox` SEM `allow-same-origin` (`lesson-blocks.tsx`). **Embed v3:**
   sempre `srcDoc` em largura total + `aspect-video` (16:9) — `embedType`/`src`/`height` são
   legado ignorado (bloco antigo só-src → "não suportado"); o `content.sandbox` (allowlist do
   members) também é **ignorado de propósito** — o renderer fixa `allow-scripts`, o default mais
   restrito que ainda roda o interativo (honrar tokens por bloco abriria a porta p/
   allow-same-origin). `rich_text` renderiza `markdown` com conversor próprio controlado (sem
   HTML cru) — **`src/lib/markdown.tsx`**, puro e unit-testado (`tests/markdown.test.tsx`) —
   tokens suportados: headings 1-3, listas `-`/`*` e numeradas `1.`, citação `> `, código
   inline/fenced, negrito, itálico (`*x*`/`_x_`) e links http(s). É o ALVO do editor TipTap do
   admin (saída markdown) — token novo na toolbar de lá exige suporte aqui (e teste).
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
      cursos/[slug]/aulas/[lessonId]/  Player (blocos + anexos + concluir + prev/next + outline
                                       + classificação do curso na sidebar — ver Contratos)
      perfil/               Foto (upload R2) + editar nome/telefone + trocar senha (e-mail IMUTÁVEL)
      compras/              Tabela paginada + dialog de detalhe
    api/
      healthz/route.ts      liveness puro p/ o healthcheck do Railway (sem auth/upstream)
      auth/{login,logout,forgot-password,reset-password,me,me/password}/route.ts
      auth/{otp/request,otp/verify,password/reset-otp}/route.ts   (login/reset por código)
      me/avatar/route.ts    POST multipart → sharp→WebP → R2 → PATCH /auth/me
      cursos/[slug]/aulas/[lessonId]/anexos/[attachmentId]/route.ts
                            GET download de material c/ MARCA D'ÁGUA do aluno (R2 privado).
                            UI: lesson-attachments.tsx baixa via fetch NA MESMA página
                            (spinner por item + lista desabilitada; a marca d'água demora
                            segundos — target=_blank deixava uma guia em branco "morta");
                            blob → âncora programática c/ filename do Content-Disposition;
                            anexo EXTERNO (302 cross-origin) → fetch falha no CORS →
                            fallback window.open
      cursos/[slug]/aulas/[lessonId]/blocos/[blockId]/ebook/route.ts
                            GET PDF do bloco e-book c/ MARCA D'ÁGUA, INLINE (livro 3D consome)
      members/courses/[slug]/rating/route.ts   PUT classificação do curso (Zod espelha o TypeBox)
      members/lessons/[lessonId]/{complete,position}/route.ts
      members/lessons/[lessonId]/blocks/[blockId]/quiz-attempts/route.ts
      payments/my/route.ts
  server/   session.ts (getSession exibição · verifyAccessToken ESTRITO p/ autorizar local)
            gateway.ts (forward de x-forwarded-for/x-request-id + timeouts) · auth.ts ·
            members.ts · payments.ts · r2.ts (privado em STREAM + list/delete de avatares +
            timeouts S3 connection 5s/request 120s) · image-optimizer.ts ·
            media.ts (guard estrito + anti-CSRF em mutação + 411/413 pre-check + limpeza de
            avatares + espelho Sentry) · watermark.ts (PDF pdf-lib + imagem sharp/SVG — puro,
            testado) · watermark-queue.ts (gate de concorrência da marca, FIFO em globalThis) ·
            sentry.ts (ingestão via fetch, SEM SDK — sem `server-only` p/ o onRequestError)
  instrumentation.ts      fail-fast de env em DEV (⚠️ prod NÃO roda register() — ver scripts/)
                          + onRequestError → Sentry (exceções de Route Handler/RSC)
  scripts/boot-check.mjs  fail-fast REAL de prod (CMD do Dockerfile; sincronia c/ instrumentation)
  lib/      env.ts (server-only) · types.ts (views do ALUNO) · user-display.ts · format.ts · cn.ts · api.ts
            markdown.tsx (conversor controlado do rich_text — puro, testado)
            download-mime.ts (MIME/marca dos downloads por sinais reais — puro, testado)
            csrf.ts (same-origin via Sec-Fetch-Site — puro, testado) · cookies.ts (nomes dos
            cookies, __Host- em prod — puro, testado)
  components/ community/* (topnav/user-menu/user-avatar/cards/blocos/course-rating-flow)
            community/ebook/* — LIVRO 3D do bloco e-book: ebook-block.tsx (resolve URL via
            LessonPlayerContext + dynamic ssr:false) → ebook-book.impl.tsx (Canvas r3f +
            OrbitControls restrito + botões/label + slider de brilho — preferência via
            ebook-prefs.ts, localStorage) + book-3d.tsx (folhas = BoxGeometry
            segmentado + SkinnedMesh/bones, dobra com damp por frame; técnica própria) +
            use-pdf-pages.ts (pdf.js → CanvasTexture, janela folha±2 c/ dispose; worker via
            new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url), singleton)
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
| `bun test` | testes (watermark · markdown · download-mime · refresh · csrf · cookies · sentry · watermark-queue · ebook-prefs — rode com **sandbox off**, gotcha do monorepo) |
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

- `GATEWAY_URL` (default `http://localhost:3000`; **em prod é OBRIGATÓRIO explícito** — fail-fast).
- Verificação do access token — **pelo menos UM**: `JWT_HS256_SECRET` (dev/local, MESMO do
  auth/gateway) e/ou `JWT_JWKS_URL` (**produção** — o auth emite RS256; usar o JWKS via gateway:
  `http://api-gateway.railway.internal:3000/auth/.well-known/jwks.json`). ⚠️ **Em produção o boot
  EXIGE `JWT_JWKS_URL` e RECUSA `JWT_HS256_SECRET`** (full review 2 — HS256 fraco forjaria a
  sessão local de mídia/downloads).
- `JWT_ISSUER`/`JWT_AUDIENCE`: **OBRIGATÓRIOS em produção** (fail-fast no boot — mesma regra do
  gateway/admin; prod = `sistemazero-auth`/`sistemazero`); em dev, casar com o auth ativa a checagem.
- `SENTRY_DSN` (opcional): espelho de erros LOCAIS (pipeline de mídia/watermark + exceções de
  Route Handler/RSC via `onRequestError`). Ausente = no-op. ⚠️ **Sem SDK** — `src/server/sentry.ts`
  fala o protocolo de ingestão via `fetch` (o tracing do standalone/Turbopack não copia pacotes
  externos de forma confiável; mesma decisão do admin).

**Fail-fast de boot:** as regras acima vivem em DOIS lugares que precisam ficar em sincronia —
`src/instrumentation.ts` (cobre `next dev`; ⚠️ em PRODUÇÃO o Next 16 não roda `register()` no
boot) e **`scripts/boot-check.mjs`** (o fail-fast REAL de prod — launcher do CMD do Dockerfile:
valida e só então importa o `server.js` standalone).
- `FUNNEL_URL` opcional — fallback da página de vendas (curso sem `metadata.salesPageUrl`):
  em `/cursos` (sem ela e sem metadata, o card bloqueado fica não-clicável) e na modal
  Compartilhar da classificação do curso (sem URL, o botão Compartilhar é ocultado).
  Dev = `http://localhost:4321` (funil local); prod = domínio real do funil.
- `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET`/`R2_PUBLIC_URL`
  opcionais — upload de avatar (ausentes → 503 amigável; mesmo bucket do admin: dev = `testes`
  com `R2_PUBLIC_URL` r2.dev · prod = `comunidade-sistema-zero` com `cdn.sistemazero.com.br`).
- `R2_PRIVATE_BUCKET` opcional — leitura dos materiais didáticos p/ o download com marca d'água
  (mesmas credenciais; SEM acesso público: dev = `testes-privado` · prod =
  `comunidade-sistema-zero-privado`; ausente → download responde 503).

## Deploy (Railway)

- Serviço próprio via **`packages/community/railway.json`** (builder DOCKERFILE, build context =
  RAIZ do monorepo, `healthcheckPath: /api/healthz`, watchPatterns community+ui+lock).
- **Dockerfile** (espelha o admin): build em `node:22-bookworm-slim` com o binário do **bun**
  copiado de `oven/bun:1` só p/ `bun install` (workspace); `next build` roda **package-local com
  runtime Node** (`npm run build`). Runner copia `.next/standalone` (árvore espelha o monorepo —
  `outputFileTracingRoot` = raiz) + static + public e roda `node packages/community/boot-check.mjs`
  (fail-fast de env → `server.js`). `PORT` injetado pelo Railway (fallback 3007), `HOSTNAME=::`.
  `output: 'standalone'` + `poweredByHeader: false` no `next.config.ts`.
- `/api/healthz` é liveness puro (sem auth, sem tocar upstream). **Security headers + CSP vivem
  no `next.config.ts`** (`headers()`, cobrem TODAS as rotas incl. `/api/me/avatar` e estáticos):
  XFO DENY, nosniff, Referrer-Policy, Permissions-Policy, `X-Robots-Tag: noindex`, **HSTS em
  prod** e CSP (frame-src allowlist + worker-src blob + base-uri/form-action/frame-ancestors;
  `https:` em script/style/font/connect/img/media — o srcDoc do embed herda a CSP do pai).
- ⚠️ **RÉPLICA ÚNICA (não escalar horizontalmente sem refatorar):** o single-flight do refresh
  (`refresh.ts`) e o gate da marca d'água (`watermark-queue.ts`) vivem em `globalThis` — POR
  PROCESSO. Com 2+ réplicas, duas rotações do mesmo refresh colidem no claim atômico do auth
  (logout aleatório) e o teto de memória da marca vira teto POR réplica. Mesma régua do admin.
- ⚠️ **Tracing de externos no standalone (verificar no 1º deploy):** o `next build` (Turbopack)
  não copia `serverExternalPackages` (ex.: `sharp`) p/ o `.next/standalone/node_modules` de forma
  confiável (descoberta do admin) — aqui o sharp atende avatar E marca d'água de imagem. Confirme
  que `sharp` chega ao container; se não, o Dockerfile deve copiá-lo explicitamente.
- Envs de prod: `GATEWAY_URL` + `JWT_JWKS_URL` (+ `JWT_ISSUER`/`JWT_AUDIENCE` obrigatórios; SEM
  `JWT_HS256_SECRET` — o boot recusa) + `FUNNEL_URL` + R2_* (incl.
  `R2_PRIVATE_BUCKET=comunidade-sistema-zero-privado`) + `SENTRY_DSN` (opcional).

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
  a página `/cursos` resolve `salesPageUrl ?? FUNNEL_URL` no server, o card bloqueado abre a
  página de vendas em **NOVA aba** (`target="_blank" rel="noopener noreferrer"`) e filtra/busca
  client-side com estado na URL `?q=&acesso=&ordem=`); `GET /members/courses/:slug` → `CourseDetailView`
  (módulos+outline + `continueLessonId`: última aula acessada > 1ª não concluída > 1ª);
  `GET /members/courses/:slug/lessons/:lessonId` → `LessonDetailView` (**busca por ID**, blocos
  `kind: rich_text|video|image|audio|quiz|embed|ebook` + anexos + `positionSeconds`; bloco quiz vem
  **SEM gabarito** e com `quizState`; **anexo vem SEM `url`** — o download é pela rota BFF
  `/api/cursos/:slug/aulas/:lessonId/anexos/:id`, que resolve a localização real via
  `GET …/attachments/:attachmentId/resolve` → `AttachmentDownloadView{storageRef}` e aplica a
  marca d'água — ver invariante 1; **bloco `ebook` também vem SEM `url`** — o livro 3D busca o PDF
  pela rota BFF `/api/cursos/:slug/aulas/:lessonId/blocos/:blockId/ebook`, que resolve via
  `GET …/blocks/:blockId/ebook/resolve` → `EbookDownloadView{title,storageRef}`, aplica a MESMA
  marca d'água de PDF e serve INLINE com `private, no-store`); `POST /members/lessons/:lessonId/complete` (→ **409
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
- **E-book / livro 3D** (`components/community/ebook/*`): bloco `ebook` renderiza o PDF como
  livro 3D interativo — folhas com dobra real (SkinnedMesh + cadeia de bones por folha, damp por
  frame; frente da folha i = página 2i+1, verso = 2i+2), virar por clique na página ou botões
  HTML (acessíveis), inclinação leve por drag (OrbitControls restrito), flutuação idle.
  **Orientação DE FRENTE** (ajustes 04/06/2026): folha não virada = rotação 0 (livro fechado
  mostra a CAPA pro leitor), virada = −π; verso da última folha sem página = **contracapa
  escura** (`BACK_COVER_COLOR`). **Empilhamento (gotcha)**: a fórmula `(page − number)·d` da
  técnica de referência INVERTE a pilha esquerda (a capa cobria a página atual a partir de ~3
  folhas viradas) — cada pilha desce na ordem certa (recém-virada por cima), o topo esquerdo
  fica 2 gaps acima do direito (folha em virada nunca colide com o novo topo direito; pilhas
  não se sobrepõem em x) e `SHEET_GAP = 1.4×espessura` (faces coplanares = z-fighting). **Legibilidade**: `Canvas flat` (SEM tone mapping — ACES lavava
  o contraste do texto), texturas 1536px + `anisotropy 16` e **luzes calibradas p/ a página de
  frente renderizar a ~1.0** (modo físico do three r155+ divide a difusa por π — ambiente 2.75 +
  direcional 0.5; intensidades baixas deixam o papel CINZA, percebido como "overlay escuro") +
  **slider de brilho da página** (Sun + range 0.5–1.0 ao lado do fullscreen, multiplica as duas
  luzes; preferência em localStorage `sz:ebook:brightness` via `ebook-prefs.ts`, puro/testado). **Tela
  cheia** no container (Fullscreen API, mesmo padrão do `vimeo-player`; em fullscreen o
  `aspect-video` vira `h-full` e o **zoom por scroll LIGA** — fora dela ficaria sequestrando o
  scroll da página). Fundo = gradiente radial calmo (azul-escuro). Texturas via pdf.js (worker
  do próprio bundle — CSP tem `worker-src 'self' blob:`), janela lazy folha±2 com
  `texture.dispose()` (keep ±3; PDF grande não estoura GPU). O PDF chega da rota BFF já com a
  **marca d'água do aluno** (mesma pipeline dos anexos) → a marca aparece nas próprias páginas
  do livro. Deps: `three` (+`transpilePackages`), `@react-three/fiber@9` (React 19),
  `@react-three/drei@10`, `pdfjs-dist@6` — TUDO atrás de `dynamic ssr:false` (só entra no
  bundle quando a aula tem bloco e-book).
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
- [ ] Mexeu nas regras de env? `src/instrumentation.ts` e `scripts/boot-check.mjs` em SINCRONIA.
- [ ] Chamada de saída nova? Propaga `x-forwarded-for`/`x-request-id` + `AbortSignal.timeout`.

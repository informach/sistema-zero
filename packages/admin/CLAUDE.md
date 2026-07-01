# CLAUDE.md — @sistemazero/admin

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Next.js, React, Tailwind,
> jose, Zod, etc.) — não confie só na memória; APIs mudam (ex.: `middleware`→`proxy` no Next 16). Para
> **pesquisa, exploração e entender padrões**, use o **MCP do Octocode** em repositórios GitHub
> relevantes. Faça certo e atualizado — não "de cabeça".

Guia operacional do **painel administrativo** (full-stack). Leia antes de editar.

> 📖 A explicação CONCEITUAL do catálogo (produto × oferta × matrícula, chave-mestra, as 3 formas
> de bônus — o que cada tela do painel significa para o negócio) está em
> [`docs/catalogo-e-entitlements.md`](../../docs/catalogo-e-entitlements.md). **Mudou o fluxo de
> cadastro/concessão aqui? Atualize o manual também.**

## O que é

Painel para o dono operar a plataforma: **usuários, pagamentos, produtos, ofertas, cupons e membros**.
Front-end **Next.js 16 (App Router) + React 19 + Tailwind v4**; o back-end é um **BFF agregador** que
**chama o API Gateway** (NUNCA os serviços direto). Espelha o design do projeto de referência
`comunidade-sistema-zero` (tokens OKLch dual light/dark, Base UI-like + lucide + sonner; **logo
dual-theme** `public/logo_dark.svg`⇄`logo_white.svg` na topbar/login — `dark:block`/`dark:hidden` —
e **favicon** completo: `src/app/favicon.ico` + PNGs 16/32/192/512 + apple-touch via
`metadata.icons`, mesmos assets do community). Porta **3005**.

> Estado: **Fatia 1 — Catálogo** (produtos/ofertas/cupons: listar/criar/editar) + **Fatia 2 —
> Usuários** (listar com busca/filtros — q/papel/status + **busca avançada 06/2026**: origem do
> cadastro + janela `createdFrom/createdTo` — + **criar via convite por e-mail** + editar
> status/papel/perfil, guards hierárquicos e concorrência otimista; ações por linha **Conceder
> acesso** — `GrantAccessDialog` compartilhado com pickers de oferta/curso + presets de validade —
> e **Matrículas**; **ações em LOTE 06/2026**: checkbox por linha + "selecionar todos da página" →
> barra com **Conceder acesso em lote** (`GrantAccessDialog` com `userIds[]`, itera o POST por
> usuário via `lib/pool.mapPool` conc. 5 — cada concessão idempotente e auditada individualmente)
> e **Suspender/Ativar em lote** (PATCH por usuário; pula self + contas que o operador não pode
> editar; resumo por item no toast)) + **Análises de aprendizado (06/2026)** (aba "Análises" sob
> Membros → `/admin/membros/analises`, `analises-client.tsx`: overview de conclusão por curso +
> funil por aula com destaque do GARGALO [maior queda]; BFF `GET /api/members/analytics/courses[/:courseId]`)
> + **Fatia Pagamentos** (transações + assinaturas: listar/filtrar/detalhe +
> **estornar**/**cancelar**, stats e saúde de webhooks/operações; detalhe exibe a **garantia** da
> oferta comprada — resolvida no BFF de `metadata.offerId` → `guaranteeDays` do catálogo — com
> aviso de estorno fora da garantia) + **Fatia Membros** (abas
> Alunos|Cursos — **Alunos**: listar + **ficha 360 do aluno** (`[userId]/member-detail-client.tsx`
> em abas: Visão geral [progresso+matrículas], Gamificação, Atividade, Certificados, Classificações,
> Pagamentos) com matrículas/progresso + conceder manual
> (oferta/curso) + revogar/expirar/estender + **"Entrar como"** (reusa `lib/impersonation`) +
> revogar certificado, identidade hidratada do auth via batch. A 360 tem **seletor de aprendiz**
> (conta=adult / cada perfil=kids); Gamificação/Atividade/Certificados/Classificações são por
> aprendiz (BFF chama `/api/members/[userId]/{gamification?audience,activity,certificates,ratings}`,
> keyados no id do aprendiz — a conta OU o profileId); Pagamentos busca `/api/payments/transactions?q=<email>`;
> **Cursos**:
> autoria — CRUD de cursos + editor de módulos/aulas com **drag-and-drop** (dnd-kit clássico:
> core 6.3 + sortable 10; hook `components/dnd/use-sortable-item.ts`; reorder otimista →
> endpoints `/reorder`, erro→toast+reload) + módulos **colapsáveis** com contador "X de Y aulas
> publicadas · N min" + **publicação por aula** (switch no dialog — aula nova nasce RASCUNHO —,
> badge Publicada/Rascunho; publicar curso sem aula publicada → 409 `NO_PUBLISHED_LESSON` no
> toast) + editor de blocos polimórficos (texto/vídeo/imagem/áudio/quiz/embed/**ebook**/**studio**/**certificate**) e anexos,
> ambos com DnD; **autoria v3 (06/2026): upload é o ÚNICO caminho** — imagem upload-only
> (`ImageUploader allowManualUrl={false}`; capa de curso mantém URL manual), vídeo **só Vimeo**
> (sem select de provider/URL/duração manual — o uploader TUS preenche src/duração/transcrição;
> `BlockForm.provider` interno preserva blocos legados youtube/file na edição), áudio via
> `AudioUploader` (bucket público + duração auto), interativo = **só HTML** (CodeMirror 6 —
> `components/editor/html-code-editor{,.impl}.tsx`, `@uiw/react-codemirror`+`@codemirror/lang-html`,
> dynamic ssr:false, tema via next-themes; renderiza iframe sandbox 16:9 no aluno) e **ebook** =
> PDF via `FileUploader` (bucket privado, `r2priv:`, ≤200MB) + título → livro 3D no community;
> o upload do PDF do e-book também cria AUTOMATICAMENTE o anexo da aula (material p/ download,
> `addEbookAttachment` com dedupe por URL; trocar o PDF deixa o material antigo — excluir manual); bloco
> **rich_text usa TipTap** (`components/editor/rich-text-editor{,.impl}.tsx` —
> saída MARKDOWN via tiptap-markdown, `dynamic ssr:false` + `immediatelyRender:false` +
> `shouldRerenderOnTransaction:true`; estilos `.rich-text-content` no globals.css; **suporta
> IMAGEM** via `@tiptap/extension-image` + botão da toolbar que faz upload em `/api/media/images`
> (`scope=block`) e insere `setImage`; a imagem é **REDIMENSIONÁVEL/ALINHÁVEL** —
> `components/editor/resizable-image.tsx` estende o Image com `width` (% 10–100) e `align`
> (left/center/right), NodeView (`ReactNodeViewRenderer`) com **alça de arrastar** + botões de
> alinhar quando selecionada, e serializa p/ `![](url){width=NN align=xx}` (sufixo só quando há
> atributo → sem atributo = `![](url)`, compat total). O renderer do aluno
> (`member-shell/lib/markdown`) LÊ esse mesmo sufixo (`imageStyleFromAttrs`) — mexeu num, mexa no
> outro. prop `compact` reduz a altura
> mínima) e bloco **quiz usa o MESMO editor TipTap** (`aulas/[lessonId]/quiz-builder.tsx` —
> enunciado, opções e explicação são MARKDOWN com formatação rica + imagens, `compact` nas
> opções/explicação; checkbox "correta"/nota de corte seguem; `validateQuiz` espelha o members;
> o aluno renderiza via `member-shell/lib/markdown`)) + **Painel "Gestão de vendas"**
> (estilo Hotmart: filtros produto/período **7/30/90 dias + 6/12 meses**, cards
> líquido/transações/cancelamentos com tooltip, gráfico Recharts colapsável — série densa via BFF,
> **agregada por semana >90d / mês >270d** com `granularity`/`periodEnd`) + **cadastros inteligentes**
> (SKU/slug/code auto-gerados com dirty-flag, tooltips `Field.tooltip`, cupom com multi-select de
> ofertas, produto em PÁGINA dedicada com editores de combo e fulfillment, oferta com bônus/itens;
> **entrega derivada (06/2026)**: o FulfillmentEditor virou "O que esta compra libera" — `course`
> (picker de curso) ou `all_courses` (chave-mestra, todos os cursos atuais e futuros) + Liberação;
> sem select de accessType solto, sem editor de assets (download/external REMOVIDOS — tudo entrega
> via curso). Tipos oferecidos no select: ebook/curso/kit/comunidade/combo — `service`/`other`
> saíram do FORM (por enquanto; o catálogo segue aceitando — enum no banco, default 'other' — e
> produto legado com tipo fora da lista ganha opção "(legado)" na edição). Card de Entrega SOME
> quando kind=`bundle` (combo entrega via componentes); trocar o
> kind limpa o estado que não se aplica (`onKindChange`: → bundle zera fulfillment, ← bundle zera
> components) e o payload manda `fulfillment:null` p/ combo. Validação client espelha o
> `assertCoherent` do catalog: ATIVAR exige curso escolhido OU all_courses (não-combo) / ≥1
> componente (combo); rascunho livre. Produto legado (download/assets) é normalizado no load
> (`sanitizeFulfillment`) — salvar auto-limpa) +
> **Fatia Mídia** (upload de imagens/anexos → Cloudflare R2 com sharp→WebP; vídeos → Vimeo via TUS
> direto do browser + capa + transcrição re-hospedada no R2 — ver §Mídia) +
> **Fatia Auditoria (06/2026)** (item de nav "Auditoria" → `/admin/auditoria`,
> `auditoria-client.tsx`: trilha de ações administrativas com filtros ação/ator/alvo/período +
> paginação; BFF `GET /api/admin/audit` → gateway `GET /auth/admin/audit`, admin+. A trilha é
> ALIMENTADA pelo gateway nas rotas admin mutantes marcadas com `audit` — o painel só LÊ).
> Login via IdP (`@sistemazero/auth`) com JWT/RBAC. Badges usam tokens `--success/--success-foreground`
> (contraste AA no light; `bg-success/15 text-success-foreground`).

## Arquitetura (o padrão central — preserve-o)

```
Browser → /api/* (Route Handlers, mesma origem, cookie HttpOnly)
        → gatewayFetch (Bearer do cookie, refresh-on-401)
        → API Gateway (:3000) verifica JWT + RBAC → injeta X-Auth-User-* → serviço
```

- **Login:** `POST /api/admin/login` → gateway `/auth/login`; rejeita role ∉ {superadmin,admin,staff}
  (403); grava `sz_admin_access` (JWT) + `sz_admin_refresh` (opaco) em cookies **HttpOnly**.
  ⚠️ **Transição de sessão (login/logout) navega com `window.location.replace(...)` — NUNCA
  `router.replace + router.refresh`**: o refresh não espera a navegação commitar (corrida
  vercel/next.js#54766) e re-renderiza `/login` já com sessão → preso no login até um F5 (bug
  visto no community); o full load também descarta o router cache da sessão anterior.
- **Sessão (`src/server/session.ts`):** `getSession()` verifica o access JWT — a chave é escolhida
  pelo `alg` do token (espelha a jwt.strategy do gateway): **HS256** com `JWT_HS256_SECRET`
  (dev/local, MESMO segredo do auth/gateway) e/ou **RS256 via `JWT_JWKS_URL`** (PRODUÇÃO — o auth
  emite RS256; aponte p/ o gateway `<GATEWAY_URL>/auth/.well-known/jwks.json`; jose cuida do cache).
  Pelo menos UM dos dois é obrigatório (refine no env). **Em PRODUÇÃO o boot EXIGE `JWT_JWKS_URL` e
  RECUSA `JWT_HS256_SECRET`** (full review 2): um segredo HS256 fraco copiado de dev forjaria a
  sessão que autoriza LOCALMENTE o `/api/media/*` (essas rotas não passam pelo gateway). Token
  expirado → a assinatura já foi validada (jose checa assinatura ANTES do exp) → decodifica p/
  exibir; os dados renovam via refresh-on-401. Os **nomes dos cookies** vivem em `src/lib/cookies.ts`
  (fonte única — `session.ts` escreve, `proxy.ts` lê): em prod ganham o prefixo **`__Host-`**
  (`__Host-sz_admin_*` — o browser exige Secure+Path=/+sem Domain, prende o cookie a esta origem
  exata); em dev (http) o prefixo é omitido (`__Host-` exige Secure). ⚠️ A **remoção** também
  obedece o prefixo: expirar usa `expireCookieOptions` (`set('', maxAge:0)` com `Secure`) —
  `cookies().delete()` pelado é REJEITADO pelo browser p/ `__Host-*` e o cookie SOBREVIVE
  (logout não deslogava em prod; achado do e2e do community em staging, 07/06/2026). ⚠️ Ao subir
  p/ prod, sessões abertas (cookies sem prefixo) deixam de ser lidas → 1 re-login regrava.
- **Refresh (`src/server/gateway.ts`):** `gatewayFetch` em 401 chama `/auth/refresh`, regrava os
  cookies e re-tenta UMA vez. **Só** roda em Route Handlers/Server Actions (lá pode escrever cookies).
  A rotação é **single-flight por refresh token**: chamadas paralelas (`Promise.all` no BFF, fetches
  concorrentes do dashboard) compartilham UMA rotação — sem isso o claim atômico do auth derruba a
  2ª e o `clearSessionCookies` dela apagaria os cookies recém-gravados (logout aleatório). ⚠️ O mapa
  vive em **`globalThis`**, NÃO em escopo de módulo: o Turbopack separa route handlers (e o proxy)
  em BUNDLES distintos com cópias próprias do módulo — um Map de módulo daria uma rotação concorrente
  POR bundle, mesmo em UM processo, reabrindo o logout aleatório (lição verificada no community).
  ⚠️ Mesmo no `globalThis`, o single-flight é **POR PROCESSO → só cobre 1 réplica** (ver §Deploy).
  Falha de REDE no refresh NÃO limpa cookies (transitória); recusa do auth limpa. Toda chamada de
  saída tem **timeout** (`AbortSignal.timeout`: dados 60s, auth 15s) e **propaga
  `x-forwarded-for`/`x-request-id`** do request de entrada (sem isso o rate limit por IP do gateway e
  o log de login falho do auth veriam só o IP do host do admin).
- **Gate de UI + anti-CSRF:** `src/proxy.ts` (convenção `proxy` do Next 16, ex-`middleware`)
  (a) **barra mutação `/api/*` que não seja same-origin** (`requiresOriginCheck` + `isSameOriginRequest`
  de `lib/csrf.ts`) — defesa em profundidade além do `SameSite=Lax`, que NÃO barra um subdomínio
  IRMÃO (same-site) no domínio definitivo; e (b) bloqueia `/admin/*` sem cookie de refresh (redirect
  `/login`). `app/admin/layout.tsx` faz a checagem real (assinatura + role) e mostra "acesso negado"
  se preciso. ⚠️ Os **security headers NÃO ficam mais no proxy** — migraram p/ `next.config.ts`
  (`headers()`), que cobre TODAS as respostas, inclusive `/api/media/*` (fora do matcher do proxy):
  CSP, XFO DENY, nosniff, Referrer-Policy, Permissions-Policy, `X-Robots-Tag: noindex` e HSTS (prod).
  A **CSP** é sem-nonce (`'unsafe-inline'` p/ o bootstrap do Next; `connect-src` libera os hosts de
  upload TUS do Vimeo `*.cloud.vimeo.com`; `img-src https:` p/ capas do R2/externas; `frame-src`
  player.vimeo) — se o upload de vídeo sumir com erro de CSP, re-extraia o host de upload do Vimeo.

## Mídia (`/api/media/*` — R2 + Vimeo)

Upload nos cadastros de curso/aula (capa, blocos imagem/áudio, anexos, vídeo). **Estas rotas NÃO
passam pelo gateway** (falam com provedores EXTERNOS — não viola o invariante 1, que é sobre
serviços internos) → **todo handler exige `requireMediaSession()`** (sessão + role superadmin/admin;
`src/server/media.ts`). O guard é **ESTRITO** (full review 06/2026): como o gateway nunca revalida
essas rotas, token expirado NÃO autoriza — `verifyAccessToken` (exp incluso) + UMA tentativa de
`tryRefresh` (Route Handler pode regravar cookies) e re-verificação; falhou → 401. (`getSession`
tolera exp SÓ p/ exibição — não use p/ autorizar fora do gateway.) O `requireMediaSession` também
aplica a **mesma checagem anti-CSRF same-origin** do proxy (estas rotas ficam FORA do matcher dele).
Todo upload tem **pre-check de Content-Length** (`rejectOversizedRequest`) ANTES do `formData()` — o
parse materializa o corpo inteiro em memória; **Content-Length é OBRIGATÓRIO** (411 se ausente — sem
isso um corpo chunked passaria sem teto até o check pós-parse), excedente → 413. O matcher do
`proxy.ts` **exclui `api/media`** (o proxy buffeia o corpo a ~10MB e estrangularia multipart). Fatia
**stateless**: sem tabela de assets — URLs/IDs vivem no conteúdo dos blocos do members (lixo órfão no
R2 é dívida documentada; sem GC nesta fatia). Chamadas externas têm timeout (Vimeo API 30s / bytes
60s; S3/R2 connection 5s / request 120s) e o `mediaErrorResponse` **não vaza** a mensagem interna em
prod (fica no log) e **espelha o erro p/ o Sentry** (`captureServerException`, com a cadeia de
`cause` — o `r2.ts` embrulha o erro do S3 preservando a causa).

- `POST /api/media/images` (multipart ≤5MB png/jpg/webp; `scope=course|block`) → sharp→WebP →
  R2 `admin/{courses,blocks}/<uuid>.webp` → `{url,width,height,sizeBytes}`.
- `POST /api/media/audio` (multipart ≤50MB mp3/m4a/ogg/wav) → bucket R2 **PÚBLICO**
  `admin/audio/<uuid>.<ext>` (sem transformação) → `{url,fileType,sizeBytes}`. Áudio de aula é
  PÚBLICO de propósito: o `<audio>` do aluno toca a URL direto (bucket privado quebraria a
  reprodução — bug da v2, corrigido na autoria v3). A **duração é detectada no client**
  (`AudioUploader`: object URL + `loadedmetadata`) e salva no bloco — sem campo manual.
- `POST /api/media/files/presign` (JSON `{filename,contentType,sizeBytes}`, allowlist
  pdf/zip/office/txt/csv/imagem/áudio ≤200MB) → valida sessão/MIME/tamanho, gera a key
  server-side e devolve **URL PUT pré-assinada** → `{uploadUrl,url,contentType}`. O
  `FileUploader` então sobe o arquivo **DIRETO no bucket R2 privado** (XHR PUT com progresso),
  exatamente como o vídeo sobe direto pro Vimeo. **`url` = `r2priv:<key>`** (NÃO navegável).
  ⚠️ **Por que direto (e não multipart pelo admin):** `admin.sistemazero.com.br` fica atrás do
  **Cloudflare (plano Free → teto RÍGIDO de 100MB no corpo da requisição)** — um PDF de e-book
  >100MB é cortado pela borda do Cloudflare ANTES de chegar no admin (sintoma: "enviando…" pra
  sempre, sem log no Railway/Sentry pq nem chega na origem). O upload direto pula o Cloudflare E o
  buffer de memória do admin E o timeout de 300s da borda do Railway. Exige **CORS no bucket
  privado** (regra `admin-direct-upload`: PUT/GET/HEAD de `https://admin.sistemazero.com.br` +
  `http://localhost:3005`, header `content-type`) — setado via API Cloudflare R2 nos dois buckets
  privados (dev+prod) em 08/06/2026; e `connect-src https://*.r2.cloudflarestorage.com` na CSP.
- `POST /api/media/files` (multipart ≤200MB, mesma allowlist) → bucket R2 **PRIVADO**
  (`R2_PRIVATE_BUCKET`) `admin/attachments/*` → `{url,fileType,sizeBytes}` com `url = r2priv:<key>`.
  Rota legada/fallback (buffeia o corpo no admin → só serve ≤100MB atrás do Cloudflare Free); o
  `FileUploader` NÃO a usa mais (usa o presign acima). O aluno baixa pela rota autenticada do
  community, que resolve a key, aplica a **marca d'água com o e-mail do aluno** (PDF: rodapé em
  todas as páginas; imagem: selo no canto) e seta o Content-Disposition. URL http(s) colada
  manualmente no dialog de anexo segue suportada (o community faz redirect — sem marca).
- `POST /api/media/videos/ticket` (`{filename,sizeBytes,mimeType}` ≤5GB mp4/mov/webm) → Vimeo
  `POST /me/videos` approach tus + privacy `view=disable, embed=whitelist` (+ domínios da env) →
  `{vimeoVideoId,uploadLink,embedUrl}`. O vídeo sobe DIRETO do browser (tus-js-client, chunk 128MB).
  Pós-ticket, o vídeo é movido p/ a pasta `VIMEO_FOLDER_ID` (best-effort, como a whitelist —
  `PUT /me/projects/{id}/videos/{id}`): dev = "Testes" (29469881) · prod = "Comunidade Sistema
  Zero" (29469887); env ausente = sem pasta.
- `GET /api/media/videos/:id/status` → reconcilia transcode on-demand (sem webhook; polling do
  editor a ~5s/cap 10min) → `{status: processing|ready|failed, durationSeconds, embedUrl, captions?}`.
  Quando ready, baixa o VTT do Vimeo (link assinado, **EXPIRA**) e **re-hospeda no R2**
  (`admin/captions/<id>-<lang>.vtt`) → `captions[].url` estável p/ o bloco do members.
- `POST /api/media/videos/:id/thumbnail` (multipart jpg/png ≤5MB) → **SÓ Vimeo pictures** →
  `{ok:true}`. O player do aluno usa a capa do próprio Vimeo; a cópia WebP no R2 + `posterUrl`
  da v2 foram removidas (decisão do usuário: capa direto no Vimeo, sem R2).

**Decisões load-bearing:** `src` do bloco vídeo = **embed URL** `player.vimeo.com/video/<id>?h=…`
(o renderer do community extrai o id por regex `vimeo\.com\/...` — id cru NÃO funciona); members e
community NÃO mudaram (`captions: {lang,url}[]` já existia no DTO; CSP do community já libera
`player.vimeo.com`). Server-only: `src/server/{r2,vimeo,image-optimizer,media}.ts`. Componentes:
`src/components/media/*` (image-uploader — fallback de URL manual opcional via `allowManualUrl`,
`false` no bloco de imagem; file-uploader; **audio-uploader** — bucket público + duração auto;
video-uploader + use-video-upload; video-thumbnail-uploader — só Vimeo, sem `onPoster`;
vimeo-preview). `next.config.ts` tem
`serverExternalPackages: ['sharp']` (binário nativo). Envs OPCIONAIS (R2_*, VIMEO_*) — ausentes →
503 `MEDIA_NOT_CONFIGURED` amigável, nunca quebra o boot. Buckets R2: dev = `testes` (público via
r2.dev), prod = `comunidade-sistema-zero` (`cdn.sistemazero.com.br`); **anexos** vão para o bucket
PRIVADO `R2_PRIVATE_BUCKET` (dev = `testes-privado` · prod = `comunidade-sistema-zero-privado`,
SEM acesso público — mesmas credenciais; criados via wrangler em 04/06/2026, o MESMO token S3
acessa os quatro). `scripts/verify-private-bucket.ts` (`bun scripts/verify-private-bucket.ts`)
valida put/get/delete no bucket privado com as envs do `.env` — útil ao configurar um host novo.
`R2_PRIVATE_BUCKET=comunidade-sistema-zero-privado` JÁ está setado no host de PROD do admin
(verificado 08/06/2026). ⚠️ Os buckets privados têm DUAS regras de **CORS**:
**`admin-direct-upload`** (PUT/GET/HEAD do admin — o upload de anexo/e-book é DIRETO do browser pro R2,
ver `/api/media/files/presign` acima; `connect-src https://*.r2.cloudflarestorage.com` na CSP) e
**`community-direct-download`** (GET/HEAD dos apps de ALUNO — community + community-kids — que LEEM o
bucket via `fetch` e SEGUEM o 302 pré-assinado: o **livro 3D do e-book** (pdf.js) e o download de anexo
por fetch; expõe `Content-Disposition` p/ o filename). ⚠️ **Origem (app/host) nova precisa entrar na
allowlist da regra certa, senão o navegador bloqueia por CORS** — sintoma clássico: o livro 3D não
renderiza e o console acusa "No 'Access-Control-Allow-Origin' header" no host `*.r2.cloudflarestorage.com`
(o community-kids quebrou assim em 25/06/2026 — a origem do kids faltava na `community-direct-download`,
que nasceu só com o community adulto). Gerencie com **`scripts/r2-cors-private.ts`**
(`bun scripts/r2-cors-private.ts` = dry-run que mostra atual+proposto; `--apply` grava; `--bucket=<nome>`
mira o privado de prod com as MESMAS credenciais): ele faz GET→MESCLA→PUT (PutBucketCors substitui tudo),
PRESERVA as outras regras e é idempotente. Origem nova de aluno → adicione em `STUDENT_APP_ORIGINS` e
re-rode nos dois buckets (`testes-privado` e `comunidade-sistema-zero-privado`).

## Invariantes (NÃO quebrar)

1. **O admin nunca chama os serviços direto** — tudo via gateway (`src/server/gateway.ts`).
   Exceção CONSCIENTE: `/api/media/*` fala com R2/Vimeo (provedores externos) e por isso tem
   guard de sessão próprio (ver §Mídia).
2. **Segredos só no servidor.** `src/lib/env.ts` é `server-only`; `src/server/*` idem. **Nunca**
   importe `env`/`server/*` de um Client Component (vaza p/ o bundle). Client fala só com `/api/*`.
3. **Tokens em cookie HttpOnly** (`sz_admin_*`; em prod prefixados **`__Host-`** — ver `lib/cookies.ts`),
   `SameSite=Lax`, `Secure` em prod, `Path=/`, sem `Domain`. Nunca exponha ao JS.
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
      page.tsx            Painel: overview cards (dashboard-cards.tsx, SEM card de receita) +
                          "Gestão de vendas" (sales-panel.tsx + sales-chart.tsx — Recharts client)
      catalogo/{ofertas,cupons}/  page.tsx + *-client.tsx (tabela + dialog CRUD; oferta com
                          slug/code AUTO-gerados de produto+preço+modo e editor de bônus;
                          cupom com multi-select de ofertas quando appliesToAll=false)
      catalogo/produtos/  listagem (links, sem dialog) + PÁGINA dedicada de form:
                          novo/page.tsx · [id]/page.tsx · product-form-client.tsx
                          (SKU/slug auto do nome + ComponentsEditor se kind=bundle + FulfillmentEditor)
      usuarios/             page.tsx (passa o operador p/ gating) + users-client.tsx (tabela + dialog edição)
      pagamentos/{transacoes,assinaturas,operacoes}/  page.tsx + *-client.tsx (lista/detalhe + estorno/cancelar; index redireciona p/ transacoes)
      notas-fiscais/       page.tsx + invoices-client.tsx (lista/filtros/stats + botão "Emitir
                          manualmente" no header) + invoice-detail-dialog.tsx (snapshot + timeline +
                          ações por estado, incl. "Emitir agora" p/ SCHEDULED) +
                          manual-invoice-dialog.tsx (emissão manual por Payment ID) +
                          invoice-status-badge.tsx (mapeamento puro em lib/nfse.ts)
      membros/             (conforme a fatia de membros; curso com slug auto do título)
    api/
      admin/{login,logout}/route.ts · admin/users/route.ts (+ [id]/route.ts p/ PATCH)
      catalog/{products,offers,coupons}/route.ts (+ [id]/route.ts — products tem GET-one + PATCH)
      payments/{transactions,subscriptions,stats,ops}/… (GET; [id] GET, [id]/refund POST, subscriptions/[id] DELETE)
      payments/stats/daily/route.ts (série diária do painel; ?from&to&productId)
      nfse/{invoices,stats}/… (GET lista/detalhe/stats; invoices POST = emissão manual por
      paymentId, uuid validado no BFF → 400; [id]/pdf GET = STREAMING pass-through
      do binário via gatewayFetchRaw; [id]/{retry,cancel,substitute,emit-now} POST)
  server/   session.ts · gateway.ts · catalog.ts · users.ts · payments.ts · nfse.ts · sentry.ts   (server-side)
            payments.ts: getDailyPaymentsStats DENSIFICA a série (dias civis BRT, zeros, totals
            via BigInt) e resolve productId→offerIds no catálogo antes de chamar o payments; +
            micro-cache TTL da lista de ofertas (garantia). sentry.ts: ingestão via fetch (sem SDK)
            forward.ts: `forwardUpstream({status,body})` — repassa a resposta do gateway; em SUCESSO
            o corpo intacto, em ERRO normaliza p/ `{error:{code,message}}` (não vaza corpo interno).
            Use SEMPRE no pass-through em vez de `NextResponse.json(body,{status})`. Exceções: rotas
            que TRANSFORMAM o body no sucesso (ex.: `api/members` hidrata e tem normalização própria).
  lib/      env.ts (server-only) · types.ts · format.ts · cn.ts · api.ts (client fetch)
            cookies.ts (nomes dos cookies, prefixo __Host- em prod) · csrf.ts (same-origin, puro)
            upstream.ts (normalizeUpstreamError, puro/testado — usado por server/forward.ts) ·
            list-params.ts (parseLimit COM TETO 100 / parseOffset, puros/testados — todo route de
            listagem usa, NÃO reintroduza o `num()` local sem teto) · dates.ts
            (dateInputToSaoPauloEndOfDayIso — validade `input[type=date]` → fim do dia em SP)
            slug.ts (slugify/skuify/offerSlugSuggestion/offerCodeSuggestion — kebab MINÚSCULO,
            espelha os VOs do catalog: Sku lowercase!; autogeração usa dirty-flag por campo)
  components/ catalog/* (offers-multi-select · components-editor · offer-items-editor ·
            fulfillment-editor — courseRef = SLUG do curso do members; **o campo "Quantidade de perfis
            (plataforma Kids)" MUDOU p/ o form da OFERTA (28/06)** — vive em `OfferContent.maxProfiles`
            (em `ofertas/offers-client.tsx`, mesclado no `content` sem apagar badge/cta), NÃO mais no
            produto) · admin/* (topbar/header/tabs/…)
            ⚠️ Primitivos de UI (button/card/input/table/dialog/badge/select/info-tooltip/…) vivem
            no **`@sistemazero/ui`** (packages/ui, compartilhado com o community) — importe
            `@sistemazero/ui/<componente>`; NÃO recrie cópias locais. O Button espelha as classes
            do projeto de referência (contraste por tema vem delas). Requisitos no app:
            `transpilePackages: ['@sistemazero/ui']` no next.config + `@source "../../../ui/src"`
            no globals.css (Tailwind v4 só gera classes que o scanner vê).
  proxy.ts              (ex-middleware; convenção Next 16, runtime nodejs)
```

> ⚠️ Drizzle (visto no payments, vale de lição aqui): em fragmento `sql` cru o Drizzle NÃO aplica o
> mapper da coluna — `Date` vira `toString()` JS e quebra no PG; passe `.toISOString()`.
> PATCH do catálogo SUBSTITUI coleções (components/items/offerIds) → os forms enviam o estado completo.

## Comandos (de dentro de `packages/admin`)

| Comando | O quê |
|---------|-------|
| `bun run dev` | Next dev server :3005 (**Turbopack** — ok, não pré-renderiza) |
| `bun run build` / `start` | build (**`next build`** — Turbopack) + produção |
| `bun test` | Suite (lógica pura de `src/lib/*`: sales-series, guarantee, filenames, vimeo-helpers, paths) |
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

- `GATEWAY_URL` (default `http://localhost:3000`; **em prod é OBRIGATÓRIO explícito** — fail-fast).
- Verificação do access token — **pelo menos UM**: `JWT_HS256_SECRET` (dev/local, MESMO do
  auth/gateway) e/ou `JWT_JWKS_URL` (**produção** — o auth emite RS256; usar o JWKS via gateway:
  `http://api-gateway.railway.internal:3000/auth/.well-known/jwks.json`). ⚠️ **Em produção o boot
  EXIGE `JWT_JWKS_URL` e RECUSA `JWT_HS256_SECRET`** (full review 2 — HS256 fraco forjaria a sessão
  local de `/api/media/*`).
- `JWT_ISSUER`/`JWT_AUDIENCE`: **OBRIGATÓRIOS em produção** (fail-fast no boot — mesma regra do
  gateway; prod = `sistemazero-auth`/`sistemazero`); em dev, casar com o auth ativa a checagem.
- `SENTRY_DSN` (opcional): espelho de erros LOCAIS do painel (pipeline de mídia + exceções de Route
  Handler/RSC via `onRequestError`). Ausente = no-op. ⚠️ **Sem SDK** — o `src/server/sentry.ts` fala
  o protocolo de ingestão via `fetch` (o tracing do standalone/Turbopack não copia pacotes externos
  de forma confiável; ver §Deploy).

**Fail-fast de boot:** as regras acima vivem em DOIS lugares que precisam ficar em sincronia —
`src/instrumentation.ts` (cobre `next dev`; ⚠️ em PRODUÇÃO o Next 16 não roda `register()` no boot:
o `NextServer.prepare()` pula em prod e o `route-module.prepare` dispara a instrumentation por
request SEM await) e **`scripts/boot-check.mjs`** (o fail-fast REAL de prod — launcher do CMD do
Dockerfile: valida e só então importa o `server.js` standalone).

## Deploy (Railway)

- Serviço próprio via **`packages/admin/railway.json`** (builder DOCKERFILE, build context = RAIZ
  do monorepo, `healthcheckPath: /api/healthz`, watchPatterns admin+ui+lock).
- **Dockerfile**: build em `node:22-bookworm-slim` com o binário do **bun copiado da imagem
  `oven/bun:1`** só p/ `bun install` (workspace); o `next build` roda **package-local com runtime
  Node** (`npm run build` — Next sob Bun não é suportado; e `--filter` da raiz quebra o React, ver
  gotcha do build). Runner copia `.next/standalone` (árvore espelha o monorepo —
  `outputFileTracingRoot` = raiz) + static + public e roda `node packages/admin/boot-check.mjs`
  (fail-fast de env → `server.js`). `PORT` injetado pelo Railway (fallback 3005), `HOSTNAME=::`
  (rede privada IPv6). `output: 'standalone'` + `poweredByHeader: false` no `next.config.ts`.
- `/api/healthz` é liveness puro (sem auth, sem tocar upstream — degradação de serviço ≠ outage do
  painel). **Security headers + CSP** vivem no `next.config.ts` (`headers()`, cobrem TODAS as rotas
  incl. `/api/media/*`): XFO DENY, nosniff, Referrer-Policy, Permissions-Policy, `X-Robots-Tag:
  noindex`, **CSP** e **HSTS em prod**.
- ⚠️ **RÉPLICA ÚNICA (não escalar horizontalmente sem refatorar):** o single-flight do refresh
  (`gateway.ts`, em `globalThis`) e o micro-cache de garantia (`payments.ts`) são POR PROCESSO. Com
  2+ réplicas, duas rotações concorrentes do mesmo refresh (em réplicas distintas) colidem no claim
  atômico do auth → logout aleatório. O Railway roda 1 réplica por default (2-3 operadores não
  exigem escala); para escalar, mover o single-flight p/ um store compartilhado ou dar ao auth uma
  janela de reuso do refresh (`multiRegionConfig.<região>.numReplicas` no railway.json fixaria a
  contagem, mas exige escolher a região — preferimos o default do dashboard).
- ⚠️ **Tracing de externos no standalone (verificar no 1º deploy):** o `next build` (Turbopack) NÃO
  copia pacotes `serverExternalPackages` (ex.: `sharp`) p/ o `.next/standalone/node_modules` no build
  LOCAL (Windows) — os deps comuns são BUNDLADOS no chunk e não precisam, mas `sharp` é nativo e
  PRECISA. Confirme que `sharp` chega ao container (build Linux do Dockerfile); se não, o Dockerfile
  deve copiá-lo explicitamente. (Por isso o Sentry NÃO usa SDK — fala ingestão via `fetch`, sem dep
  externa, imune a esse tracing.)
- Envs de prod: `GATEWAY_URL` + `JWT_JWKS_URL` (+ `JWT_ISSUER`/`JWT_AUDIENCE`) + R2_*/VIMEO_*
  (incl. `R2_PRIVATE_BUCKET=comunidade-sistema-zero-privado`, `VIMEO_FOLDER_ID=29469887`).

## Setup local (e2e)

1. Postgres :5433 + migrations do auth/catalog (`db:auth:migrate`, `db:catalog:migrate`).
2. Suba auth :3002, catalog :3003, gateway :3000 (com `JWT_HS256_SECRET` igual em todos).
3. Crie um admin: `bun run --filter @sistemazero/auth db:seed --email <e> --password <p> --role admin`.
4. `bun run dev:admin` → `http://localhost:3005` → login → Catálogo.

## Contratos consumidos

- Auth: `POST /auth/login` → `{ user: UserView, tokens: { accessToken, refreshToken, expiresIn,
  refreshExpiresIn } }`; `POST /auth/refresh` `{ refreshToken }` → `{ tokens }`.
- Catálogo (via gateway, JWT+RBAC): `GET /catalog/admin/{products,offers,coupons}` (`?q&status&limit&offset`,
  offers `?productId`; offers trazem `items` crus p/ o editor de bônus), `GET /catalog/admin/products/:id`
  (GET-one da página de edição — view completa com `fulfillment`/`components`),
  `POST/PATCH /catalog/{products,offers,coupons}`. Views espelhadas em `src/lib/types.ts`.
- Usuários (via gateway, JWT+RBAC): `GET /auth/admin/users` (`?q&role&status&limit&offset`) → `Paginated<UserView>`;
  **`POST /auth/admin/users`** `{ email, firstName, lastName, phone?, role }` → `{ user, inviteSent }`
  (criação pelo painel, fluxo CONVITE: o auth gera senha aleatória e envia o e-mail `welcome` com link de
  definição de senha; `inviteSent:false` = conta criada mas e-mail falhou → toast de aviso);
  `PATCH /auth/admin/users/:id` `{ role?, status?, firstName?, lastName?, phone?, version? }` → `{ user }`.
  Edição com `version` (concorrência otimista → 409 se defasada). Guards de papel/status são do `auth`
  (o client só faz gating de UX por `currentUser.role`).
  **Exclusão EM CASCATA (06/2026):** `DELETE /api/admin/users/:id` → `server/users.ts deleteUser`
  ORQUESTRA via gateway: `GET /auth/admin/users/:id/profiles` → `DELETE /members/admin/users/:id/data?profileIds=`
  → `DELETE /hub/admin/users/:id/data?profileIds=` → `DELETE /auth/admin/users/:id` (identidade por
  ÚLTIMO; falha antes disso aborta com o erro do upstream e a conta segue intacta p/ retry; sucesso →
  200 `{ok:true}`). **Reten financeiro/fiscal** (payments/NFS-e não são tocados). UI: ação "Excluir" por
  linha em `users-client.tsx`, **gated por `currentUser.role === 'superadmin'`** + não-self +
  alvo não-admin/superadmin (o gateway/auth re-checam); **dupla confirmação** = `ConfirmDialog` com campo
  que exige digitar o E-MAIL do usuário (`confirmDisabled` até bater).
  A lista de usuários também tem ações **"Conceder acesso"** (cortesia/teste — abre o
  `GrantAccessDialog` compartilhado em `components/admin/grant-access-dialog.tsx`, com pickers de
  oferta/curso + modo **"Todos os cursos (chave-mestra)"** + presets de validade 7/30/90
  dias/vitalício/data, POST `/api/members/entitlements`)
  e **"Matrículas"** (link p/ `/admin/membros/[userId]`). O member-detail usa o MESMO dialog.
  **"Entrar como" (impersonação p/ suporte, 06/2026):** ação por linha (gating de UX =
  `canImpersonate` em `lib/impersonation.ts`, puro/testado — superadmin → qualquer ativo;
  admin → só customer/staff; nunca self/inativo; o AUTH re-checa a matriz no serviço) → BFF
  `POST /api/admin/users/:id/impersonate` → gateway `POST /auth/admin/users/:id/impersonate` →
  `{token, expiresAt, communityUrl}` (handoff single-use ~60s) → `window.open` de
  `<communityUrl>/impersonar?token=...` (`impersonationUrl`) em nova aba — a community troca o
  token pela sessão impersonada (claim `act`, banner, TTL curto). Adapter `impersonateUser` em
  `server/users.ts`.
- Pagamentos (via gateway, JWT+RBAC): `GET /payments/admin/payments` (`?q&status&method&consumerId&from&to&limit&offset`)
  → `Paginated<PaymentView>`; `GET /payments/admin/payments/:id`; `GET /payments/admin/subscriptions`
  (`?q&status&consumerId&limit&offset`) → `Paginated<SubscriptionView>`; `GET /payments/admin/subscriptions/:id`;
  `GET /payments/admin/stats` (`?from&to`) → `PaymentStats`;
  `GET /payments/admin/stats/daily` (`?from&to&offerIds` CSV) → série diária ESPARSA (o BFF densifica
  → `DailyPaymentStats` com `days` densos + `totals` + `granularity`; janelas >90d/>270d são
  AGREGADAS no BFF em semana/mês — `day` = início do bucket, `periodEnd` = último dia, somas em
  BigInt); `GET /payments/admin/ops` → `PaymentOps`;
  As rotas BFF de transações (`/api/payments/transactions[/:id]`) ENRIQUECEM cada linha com
  `guarantee` (`PaymentRow`): `metadata.offerId` → `guaranteeDays` da oferta (1 chamada
  `listOffers limit:100`, best-effort → `null` se catálogo indisponível/sem oferta) + cálculo
  `paidAt + dias` (`until/daysLeft/expired`);
  **`POST /payments/admin/payments/:id/refund`** (estorno Pix/cartão) → `PaymentView`; sob corrida
  (duplo-clique) o payments serializa por claim otimista e o perdedor recebe **409
  `REFUND_IN_PROGRESS`** (o refund de cartão NÃO é idempotente na Efí) — trate como "já em
  andamento, recarregue", não como falha;
  **`DELETE /payments/admin/subscriptions/:id`** (cancela) → `SubscriptionView`. Valores em **string**
  (bigint, centavos) → `formatCentsStr`. Adapter em `src/server/payments.ts`; views em `src/lib/types.ts`.
- Notas fiscais (via gateway, JWT+RBAC — serviço `@sistemazero/fiscal`, NFS-e pós-garantia):
  `GET /fiscal/admin/invoices` (`?status&q&limit&offset`) → `{ items: InvoiceView[], total }`;
  `GET /fiscal/admin/invoices/:id` → `{ invoice, events: InvoiceEventView[] }`;
  `GET /fiscal/admin/invoices/:id/pdf` → binário `application/pdf` (404 sem PDF) — o BFF
  repassa em STREAMING via `gatewayFetchRaw` (variante crua do gatewayFetch, mesmo
  Bearer/refresh-on-401, sem materializar o corpo); `POST …/:id/retry` (só FAILED);
  `POST …/:id/cancel` `{reason}` (obrigatório 15..255 = TSMotivo do XSD — validado no BFF E no serviço;
  fora disso a Sefin rejeita e a nota fica presa em CANCEL_PENDING);
  `POST …/:id/substitute` `{customerName?,customerDocument?,serviceDescription?}` (≥1 campo) →
  201 `{id}` da nota substituta (a original é cancelada por substituição);
  `POST …/:id/emit-now` → `{ok:true}` (só SCHEDULED — ANTECIPA a emissão: o worker emite em
  ≤30s e a re-verificação de estorno na emissão continua valendo; outros estados → 409
  `INVALID_STATE`; ação "Emitir agora" no detalhe, confirm em 2 passos);
  **`POST /fiscal/admin/invoices`** `{paymentId: uuid}` → 201 `{id}` — emissão MANUAL por
  pagamento (backfill/antecipação: emite AGORA, sem esperar a garantia). Erros: 404
  `PAYMENT_NOT_FOUND` · 409 `PAYMENT_NOT_PAID` ("Pagamento está X — só PAID emite nota") ·
  409 `INVOICE_ALREADY_EXISTS` (a mensagem traz o id da nota existente —
  `extractExistingInvoiceId` em `lib/nfse.ts` o extrai e a UI oferece abri-la) · 422
  `INVALID_DOCUMENT` (sem CPF válido) · 502 `PAYMENTS_UNAVAILABLE`. O BFF valida o uuid
  ANTES do gateway (400 `INVALID_PAYMENT_ID`; `isValidUuid` puro). UI: botão "Emitir
  manualmente" no header da página → `manual-invoice-dialog.tsx`;
  `GET /fiscal/admin/stats` → `{ byStatus }`. Status: SCHEDULED|EMITTED|SKIPPED|FAILED|
  CANCEL_PENDING|CANCELLED|SUBSTITUTED — labels/cores/gates de ação/máscara de CPF/chave
  truncada são PUROS em `src/lib/nfse.ts` (unit-testados). `amountInCents` é STRING (bigint) →
  `formatCentsStr`, como no payments. Adapter em `src/server/nfse.ts`; views em `src/lib/types.ts`.
- Membros (via gateway, JWT+RBAC): `GET /members/admin/members` (`?status&courseRef&limit&offset`) →
  `Paginated<MemberSummaryView>`; `GET /members/admin/members/:userId` → matrículas + progresso.
  **Perfis estilo Netflix (suporte):** o BFF de `/api/members/:userId` busca os perfis da conta
  em `GET /auth/admin/users/:id/profiles` (auth, `getUserProfiles`), repassa os ids ao members
  (`getMember(userId, profileIds)` → `?profileIds=`) e junta nome (auth) + progresso por perfil
  (members) em `MemberDetail.profiles`. A tela mostra a seção "Perfis e progresso" (uma grade por
  perfil); conta sem perfis cai no progresso da conta (compat)
  (matrícula `all_courses` renderiza "Todos os cursos (chave-mestra)" — `ACCESS_LABELS`);
  `POST /members/admin/entitlements` (`{mode:'offer'|'course'|'all_courses', userId,
  offerRef|courseRef?, expiresAt?}`) → concessão manual; `PATCH /members/admin/entitlements/:id`
  (`{action:'revoke'|'expire'|'extend', expiresAt?}`).
  **Ficha 360 (06/2026):** `GET /members/admin/members/:userId/gamification?audience=adult|kids`
  (→ `MemberGamificationView`), `…/activity?limit&offset` (→ `MemberActivityPage` = `{items,hasMore}`,
  mescla acesso/conclusão/quiz/Estúdio), `…/certificates` (→ `{certificates}`), `…/ratings` (→ `{ratings}`);
  `POST /members/admin/certificates/:id/revoke` (revogar certificado). Todas keyadas no `:userId` do
  APRENDIZ (a conta OU um profileId) — a UI chama 1× por aprendiz (audiência `adult` p/ a conta,
  `kids` p/ os perfis). Pagamentos do aluno na ficha reusam `/api/payments/transactions?q=<email>`.
  Adapters `getMember{Gamification,Activity,Certificates,Ratings}`+`revokeCertificate` em `server/members.ts`.
  O **BFF agrega**: o handler `GET /api/members` hidrata nome/email do auth via
  `POST /auth/admin/users/batch` (`server/users.ts`: `batchGetUsers`/`getUser`). Adapter em
  `src/server/members.ts`; views em `src/lib/types.ts`.
- Membros — Autoria (via gateway, JWT+RBAC): `GET/POST /members/admin/courses`,
  `GET/PATCH/DELETE /members/admin/courses/:id` (GET = árvore curso+módulos+aulas); módulos/aulas
  via `…/modules`, `…/lessons` (+ `…/reorder`); blocos/anexos via `…/lessons/:id/blocks|attachments`
  (+ `…/reorder`) e `PATCH/DELETE /members/admin/{blocks,attachments}/:id`. Conteúdo de bloco é
  união por `kind`. Body de aula aceita **`isPublished`** (ausente → `false`: aula nova nasce
  RASCUNHO; `LessonView` devolve a flag); publicar curso `published` sem aula publicada → **409
  `NO_PUBLISHED_LESSON`**. Body de curso aceita **`salesPageUrl`** (nullable, 06/2026) — campo
  "Página de vendas (URL)" no dialog do curso (destino do cadeado no catálogo do community;
  vazio → fallback `FUNNEL_URL`; vira `metadata.salesPageUrl` no members e `CourseView` a devolve).
  ⚠️ O dialog do curso é o ÚNICO PATCH de curso (o editor `[courseId]` só toca módulos/aulas) —
  se outro PATCH de curso surgir, ele PRECISA enviar `salesPageUrl` (ausente/null limpa a chave).
  Body de curso também aceita **`audience`** (`adult`|`kids`, 06/2026 — plataforma Kids): select
  "Audiência" no dialog, **sempre enviado** (o members PRESERVA quando ausente — ≠ salesPageUrl);
  `CourseView.audience` devolvido; badge "Kids" na listagem. Curso `kids` fica FORA da chave-mestra
  `all_courses` (copy do GrantAccessDialog = "todos os cursos ADULTOS"; option de curso kids ganha
  sufixo `[Kids]`). Body de curso também aceita **`sequentialLock`** (boolean, 06/2026 — trava
  sequencial estilo Duolingo): checkbox "Trava sequencial das aulas" no dialog, **sempre enviado**
  (members PRESERVA quando ausente; default `true` no curso novo); `CourseView.sequentialLock`
  devolvido. Ligada, o aluno só abre a próxima aula após concluir a anterior (gate no members → 423).
  Body de curso também aceita **`level`** (`iniciante`|`intermediario`|`avancado`, 06/2026 —
  dificuldade): select "Nível do curso" no dialog, **sempre enviado** (members PRESERVA quando ausente;
  default `iniciante`); `CourseView.level` devolvido. Alimenta o NÍVEL DO ALUNO no community-kids
  (concluir + publicar no Mural cursos de cada dificuldade → rank Noob→God). `COURSE_LEVELS`/
  `LEVEL_LABELS` em `lib/types.ts`.
  **Convite multi-plataforma**: `POST /auth/admin/users` aceita
  `platform: 'main'|'kids'` (select "Plataforma do convite" no dialog — decide a base do link do
  e-mail `welcome`); impersonação aceita `?platform=kids` (`impersonateUser(id, platform?)` em
  `server/users.ts` devolve a `communityUrl` do app kids; o botão de UI kids entra quando o
  community-kids existir).
  Páginas em `app/admin/membros/cursos/*` (lista + editor de curso + editor
  de aula com formulários por tipo de bloco). Adapter em `src/server/members.ts`; views em
  `src/lib/types.ts`.
  **Bloco `studio` (06/2026):** o form de bloco embute o **`@sistemazero/studio`**
  (`components/studio/studio-embed.tsx`, dynamic ssr:false, `persistence:'none'`) — o admin monta o
  PROJETO INICIAL (tipo/código/nome) e o `saveBlock` captura via `handleRef.getProject()`; campos à
  parte: nível, modos liberados, categorias sempre visíveis, **lista de blocos** (RESTRITIVA —
  `components/studio/studio-blocks-picker.tsx`, busca + grupos por categoria, carrega o `BLOCK_CATALOG`
  do pacote — **CORE + extensões Jogo 2D/3D** — por import DINÂMICO; preenchida = o aluno vê SÓ esses
  blocos na paleta; rótulo repetido na MESMA categoria mostra o **id** ao lado p/ desambiguar, ex.:
  "Tocar som de explosão" nos 2 kits do Jogo 2D). **Reaproveitar config entre aulas:**
  `components/studio/studio-config-clipboard.tsx` — botões "Copiar/Colar configuração" (curadoria:
  nível+modos+categorias+lista de blocos+revelar) via `localStorage` (`sz:admin:studio-block-config`);
  copia numa aula, cola nas outras do curso (e entre cursos), sem backend; NÃO leva projeto
  inicial/atividade/cadeia/vitrine (são da aula). Mais: "revelar avançado" e **"Projeto contínuo
  (nome)"** (`BlockForm.studioChain` → `content.chain`): dar o MESMO nome a aulas que constroem um
  único projeto faz o aluno abrir cada aula com o código que enviou na anterior da cadeia (carryover
  no members/member-shell); vazio = aula independente. **Acompanhamento do
  professor:** botão "Entregas" no bloco → `studio-submissions-dialog.tsx` lista quem entregou +
  abre o projeto do aluno num Estúdio embutido (`…/:userId`, **modal LARGO `max-w-7xl`** p/ caber a
  IDE; lista em `max-w-2xl`) ou baixa o `.szproject.json`. A lista marca "Deixou um recado" e o
  detalhe mostra o **recado opcional do aluno** (`message` da entrega) quando há. **Identidade (kids):** a entrega vem com
  `accountId`, então a rota BFF (`GET /api/members/blocks/:id/studio-submissions`) mostra a CRIANÇA
  (nome do PERFIL via `getUserProfiles` da conta) + o RESPONSÁVEL (conta via `batchGetUsers`) —
  perfil≠conta no kids, iguais no adulto. Requer
  `transpilePackages:['@sistemazero/studio']` + `@source "../../../studio/src"` + na CSP do `next.config.ts`:
  `frame-src blob:` E **`script-src data: https:`** (+ `media/font/style/img https:`). ⚠️ **Sem `script-src
  data:` o PREVIEW do Estúdio fica EM BRANCO** nas Entregas (e na autoria): o `script.js` do aluno é
  injetado como `<script src="data:text/javascript;base64,…">` num iframe `srcdoc` que HERDA a CSP do
  painel — sem `data:` o navegador bloqueia e o professor abre os blocos mas não vê o resultado rodar
  (corrigido 27/06, espelha o community-kids; a fronteira de segurança é o sandbox sem `allow-same-origin`
  + a meta-CSP do próprio srcdoc, NÃO a CSP do pai). Mudança de CSP = HEADER → exige **restart do server**
  (não basta HMR). `features.extensions:false` no viewer só esconde o PAINEL de extensões; o runtime/blocos
  do projeto seguem carregando.

- **Bloco `certificate` (06/2026; layout por imagem base 26/06):** o "diploma" do curso — pode ficar em
  QUALQUER aula (libera quando as ANTERIORES estão concluídas; ver o members). O form (em
  `lesson-editor-client.tsx`, `KIND_LABELS.certificate` + `case 'certificate'` em
  `buildContent`/`validateBlock`/`blockSummary` + campos `cert*` no `BlockForm`) é metadado de autoria do
  PDF: **imagem base por CURSO** (`baseImageUrl` via `ImageUploader` — fundo A4 paisagem com logo/título/
  decoração; o conteúdo é escrito POR CIMA), `introLine` (default "Certificamos que o aluno"), `coursePhrase`
  (frase curta), `bodyText` (parágrafo) e **2 assinaturas** (slots `cert{Sig1,Sig2}{Url,Name}` →
  `signatures[]`). ⚠️ Na assinatura a **IMAGEM é a assinatura** (rabisco, via `ImageUploader`); o `name` é
  só RESERVA — o PDF usa o nome NO LUGAR da imagem quando ela não foi enviada (decisão da usuária 26/06; não
  desenha os dois). **SEM campo de cor** (removido — `accentColor` deprecado; o nome sai escuro). O NOME do
  aluno e a DATA entram sozinhos na emissão (não há campo). A **mensagem** (frase E/OU parágrafo, abaixo do
  nome) é **OBRIGATÓRIA** (`validateBlock` exige ≥1 das duas); o resto é opcional. `buildContent` PRESERVA os
  campos legados (`title`/`issuerName`/`logoUrl`/`signatureImageUrl`/`message`) via `previousContent` ao
  editar um bloco antigo. Sem `baseImageUrl` o BFF cai no layout "marca" antigo. Sem editor pesado →
  `max-w-lg` padrão. Validação client de URLs `^https?://` (imagem base/assinaturas; o `ImageUploader`
  do admin sobe WebP no R2 — o renderizador do BFF converte WebP→PNG via sharp). ⚠️ **A aula do
  certificado NÃO pode ter blocos que TRAVAM a conclusão** (quiz com nota de corte / Estúdio) — o
  members recusa (`VALIDATION_ERROR`→400, `lessonHasGatingBlock`); conteúdo livre (vídeo/texto de
  parabéns) convive. A nota no topo do form avisa o autor. Flui pelos endpoints de bloco já existentes
  (`POST …/lessons/:id/blocks` · `PATCH …/blocks/:id`) — o DTO do members já tinha `CertificateBlockSchema`.

- **Comunidade (hub) — fatia 06/2026.** Item de nav "Comunidade" (`MessagesSquare`) + abas
  `COMMUNITY_TABS` (Servidores · Moderação). Páginas em `app/admin/comunidade/`: **`servidores`**
  (lista + criação/edição de servidores e canais — `servers-client.tsx`), **`servidores/[id]`**
  (detalhe do servidor + canais — `space-detail-client.tsx`) e **`moderacao`** (fila de aprovação +
  denúncias + silenciar/banir — `moderation-client.tsx`). BFF: adapter `src/server/hub.ts` + tipos
  `src/lib/hub-types.ts`; a árvore de route handlers `app/api/hub/admin/*` espelha as rotas admin do
  gateway (spaces/channels + reorder, `pending`/approve/reject/hide/delete/pin/lock, reports/resolve,
  mutes/bans). Consome o **`@sistemazero/hub`** via gateway (JWT + RBAC: leitura staff+, escrita admin+).

## Checklist antes de finalizar

- [ ] `bun test` verde · `bun run typecheck` limpo · `bun run check` (Biome) limpo · `bun run build` passa.
- [ ] Nenhum `server/*`/`env` importado por Client Component. Sem `any` novo.
- [ ] Novo endpoint do gateway? Atualizou `src/server/*` + tipos + (se preciso) o `gateway.config.ts`.
- [ ] Mexeu nas regras de env? `src/instrumentation.ts` e `scripts/boot-check.mjs` em SINCRONIA.
```

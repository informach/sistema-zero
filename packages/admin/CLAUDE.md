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
`comunidade-sistema-zero` (tokens OKLch dual light/dark, Base UI-like + lucide + sonner; **logo
dual-theme** `public/logo_dark.svg`⇄`logo_white.svg` na topbar/login — `dark:block`/`dark:hidden` —
e **favicon** completo: `src/app/favicon.ico` + PNGs 16/32/192/512 + apple-touch via
`metadata.icons`, mesmos assets do community). Porta **3005**.

> Estado: **Fatia 1 — Catálogo** (produtos/ofertas/cupons: listar/criar/editar) + **Fatia 2 —
> Usuários** (listar com busca/filtros + **criar via convite por e-mail** + editar
> status/papel/perfil, guards hierárquicos e concorrência otimista; ações por linha **Conceder
> acesso** — `GrantAccessDialog` compartilhado com pickers de oferta/curso + presets de validade —
> e **Matrículas**) + **Fatia Pagamentos** (transações + assinaturas: listar/filtrar/detalhe +
> **estornar**/**cancelar**, stats e saúde de webhooks/operações; detalhe exibe a **garantia** da
> oferta comprada — resolvida no BFF de `metadata.offerId` → `guaranteeDays` do catálogo — com
> aviso de estorno fora da garantia) + **Fatia Membros** (abas
> Alunos|Cursos — **Alunos**: listar + detalhe com matrículas/progresso + conceder manual
> (oferta/curso) + revogar/expirar/estender, identidade hidratada do auth via batch; **Cursos**:
> autoria — CRUD de cursos + editor de módulos/aulas com **drag-and-drop** (dnd-kit clássico:
> core 6.3 + sortable 10; hook `components/dnd/use-sortable-item.ts`; reorder otimista →
> endpoints `/reorder`, erro→toast+reload) + módulos **colapsáveis** com contador "X de Y aulas
> publicadas · N min" + **publicação por aula** (switch no dialog — aula nova nasce RASCUNHO —,
> badge Publicada/Rascunho; publicar curso sem aula publicada → 409 `NO_PUBLISHED_LESSON` no
> toast) + editor de blocos polimórficos (texto/vídeo/imagem/áudio/quiz/embed/**ebook**) e anexos,
> ambos com DnD; **autoria v3 (06/2026): upload é o ÚNICO caminho** — imagem upload-only
> (`ImageUploader allowManualUrl={false}`; capa de curso mantém URL manual), vídeo **só Vimeo**
> (sem select de provider/URL/duração manual — o uploader TUS preenche src/duração/transcrição;
> `BlockForm.provider` interno preserva blocos legados youtube/file na edição), áudio via
> `AudioUploader` (bucket público + duração auto), interativo = **só HTML** (CodeMirror 6 —
> `components/editor/html-code-editor{,.impl}.tsx`, `@uiw/react-codemirror`+`@codemirror/lang-html`,
> dynamic ssr:false, tema via next-themes; renderiza iframe sandbox 16:9 no aluno) e **ebook** =
> PDF via `FileUploader` (bucket privado, `r2priv:`, ≤100MB) + título → livro 3D no community;
> o upload do PDF do e-book também cria AUTOMATICAMENTE o anexo da aula (material p/ download,
> `addEbookAttachment` com dedupe por URL; trocar o PDF deixa o material antigo — excluir manual); bloco
> **rich_text usa TipTap** (`components/editor/rich-text-editor{,.impl}.tsx` —
> saída MARKDOWN via tiptap-markdown, `dynamic ssr:false` + `immediatelyRender:false` +
> `shouldRerenderOnTransaction:true`; estilos `.rich-text-content` no globals.css) e bloco
> **quiz usa builder visual** (`aulas/[lessonId]/quiz-builder.tsx` — perguntas/opções/corretas/
> nota de corte, `validateQuiz` espelha o members; sem JSON cru)) + **Painel "Gestão de vendas"**
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
> direto do browser + capa + transcrição re-hospedada no R2 — ver §Mídia).
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
- **Sessão (`src/server/session.ts`):** `getSession()` verifica o access JWT (HS256, MESMO
  `JWT_HS256_SECRET` do auth/gateway). Token expirado → a assinatura já foi validada (jose checa
  assinatura ANTES do exp) → decodifica p/ exibir; os dados renovam via refresh-on-401.
- **Refresh (`src/server/gateway.ts`):** `gatewayFetch` em 401 chama `/auth/refresh`, regrava os
  cookies e re-tenta UMA vez. **Só** roda em Route Handlers/Server Actions (lá pode escrever cookies).
- **Gate de UI:** `src/proxy.ts` (convenção `proxy` do Next 16, ex-`middleware`) bloqueia `/admin/*` sem cookie de refresh (redirect `/login`);
  `app/admin/layout.tsx` faz a checagem real (assinatura + role) e mostra "acesso negado" se preciso.

## Mídia (`/api/media/*` — R2 + Vimeo)

Upload nos cadastros de curso/aula (capa, blocos imagem/áudio, anexos, vídeo). **Estas rotas NÃO
passam pelo gateway** (falam com provedores EXTERNOS — não viola o invariante 1, que é sobre
serviços internos) → **todo handler exige `requireMediaSession()`** (sessão + role superadmin/admin;
`src/server/media.ts`). O matcher do `proxy.ts` **exclui `api/media`** (o proxy buffeia o corpo a
~10MB e estrangularia multipart). Fatia **stateless**: sem tabela de assets — URLs/IDs vivem no
conteúdo dos blocos do members (lixo órfão no R2 é dívida documentada; sem GC nesta fatia).

- `POST /api/media/images` (multipart ≤5MB png/jpg/webp; `scope=course|block`) → sharp→WebP →
  R2 `admin/{courses,blocks}/<uuid>.webp` → `{url,width,height,sizeBytes}`.
- `POST /api/media/audio` (multipart ≤50MB mp3/m4a/ogg/wav) → bucket R2 **PÚBLICO**
  `admin/audio/<uuid>.<ext>` (sem transformação) → `{url,fileType,sizeBytes}`. Áudio de aula é
  PÚBLICO de propósito: o `<audio>` do aluno toca a URL direto (bucket privado quebraria a
  reprodução — bug da v2, corrigido na autoria v3). A **duração é detectada no client**
  (`AudioUploader`: object URL + `loadedmetadata`) e salva no bloco — sem campo manual.
- `POST /api/media/files` (multipart ≤100MB, allowlist pdf/zip/office/txt/csv/imagem/áudio) →
  bucket R2 **PRIVADO** (`R2_PRIVATE_BUCKET`, sem URL pública) `admin/attachments/*` →
  `{url,fileType,sizeBytes}` onde **`url` = referência `r2priv:<key>`** (NÃO navegável). O aluno
  baixa pela rota autenticada do community, que resolve a key, aplica a **marca d'água com o
  e-mail do aluno** (PDF: rodapé em todas as páginas; imagem: selo no canto) e seta o
  Content-Disposition. URL http(s) colada manualmente no dialog de anexo segue suportada
  (o community faz redirect — sem marca).
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
⚠️ Pendente em PROD: `R2_PRIVATE_BUCKET=comunidade-sistema-zero-privado` nas envs dos hosts do
admin E do community.

## Invariantes (NÃO quebrar)

1. **O admin nunca chama os serviços direto** — tudo via gateway (`src/server/gateway.ts`).
   Exceção CONSCIENTE: `/api/media/*` fala com R2/Vimeo (provedores externos) e por isso tem
   guard de sessão próprio (ver §Mídia).
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
      membros/             (conforme a fatia de membros; curso com slug auto do título)
    api/
      admin/{login,logout}/route.ts · admin/users/route.ts (+ [id]/route.ts p/ PATCH)
      catalog/{products,offers,coupons}/route.ts (+ [id]/route.ts — products tem GET-one + PATCH)
      payments/{transactions,subscriptions,stats,ops}/… (GET; [id] GET, [id]/refund POST, subscriptions/[id] DELETE)
      payments/stats/daily/route.ts (série diária do painel; ?from&to&productId)
  server/   session.ts · gateway.ts · catalog.ts · users.ts · payments.ts   (server-only)
            payments.ts: getDailyPaymentsStats DENSIFICA a série (dias civis BRT, zeros, totals
            via BigInt) e resolve productId→offerIds no catálogo antes de chamar o payments
  lib/      env.ts (server-only) · types.ts · format.ts · cn.ts · api.ts (client fetch)
            slug.ts (slugify/skuify/offerSlugSuggestion/offerCodeSuggestion — kebab MINÚSCULO,
            espelha os VOs do catalog: Sku lowercase!; autogeração usa dirty-flag por campo)
  components/ catalog/* (offers-multi-select · components-editor · offer-items-editor ·
            fulfillment-editor — courseRef = SLUG do curso do members) · admin/* (topbar/header/tabs/…)
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
  A lista de usuários também tem ações **"Conceder acesso"** (cortesia/teste — abre o
  `GrantAccessDialog` compartilhado em `components/admin/grant-access-dialog.tsx`, com pickers de
  oferta/curso + modo **"Todos os cursos (chave-mestra)"** + presets de validade 7/30/90
  dias/vitalício/data, POST `/api/members/entitlements`)
  e **"Matrículas"** (link p/ `/admin/membros/[userId]`). O member-detail usa o MESMO dialog.
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
  **`POST /payments/admin/payments/:id/refund`** (estorno Pix/cartão) → `PaymentView`;
  **`DELETE /payments/admin/subscriptions/:id`** (cancela) → `SubscriptionView`. Valores em **string**
  (bigint, centavos) → `formatCentsStr`. Adapter em `src/server/payments.ts`; views em `src/lib/types.ts`.
- Membros (via gateway, JWT+RBAC): `GET /members/admin/members` (`?status&courseRef&limit&offset`) →
  `Paginated<MemberSummaryView>`; `GET /members/admin/members/:userId` → matrículas + progresso
  (matrícula `all_courses` renderiza "Todos os cursos (chave-mestra)" — `ACCESS_LABELS`);
  `POST /members/admin/entitlements` (`{mode:'offer'|'course'|'all_courses', userId,
  offerRef|courseRef?, expiresAt?}`) → concessão manual; `PATCH /members/admin/entitlements/:id`
  (`{action:'revoke'|'expire'|'extend', expiresAt?}`).
  O **BFF agrega**: o handler `GET /api/members` hidrata nome/email do auth via
  `POST /auth/admin/users/batch` (`server/users.ts`: `batchGetUsers`/`getUser`). Adapter em
  `src/server/members.ts`; views em `src/lib/types.ts`.
- Membros — Autoria (via gateway, JWT+RBAC): `GET/POST /members/admin/courses`,
  `GET/PATCH/DELETE /members/admin/courses/:id` (GET = árvore curso+módulos+aulas); módulos/aulas
  via `…/modules`, `…/lessons` (+ `…/reorder`); blocos/anexos via `…/lessons/:id/blocks|attachments`
  (+ `…/reorder`) e `PATCH/DELETE /members/admin/{blocks,attachments}/:id`. Conteúdo de bloco é
  união por `kind`. Body de aula aceita **`isPublished`** (ausente → `false`: aula nova nasce
  RASCUNHO; `LessonView` devolve a flag); publicar curso `published` sem aula publicada → **409
  `NO_PUBLISHED_LESSON`**. Páginas em `app/admin/membros/cursos/*` (lista + editor de curso + editor
  de aula com formulários por tipo de bloco). Adapter em `src/server/members.ts`; views em
  `src/lib/types.ts`.

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun run check` (Biome) limpo · `bun run build` passa.
- [ ] Nenhum `server/*`/`env` importado por Client Component. Sem `any` novo.
- [ ] Novo endpoint do gateway? Atualizou `src/server/*` + tipos + (se preciso) o `gateway.config.ts`.
```

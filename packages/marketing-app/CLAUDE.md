# CLAUDE.md — @sistemazero/marketing-app

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Next.js, React, Tailwind,
> jose, Zod etc.) — não confie só na memória; APIs mudam (ex.: `middleware`→`proxy` no Next 16).
> Para **pesquisa, exploração e entender padrões**, use o **MCP do Octocode**.

Guia operacional do **app de marketing digital** (front da equipe). Leia antes de editar.

> 📖 O manual CONCEITUAL (o que é o pipeline, cross-post, modo lembrete, fases do roadmap) está
> em [`docs/marketing.md`](../../docs/marketing.md). Mudou o fluxo? Atualize o manual também.

## O que é

Front-end **dedicado e interno** (equipe staff+) da ferramenta de marketing: pipeline de produção
de conteúdo, calendário editorial, publicações cross-post, biblioteca de mídia, métricas e
conexões de contas sociais. **Next.js 16 (App Router) + React 19 + Tailwind v4**; o back-end é o
**[@sistemazero/marketing](../marketing)** (porta 3011), consumido SEMPRE via api-gateway.
Molde arquitetural: **`packages/admin`** (BFF via gateway, cookies HttpOnly, réplica única).
Porta **3012**. Domínio futuro: `marketing.sistemazero.com.br`.

> Estado: **F0 + F1 + F2 COMPLETAS (07/07/2026)** — TODAS as telas ricas no ar: Painel
> (contagens + hoje/amanhã/atrasadas/falhas com "marcar como publicada"), Pipeline (kanban
> dnd-kit, colunas derivadas somente leitura), Ideias (inbox/promover), `/conteudos/[id]`
> (stepper + abas Roteiro/Checklist/Anexos/Publicações + comentários/timeline), Composer
> (`/conteudos/[id]/publicacoes/[pubId]` — contador por rede, capa, agendar, toggle
> auto/lembrete, preview), Biblioteca (upload XHR presigned com progresso + importar do
> Drive), Calendário (grade custom + drag reagenda), Conexões (OAuth YouTube real, admin+)
> e Métricas (canal + top publicações YT). Libs puras testadas (80 testes), build standalone OK.
> Padrões-chave: 409 CONCURRENCY_CONFLICT → toast + re-GET; etapas derivadas nunca são alvo de
> drag; PATCH nunca envia scheduledAt (agendar é rota própria); pós-upload do YouTube
> (`hasRemoteVideo`) congela metadados.

## Arquitetura (o padrão central — preserve-o)

```
Browser → /api/* (Route Handlers, mesma origem, cookie HttpOnly)
        → gatewayFetch (Bearer do cookie, refresh-on-401 single-flight em globalThis)
        → API Gateway (:3000) verifica JWT + RBAC staff+ → injeta X-Auth-User-* + x-internal-token
        → @sistemazero/marketing (:3011)
```

- **Login:** `POST /api/auth/login` → gateway `/auth/login`; **rejeita role ∉
  {superadmin, admin, staff} com 403 ANTES de gravar cookies**. Cookies `sz_mkt_access`/
  `sz_mkt_refresh` (**`__Host-`** em prod; remoção via `expireCookieOptions` — `delete()` pelado
  não remove `__Host-*`). Pós-login/logout navega com **`window.location.replace`** (NUNCA
  `router.replace + refresh` — corrida do Next documentada no admin).
- **Sessão (`src/server/session.ts`):** HS256 (`JWT_HS256_SECRET`, dev) e/ou RS256 via
  `JWT_JWKS_URL` (prod). **Prod EXIGE JWKS e RECUSA HS256** (mesma regra do admin).
- **BFF (`src/app/api/marketing/[...path]/route.ts`):** catch-all que encaminha
  GET/POST/PATCH/DELETE ao gateway `/marketing/<path>` com **allowlist de 1º segmento**
  `{ideas, contents, publications, media, checklist, accounts, metrics}` (fora → 404) +
  `forwardUpstream` (erro normalizado `{error:{code,message}}`). Desvio consciente do estilo
  "um handler por recurso" do admin: corta ~30 handlers idênticos; handler explícito só onde há
  lógica (`/api/team` busca `/auth/admin/users` UMA vez POR PAPEL de equipe — `?role=` — com
  micro-cache 60s; filtrar a lista geral aqui perderia a equipe além da 1ª página; auth; healthz).
- **Proxy (`src/proxy.ts`):** anti-CSRF same-origin em mutações `/api/*` + redirect `/login`
  (com `?next=`) nas páginas do grupo `(app)` sem cookie de refresh. Gate REAL de sessão/role no
  `(app)/layout.tsx` (tela de acesso negado p/ role insuficiente).
- **Security headers/CSP no `next.config.ts`** (cobrem tudo): iguais ao admin MENOS os hosts do
  Vimeo/Estúdio; `connect-src https://*.r2.cloudflarestorage.com` mantido (upload presigned
  DIRETO browser→R2 — os bytes nunca passam pelo app; o presign vem do BACKEND marketing, não
  daqui — por isso este app não tem credencial R2 nem aws-sdk).

## Invariantes (NÃO quebrar)

1. **Nunca chamar serviços direto** — tudo via gateway (`src/server/gateway.ts`). Não existe
   exceção de mídia aqui (≠ admin): o presign é do backend marketing.
2. **Segredos só no servidor** (`src/lib/env.ts` é `server-only`; nunca importar de client).
3. **Réplica única**: single-flight do refresh em `globalThis` — não escalar horizontalmente.
4. Primitivos de UI vêm de **`@sistemazero/ui`** (exige `transpilePackages` +
   `@source "../../../ui/src"` no globals.css). Nunca copiar primitivo localmente.
5. **Copy da UI na voz sistemazero**: sem travessão, sem exclamação, sem jargão de IA.
6. `lib/networks.ts` e `lib/pipeline.ts` são PUROS, testados e **ESPELHAM o backend**
   (`domain/publication/publication.ts` e `domain/content/stage.ts` do marketing) — mudou lá,
   mude aqui (e vice-versa). Limites de caracteres por rede mudam com o tempo: confirmar via
   Context7 antes de editar.

## Estrutura

```
src/
  app/
    layout.tsx · globals.css (tokens OKLch do admin + @source ui) · not-found.tsx
    login/                     página + form (client)
    (app)/                     shell autenticado: layout gate + Topbar + AppSidebar
      page.tsx + painel-cards.tsx   Painel (contagens via `/marketing/contents/stage-counts`,
                                    agregadas no banco + estado de erro visível; client fetch — padrão admin)
      pipeline/ (kanban dnd-kit) · calendario/ (grade custom + drag) · ideias/ (inbox/promover) ·
      conteudos/[id]/ (stepper + abas + composer) · midia/ (upload presigned + Drive) ·
      metricas/ (canal/top + heatmap) · conexoes/ (OAuth por rede, admin+)   — telas implementadas
    api/
      auth/{login,logout}/ · healthz/ · team/ · marketing/[...path]/   (BFF)
  server/   session.ts · gateway.ts · forward.ts · sentry.ts (ingestão via fetch, sem SDK)
  lib/      env.ts · cookies.ts · csrf.ts · api.ts · upstream.ts · format.ts · dates.ts (SP) ·
            paths.ts (safeNextPath) · types.ts (views do backend) ·
            networks.ts (limites/labels por rede — PURO) · pipeline.ts (etapas/labels/cores — PURO)
  components/ layout/* (sidebar/topbar/user-menu/theme) · shared/{empty-state,page-header} · providers
  proxy.ts · instrumentation.ts
scripts/boot-check.mjs   (fail-fast de env em prod, em SINCRONIA com instrumentation.ts)
tests/    libs puras: networks · pipeline · calendar · carousel · dates · heatmap · lightcopy ·
          metrics · publications (80 testes)
```

## Comandos (de dentro de `packages/marketing-app`)

| Comando | O quê |
|---------|-------|
| `bun run dev` | Next dev :3012 (Turbopack) |
| `bun run build` / `start` | build + produção (⚠️ build sempre PACKAGE-LOCAL, nunca `--filter` da raiz) |
| `bun test` · `bun run typecheck` · `bun run check` | suite / tsc / Biome |

Da raiz: `dev:marketing-app`, `build:marketing-app`, `start:marketing-app`, `typecheck:marketing-app`,
`test:marketing-app`. Setup local: Postgres up + auth/gateway/marketing rodando + usuário staff
(`db:seed` do auth) → `bun run dev:marketing-app` → `http://localhost:3012`.

## Env (`.env.example`)

`GATEWAY_URL` (prod: obrigatório explícito) · `JWT_HS256_SECRET` (dev) e/ou `JWT_JWKS_URL` (prod,
obrigatório; recusa HS256) · `JWT_ISSUER`/`JWT_AUDIENCE` (obrigatórios em prod) · `SENTRY_DSN`
(opcional). Regras em `src/instrumentation.ts` E `scripts/boot-check.mjs` (manter em sincronia).

## Deploy (Railway) — PROVISIONADO 07/07/2026

Dockerfile (Node 22 + bun install, build package-local, standalone) + railway.json (healthcheck
`/api/healthz`, watchPatterns marketing-app+ui+lock). Serviço `marketing-app` criado em
**staging E produção** (id `95f3752d…`, `railwayConfigFile` apontado, repo conectado, triggers
desarmados). Envs nos 2 ambientes: `GATEWAY_URL` + `JWT_JWKS_URL` (via gateway interno) +
`JWT_ISSUER=sistemazero-auth` + `JWT_AUDIENCE=sistemazero`. Domínios: staging
`marketing-app-staging-cb28.up.railway.app`; produção `marketing.sistemazero.com.br`
(⚠️ pende o CNAME `marketing` → `34z3j59k.up.railway.app` no Cloudflare — token atual não
escreve DNS). Réplica única.

## Roadmap deste app (plano: `~/.claude/plans/eu-tenho-a-plataforma-wise-nebula.md`)

- **F1 (operação manual):** kanban dnd-kit (padrão reorder do admin, otimista+rollback), detalhe
  do conteúdo (stepper/checklist/anexos/comentários), composer com contador por rede + preview
  aproximado, calendário mensal custom (CSS grid 7 col + dnd-kit; SEM lib de calendário),
  biblioteca com upload presigned (XHR PUT com progresso) + "marcar como publicado".
- **F2+:** /conexoes (OAuth via backend; o app só abre a authorizeUrl e lê `?connected=` no
  retorno), /metricas (recharts 3.8.1 pinado igual admin + heatmap 7×24 custom), toggle
  auto/lembrete, banner de falha com CTA, IA (lightcopy.ts como linter de legenda).

## Checklist antes de finalizar

- [ ] `bun test` verde · `bun run typecheck` limpo · `bun run check` limpo · `bun run build` passa.
- [ ] Nenhum `server/*`/`env` importado por Client Component. Sem `any` novo.
- [ ] Endpoint novo no backend? Atualizou `lib/types.ts` (+ allowlist do catch-all se for
      1º segmento novo) e o `docs/marketing.md` se o fluxo mudou.

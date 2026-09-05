# CLAUDE.md — @sistemazero/helpdesk-app

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Next.js, React, Tailwind,
> recharts, jose, Zod etc.) — não confie só na memória; APIs mudam (ex.: `middleware`→`proxy` no
> Next 16). Para **pesquisa, exploração e entender padrões**, use o **MCP do Octocode**.

Guia operacional do **app do help desk** (front da equipe). Leia antes de editar.

## O que é

Front-end **dedicado e interno** (equipe staff+) do help desk: painel, caixa de entrada (tickets
do e-mail e do portal), thread + resposta com IA, base de conhecimento e configurações (conexão
Gmail + assinatura). **Next.js 16 (App Router) + React 19 + Tailwind v4**; o back-end é o
**[@sistemazero/helpdesk](../helpdesk)** (porta 3013), consumido SEMPRE via api-gateway. Molde
arquitetural: **`packages/marketing-app`** (BFF via gateway, cookies HttpOnly, réplica única).
Porta **3014**. Domínio futuro: `helpdesk.sistemazero.com.br` (ou `atendimento`).

> Estado: **F0–F7 COMPLETAS (01/09/2026)** — todas as telas no ar: **Painel** (exceções de SLA,
> risco e tickets sem responsável + gráfico de volume de 14 dias), **Caixa de entrada** (atalhos
> de atenção/atribuição, filtros status/categoria/busca e badges de SLA/canal), **Ticket**
> (thread com citação colapsada + painel resumo IA + editor prefilled com o rascunho + Enviar/
> Regenerar/Resumir/Nota; timeout de envio permite verificar o Gmail antes de liberar uma nova
> resposta; 409 → toast + soft-reload; chamado do PORTAL: o editor diz "Publicar resposta" e
> a mensagem vai para a conversa do /ajuda + aviso por e-mail, SEM depender da caixa Gmail —
> o canal é do ticket, decidido no backend), **Base de conhecimento** (CRUD + toggle
> Publicado), **Configurações** (conexão Gmail conectar/reconectar + assinatura). IA é somente
> copiloto: todo rascunho exige revisão e envio humano.
> Padrões-chave: 409 CONCURRENCY_CONFLICT → toast + soft-reload (preserva o texto digitado);
> erro de fetch NUNCA vira "0" no painel (fica traço + aviso); o painel busca no client (rotação
> de cookie só acontece em Route Handler).

## Arquitetura (o padrão central — preserve-o)

```
Browser → /api/* (Route Handlers, mesma origem, cookie HttpOnly)
        → gatewayFetch (Bearer do cookie, refresh-on-401 single-flight em globalThis)
        → API Gateway (:3000) verifica JWT + RBAC staff+ → injeta X-Auth-User-* + x-internal-token
        → @sistemazero/helpdesk (:3013)
```

- **Login:** `POST /api/auth/login` → gateway `/auth/login`; **rejeita role ∉
  {superadmin, admin, staff} com 403 ANTES de gravar cookies**. Cookies `sz_hd_access`/
  `sz_hd_refresh` (**`__Host-`** em prod). Pós-login/logout navega com `window.location.replace`
  (NUNCA `router.replace + refresh` — corrida documentada do Next).
- **Sessão (`src/server/session.ts`):** HS256 (`JWT_HS256_SECRET`, dev) e/ou RS256 via
  `JWT_JWKS_URL` (prod). **Prod EXIGE JWKS e RECUSA HS256** (mesma regra do marketing-app/admin).
- **BFF (`src/app/api/helpdesk/[...path]/route.ts`):** catch-all que encaminha
  GET/POST/PUT/PATCH/DELETE ao gateway `/helpdesk/<path>` com **allowlist de 1º segmento**
  `{tickets, kb, settings, connection, oauth}` (fora → 404) + `forwardUpstream` (envelope
  `{error:{code,message}}`; trata 204/205/304 sem corpo). Re-encoda os segmentos (o Next entrega
  decodificado — sem isso `..%2F` viraria path traversal).
- **Proxy (`src/proxy.ts`):** anti-CSRF same-origin em mutações `/api/*` + redirect `/login` nas
  páginas `(app)` sem cookie de refresh. Gate REAL de sessão/role no `(app)/layout.tsx`.
- **Security headers/CSP no `next.config.ts`**: sem hosts de R2/Vimeo (este app não faz upload;
  os bytes dos e-mails vivem no Gmail, não aqui).

## Invariantes (NÃO quebrar)

1. **Nunca chamar o serviço direto** — tudo via gateway (`src/server/gateway.ts`).
2. **Segredos só no servidor** (`src/lib/env.ts` é `server-only`; nunca importar de client).
3. **Réplica única**: single-flight do refresh em `globalThis` — não escalar horizontalmente.
4. Primitivos de UI vêm de **`@sistemazero/ui`** (exige `transpilePackages` +
   `@source "../../../ui/src"` no globals.css). Nunca copiar primitivo localmente.
5. **Copy da UI na voz sistemazero**: sem travessão, sem exclamação, sem jargão de IA.
6. Enums, views e parser de citações vêm de **`@sistemazero/helpdesk-contracts`**. Labels e cores
   específicas do console permanecem em `lib/categories.ts`; não replique contratos localmente.
7. **Erro de painel/contagem NUNCA vira 0** (indistinguível de caixa vazia): mostra o traço + aviso.

## Estrutura

```
src/
  app/
    layout.tsx · globals.css (tokens + @source ui) · not-found.tsx
    login/                     página + form (client)
    (app)/                     shell autenticado: layout gate + Topbar + AppSidebar
      page.tsx + painel-client.tsx + volume-chart.tsx   Painel (stats via
                               `/helpdesk/tickets/stats`, agregado no banco; recharts 3.8.1 pinado)
      tickets/ (page + tickets-client + [id]/*)   fila SLA por cursor + thread/resposta/notas/controles
      base-conhecimento/ (page + kb-client + article-dialog)   CRUD do KB
      configuracoes/ (page + configuracoes-client)   conexão Gmail + assinatura
    api/
      auth/{login,logout}/ · healthz/ · helpdesk/[...path]/   (BFF)
  server/   session.ts · gateway.ts · forward.ts · sentry.ts (ingestão via fetch, sem SDK)
  lib/      env.ts · cookies.ts · csrf.ts · api.ts · upstream.ts · format.ts · dates.ts (SP) ·
            paths.ts · types.ts (reexports do contrato) · categories.ts (labels/cores PT-BR)
  components/ layout/* (sidebar/topbar/user-menu/theme/nav) · shared/{empty-state,page-header,
              ticket-badges} · providers
  proxy.ts · instrumentation.ts
scripts/boot-check.mjs   (fail-fast de env em prod, em SINCRONIA com instrumentation.ts)
tests/    (libs puras — quote/categories/paths etc.)
```

## Comandos (de dentro de `packages/helpdesk-app`)

| Comando | O quê |
|---------|-------|
| `bun run dev` | Next dev :3014 |
| `bun run build` / `start` | build + produção (⚠️ build sempre PACKAGE-LOCAL, nunca `--filter` da raiz) |
| `bun test` · `bun run typecheck` · `bun run check` | suite / tsc / Biome |

Da raiz: `dev:helpdesk-app`, `build:helpdesk-app`, `typecheck:helpdesk-app`, `test:helpdesk-app`.
Setup local: Postgres up + auth/gateway/helpdesk rodando + usuário staff → `bun run dev:helpdesk-app`
→ `http://localhost:3014`.

## Env (`.env.example`)

`GATEWAY_URL` (prod: obrigatório explícito) · `JWT_HS256_SECRET` (dev) e/ou `JWT_JWKS_URL` (prod,
obrigatório; recusa HS256) · `JWT_ISSUER`/`JWT_AUDIENCE` (obrigatórios em prod) · `SENTRY_DSN`
(opcional). Regras em `src/instrumentation.ts` E `scripts/boot-check.mjs` (manter em sincronia).

## Deploy (Railway) — pendências da usuária

Dockerfile (Node 22 + bun, build package-local, standalone) + railway.json (healthcheck
`/api/healthz`, watchPatterns helpdesk-app+ui+lock). Falta a usuária **criar o serviço
`helpdesk-app`** (staging+prod) e registrar seu ID na variável de repositório
`RAILWAY_HELPDESK_APP_SERVICE_ID` (e o ID da API em `RAILWAY_HELPDESK_SERVICE_ID`; destravam o
CI); envs nos 2 ambientes:
`GATEWAY_URL` + `JWT_JWKS_URL` (via gateway interno) + `JWT_ISSUER=sistemazero-auth` +
`JWT_AUDIENCE=sistemazero`. Réplica única.

## Checklist antes de finalizar

- [ ] `bun test` verde · `bun run typecheck` limpo · `bun run check` limpo · `bun run build` passa.
- [ ] Nenhum `server/*`/`env` importado por Client Component. Sem `any` novo.
- [ ] Endpoint novo no backend? Atualizou `@sistemazero/helpdesk-contracts` (+ allowlist do
      catch-all se for 1º segmento novo).

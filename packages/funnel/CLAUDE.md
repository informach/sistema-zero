# CLAUDE.md — `@sistemazero/funnel`

Orientações para agentes trabalhando **dentro deste package**. Para setup local ponta a ponta
(subir payments + gateway + funil, seed de consumer, imagens), veja o `README.md`.

## O que é

Funil de vendas do ebook **No Comando da IA** (R$ 37):
`quiz (10 perguntas em /quiz)` → `resultado personalizado` → `página de vendas` →
`modal pré-checkout` → `checkout Pix` → `/obrigado` · + painel `/admin`.
`/` redireciona (302) para `/quiz` — a P1 (com imagens) é o primeiro passo da própria ilha do quiz.

**Stack:** Astro 6 (`output: 'server'` + `@astrojs/node` standalone, roda no Bun) · ilhas **React 19**
só onde há interação · **Drizzle + postgres.js** (schema `funil` no Postgres compartilhado com o
payments) · **Tailwind v4** (`@theme` em `src/styles/global.css`) · **Zod** env fail-fast · **Biome**.

## Comandos

```bash
bun run dev        # dev server :4321 (--host)
bun run build      # marketing pré-renderizado + servidor SSR
bun run start      # sobe o build (bun ./dist/server/entry.mjs)
bun run typecheck  # astro check (cobre .astro + .ts + .tsx)
bun test           # bun:test
bun run check      # biome (lint+format); check:fix p/ aplicar
bun run db:generate / db:migrate   # migrations Drizzle (schema funil)
```

Após qualquer mudança, antes de concluir: **`bun test` + `bun run typecheck` + `bun run check`**
devem passar (e idealmente `bun run build`, pois é o que valida a middleware/SSR).

## Arquitetura (o padrão central — preserve-o)

Lógica fica em **handlers puros** `(@/server/*.ts)` com a forma `(request: Request, deps) => Response`
(ou `Promise<Response>`). As rotas `(@/pages/api/*)` são **finas**: só montam `deps` via `getDeps()`
e chamam o handler. Isso mantém tudo testável com fakes, sem subir Astro/Postgres.

```
src/
  pages/api/**      Rotas finas (APIRoute). prerender=false. Sem lógica de negócio.
  server/*.ts       Handlers puros + deps interfaces (checkout, leads, webhook, admin).
  server/deps.ts    getDeps(): singleton {repo, env, gateway} (reusa o pool do Postgres).
  db/
    schema.ts       pgSchema('funil'): leads, funnel_events, processed_webhooks.
    repo.ts         Porta FunnelRepo (interface) + impl Drizzle. Endpoints dependem da interface.
    client.ts       postgres.js + Drizzle (singleton lazy, casing snake_case).
  lib/              Utilitários client-safe e server-only (ver regra de import abaixo).
  islands/          Ilhas React (só onde há interação). Falam com /api/* via lib/api-fetch.
  content/          Copy/config tipados (quiz-config, copy, sales-sections, result-messages).
  middleware.ts     Security headers + rate-limit best-effort (SSR only).
tests/
  fakes/            fake-db (FunnelRepo em memória), fake-gateway.
  unit/ integration/  Testam handlers/libs direto com fakes.
```

Ao adicionar um endpoint: escreva o handler em `server/`, exporte uma rota fina em `pages/api/`,
adicione o método ao `FunnelRepo` (interface + Drizzle + **fake**) se precisar de persistência, e
cubra com teste usando os fakes.

## Invariantes (NÃO quebrar)

1. **O funil nunca chama o `payments` direto.** Todo pagamento passa pelo **api-gateway (BFF)** via
   `lib/gateway-client.ts`. Ver `packages/api-gateway` e `packages/payments`.
2. **Nunca importar `lib/env.ts`, `server/*`, `db/*` ou qualquer segredo de uma ilha React** — vaza
   para o browser. Ilhas só falam com `/api/*` (mesma origem) via `lib/api-fetch.ts`.
3. **Dinheiro sempre em centavos** (inteiro). Formatação só na borda (`lib/money.ts`).
   `custo_mensal = horas × valor_hora(centavos) × 4`, **recalculado no servidor** (não confie no client).
4. **Toda operação de lead deriva do cookie `funil_lead`** (HttpOnly) — nunca id na URL (ilhas não
   leem HttpOnly). Ver `lib/lead-session.ts`.
5. **Sempre `content-type: application/json`** nas chamadas `/api/*` (o `apiPost`/`apiPatch` já fazem).
   Astro 6 `checkOrigin` (CSRF) só barra content-types de form; o JSON + cookie `SameSite=Lax` é a
   defesa CSRF efetiva.
6. **Valide a entrada do usuário no servidor.** Em `server/leads.ts`, `VALUE_SCHEMA` valida o `value`
   por chave do quiz (escolhas = enums A-D/sim-nao; numéricos com teto que cabe em `integer`/int4).
7. **Mantenha os handlers puros** — sem `process.env`/`Date`/IO escondidos; receba tudo por `deps`.

## Pagamentos (gateway = BFF)

Browser → funil `/api/checkout/*` (mesma origem) → `gateway-client` assina **edge-HMAC** (consumer
`funnel`, `FUNNEL_HMAC_SECRET`) → gateway `POST /payments` (re-assina como consumer `gateway`).

**Canônicos HMAC** — `core.signHmac(secret, msg, ts)` assina `"<ts>.<msg>"`; header `x-signature: t=<ts>,v1=<hex>`:
- POST com Idempotency-Key: `msg = "<idempotencyKey>.<rawBody>"`.
- GET (corpo vazio): `msg = ""` → assina `"<ts>."`.
- Idempotency-Key determinística por lead: **`funil-<leadId>`** (retry aponta p/ a MESMA cobrança).

**Confirmação de pagamento (duas vias):**
- **Polling** (`PixCheckout` → `GET /api/checkout/:id` via gateway) — UX/fallback.
- **Webhook** (`payment.paid`: payments → gateway → funil `/api/webhooks/payments`). O gateway valida
  a assinatura do payments e injeta `x-internal-token` (= `FUNNEL_INTERNAL_TOKEN`); o funil confere o
  token (`safeEqual`), deduplica por `x-delivery-id` e marca pago.

`markPaid` é um `UPDATE … WHERE paid_at IS NULL … RETURNING` → **idempotente**: o evento
`pagamento_confirmado` dispara uma única vez, mesmo com polling + múltiplas entregas de webhook.
O webhook **processa antes** de registrar o `delivery_id`, para que uma falha transitória não faça o
retry do gateway ser descartado.

**Concessão na área de membros (`grantMembers`):** roda DEPOIS do registro do comprador, em
**três caminhos** (espelhando o `fulfill`): webhook (`payment.paid` → 502 `GRANT_RETRY` se falhar →
gateway re-entrega) e **best-effort** no polling do Pix (`pixStatus`) e no cartão síncrono PAID
(`startCard`) — via `server/members-grant.ts` (`makeGrantMembers`). Idempotente do lado do members
(chave da matrícula), então reentregar/retentar é seguro; o webhook é o backstop durável.

## Renderização (prerender split)

- **Estáticas (`prerender = true`):** `oferta`, `quiz` (shell; a ilha do quiz busca/cria o lead e
  roda as 10 perguntas), `obrigado`. Servidas como HTML estático.
- **SSR (`prerender = false`):** `index` (redirect 302 → `/quiz`), `resultado`, `checkout`, `admin`,
  `admin/login`, **todas** `/api/*`, `health`.
  Páginas com dados do lead setam `cache-control: no-store` e redirecionam se faltar cookie/contato.

## Segurança

- **`src/middleware.ts`** seta security headers (CSP, `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, HSTS em prod) e um **rate-limit best-effort** em memória
  (`lib/rate-limit.ts`, 240/min/IP nos POST/PATCH de `/api/{leads,events,contact,checkout}`).
  - ⚠️ A middleware **só roda em rotas SSR** — páginas pré-renderizadas (marketing) são servidas
    estáticas e **não passam por ela** em runtime. Em produção, replique os headers no proxy/CDN.
  - ⚠️ O rate-limit é **por instância** (não compartilhado, não persiste). A defesa de borda real é
    do gateway/CDN. Mantenha o limite generoso (o quiz faz ~12 PATCH por sessão).
  - A CSP usa `'unsafe-inline'` em script/style — necessário p/ hidratação do Astro, JSON-LD inline
    (`ProductJsonLd`) e o `onerror` do `ImageSlot`. Ao adicionar inline scripts, lembre disso.
- **Admin** (`/admin`, `/api/admin/*`): **login in-app** com cookie de sessão assinado
  (`lib/admin-session.ts`: HMAC via `core.signHmac` + `lib/safe-equal`; TTL 12h; HttpOnly/SameSite=Lax;
  `Secure` em prod). `/admin` sem sessão → redireciona p/ `/admin/login` (ilha `AdminLogin`: valida com
  Zod e `POST /api/admin/login`); `/api/admin/*` sem sessão → 401. Credenciais em `ADMIN_USER`/
  `ADMIN_PASSWORD` (comparação timing-safe); o cookie é assinado com `ADMIN_SESSION_SECRET`. Logout:
  `POST /api/admin/logout` (botão "Sair" no painel). Só seguro sob HTTPS — garanta TLS em prod.
- **Não importar `middleware.ts` em testes** (`bun test` não resolve o módulo virtual
  `astro:middleware`). Teste a lógica isolada (ex.: `lib/rate-limit.ts`).

## Convenções de status HTTP (`lib/http.ts` → `json`/`jsonError`)

| Situação | Status | code |
|---|---|---|
| Sem cookie de lead (ops autenticadas) | 401 | `NO_LEAD` |
| Cookie presente mas lead inexistente | 404 | `NOT_FOUND` |
| Payload/valor inválido | 400 | `BAD_REQUEST` |
| Checkout sem e-mail (sem contato p/ entregar) | 409 | `NO_CONTACT` |
| Rate limit | 429 | `RATE_LIMITED` |
| Falha no gateway | 502 | `GATEWAY_ERROR` |
| Admin sem sessão / login inválido (`/admin/*`) | 401 | `UNAUTHORIZED` |

## Banco (schema `funil`)

**Padrão do monorepo:** 1 Postgres compartilhado (`sistemazero`) com 1 schema por
serviço (`payments`/`funil`/`auth`). Este package é dono do schema `funil`
(`pgSchema('funil')` + `schemaFilter:['funil']`). Tabelas: `leads`
(1 linha/lead, enriquecida a cada resposta; centavos em colunas `integer`), `funnel_events`
(analytics; conversão por etapa usa `count(distinct lead_id)`), `processed_webhooks` (dedupe).
Migrations forward-only por `drizzle-kit`, com **journal próprio por pacote**
(`migrations: { table: 'funil_migrations' }`) no schema `drizzle` — NÃO compartilhe
`__drizzle_migrations` entre pacotes (a dedupe por `created_at` pularia migrations).

> Centavos em `integer` (int4, máx ~2,1e9): os tetos do `VALUE_SCHEMA` garantem que nenhum valor —
> nem o produto `horas×valor×4` — estoure int4. Se um dia precisar de valores maiores, migre as
> colunas de centavos para `bigint` (e ajuste os tetos).

## Testes

`bun:test`. Handlers/libs são testados **direto**, injetando `fake-db` (`FunnelRepo` em memória) e
`fake-gateway`. Ao mudar a interface `FunnelRepo`, atualize **os três**: interface, impl Drizzle e o
fake — senão o typecheck/teste quebra. Padronize asserts por status + efeito no fake (lead/evento).

## Gotchas de Biome / `.astro`

Biome 2.4 tem suporte parcial a `.astro`. Os overrides ficam no **`biome.json` da raiz**: funnel
`*.tsx` relaxa a11y (espelha a TUI), `*.astro` desliga `noUnused*` (falsos positivos com imports
usados no template), `*.css` desliga `noImportantStyles`; `!**/.astro` exclui os tipos gerados.
O typecheck de `.astro` é o `astro check`.

## Gotcha: ilhas React não hidratam (`jsxDEV is not a function`)

**Sintoma:** uma ilha React quebra na hidratação com `Uncaught TypeError: jsxDEV is not a function`
(ou simplesmente "as opções/o componente pararam de aparecer, antes apareciam"). Afeta **todas** as
ilhas, não só uma.

**Causa:** o pre-bundle de deps do Vite (`node_modules/.vite/deps`) ficou otimizado em **modo
production**, onde o React entrega `jsxDEV = void 0` de propósito (em prod usa-se `jsx`, não `jsxDEV`).
Mas em dev o `@vitejs/plugin-react` transforma as ilhas chamando `jsxDEV(...)`. O Vite chaveia esse
cache por hash de lockfile/config — **não** por `NODE_ENV` — então uma única otimização rodada com
`NODE_ENV=production` (um shell com a var setada, etc.) envenena o cache e ele **não** se regenera
sozinho ao voltar pro dev.

**Fix:** `bun run dev:clean` (limpa `.vite`/`.astro` e sobe o dev → Vite re-otimiza em modo dev).
E **não** rode `bun run dev` com `NODE_ENV=production` no shell. O `NODE_ENV=development` no `.env` é
legítimo (consumido por `src/lib/env.ts` p/ `secureCookie`) — não é a causa.

## Gotcha: ilha não hidrata com `504 (Outdated Optimize Dep)`

**Sintoma:** uma ilha **lazy** (`client:idle` ou carregada por `import()` dinâmico) não hidrata; o
console mostra `504 (Outdated Optimize Dep)` numa dep (ex.: `zod.js`) **+** `Failed to fetch
dynamically imported module: .../src/islands/<Ilha>.tsx`. Diferente do gotcha do `jsxDEV` acima,
costuma afetar **uma** ilha (a lazy) e some sozinho num restart — só pra voltar depois.

**Causa:** no cold-start o scanner do Vite só pré-bundla as deps que alcança a partir dos entry
points. Ilhas `client:idle`/`import()` são entry points carregados **tarde**; quando finalmente
hidratam e puxam uma dep que não foi pré-bundlada, o Vite a descobre na hora, **re-otimiza** e troca
o hash dos chunks — as requisições em voo do hash antigo viram **504 Outdated Optimize Dep** e o
import dinâmico da ilha falha. Deps assim no funil: `zod` (via `contact-schema`/`checkout-schema`/
`admin-schema`, usadas por `PreCheckoutModal client:idle` e abas do checkout), `motion/react` e
`payment-token-efi` (`import('payment-token-efi')` em `CardCheckout`).

**Fix:** já estão listadas em `vite.optimizeDeps.include` no `astro.config.mjs` (força o pré-bundle
no cold-start). Ao adicionar uma **nova** dep de terceiros consumida só por ilha lazy/import
dinâmico, inclua-a ali também. Um restart simples basta (mudar `optimizeDeps` muda o config-hash →
re-otimização automática).

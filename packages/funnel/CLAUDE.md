# CLAUDE.md — `@sistemazero/funnel`

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Astro, React, Tailwind,
> Drizzle, Zod, Bun, etc.) — não confie só na memória; APIs mudam. Para **pesquisa, exploração e
> entender padrões**, use o **MCP do Octocode** em repositórios GitHub relevantes. Faça certo e
> atualizado — não "de cabeça".
>
> **💳 Efí Pay (provedor de pagamentos):** o checkout do funil usa a Efí (via gateway→payments). SEMPRE
> consulte também a documentação oficial ATUALIZADA da Efí antes de mexer em pagamento/tokenização de
> cartão/credenciais: **https://dev.efipay.com.br/docs/api-pix/credenciais/** (e seções relacionadas).

Orientações para agentes trabalhando **dentro deste package**. Para setup local ponta a ponta
(subir payments + gateway + funil, seed de consumer, imagens), veja o `README.md`.

## O que é

Funil de vendas do ebook **No Comando da IA** (R$ 37):
`quiz (10 perguntas em /quiz)` → `resultado personalizado` → `página de vendas` →
`modal pré-checkout` → `checkout estilo Hotmart (Pix / cartão na UI; boleto só pela API)` →
`/obrigado` · + páginas legais (`/politica-de-privacidade`, `/termos-de-uso`) · + painel `/admin`.
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
  server/*.ts       Handlers puros + deps interfaces (checkout, leads, webhook, admin,
                    catalog [preço/cupom via gateway], members-grant [matrícula], fulfillment [registro do comprador]).
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

**Canônicos HMAC** — `core.signHmac(secret, msg, ts)` assina `"<ts>.<msg>"` com
`msg = canonicalHmacMessage({method, path, idempotencyKey?, body})` (06/2026: método+path
amarrados → sem replay cross-endpoint); header `x-signature: t=<ts>,v1=<hex>`:
- POST com Idempotency-Key: `msg = "POST.<path>.<idempotencyKey>.<rawBody>"`.
- GET (corpo vazio): `msg = "GET.<path>."`.
- O `path` assinado = pathname SEM query, o MESMO usado na URL (o gateway verifica
  com o pathname que recebe — construa o path uma vez e use nos dois lugares).
- Idempotency-Key do Pix: **`funil-<leadId>-<fingerprint12>`** — determinística por lead+CONTEÚDO
  (`pixContentFingerprint`: valor+cupom+dados pessoais). Retry com os MESMOS dados → MESMA cobrança
  (não duplica transação); dados diferentes (cupom novo, CPF corrigido) → chave nova → cobrança
  nova, em vez de 409 IDEMPOTENCY_CONFLICT (que travava o Pix do lead p/ sempre). Boleto:
  `funil-<leadId>-boleto`; cartão: `funil-<leadId>-card-<attemptId>` (nonce por tentativa).

**Checkout (estilo Hotmart, 06/2026):** card do produto (capa + nome + autor + preço) → **"Dados
pessoais"** (e-mail + confirmação [só client] + nome + CPF, pré-populados do lead com fallback nos
**query params** `?nome&email&telefone` que o `PreCheckoutModal` anexa ao redirect — sobrevive a
refresh/cookie perdido; `checkout.astro` cria lead novo no SSR se faltar cookie e persiste o contato
dos params) → formas de pagamento como **radio-cards** (Pix default + cartão; boleto fora da UI). O
corpo de `POST /api/checkout/{pix,card}` EXIGE `contact {nome,email,cpf}` (`CheckoutContactSchema`):
o handler atualiza o lead (`document` = CPF sem máscara) e monta o `customer` da cobrança — no Pix
vira o `devedor` da cob na Efí. **O Pix NÃO gera QR automático**: botão "Gerar código Pix"
desabilitado até o contato validar (motivos: enviar dados completos à Efí + não criar transação à
toa); depois do clique vale a máquina de estados de sempre (auto-retry, 409 "aguarde", polling,
expiração 15min). O cartão usa o MESMO CPF compartilhado (o form não o coleta mais).

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

**E-mail de boas-vindas / 1º acesso (`sendWelcome`):** roda no webhook DEPOIS de fulfill+grant,
**só p/ comprador NOVO** (`buyerUserId` setado — o recorrente já tem credenciais). Via
`server/welcome-email.ts` (`makeSendWelcome`): pede o token de definição de senha ao auth
(`POST /auth/internal/password-tokens`, HMAC via gateway), monta o link
`${COMMUNITY_URL}/redefinir-senha?token=...` e enfileira o template `welcome` no messaging
(`POST /messaging/send`, `Idempotency-Key: welcome-<leadId>` → reentrega NÃO duplica).
**BEST-EFFORT deliberado:** falha só loga e NUNCA muda o status do webhook (fallback do aluno =
"esqueci minha senha"). Env: `COMMUNITY_URL`.

## Renderização (prerender split)

- **Estáticas (`prerender = true`):** `quiz` (shell; a ilha do quiz busca/cria o lead e
  roda as 10 perguntas), `politica-de-privacidade` e `termos-de-uso` (conteúdo em
  `content/legal.ts`; links no Footer novo — logo Sistema Zero + Recursos + voltar-ao-topo +
  copyright Informach/CNPJ). Servidas como HTML estático.
- **SSR (`prerender = false`):** `index` (redirect 302 → `/quiz`), `oferta` (nome/preço vêm do
  catálogo em runtime; sem dado por-usuário → `cache-control: public, max-age=60,
  stale-while-revalidate=300`), `resultado`, `checkout`, `obrigado`, `admin`, `admin/login`,
  **todas** `/api/*`, `health`. Páginas com dados do lead setam `cache-control: no-store` e
  redirecionam se faltar cookie/contato.
  - ⚠️ **`obrigado` é SSR só para EXPIRAR o cookie do lead** (`clearLeadCookie`, `Max-Age=0`):
    após a compra, o próximo checkout começa do zero. Combina com dois pontos no `checkout.astro`:
    o **CPF NUNCA é pré-preenchido** (`initialContact.cpf = ''` — dado sensível, digitado a cada
    compra) e o **lead já PAGO não é reaproveitado** (`if (lead?.paidAt) → novo lead`). Nome/e-mail/
    telefone repopulam pela URL do pré-checkout. (Decisão do usuário, 06/2026.)

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
  - A CSP também libera as origens do **checkout de cartão** (`payment-token-efi`): API de cobranças
    da Efí (`cobrancas[-h].api.efipay.com.br` em `connect-src`), tokenizer (`tokenizer.sejaefi.com.br`
    em `connect-src`) e fingerprint antifraude da ClearSale (`device.clearsale.com.br` em
    `script-src`/`connect-src`/`img-src`; `web.fpcs-monitor.com.br` em `connect-src`/`img-src`).
    Sem isso a tokenização falha e o `isScriptBlocked()` acusa "adblock" à toa. Se a Efí mudar de
    endpoints numa atualização da lib, re-extraia as URLs do bundle
    (`rg -o 'https://[a-z0-9.-]+' node_modules/payment-token-efi/dist/payment-token-efi-esm.min.js`).
  - **Extras DEV-only na CSP** (`import.meta.env.DEV`; NUNCA em prod): `worker-src 'self' blob:` +
    `'unsafe-eval'` no script-src. O cliente HMR do Vite cria um **SharedWorker via `blob:`** para
    detectar o restart do dev server — sem `worker-src` o fallback é o script-src e a CSP o
    bloqueava ("Creating a worker from 'blob:...' ... has been blocked" no console + auto-reload
    quebrado após restart; o `[vite] Error: send was called before connect` é ruído da mesma
    reconexão). Em prod não existe `/@vite/client` e nada cria worker (verificado no bundle da Efí
    e em runtime) — a CSP segue estrita.
- **Admin** (`/admin`, `/api/admin/*`): login com **usuário REAL do auth (IdP)** via gateway
  (`lib/admin-auth.ts`). `POST /api/admin/login` (ilha `AdminLogin`, e-mail+senha validados com Zod)
  chama o gateway `POST /auth/login`; só `role ∈ {admin, superadmin}` + `status: active` entra (senão
  403). Os tokens (access+refresh) viram cookies **HttpOnly** `admin_access`/`admin_refresh`
  (`SameSite=Lax`, `Secure` em prod). Cada request valida via gateway `GET /auth/me` (`resolveAdmin`); se
  o access expira, troca o refresh por um par novo (rotação no auth) e reseta os cookies. `/admin` sem
  sessão → redireciona p/ `/admin/login`; `/api/admin/*` sem sessão → 401. Logout: `POST /api/admin/logout`
  revoga o refresh no auth e limpa os cookies. **O funil não guarda credencial/segredo de admin** — crie
  o admin no auth (`bun run --filter @sistemazero/auth db:seed --email <e> --password <p> --role admin`).
  Só seguro sob HTTPS.
  - ⚠️ **Sem SSO com o painel `admin` (3005):** são apps separados — cookies de nomes diferentes
    (`admin_*` aqui vs. `sz_admin_*` lá) e, em prod, domínios diferentes. Logar num NÃO loga no outro;
    cada um faz o próprio login contra o mesmo IdP.
- **UI do painel (06/2026):** o `/admin` (login + dashboard) usa o **`@sistemazero/ui`**
  (Button/Card/Table/Badge/Dialog/Input/PasswordInput/Field) + o tema sistema-zero + o **logo**
  (`public/logo_dark.svg`/`logo_white.svg`), espelhando o pacote `admin`. **Dark-only**: `BaseLayout`
  tem prop `htmlClass` e só as páginas `/admin*` passam `htmlClass="dark"`. O tema no `global.css` é
  **ADITIVO** — mantém os `@theme { --color-* }` de marca do funil e **OMITE de propósito**
  `--color-card`/`--color-muted` (já significam card escuro e o cinza de TEXTO `text-muted` das
  públicas; remapear regrediria-as). **REGRA: nessa camada só ADICIONE token novo.** As deps do ui
  (`lucide-react`/`class-variance-authority`/`clsx`/`tailwind-merge`) viraram deps DIRETAS do funil +
  entraram no `optimizeDeps.include` (senão o Vite não as resolve da raiz). Abas: **Respostas** (tabela
  enxuta → `Dialog` c/ os 16 campos; cards no mobile) + **Performance** (KPIs/barras, intacta).
- **`GET /api/admin/leads` pagina no SERVIDOR**: `?limit` (1..100, default 25) `&offset&q&sort`
  (asc|desc) → `{ leads, total, limit, offset }`. Busca (ILIKE nome/e-mail) e ordenação valem sobre
  TODOS os leads (repo `listLeads(limit, offset, {q,sort})` + `countLeads(q)`, mesmo WHERE no count);
  a UI usa o `Pagination` do ui c/ busca debounced (reseta p/ página 1). Antes capava em 1000 sem
  paginação. **Status por lead** (coluna na tabela + badge no detalhe + seção "Compra"): derivado
  dos dados reais — `paidAt`→**Comprou**, senão `paymentId`→**Checkout**, senão `email`→**Pré-checkout**,
  senão **Quiz**. ⚠️ Usar esses campos, NÃO `last_step` (que fica na última pergunta do quiz — não
  avança p/ checkout/pagamento; era por isso que comprador aparecia "na pergunta 10").
- **Não importar `middleware.ts` em testes** (`bun test` não resolve o módulo virtual
  `astro:middleware`). Teste a lógica isolada (ex.: `lib/rate-limit.ts`).

## Convenções de status HTTP (`lib/http.ts` → `json`/`jsonError`)

| Situação | Status | code |
|---|---|---|
| Sem cookie de lead (ops autenticadas) | 401 | `NO_LEAD` |
| Cookie presente mas lead inexistente | 404 | `NOT_FOUND` |
| Payload/valor inválido | 400 | `BAD_REQUEST` |
| Checkout sem e-mail (sem contato p/ entregar) | 409 | `NO_CONTACT` |
| Cobrança ainda em criação (retry durante a reserva de idempotência do payments) | 409 | `PAYMENT_IN_PROGRESS` |
| Rate limit | 429 | `RATE_LIMITED` |
| Falha no gateway | 502 | `GATEWAY_ERROR` |
| Admin sem sessão / login inválido (`/admin/*`) | 401 | `UNAUTHORIZED` |

## Banco (schema `funil`)

**Padrão do monorepo:** 1 Postgres compartilhado (`sistemazero`) com 1 schema por
serviço (`payments`/`funil`/`auth`). Este package é dono do schema `funil`
(`pgSchema('funil')` + `schemaFilter:['funil']`). Tabelas: `leads`
(1 linha/lead, enriquecida a cada resposta; centavos em colunas `integer`; `document` = CPF sem
máscara coletado nos dados pessoais do checkout), `funnel_events`
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
no cold-start). Também ali: as deps do **`@sistemazero/ui`** (`lucide-react`/`class-variance-authority`/
`clsx`/`tailwind-merge`, consumidas pelas ilhas do `/admin`) — e, como vivem só em
`packages/ui/node_modules`, foram declaradas como deps DIRETAS do funil p/ o Vite resolvê-las da raiz
(senão dá `Failed to resolve dependency`). Ao adicionar uma **nova** dep de terceiros consumida só por
ilha lazy/import dinâmico, inclua-a ali também. Um restart simples basta (mudar `optimizeDeps` muda o
config-hash → re-otimização automática).

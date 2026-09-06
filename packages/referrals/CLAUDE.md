# CLAUDE.md — @sistemazero/referrals

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Elysia, Drizzle, Zod, Bun
> etc.) — não confie só na memória; APIs mudam. Para **pesquisa/exploração**, use o **MCP do
> Octocode**. Faça certo e atualizado — não "de cabeça".

## O que é

**Serviço de indicações e bolsas** do Sistema Zero. Porta **3012**, schema Postgres **`referrals`**,
journal `referrals_migrations`. Runtime: **Bun**. Molde arquitetural: `packages/fiscal`
(DDD + Hexagonal, env Zod fail-fast, borda Elysia, advisory locks, testes em 4 camadas).
Plano completo do projeto: `~/.claude/plans/ent-o-vamos-implementar-esses-atomic-stroustrup.md`;
consenso de produto: memória `sistema-indicacao-moeda-premium.md` + artifact
https://claude.ai/code/artifact/a77ac5ad-56c9-47f3-9a83-83f36611cd43.

> Estado: **FASE 1 (Bolsa do Primeiro Jogo)** implementada + **EXTENSÃO (09/2026): auto-cadastro
> do responsável, rastreio de conversão e bônus Pix manual** (ver §Conversões abaixo). O Programa 1
> (moeda da família, ledger 20%, gasto no checkout) segue NA GAVETA por decisão da usuária.

## Conceito central (decisões travadas com a usuária)

1. **Bolsa = a MESMA oferta do comprador** (`SCHOLARSHIP_OFFER_SLUG`, default
   `desafio-primeiro-jogo`): curso vitalício + bônus (Mural), via grant manual `mode:'offer'` no
   members com `expiresAt: null`. **1 bolsa por E-MAIL, global** (UNIQUE em
   `scholarship_redemptions.email`).
2. **Embaixador não precisa de conta** — a página dele é uma capability-URL
   (`/embaixador/<page_token>`, 32 bytes base64url). Sem ganho financeiro ao embaixador.
3. **`codes` é GENÉRICA desde a F1**: `owner_kind ∈ {ambassador, account}` com UNIQUEs parciais e
   CHECK de exatamente-um-owner. Na F2 o MESMO código do membro serve à landing `/bolsa/<code>` e à
   atribuição `?ref` — é "a liga" (bolsista que assinar depois credita 20% ao membro na F3).
   `owner_email` (lower) já nasce aqui — base do anti-autoindicação da F3, sem backfill.
4. **Sem WhatsApp automático** (decisão de produto): disparo da plataforma é E-MAIL único;
   o embaixador compartilha o link no próprio WhatsApp.
5. **Ordem do resgate: CONTA → GRANT → E-MAIL** — se o e-mail falhar, o acesso já existe; se o
   grant falhar, nenhum e-mail mentiroso saiu. O e-mail é best-effort (fallback do usuário =
   "esqueci minha senha").

## Fluxo do resgate (`RedeemScholarshipService`)

1. Código ativo? (404 **UNIFORME** p/ inexistente OU desativado — não vazar qual.)
2. Normaliza e-mail (lower/trim) **ANTES** do UNIQUE e de qualquer S2S.
3. Claim da bolsa: `INSERT … ON CONFLICT (email) DO NOTHING`; conflito → `completed` = 409 —
   mas se `welcome_sent_at` for NULL, **RETOMA só o e-mail antes do 409** (crash entre o grant e
   o welcome; o claim atômico do welcome é o mutex — dispensa lease, que exclui completed);
   `pending/failed` = **RETOMADA por etapas** (colunas `user_id`/`granted_at`/`welcome_sent_at`
   pulam o que já concluiu; o 1º claim vence o `code_id`).
4. **Lease** em coluna (`processing_until`, `REDEMPTION_LEASE_MS` 90s): só uma execução roda;
   segunda submissão → 202 `processing`; crash no meio expira sozinho.
5. `POST /auth/internal/ensure-buyer` (via gateway, consumer `referrals`) com senha descartável e
   `source: 'scholarship'` → `{userId, created}`.
6. `POST /members/webhooks/grant-manual` — o CLIENTE injeta `mode: 'offer'` no corpo (detalhe do
   WIRE, obrigatório no DTO do members; travado por `tests/unit/gateway-client.test.ts` contra o
   cliente REAL — os fakes não pegariam) — com `x-delivery-id: scholarship:<id>` **ESTÁVEL** +
   `sourceId: 'scholarship:<id>'` (a idempotência do members vira
   `manual:userId:productId:scholarship:<id>` — cortesia admin do mesmo produto NUNCA colide com
   a bolsa). 409 = **terminal** (`failed_reason: grant_conflict`, aflora no admin — nunca retry
   infinito; o members NÃO marca a entrega, então destravar lá + re-submeter aqui conclui);
   5xx = grava `last_error` (`grant:<status>[:código]`, some no sucesso) + solta lease + 502
   (o usuário re-tenta; tudo idempotente). `OFFER_UNRESOLVED`/`OFFER_EMPTY` = MISCONFIG
   (slug errado) → log **ERROR** alertável, não warn.
7. Welcome com **claim atômico** (`welcome_sent_at`, molde `welcome-email.ts` do funil):
   conta NOVA → password-token (falha na emissão → release do claim; **emitido → NUNCA liberar**,
   reemitir mataria o link entregue — o auth consome tokens pendentes) → template
   `referrals-scholarship-welcome`; conta PRÉ-EXISTENTE → **sem token**, template `new-access`.

## Conversões + bônus Pix manual (extensão 09/2026)

Rastreia **bolsista que assinou a Comunidade dos Criadores** e controla o bônus **FIXO de R$30**
(`BONUS_AMOUNT_CENTS`, qualquer plano — decisão dela) pago **manualmente via Pix** pela empresa.
O serviço NUNCA guarda saldo: só sinaliza elegibilidade e controla pago/não-pago.

- **Consumer do payments** (`interfaces/http/webhooks.routes.ts`, porte fiel do fiscal): `POST
  /webhooks/payments` chega DIRETO na rede privada (fan-out multi-consumer; HMAC do corpo cru com
  `PAYMENTS_WEBHOOK_HMAC_SECRET`, tolerância `WEBHOOK_TOLERANCE_SECONDS`, dedupe por delivery id
  assinado + claim/lease em `processed_webhooks`; retryable → 502 re-entrega; ⚠️ prod com secret
  ausente = rota 401 fail-closed). Registrado via `packages/payments/scripts/seed-consumer.ts`
  (`--id referrals`, eventos `payment.paid,payment.refunded`) — o secret impresso NUNCA é ecoado.
- **`RecordConversionService`** (`application/conversions/`): `payment.paid` → enriquece no
  payments (`GET /payments/internal/payments/:id`, `amountInCents` STRING→bigint; fora →
  retryable; 404 → ERROR + consome) → ⭐ **filtro BARATO primeiro** (full review 06/09): busca
  `scholarship_redemptions` por e-mail `completed` ANTES do catálogo — o fan-out entrega TODO
  pagamento da plataforma e quase nenhum é de bolsista, então quem não resgatou é descartado num
  SELECT local (catalog fora do ar NÃO vira tempestade de retry de entregas irrelevantes) → só
  então resolve a OFERTA pelo `metadata.offerId` (client cópia do fiscal; ⚠️ **anual à vista NÃO
  tem subscriptionId** — o critério é o slug ∈ `CONVERSION_OFFER_SLUGS`) → **anti-autoindicação**:
  e-mail do bolsista == `codes.owner_email` → conversão `self_blocked` com `bonus_cents 0` →
  senão INSERT `pending` com `matures_at = paidAt + BONUS_MATURE_HOURS` (`onConflictDoNothing`).
  ⚠️ **UNIQUE(redemption_id) é PARCIAL (`WHERE status <> 'canceled'`)**: "só a primeira cobrança"
  vale p/ pending/eligible/paid/self_blocked, mas quem ESTORNOU na garantia e assinou de novo
  meses depois volta a converter (achado do full review — sem o parcial o bônus legítimo se
  perdia em silêncio p/ sempre); UNIQUE(payment_id) segue o dedupe de re-entrega.
  `payment.refunded`: `pending` → `canceled`; o repo devolve o STATUS no `not_pending` e o alerta
  ERROR `referrals.refund_after_bonus_eligible` sai SÓ p/ `eligible|paid` — `self_blocked` (bônus
  nunca existiu) e `canceled` (re-entrega) são mudos, senão o Sentry acusaria "devolver Pix" falso.
- **Sweep** (`SweepConversionsService`, timer no composition-root a cada
  `CONVERSION_SWEEP_INTERVAL_MS` — ⚠️ **SEMPRE ligado, independente do secret do consumer**:
  conversões já gravadas, inclusive as do `mature-now`, precisam promover/avisar mesmo com o
  webhook desligado): fase 1 `mature()` promove `pending → eligible` — o advisory xact-lock
  **`7429184620031201`** vive DENTRO do `matureConversions` do repo (mesma tx/conexão do UPDATE;
  no composition-root ele não guardaria nada); fase 2 `notify()` fora da tx: e-mail
  `referrals-bonus-eligible` {nome, valor, link da página} com mark-after-send em `notified_at` +
  Idempotency-Key `bonus-eligible:<id>` — ⚠️ **só embaixador ATIVO** (`listConversionsToNotify`
  filtra: página de desativado 404aria o link e a notificação seria queimada; reativou → o
  próximo ciclo envia); fase 3: `pruneProcessedBefore` poda o dedupe do consumer com 30 dias de
  retenção (metade do molde fiscal que o porte tinha largado — a tabela crescia com TODAS as
  vendas da empresa). Links do funil SEMPRE via `domain/links.ts`
  (`ambassadorPageUrl`/`scholarshipShareUrl` — dono único do shape; eram 5 pontos de construção).
- **Status**: `CONVERSION_STATUSES` (const no port — fonte única; o admin espelha com teste de
  conformance). O que o EMBAIXADOR enxerga = `AMBASSADOR_VISIBLE_CONVERSION_STATUSES`
  (pending/eligible/paid — self_blocked/canceled fora), aplicado NO SQL antes do limit
  (`listAmbassadorVisibleConversions` — canceladas não empurram bônus reais p/ fora da página).
  `markConversionPaid` só de `eligible` (409 `CONVERSION_NOT_ELIGIBLE`); `mature-now` só de
  `pending`.
- **Chave Pix**: campo `ambassadors.pix_key` — o embaixador cadastra NA PÁGINA dele (PATCH
  by-token via funil); o admin só COPIA na tela de bônus.
- **Auto-cadastro do responsável**: `GET|POST /referrals/me/ambassador` (rotas JWT "me"): a
  identidade é **`x-auth-account-id ?? x-auth-user-id`** (⚠️ sessão de PERFIL kids manda o perfil
  no user-id e a CONTA no account-id — sem o fallback um perfil prenderia o e-mail da conta a um
  uuid de perfil e o dono real cairia em 409 p/ sempre); get-or-create pela CONTA; e-mail já
  existe como embaixador externo → **LINKA** `account_user_id` (não duplica); e-mail de OUTRA
  conta → 409 `AMBASSADOR_EMAIL_CONFLICT`; corrida de dois selfEnroll → a UNIQUE parcial da conta
  vira `account_exists` e o perdedor re-busca (nunca 500). Devolve `{enrolled, ambassador:
  {pageUrl, shareUrl ABSOLUTOS via viewOf do service, pixKeySet, status}, stats
  (`getAmbassadorStats` — 2 counts numa ida, sem re-buscar pelo token), bonus: {counts,
  amountCents}}` + `created` no POST (true = o e-mail do link SAIU; vínculo/retomada não manda
  e-mail e o app não pode prometer um). `bonus.amountCents` = env `BONUS_AMOUNT_CENTS` — a copy
  dos apps NUNCA hardcoda o valor.

## Borda HTTP (tudo VIA GATEWAY, exceto o consumer)

- `/referrals/admin/*` — JWT/RBAC no gateway (leitura staff+, escrita admin+); aqui defesa em
  profundidade: `assertInternalCaller` (x-internal-token) + `requireAdmin` (X-Auth-User-*,
  fail-closed). Rotas: POST/GET `ambassadors`, GET `:id` (o detalhe traz `conversion` por resgate
  — a JORNADA do bolsista), POST `:id/resend-link` (Idempotency-Key versionada por
  `link_email_count`), PATCH `:id` {status, rotateToken}, GET `conversions`
  (`?status&limit&offset`; `amountCents` viaja como STRING — bigint), POST
  `conversions/:id/mark-paid` {note?} (grava `paid_marked_at`/`paid_marked_by` do X-Auth-User) e
  POST `conversions/:id/mature-now` (antecipa a garantia — staging/exceção).
  Desativar o embaixador desativa o CÓDIGO junto.
- `/referrals/me/*` — rotas JWT do USUÁRIO logado (gateway `referrals-me-ambassador-{get,post}`,
  `statuses:['active']` sem roles): GET/POST `/referrals/me/ambassador` (auto-cadastro, ver
  §Conversões).
- `/referrals/internal/*` — consumidas pelo FUNIL (HMAC de borda lá; no gateway as rotas têm
  `allowedConsumers: ['funnel']`): GET `codes/:code`, GET `ambassadors/by-token/:token` (agora
  com `bonus: {pixKey, items}` — SÓ status/valor/datas, NUNCA PII do bolsista), PATCH
  `…/by-token/:token/pix` {pixKey 5..140} (cadastro da chave na página do embaixador),
  POST `…/invites` (202 | 409 INVITE_ALREADY_SENT | 409 EMAIL_ALREADY_REDEEMED — SÓ bolsa
  `completed` barra; pending/failed NÃO (o e-mail com o link é o empurrão da retomada) |
  429 cap diário 50/24h móvel), POST `redemptions` (201 completed | 202 processing | 404 |
  409 SCHOLARSHIP_ALREADY_REDEEMED | 409 SCHOLARSHIP_FAILED | 502).
- `/webhooks/payments` — DIRETO na rede privada (consumer do fan-out; ver §Conversões).
- `/healthz` · `/readyz` (probe select 1 — healthcheck do Railway) · `/metrics`
  ({redemptionsByStatus}, token obrigatório em prod).
- Validação: envelope FIXO no `VALIDATION` (nunca ecoa input). Convites: dados MÍNIMOS
  (nome + e-mail — LGPD), envio único por (embaixador, e-mail); re-envio só de `failed`.

## Integrações (contratos)

Todas via **api-gateway** com HMAC de borda (consumer **`referrals`**, `REFERRALS_HMAC_SECRET`),
cliente `infrastructure/gateways/gateway.client.ts` (porte fiel do gateway-client do funil:
canônico `canonicalHmacMessage`, timeout NUNCA lança — vira 502/504 por status):
- **auth**: `POST /auth/internal/ensure-buyer` → `{userId, created}`;
  `POST /auth/internal/password-tokens` → `{token}` (TTL convite 14d).
- **members**: `POST /members/webhooks/grant-manual` (rota criada junto com este serviço;
  `upstreamAuth: 'resign'` no gateway — o members verifica o HMAC do gateway).
- **messaging**: `POST /messaging/send` (202; Idempotency-Key por consumer). Templates novos no
  seed do messaging: `referrals-ambassador-link` {nome, link} ·
  `referrals-scholarship-invite` {nome, indicador, link} · `referrals-scholarship-welcome`
  {nome, indicador, link}. Conta pré-existente reusa `new-access` {nome, link}.
- **payments** (extensão 09/2026): consumer de `payment.paid`/`payment.refunded` ATIVO (ver
  §Conversões) + enriquecimento `GET /payments/internal/payments/:id` (direto, x-internal-token,
  `PAYMENTS_BASE_URL`/`PAYMENTS_INTERNAL_TOKEN`).
- **catalog** (extensão): `GET /catalog/internal/offers/:id` direto (`CATALOG_BASE_URL`) —
  resolve o slug da oferta p/ classificar a conversão (client cópia do fiscal).
- Template novo no seed do messaging: `referrals-bonus-eligible` {nome, valor, link} — avisa que
  o bônus liberou e pede a chave Pix na página do embaixador.

## Banco (schema `referrals`)

`ambassadors` (email UNIQUE lower, `page_token` UNIQUE, `link_email_count`; extensão 09/2026:
`account_user_id` UNIQUE parcial — vínculo com a conta do responsável — + `pix_key`) · `codes`
(code UNIQUE `^[a-z0-9-]{4,32}$`; UNIQUEs parciais por owner; CHECK owner; `owner_email`/
`owner_document`/`panel_audience` já criados p/ F2-F3) · `scholarship_redemptions` (email UNIQUE
global; etapas + lease + claim do welcome) · `invites` (UNIQUE ambassador+e-mail; `send_count`
versiona reenvio) · `conversions` (0001: `redemption_id` UNIQUE **PARCIAL** `WHERE status <>
'canceled'` — 1 bônus por bolsista, mas estorno + nova assinatura volta a converter —,
`payment_id` UNIQUE, `offer_slug`, `amount_cents` bigint, `bonus_cents`, status, `matures_at`/
`eligible_at`/`notified_at`/`paid_marked_at`/`paid_marked_by`/`note`; índices (status,matures_at)
+ (ambassador_id,status) + code_id) · `processed_webhooks` (0001: dedupe/claim do consumer, molde
fiscal + retenção de 30d no ciclo do sweep).
Migrations forward-only via drizzle-kit; **journal próprio `referrals_migrations`**.
⚠️ Regras herdadas do monorepo: carimbo `when` é RELÓGIO (nunca à mão no futuro — guard
`tests/unit/migrations-journal.test.ts`); enum novo não se escreve na mesma transação; CHECK novo
valida linhas existentes.

## Códigos (`domain/codes.ts`)

Alfabeto sem ambíguos (`abcdefghjkmnpqrstuvwxyz23456789` — sem 0/o/1/l/i; código é lido em voz
alta). Embaixador = `slug do 1º nome` + `-` + 4 chars (ex.: `vo-x7k2`); conta (F2) = 8 chars puros
(sem nome — privacidade). `generatePageToken` = 32 bytes base64url.

## Comandos (de dentro de `packages/referrals`)

`bun run dev|start` (porta 3012) · `typecheck` · `test` (sandbox off; `tests/db` auto-pula sem
Postgres :5433 — rode a PASTA inteira) · `db:generate|db:migrate` · `check|check:fix`.
**Sempre** rode `typecheck` + `test` + `check` antes de concluir.

## Deploy (Railway)

`railway.json` (Dockerfile context = raiz; preDeploy `db:migrate`; healthcheck `/readyz`).
Envs de prod (fail-fast): `NODE_ENV=production`, `APP_ENV`, `PORT=3012`, `HOST=::`,
`DATABASE_URL=${{Postgres.DATABASE_URL}}`, `GATEWAY_URL=http://api-gateway.railway.internal:3000`,
`REFERRALS_HMAC_SECRET` (= o do consumer no gateway), `INTERNAL_API_TOKEN`
(= `REFERRALS_INTERNAL_TOKEN` do gateway), `METRICS_TOKEN`, `FUNNEL_PUBLIC_URL`,
`KIDS_COMMUNITY_URL`, `SENTRY_DSN` (só prod). No GATEWAY: `REFERRALS_URL`,
`REFERRALS_INTERNAL_TOKEN`, `REFERRALS_HMAC_SECRET`, `REFERRALS_ALLOWED_CIDRS` —
⚠️ **prod não sobe sem elas** (PROD_REQUIRED_SECRETS).
**Extensão 09/2026** (opcionais em dev; com `PAYMENTS_WEBHOOK_HMAC_SECRET` presente em prod, o
refine EXIGE `PAYMENTS_INTERNAL_TOKEN` + URLs não-loopback): `PAYMENTS_WEBHOOK_HMAC_SECRET` (do
seed-consumer no payments — liga o consumer), `PAYMENTS_BASE_URL`
(`http://payments.railway.internal:3001`), `PAYMENTS_INTERNAL_TOKEN`, `CATALOG_BASE_URL`
(`http://catalog.railway.internal:3003`), `CONVERSION_OFFER_SLUGS` (csv, default
`comunidade-dos-criadores-mensal,comunidade-dos-criadores-anual`), `BONUS_AMOUNT_CENTS` (3000),
`BONUS_MATURE_HOURS` (180 = 7d+12h, régua da NFS-e), `CONVERSION_SWEEP_INTERVAL_MS` (15min),
`WEBHOOK_TOLERANCE_SECONDS` (300), `WEBHOOK_PROCESSING_STALE_MS` (60s).

## Testes

4 camadas (molde fiscal): `tests/unit` (env refines, códigos, journal), `tests/application`
(fakes in-memory — retomada, claims, caps), `tests/integration` (Elysia via `app.handle`, auth
fail-closed, 404 uniforme), `tests/db` (Postgres real com auto-skip: corrida no UNIQUE(email),
lease atômico, UNIQUEs parciais, CHECK, tx do create). ⚠️ `expect(...).rejects` NÃO funciona com
promise do drizzle (thenable preguiçoso) — try/catch; Date em SQL cru do postgres.js →
`.toISOString()`.

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde · `bun run check` sem erros.
- [ ] Mudou schema? `db:generate` + commit da migration (confira o `when` no journal).
- [ ] Mudou contrato/fluxo? Atualize este CLAUDE.md.

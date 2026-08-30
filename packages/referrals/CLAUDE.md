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

> Estado: **FASE 1 (Bolsa do Primeiro Jogo)** implementada. Fases futuras: F2 atribuição `?ref`
> + código do membro; F3 carteira/consumer do payments; F4 gasto de créditos no checkout.

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
3. Claim da bolsa: `INSERT … ON CONFLICT (email) DO NOTHING`; conflito → `completed` = 409;
   `pending/failed` = **RETOMADA por etapas** (colunas `user_id`/`granted_at`/`welcome_sent_at`
   pulam o que já concluiu; o 1º claim vence o `code_id`).
4. **Lease** em coluna (`processing_until`, `REDEMPTION_LEASE_MS` 90s): só uma execução roda;
   segunda submissão → 202 `processing`; crash no meio expira sozinho.
5. `POST /auth/internal/ensure-buyer` (via gateway, consumer `referrals`) com senha descartável e
   `source: 'scholarship'` → `{userId, created}`.
6. `POST /members/webhooks/grant-manual` com `x-delivery-id: scholarship:<id>` **ESTÁVEL** +
   `sourceId: 'scholarship:<id>'`. 409 = **terminal** (`failed_reason: grant_conflict`, aflora no
   admin — nunca retry infinito); 5xx = solta lease + 502 (o usuário re-tenta; tudo idempotente).
7. Welcome com **claim atômico** (`welcome_sent_at`, molde `welcome-email.ts` do funil):
   conta NOVA → password-token (falha na emissão → release do claim; **emitido → NUNCA liberar**,
   reemitir mataria o link entregue — o auth consome tokens pendentes) → template
   `referrals-scholarship-welcome`; conta PRÉ-EXISTENTE → **sem token**, template `new-access`.

## Borda HTTP (tudo VIA GATEWAY na F1)

- `/referrals/admin/*` — JWT/RBAC no gateway (leitura staff+, escrita admin+); aqui defesa em
  profundidade: `assertInternalCaller` (x-internal-token) + `requireAdmin` (X-Auth-User-*,
  fail-closed). Rotas: POST/GET `ambassadors`, GET `:id`, POST `:id/resend-link`
  (Idempotency-Key versionada por `link_email_count`), PATCH `:id` {status, rotateToken}.
  Desativar o embaixador desativa o CÓDIGO junto.
- `/referrals/internal/*` — consumidas pelo FUNIL (HMAC de borda lá): GET `codes/:code`,
  GET `ambassadors/by-token/:token`, POST `…/invites` (202 | 409 INVITE_ALREADY_SENT |
  409 EMAIL_ALREADY_REDEEMED | 429 cap diário 50/24h móvel), POST `redemptions`
  (201 completed | 202 processing | 404 | 409 SCHOLARSHIP_ALREADY_REDEEMED |
  409 SCHOLARSHIP_FAILED | 502).
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
- **payments**: NADA na F1 (o consumer de `payment.paid`/`payment.refunded` chega na F3 — o
  serviço nasce SEM seed-consumer de propósito: zero tráfego até lá).

## Banco (schema `referrals`)

`ambassadors` (email UNIQUE lower, `page_token` UNIQUE, `link_email_count`) · `codes` (code UNIQUE
`^[a-z0-9-]{4,32}$`; UNIQUEs parciais por owner; CHECK owner; `owner_email`/`owner_document`/
`panel_audience` já criados p/ F2-F3) · `scholarship_redemptions` (email UNIQUE global; etapas +
lease + claim do welcome) · `invites` (UNIQUE ambassador+e-mail; `send_count` versiona reenvio).
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

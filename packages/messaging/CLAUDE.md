# CLAUDE.md — @sistemazero/messaging

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Elysia, Drizzle, Zod, Bun,
> **SendGrid**, **Evolution API**, etc.) — não confie só na memória; APIs mudam. Para **pesquisa,
> exploração e entender padrões**, use o **MCP do Octocode** em repositórios GitHub relevantes.
>
> **📨 Provedores:** e-mail = **SendGrid** (`POST /v3/mail/send`, Event Webhook ECDSA); WhatsApp =
> **Evolution API** (self-hosted, protocolo WhatsApp Web — NÃO oficial → **risco de ban**). SEMPRE
> revise a doc atual de ambos antes de mexer no envio/webhooks.

Guia operacional deste package. Leia antes de editar.

## O que é

**Serviço de mensageria transacional**: envia **e-mail (SendGrid)** e **WhatsApp (Evolution)** a
partir de **templates** guardados no nosso banco. Quem solicita passa o **canal**, a **chave do
template** e os **dados do destinatário** (nome + e-mail OU telefone) + variáveis. Runtime: **Bun**.
Porta **3006**. Schema Postgres próprio **`messaging`**.

> Estado: **fatia standalone completa e testada** (57 testes). Enfileira → worker envia com ritmo →
> webhooks de status atualizam a entrega. **Sem integração com a compra/funil ainda** (fatia futura).

## Decisões de design (leia antes de mexer)

1. **Anti-ban é a restrição dominante do WhatsApp.** A Evolution não tem fila/rate-limit/retry — o
   **worker** (`infrastructure/workers/send-worker.ts`) controla tudo: envio **serializado por
   número** (lane), **delay aleatório** entre mensagens, **descanso após N**, **teto diário** por
   número, **aquecimento** de número novo e **rotação entre vários números** (pool de instâncias). A
   matemática está PURA e testável em `domain/services/pacing.ts` (relógio e RNG injetados).
2. **Remetente de e-mail configurável** (pool `email_senders`, não fixo) — o envio escolhe `senderId`
   ou usa o `is_default`. **Números de WhatsApp** também são um pool (`whatsapp_instances`) que o
   worker reveza.
3. **Templates no nosso banco** (`message_templates`), renderizados localmente com `{{variável}}`
   (`domain/services/render-template.ts`). **Valores escapados em HTML** no corpo de e-mail
   (anti-injeção); WhatsApp é texto puro. Sem engine que execute código.
4. **Outbox + worker + webhooks de status** (espelha o `payments`): enfileira em `QUEUED`, o worker
   envia respeitando o ritmo, e os webhooks (`delivered`/`read`/`bounce`/`spam`) atualizam a `Message`
   e alimentam a **supressão** (não reenviar a hard-bounce/spam/unsub).

## Arquitetura (DDD + Hexagonal — espelha `payments`)

```
src/
├── domain/
│   ├── shared/        # AggregateRoot, DomainEvent, Result/errors (re-export core), Channel
│   ├── template/      # Template (aggregate + errors)
│   ├── message/       # Message (máquina de estados) + status/events/errors
│   ├── sender/        # EmailSender (pool de remetentes)
│   ├── lane/          # WhatsAppInstance (número/lane + estado de ritmo)
│   ├── services/      # render-template (PURO) · pacing (PURO: ritmo anti-ban)
│   └── ports/         # repos + email-/whatsapp-gateway + outbox + webhook-inbox + clock + rng + provider-error
├── application/       # send-message, get-message, list-messages, apply-delivery-status,
│   │                  #   templates/senders/instances (admin) + mappers/*-view
├── infrastructure/
│   ├── config/env     # Zod fail-fast
│   ├── persistence/drizzle/  # schema (7 tabelas), db, repos, migrations
│   ├── gateways/sendgrid/    # gateway (fetch nativo) + webhook (ECDSA, node:crypto)
│   ├── gateways/evolution/   # gateway (fetch nativo, sendText)
│   ├── outbox/ · events/ · workers/send-worker (o coração)
├── interfaces/http/   # server, routes/{send,admin,webhooks,health}, dtos (TypeBox), auth, error-handler, raw-body
├── composition-root.ts (DI; instancia adapters + worker) · index.ts (loadEnv→createApplication→start)
scripts/  templates:seed · evolution:create-instance · webhooks:register · send:test
tests/    unit/ (render, pacing, message, send-worker, sendgrid-webhook) · integration/ (http, webhooks) · fakes/
```

## Comandos (de dentro de `packages/messaging`)

| Comando | O quê |
|---------|-------|
| `bun run dev` / `start` | servidor (watch / produção), porta **3006** |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test` | testes (**sandbox off** — gotcha do monorepo) |
| `bun run db:generate` / `db:migrate` | migrations (Drizzle; cria o schema `messaging`) |
| `bun run templates:seed` | popula templates `welcome` (e-mail + whatsapp) |
| `bun run evolution:create-instance <name> <phone>` | cria instância na Evolution (QR) + registra no banco |
| `bun run webhooks:register <name> <url>` | aponta o webhook da instância p/ o nosso endpoint |
| `bun run send:test <email\|whatsapp> <templateKey> <contato>` | dispara um envio de teste |
| `bun run check` / `check:fix` | Biome |

**Sempre** rode `typecheck` + `bun test` + `check` antes de concluir.

## HTTP

**Envio (S2S, atrás do gateway):**
- `POST /messaging/send` → enfileira e responde **202** `{ messageId, status }`. Body:
  `{ channel, templateKey, recipient:{name,email?,phone?}, variables?, senderId?, scheduledAt?, priority? }`.
  Idempotência por header `Idempotency-Key` (+ `X-Consumer-Id`). Auth: `x-internal-token` (injetado
  pelo gateway; espelha o members). Em e-mail exige remetente (senderId ou default); destinatário
  suprimido → 409.
- `GET /messaging/messages/:id` → status.

**Admin (painel — JWT + RBAC no gateway, `requireAdmin` defesa em profundidade):**
`/messaging/admin/templates` (POST/PATCH/GET/lista), `/messaging/admin/senders` (POST/PATCH/lista),
`/messaging/admin/whatsapp-instances` (POST/PATCH/lista), `GET /messaging/admin/messages` (log).

**Webhooks de status (públicos; o serviço valida):** `POST /messaging/webhooks/sendgrid` (assinatura
**ECDSA**, `SENDGRID_WEBHOOK_PUBLIC_KEY`) e `POST /messaging/webhooks/evolution` (`?token=`,
`MESSAGING_WEBHOOK_TOKEN`). Deduplica por `(provider, providerEventId)` em `webhook_events`.

DTOs em **TypeBox**; erros de domínio → status no `error-handler` (TEMPLATE_NOT_FOUND→404,
TEMPLATE_ALREADY_EXISTS→409, MISSING_TEMPLATE_VARIABLE→400, NO_SENDER_AVAILABLE/NO_WHATSAPP_INSTANCE_AVAILABLE→422,
RECIPIENT_SUPPRESSED→409, CONCURRENCY_CONFLICT/INVALID_STATE_TRANSITION→409, PROVIDER_ERROR→502).

## Integração com o gateway

Rotas em `packages/api-gateway/gateway.config.ts` (serviço `messaging`, `MESSAGING_URL`). `messaging-send`
+ `messaging-message-get`: `auth: hmac` + injeção de `x-internal-token` (`messagingInternalTransforms`,
`MESSAGING_INTERNAL_TOKEN`). `messaging-admin-*`: `jwt` + RBAC (LEITURA staff+; ESCRITA admin+).
`messaging-webhook-{sendgrid,evolution}`: `public` (o serviço valida assinatura/token).

## Convenções

- `verbatimModuleSyntax: true` → `import type`. Imports relativos sem extensão. **Não anote** `: Elysia`
  no retorno das factories de rota. Biome. Sem `any` novo; entradas validadas (Zod/TypeBox).
- **Relógio e aleatoriedade são injetados** (`Clock`/`Rng` em `domain/ports`) — o domínio/worker NUNCA
  chamam `new Date()`/`Math.random()` direto (testes determinísticos do ritmo/agendamento).
- Concorrência otimista: `version` + `UPDATE … WHERE version = ?` → 0 linhas = `ConcurrencyConflictError`.
- Provedores via **`fetch` nativo** (sem SDK) → evita risco de SDK sob Bun + zero deps extras.

## Banco (schema `messaging`)

1 Postgres compartilhado (`sistemazero`, Docker **5433**), schema próprio (`pgSchema('messaging')` +
`schemaFilter:['messaging']`). Tabelas: `message_templates`, `email_senders`, `whatsapp_instances`,
`messages`, `webhook_events` (dedupe), `suppressions`, `outbox`. **Journal próprio**
(`migrations: { table: 'messaging_migrations' }`) — NÃO compartilhe `__drizzle_migrations`. A 1ª
migration faz `CREATE SCHEMA "messaging"`. Índices de claim do worker em `messages(channel,status,
scheduled_at,next_attempt_at)` e seleção de lane em `whatsapp_instances(enabled,status,next_available_at)`.

## Ritmo anti-ban (env — `domain/services/pacing.ts`)

`WA_MIN_DELAY_MS`(15s)/`WA_MAX_DELAY_MS`(45s) entre mensagens · `WA_REST_AFTER_N`(50) +
`WA_REST_DURATION_MS`(10min) descanso · `WA_DEFAULT_DAILY_CAP` (no agregado, default 200) ·
`WA_WARMUP_DAYS`(10)/`WA_WARMUP_START_CAP`(20) · `WA_LANE_LEASE_MS` (reserva da lane no envio) ·
`EMAIL_RATE_PER_SEC`(5) throttle de e-mail · `SEND_RETRY_BASE_MS`/`SEND_RETRY_MAX_MS` (backoff). A
**rotação entre números** sai do worker: ele puxa a próxima mensagem para qualquer lane livre, então a
carga se distribui e os envios ficam escalonados (cada lane com seu próprio `next_available_at`).

## Pontos em aberto (futuro)

- **Integração com a compra** (funil → `POST /messaging/send` boas-vindas + acesso no `payment.paid`):
  resolver as **credenciais** (hoje a senha temp é gerada e descartada no funil → ideal: o `auth`
  emitir um **link de definir senha / magic-link**).
- UI no painel `@sistemazero/admin` (templates/remetentes/números/log de mensagens).
- Quiet hours por timezone, automação de aquecimento, métricas `/metrics` (lag de fila), rotação de
  remetentes de e-mail por reputação.
- Anti-replay forte do webhook (hoje dedupe por `providerEventId`; status sem id usa `keyId:status`).

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde (sandbox off) · `bun run check` limpo.
- [ ] Mudou schema? Gerou a migration (`db:generate`) e commitou.
- [ ] Mudou contrato de rota/config/modelo? Atualizou este `CLAUDE.md` (e o do gateway, se a rota mudou).

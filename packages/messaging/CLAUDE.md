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

> Estado: **fatia standalone completa e testada** (86 testes) + **1º full review implementado**
> (06/2026): reaper de SENDING, token bucket de e-mail, dedupe de webhook pós-aplicação,
> fail-closed em prod, soft bounce não suprime, normalização de endereço, default atômico,
> /readyz + bind `::`. Enfileira → worker envia com ritmo → webhooks de status atualizam a entrega.

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
   (anti-injeção); WhatsApp é texto puro. Sem engine que execute código. O CONTEÚDO padrão é
   versionado em `scripts/seed-templates.ts` (seed = upsert): e-mails com layout da marca
   (600px, card branco, CTA gradiente cyan→lime `#42e5e0→#bfea00`, paleta hex ≈ tokens oklch do
   community) e logo PNG hospedada (`EMAIL_LOGO_URL`). Variáveis são CONTRATO com os
   consumidores — `welcome`/`password-reset`: `nome`+`link` (funil/auth); `otp`: `nome`+`codigo`
   (auth); `nfse-emitida`: `nome`+`produto`+`valor`+`chave` (fiscal — DANFSe anexado por URL).
   NÃO renomeie sem mudar os chamadores.
4. **Outbox + worker + webhooks de status** (espelha o `payments`): enfileira em `QUEUED`, o worker
   envia respeitando o ritmo, e os webhooks (`delivered`/`read`/`bounce`/`spam`) atualizam a `Message`
   e alimentam a **supressão** (não reenviar a hard-bounce/spam/unsub). ⚠️ `bounce` com
   `type: 'blocked'` é SOFT (caixa cheia/greylisting) → **NÃO suprime** (suprimir baniria cliente
   pagante p/ sempre); só `type: 'bounce'` (hard) e `dropped` suprimem. **Endereços são
   NORMALIZADOS** (`domain/services/address.ts`: e-mail minúsculo, fone só dígitos) na criação da
   Message E nos repositórios de supressão — igualdade não pode depender do formato do consumidor.
5. **Claim com LEASE + reaper** (`SEND_CLAIM_LEASE_MS`, 10min): o claim marca SENDING com
   `next_attempt_at = now + lease`; mensagem presa em SENDING (crash/erro entre claim e update)
   volta a ser elegível quando o lease vence (re-claim incrementa `attempts`; worker falha o claim
   zumbi quando `attempts >= maxAttempts`). Erro num item do lote NÃO derruba os demais (try/catch
   por mensagem). **E-mail usa token bucket** (taxa `EMAIL_RATE_PER_SEC` sustentada por relógio,
   rajada = `taxa × intervalo`) — limite "por tick" furava a taxa quando o LISTEN/NOTIFY disparava
   ticks back-to-back.
6. **Dedupe de webhook é pós-aplicação**: `alreadyReceived` (gate de leitura) na entrada →
   aplica (com retry em `ConcurrencyConflictError`: recarrega e re-aplica) → `markReceived` por
   ÚLTIMO. Marcar antes "consumia" o evento numa falha no meio (a reentrega caía no dedupe e o
   status se perdia). Anti-replay do SendGrid: timestamp assinado conferido contra
   `WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS` (600s).
7. **Anexos por URL (e-mail)**: o body do `/messaging/send` tem teto de 64KB → os bytes NUNCA
   viajam inline nem são persistidos. `SendBody.attachments` (máx. 3: `{filename,url,contentType?}`,
   url http(s)) guarda SÓ os METADADOS na coluna jsonb `messages.attachments` (migration `0003`);
   o **worker** busca cada URL no momento do envio (`HttpAttachmentFetcher`: fetch nativo +
   `AbortSignal.timeout(15s)`, `redirect: 'error'` — seguir redirect driblaria a allowlist) e
   injeta o base64 no gateway (`disposition: 'attachment'`, COEXISTE com as logos inline `cid:`).
   Política de erro: timeout/rede/4xx/5xx/tamanho = falha **RE-TENTÁVEL** (mesmo retry/backoff de
   um erro do SendGrid — o anexo pode ainda não estar disponível); URL inválida/host fora da
   allowlist = **PERMANENTE** (FAILED). Envs: `ATTACHMENT_MAX_BYTES` (teto por anexo, default 5MB —
   confere content-length E o tamanho real lido em streaming) e `ATTACHMENT_FETCH_ALLOWED_HOSTS`
   (CSV de hostnames, anti-SSRF; VAZIA = dev liberado; **em prod SETE** — ex.:
   `fiscal.railway.internal`). Anexo só no canal e-mail (domínio rejeita em whatsapp).
   Consumidor: serviço fiscal envia o template `nfse-emitida` com o DANFSe (PDF) por URL.

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
| `bun run templates:seed` | **UPSERT** dos templates padrão: `welcome` (e-mail + whatsapp), `password-reset` (e-mail), `otp` (e-mail + whatsapp — `{{codigo}}`) e `nfse-emitida` (e-mail — `{{nome}}/{{produto}}/{{valor}}/{{chave}}`, NFS-e anexada em PDF via anexos por URL). É a fonte da verdade versionada do conteúdo — key existente tem subject/body/variables ATUALIZADOS (`active` preservado). E-mails têm layout HTML da marca (tabelas + CSS inline) com **logos EMBUTIDAS** (attachment inline + `cid:`, padrão do comunidade-sistema-zero — a imagem viaja DENTRO do e-mail; sem hospedagem externa/proxy/R2; PNGs PURAS em `assets/logo-sistema-zero-{light,dark}.png`, injetadas no gateway pelo composition-root, anexadas só quando o HTML referencia o `cid:`) e **dark mode** via `@media (prefers-color-scheme: dark)` com o tema dark do community + swap da logo (Apple Mail/Samsung/Outlook iOS; o Gmail que inverte à força mantém a logo de tinta escura — limitação aceita). ⚠️ NUNCA apague asset remoto referenciado por e-mail JÁ ENVIADO (aprendido na marra) |
| `bun run evolution:create-instance <name> <phone>` | cria instância na Evolution (QR) + registra no banco |
| `bun run webhooks:register <name> <url>` | aponta o webhook da instância p/ o nosso endpoint |
| `bun run send:test <email\|whatsapp> <templateKey> <contato>` | dispara um envio de teste |
| `bun run check` / `check:fix` | Biome |

**Sempre** rode `typecheck` + `bun test` + `check` antes de concluir.

## HTTP

**Envio (S2S, atrás do gateway):**
- `POST /messaging/send` → enfileira e responde **202** `{ messageId, status }`. Body:
  `{ channel, templateKey, recipient:{name,email?,phone?}, variables?, attachments?, senderId?, scheduledAt?, priority? }`
  (`attachments`: máx. 3 `{filename,url,contentType?}` — anexos por URL, só e-mail; ver decisão 7).
  Idempotência por header `Idempotency-Key` + `X-Consumer-Id` — ⚠️ o `x-consumer-id` que chega aqui
  é **injetado pelo GATEWAY a partir do principal HMAC autenticado** (o do cliente é stripado como
  credencial de borda; sem essa injeção a idempotência ficava morta em prod). Corrida
  check-then-insert coberta: 23505 na unique → devolve a mensagem existente (202, nunca 500).
  Auth: `x-internal-token` (injetado pelo gateway; espelha o members). Em e-mail exige remetente
  (senderId ou default); destinatário suprimido → 409.
- `GET /messaging/messages/:id` → status (`:id` validado como uuid → 400; inexistente → 404).

**Admin (painel — JWT + RBAC no gateway; defesa em profundidade FAIL-CLOSED: role E status
PRESENTES e `active` — header ausente = não veio do gateway → 401; distinção leitura/escrita:
staff+ lê, admin+ escreve; e o gateway injeta o **`x-internal-token` TAMBÉM no admin** — prova de
que os X-Auth-User-* vieram dele, igual members/catalog):**
`/messaging/admin/templates` (POST/PATCH/GET/lista), `/messaging/admin/senders` (POST/PATCH/lista —
promoção de default é ATÔMICA: `clearOtherDefaults` na mesma transação), `/messaging/admin/whatsapp-instances`
(POST/PATCH/lista), `GET /messaging/admin/messages` (log). Params `:id` validados como uuid.

**Health/observabilidade:** `/health` (liveness, sempre 200), `/readyz` (readiness = banco
respondendo — healthcheck do deploy) e **`GET /metrics`** (backlog/lag: outbox pending/dead + idade,
due/sending + idade do mais antigo POR CANAL — alerte na IDADE, pega worker morto; token
`METRICS_TOKEN` via `x-metrics-token`/Bearer, OBRIGATÓRIO em prod). **Access log** (`http.access`):
1 linha/request com o `X-Request-Id` do gateway; pula health/readyz/metrics. **Sentry** (`SENTRY_DSN`,
ausente = no-op): espelho de logs ERROR→evento + captureException no error-handler/process handlers
(espelha o payments). Bind dual-stack `::` via `HOST` (private networking do Railway é IPv6).

**Teto de corpo POR ROTA:** 64KB geral (`MAX_REQUEST_BODY_BYTES`) e **2MB nas rotas de webhook**
(`WEBHOOK_MAX_BODY_BYTES`) — a SendGrid posta eventos em LOTES de até 768KB; com 64KB o lote levaria
413 em loop e os status se perderiam. O check de oversize roda no `onTransform` (ANTES da validação
de schema — senão viraria 400 em vez de 413).

**Retenção:** ciclo periódico (advisory lock, 1 réplica por vez) limpa outbox/webhook_events
(`RETENTION_DAYS`, 30d) e **mensagens TERMINAIS** (`MESSAGES_RETENTION_DAYS`, 90d — o
`rendered_body` de ~6KB/linha cresceria p/ sempre; QUEUED/SCHEDULED/SENDING nunca são tocadas).
O `update()` de mensagem grava SÓ campos mutáveis (não regrava o rendered_body a cada transição).

**Webhooks de status (públicos; o serviço valida):** `POST /messaging/webhooks/sendgrid` (assinatura
**ECDSA**, `SENDGRID_WEBHOOK_PUBLIC_KEY` + janela de timestamp `WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS`)
e `POST /messaging/webhooks/evolution` (`?token=`, `MESSAGING_WEBHOOK_TOKEN`, comparação
timing-safe). Deduplica por `(provider, providerEventId)` em `webhook_events` — gate de leitura na
entrada, marca DEPOIS de aplicar. `connection.update` NÃO sobrescreve `PAUSED`/`BANNED` (decisão do
admin prevalece sobre reconexão da Evolution).

**Fail-closed em produção (refines no `env.ts`):** `MESSAGING_INTERNAL_TOKEN`,
`MESSAGING_WEBHOOK_TOKEN`, `METRICS_TOKEN` (≥16) e `REQUIRE_ADMIN=true` são OBRIGATÓRIOS;
`SENDGRID_WEBHOOK_PUBLIC_KEY` obrigatória quando `SENDGRID_API_KEY` está setada;
`EVOLUTION_URL`⟺`EVOLUTION_API_KEY` andam em par (qualquer ambiente).

## Deploy (Railway)

`packages/messaging/Dockerfile` (contexto = raiz do monorepo; os `assets/` das logos cid VÊM no
COPY) + `packages/messaging/railway.json` (preDeploy `db:migrate`, healthcheck `/readyz`,
watchPatterns messaging/core/lockfile). Serviço **PRIVADO** (sem domínio — topologia do projeto:
público = só gateway/payments/evolution-QR). Envs: `DATABASE_URL=${{Postgres.DATABASE_URL}}`,
tokens (`MESSAGING_INTERNAL_TOKEN` = o MESMO do gateway, `MESSAGING_WEBHOOK_TOKEN`,
`METRICS_TOKEN`, `SENTRY_DSN`), `SENDGRID_API_KEY`+`SENDGRID_WEBHOOK_PUBLIC_KEY`,
`EVOLUTION_URL=http://evolution-api.railway.internal:8080`+`EVOLUTION_API_KEY` (ler do serviço
evolution-api). Pós-deploy: seed de templates + remetente default via **`railway ssh`** (o Postgres
de prod é privado — `railway run` local não alcança). Webhook da Evolution usa a URL INTERNA
(`http://messaging.railway.internal:3006/...`); o Event Webhook da SendGrid só quando o GATEWAY
(público) subir — até lá e-mails saem mas bounce não suprime.

DTOs em **TypeBox**; erros de domínio → status no `error-handler` (TEMPLATE_NOT_FOUND→404,
TEMPLATE_ALREADY_EXISTS→409, MISSING_TEMPLATE_VARIABLE→400, NO_SENDER_AVAILABLE/NO_WHATSAPP_INSTANCE_AVAILABLE→422,
RECIPIENT_SUPPRESSED→409, CONCURRENCY_CONFLICT/INVALID_STATE_TRANSITION→409, PROVIDER_ERROR→502).

## Evolution API (infra do WhatsApp)

- **Dev:** `docker compose up -d` em `docker/evolution/` (imagem `evoapicloud/evolution-api:v2.3.7` —
  a org `atendai` parou no v2.2.x; porta 8080; Manager UI em `http://localhost:8080/manager`, login =
  `AUTHENTICATION_API_KEY` do `.env` da pasta, gitignored — copie do `.env.example`). Usa o MESMO
  Postgres do monorepo (`host.docker.internal:5433/sistemazero`) com **schema separado `evolution`**
  (o Prisma da Evolution cria/migra sozinho — NÃO gerencie por aqui). No `.env` do messaging:
  `EVOLUTION_URL=http://localhost:8080` + `EVOLUTION_API_KEY` (a MESMA chave).
- **Prod (Railway, projeto `sistema-zero`):** serviço **`evolution-api`** (mesma imagem), domínio
  `https://evolution-api-production-dd85.up.railway.app`, volume em `/evolution/instances`, banco =
  Postgres compartilhado via `${{Postgres.DATABASE_URL}}?schema=evolution`, cache local (sem Redis —
  1 réplica). Chave de prod SÓ no Railway (`railway variables --kv`, serviço evolution-api). Quando o
  messaging subir em prod: `EVOLUTION_URL=http://evolution-api.railway.internal:8080` (private networking).
- **Parear um número (1x por número/ambiente):** `bun run evolution:create-instance <nome> <fone>` →
  escanear o QR com o WhatsApp do chip (ou parear pelo Manager UI). A instância nasce `DISCONNECTED`
  + aquecimento; vira `CONNECTED` pelo webhook `connection.update` (registre:
  `bun run webhooks:register <nome> "<url-do-messaging>/messaging/webhooks/evolution?token=<MESSAGING_WEBHOOK_TOKEN>"`)
  ou manualmente via `PATCH /messaging/admin/whatsapp-instances/:id {status:"CONNECTED"}` (dev sem URL pública).

## Integração com o gateway

Rotas em `packages/api-gateway/gateway.config.ts` (serviço `messaging`, `MESSAGING_URL`). `messaging-send`
+ `messaging-message-get`: `auth: hmac` + injeção de `x-internal-token` (`messagingInternalTransforms`,
`MESSAGING_INTERNAL_TOKEN`) + **`x-consumer-id` re-injetado pelo gateway com o principal HMAC
autenticado** (o header do cliente é stripado como credencial de borda; a re-injeção é o que faz a
idempotência por consumidor funcionar — request-transform.stage do gateway). `messaging-admin-*`:
`jwt` + RBAC (LEITURA staff+; ESCRITA admin+) **+ `messagingInternalTransforms`** (o serviço exige o
token também no admin). `messaging-webhook-{sendgrid,evolution}`: `public` (o serviço valida
assinatura/token; aceita o token também via header `x-webhook-token`).

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
migration faz `CREATE SCHEMA "messaging"`; a `0001` dropa a coluna `weight`; a `0002` troca o índice
de claim por `messages_claim_idx (channel, status, priority DESC, scheduled_at)` (serve o ORDER BY —
sem ele, pico de fila = sort do backlog inteiro por tick) + `messages_created_at_idx` (listagem do
admin); a `0003` adiciona `messages.attachments` (jsonb, default `[]` — SÓ metadados de anexo por
URL). Seleção de lane em `whatsapp_instances(enabled,status,next_available_at)`.
Escritas do worker na lane (`reserve`/`applyLanePacing`/`delayLane`) fazem **bump de `version`** —
um PATCH admin concorrente conflita (409) em vez de regravar contadores de ritmo velhos por cima.
Retenção (outbox/webhook_events) gateada por **advisory lock** (`pg_try_advisory_xact_lock`, chave
própria do messaging — só UMA réplica limpa por ciclo).

## Ritmo anti-ban (env — `domain/services/pacing.ts`)

`WA_MIN_DELAY_MS`(15s)/`WA_MAX_DELAY_MS`(45s) entre mensagens · `WA_REST_AFTER_N`(50) +
`WA_REST_DURATION_MS`(10min) descanso · `WA_DEFAULT_DAILY_CAP` (no agregado, default 200) ·
`WA_WARMUP_DAYS`(10)/`WA_WARMUP_START_CAP`(20) · `WA_LANE_LEASE_MS` (reserva da lane no envio) ·
`SEND_CLAIM_LEASE_MS`(10min — lease/reaper do claim de MENSAGEM) · `EMAIL_RATE_PER_SEC`(5) token
bucket de e-mail (taxa sustentada; rajada = taxa × `SEND_POLL_INTERVAL_MS`; por réplica) ·
`SEND_RETRY_BASE_MS`/`SEND_RETRY_MAX_MS` (backoff). A **rotação entre números** sai do worker: ele
puxa a próxima mensagem para qualquer lane livre, então a carga se distribui e os envios ficam
escalonados (cada lane com seu próprio `next_available_at`).

## Pontos em aberto (futuro)

- ~~Integração com a compra~~ **FEITA (jun/2026):** o funil envia o `welcome` no `payment.paid`
  pelos **dois canais** (e-mail + WhatsApp; chaves de idempotência POR canal — `welcome-<leadId>` /
  `welcome-wa-<leadId>`; o funil prefixa o DDI 55 no telefone BR) com o link de **definir senha**
  (o `auth` emite o token via `POST /auth/internal/password-tokens`;
  link aponta p/ o app `@sistemazero/community` `/redefinir-senha?token=...`). O `auth` também envia
  o `password-reset` (reset por link) e o **`otp`** (login passwordless + recuperação de senha por
  código — variáveis `nome`/`codigo`). Tudo chega aqui via gateway (HMAC consumers
  `funnel`/`auth` + `x-internal-token`). **Falta p/ e-mails saírem de fato:** `SENDGRID_API_KEY`
  real + remetente default cadastrado (`POST /messaging/admin/senders`).
- UI no painel `@sistemazero/admin` (templates/remetentes/números/log de mensagens).
- Quiet hours por timezone, automação de aquecimento, métricas `/metrics` (lag de fila), rotação de
  remetentes de e-mail por reputação.
- ~~Anti-replay forte do webhook~~ **FEITO no 1º full review (06/2026):** janela de timestamp
  assinado no SendGrid + dedupe pós-aplicação. Resíduo: Evolution não tem assinatura (só `?token=`).

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde (sandbox off) · `bun run check` limpo.
- [ ] Mudou schema? Gerou a migration (`db:generate`) e commitou.
- [ ] Mudou contrato de rota/config/modelo? Atualizou este `CLAUDE.md` (e o do gateway, se a rota mudou).

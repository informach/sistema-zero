# CLAUDE.md — @sistemazero/payments

Guia operacional para trabalhar neste package. Leia antes de editar.

## O que é

Microserviço de **pagamentos/checkout** consumido por outros sistemas internos
(apenas IPs/URLs autorizados). Processa **Pix, boleto e cartão** (avulso e
recorrente) via **Efí Pay**. Runtime: **Bun**. Linguagem: **TypeScript (ESM)**.

> Estado atual: scaffold completo + **fatia vertical de Pix funcionando ponta a
> ponta** (criar cobrança → webhook → evento `payment.paid`), validada criando
> uma cobrança real no sandbox (txid + copia-e-cola + QR). Boleto, cartão e
> recorrência têm os _ports_ prontos; faltam os _adapters_.

## Arquitetura (DDD + Hexagonal)

Regra de dependência aponta **sempre para dentro**. O domínio não conhece
Elysia, Drizzle nem a Efí.

```
src/
├── domain/          # núcleo puro (SEM framework)
│   ├── shared/         # AggregateRoot, Entity, ValueObject, DomainEvent, Result, DomainError
│   ├── value-objects/  # money, document (CPF/CNPJ), customer, idempotency-key, payment-method
│   ├── payment/        # payment.aggregate (máquina de estados) + status/events/errors
│   ├── subscription/   # SKELETON de recorrência
│   └── ports/          # interfaces: payment-gateway, *-repository, outbox, idempotency-store, webhook-inbox
├── application/     # casos de uso: process-payment, get-payment, handle-provider-webhook
│   ├── event-handlers/ · mappers/payment-view
├── infrastructure/  # adapters (implementam os ports)
│   ├── config/env      # validação de env com Zod (fail-fast no boot)
│   ├── security/       # hmac, hash, ip (CIDR)
│   ├── persistence/drizzle/  # schema, db, repositórios, migrations
│   ├── gateways/efi/   # certificate, efi.client (nativo!), efi.gateway, efi.mapper, efi.errors
│   ├── events/ · outbox/ · logging/
├── interfaces/http/ # Elysia: server, routes/, auth, error-handler, raw-body, dtos
├── composition-root.ts  # injeção de dependências (ÚNICO lugar que instancia adapters)
└── index.ts             # entrypoint (loadEnv → createApplication → start)
scripts/             # ferramentas de operação (ver "Scripts")
tests/               # unit/ · application/ · integration/ · fakes/
```

## Comandos (rode de dentro de `packages/payments`)

| Comando | O quê |
|---------|-------|
| `bun run dev` | sobe o servidor com watch |
| `bun run start` | sobe o servidor |
| `bun run typecheck` | `tsc --noEmit` (cobre `src`, `tests`, `scripts`) |
| `bun test` | testes (unit + app com fakes + integração via `app.handle`) |
| `bun run db:generate` | gera migration SQL a partir do `schema.ts` |
| `bun run db:migrate` | aplica migrations |
| `bun run db:seed --id <id> --cidrs "ip/32,..." [--webhook-url <url>]` | cadastra/atualiza um consumidor (imprime o HMAC secret); `--webhook-url` define o destino dos webhooks de saída |
| `bun run pix:key` | cria/lista chave Pix aleatória (EVP) na Efí |
| `bun run webhook:register --url https://<dominio>/webhooks/efi` | registra o webhook (skip mTLS por padrão) |
| `bun run call-example` | cliente de teste: assina (HMAC) e dispara `POST /payments` |

**Sempre** rode `bun run typecheck` e `bun test` antes de concluir uma mudança.

## ⚠️ Armadilhas (leia com atenção)

1. **Efí + Bun = NÃO use o SDK oficial.** O `sdk-node-apis-efi` faz mTLS com o
   `.p12` (pfx) num `https.Agent`, que o Bun não suporta → `ECONNRESET` em toda
   chamada. Usamos um **cliente nativo** (`infrastructure/gateways/efi/efi.client.ts`)
   com `fetch` + `tls: { cert, key }` (PEM). O `.p12` é convertido em PEM na
   memória no boot por `node-forge` (`certificate.ts`). **Não reintroduza o SDK.**

2. **Corpo bruto (raw body) é sagrado.** A assinatura HMAC e o hash de
   idempotência usam o texto EXATO do corpo. Ele é capturado no `onParse`
   (`server.ts`) num `WeakMap` (`raw-body.ts`) e lido via `getRawBody`. Não
   troque o parser nem reserialize o corpo.

3. **Transactional outbox.** `DrizzlePaymentRepository.save` grava o agregado **e**
   os eventos de domínio no `outbox` na MESMA transação. Não emita eventos por
   fora. O `OutboxPoller` publica depois (entrega ≥1 vez → handlers idempotentes).
   O `processPending` usa `FOR UPDATE SKIP LOCKED` → **seguro com várias réplicas**
   (não publica em dobro). Mantenha a publicação rápida (in-process) — entregas
   lentas (HTTP) vão para a fila `webhook_deliveries`, não para dentro do outbox.

4. **Nunca confie no webhook.** `HandleProviderWebhookService` **re-consulta a
   cobrança na Efí** (`getPixCharge`) antes de marcar como pago, confere o **valor**
   contra o cobrado, e deduplica via `webhook_events` (o token só é consumido em
   `markProcessed` → falha no meio NÃO descarta a reentrega). Cada item é isolado
   (try/catch por item). O endpoint não tem auth de consumidor (vem da Efí); se
   `EFI_WEBHOOK_SECRET` estiver definido, exige `?token=<segredo>` (defesa extra).

5. **Idempotência (escopada por consumidor).** `POST /payments` reserva a
   `(consumerId, Idempotency-Key)` antes de trabalhar; libera em falha; conclui em
   sucesso (cacheando a resposta). Mesma chave + payload diferente → 409. Reservas
   `IN_FLIGHT` presas (crash) expiram por um TTL curto e são recicladas. A chave é
   **por consumidor** → dois consumidores podem usar o mesmo valor sem colidir.

8. **Cobrança Pix é idempotente no provedor.** Criamos via `PUT /v2/cob/{txid}`
   com `txid` **determinístico** (derivado do `paymentId`), não `POST /v2/cob`
   (txid gerado pela Efí). Assim, retry/reprocessamento do MESMO pagamento aponta
   para a MESMA cobrança — não duplica. O cliente Efí também só repete (retry)
   chamadas idempotentes (GET/PUT/token), nunca POST que cria recurso.

9. **Concorrência otimista.** `payments.version` + `save` com `UPDATE ... WHERE
   version = ?` evita lost-update e eventos duplicados quando dois writers
   (reconciliação × webhook, ou réplicas) tocam o mesmo pagamento. Conflito →
   `ConcurrencyConflictError` (o worker/handler trata como "o outro venceu").

6. **PCI.** Nunca persista o PAN do cartão — só `token` + `last4` + bandeira.

7. **Certificados são segredo.** `certs/`, `secrets/`, `*.p12`, `*.pem` estão no
   `.gitignore`/`.dockerignore`. Não commite. No Railway o cert vai em
   `EFI_CERTIFICATE_BASE64` (base64 do `.p12`).

## Escala, modos e workers

**Dois modos de criação de cobrança** (`ASYNC_CHARGE_CREATION`):
- **Síncrono (padrão):** `POST /payments` chama a Efí na request e responde **201**
  com o QR. Bom para tráfego normal.
- **Assíncrono (opt-in, para picos/lançamento):** responde **202** sem chamar a
  Efí; o `ChargeCreationWorker` cria a cobrança depois, em lotes (rate-limited),
  **suavizando o burst** contra o rate limit da Efí. O cliente consulta
  `GET /payments/:id` até o `pix` aparecer. O controller escolhe 201 vs 202 pela
  presença de `view.pix`.

**Workers** (em `infrastructure/workers/`, iniciados no `composition-root`):
- `OutboxPoller` — publica eventos de domínio (SKIP LOCKED). Acordado na hora por
  `LISTEN/NOTIFY` (canal `payments_outbox`, disparado no `save` dentro da MESMA
  transação); o intervalo de poll é só a rede de segurança. Idem o
  `WebhookDeliveryWorker` (canal `payments_webhook_deliveries`). Desligável via
  `PG_LISTEN_ENABLED=false` (ex.: atrás de PgBouncer transaction pooling).
- `ChargeCreationWorker` — só roda se `ASYNC_CHARGE_CREATION=true`; claim via SKIP
  LOCKED (colunas `charge_attempts`/`charge_claimed_at`); processa o lote com
  concorrência `CHARGE_WORKER_CONCURRENCY`; claims presos voltam à fila após
  `CHARGE_CLAIM_STALE_MS` (lease); após `CHARGE_MAX_ATTEMPTS` → FAILED.
  Vazão ≈ `concorrência / latência_da_Efí` por réplica — escale réplicas p/ mais.
- `ReconciliationWorker` — varre PENDING com cobrança e **re-consulta a Efí**
  (rede de segurança p/ webhooks perdidos). `markPaid` é idempotente.
- `WebhookDeliveryWorker` — entrega os webhooks de saída (`webhook_deliveries`)
  aos consumidores, assinados (HMAC), com retry/backoff; **at-least-once** (o
  consumidor deve deduplicar). Fila alimentada por `registerPaymentEventHandlers`
  em `payment.paid`/`payment.failed` (precisa de `consumers.webhook_url`).

**Outros:** rate limit por consumidor (`RATE_LIMIT_PER_MINUTE` → 429 + `Retry-After`,
em memória/por instância — troque por Redis p/ limite global); limpeza de
idempotência em job periódico (fora do hot path); pool do Postgres em
`DATABASE_POOL_MAX`; `GET /metrics` expõe lag (outbox/charge/deliveries).

**Escala horizontal:** stateless → várias réplicas OK. Os pollers/claims usam
`FOR UPDATE SKIP LOCKED`, então rodar em N instâncias é seguro. Cuidado com
`max_connections` do Postgres (use pooler). O teto de throughput é a **API da Efí**
— por isso o modo assíncrono + retry/backoff existem.

## Convenções de código

- **`verbatimModuleSyntax: true`** → use `import type` para imports só-de-tipo.
- Imports relativos **sem extensão**; `strict` + `noUncheckedIndexedAccess` ligados.
- **Não anote** o retorno das factories de rota Elysia como `: Elysia` — deixe
  inferir (o tipo carrega o prefixo/rotas e quebra se anotado). Ver `routes/*`.
- Nomes de arquivo em kebab-case com sufixo de papel: `.aggregate.ts`,
  `.port.ts`, `.repository.ts`, `.service.ts`, `.routes.ts`.
- Erros de domínio estendem `DomainError` (têm `code`); o mapeamento para status
  HTTP fica centralizado em `interfaces/http/error-handler.ts`.

## Autenticação service-to-service

Consumidor cadastrado em `consumers` (`id`, `hmac_secret`, `allowed_cidrs`,
`is_active`). Cada requisição protegida precisa de:
- IP de origem dentro de um CIDR permitido (`TRUST_PROXY=true` atrás de proxy →
  usa `X-Forwarded-For`);
- `X-Consumer-Id`;
- `X-Signature: t=<unix_ts>,v1=<hmac_sha256_hex>` onde a mensagem assinada é
  `"<ts>.<idempotencyKey>.<corpo_bruto>"` quando há `Idempotency-Key` (POST), ou
  `"<ts>.<corpo_bruto>"` sem ela (GET). Incluir a chave na assinatura impede
  replay com troca de `Idempotency-Key`. Tolerância de timestamp anti-replay.

## Como estender (boleto / cartão / recorrência)

1. Adicione o método ao port `PaymentGateway` e implemente em `EfiClient` +
   `EfiPaymentGateway`.
2. `ProcessPaymentService.buildMethod` já cria os `PaymentMethod`; hoje ele lança
   `UnsupportedPaymentMethodError` para não-PIX — habilite o novo método lá.
3. Reaproveite agregado/outbox/idempotência. Adicione testes em `tests/`.

## Dev local

- Postgres via Docker na **porta 5433** (a 5432 costuma estar ocupada por outro
  projeto). `.env`: `DATABASE_URL=...localhost:5433/payments`.
- Variáveis: copie de `.env.example`. `EFI_SANDBOX=true` para homologação.
- Teste sandbox: cobranças de **R$0,01 a R$10,00** são as usadas em homologação.
- O webhook precisa de URL pública (Efí não alcança `localhost`) → teste após o
  deploy ou via túnel.

## Deploy (Railway)

`Dockerfile` (oven/bun) + `railway.json` na raiz do repo (builder DOCKERFILE,
`preDeployCommand = db:migrate`). Variáveis chave: `DATABASE_URL`,
`TRUST_PROXY=true`, `EFI_*` e `EFI_CERTIFICATE_BASE64`. Detalhes no `README.md`.

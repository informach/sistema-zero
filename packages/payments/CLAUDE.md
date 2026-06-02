# CLAUDE.md — @sistemazero/payments

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Elysia, Drizzle, Zod, jose,
> Bun, SDKs de pagamento, etc.) — não confie só na memória; APIs mudam. Para **pesquisa, exploração e
> entender padrões**, use o **MCP do Octocode** em repositórios GitHub relevantes. Faça certo e
> atualizado — não "de cabeça".
>
> **💳 Efí Pay (provedor de pagamentos):** SEMPRE consulte também a documentação oficial ATUALIZADA da
> Efí antes de mexer em qualquer integração (Pix/boleto/cartão/assinaturas/credenciais/webhooks):
> **https://dev.efipay.com.br/docs/api-pix/credenciais/** (e as seções relacionadas da mesma doc).

Guia operacional para trabalhar neste package. Leia antes de editar.

## O que é

Microserviço de **pagamentos/checkout** consumido por outros sistemas internos
(apenas IPs/URLs autorizados). Processa **Pix, boleto e cartão** (avulso e
recorrente) via **Efí Pay**. Runtime: **Bun**. Linguagem: **TypeScript (ESM)**.

> Estado atual: **Pix e boleto** funcionando ponta a ponta (criar cobrança →
> webhook/notificação → evento `payment.paid`), validados com cobrança real no
> sandbox. **Cartão** (avulso) e **assinaturas de cartão** (recorrência via
> Cobranças Efí) também implementados — domínio + aplicação + rotas
> (`POST/GET/DELETE /subscriptions`); as assinaturas ainda **não** foram
> verificadas em sandbox (exigem `payment_token` de browser). **Pix Automático**
> (recorrência Pix nativa) é o próximo passo.

## Arquitetura (DDD + Hexagonal)

Regra de dependência aponta **sempre para dentro**. O domínio não conhece
Elysia, Drizzle nem a Efí.

```
src/
├── domain/          # núcleo puro (SEM framework)
│   ├── shared/         # AggregateRoot, Entity, ValueObject, DomainEvent, Result, DomainError
│   ├── value-objects/  # money, document (CPF/CNPJ), customer, idempotency-key, payment-method
│   ├── payment/        # payment.aggregate (máquina de estados) + status/events/errors
│   ├── subscription/   # subscription.aggregate (recorrência via cartão) + status/events/errors
│   └── ports/          # interfaces: payment-gateway, *-repository, subscription-plan-registry, outbox, idempotency-store, webhook-inbox
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
| `bun run boleto:create` | cria uma cobrança de boleto no sandbox (teste) |
| `bun run card:create --token <payment_token>` | cria uma cobrança de cartão avulso no sandbox (teste) |
| `bun run subscription:create --token <payment_token> [--detail] [--cancel]` | cria/consulta/cancela uma assinatura de cartão (sandbox) |
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
   `markProcessed` → falha no meio NÃO descarta a reentrega). **Mismatch de valor**
   é determinístico → consome o dedupe (`markProcessed`) p/ não reprocessar a cada
   reentrega; loga ERROR (alertável) e o pagamento fica PENDING (revisão manual). No
   **boleto** o valor conferido é o **principal** (`parseDetailCharge` lê os itens/`value`,
   NÃO o `total`, que num boleto pago em atraso inclui multa/juros). Cada item é isolado
   (try/catch por item). O endpoint não tem auth de consumidor (vem da Efí); se
   `EFI_WEBHOOK_SECRET` estiver definido, exige `?token=<segredo>` (defesa extra).

5. **Idempotência (escopada por consumidor, com _fencing_).** `POST /payments`
   reserva a `(consumerId, Idempotency-Key)` antes de trabalhar e só **libera na
   falha SE nenhum efeito colateral ocorreu** (cobrança no provedor / persistência);
   caso contrário deixa `IN_FLIGHT` para o TTL reciclar — senão um retry geraria novo
   `paymentId`/`txid` e **cobraria de novo** (vale p/ Pix também, não só boleto).
   Conclui em sucesso (cacheando a resposta). Mesma chave + payload diferente → 409.
   `reserve` retorna `ReserveResult` (`{kind:'acquired',reservationId}` |
   `{kind:'existing',record}`); `complete`/`release` **exigem o `reservationId`** +
   `state='IN_FLIGHT'` → uma request zumbi (reserva já reciclada por outra) **não
   sobrescreve/apaga** a reserva viva. Reservas presas (crash) expiram por TTL curto
   e são recicladas. A chave é **por consumidor** → dois consumidores podem usar o
   mesmo valor sem colidir.

8. **Cobrança Pix é idempotente no provedor.** Criamos via `PUT /v2/cob/{txid}`
   com `txid` **determinístico** (derivado do `paymentId`), não `POST /v2/cob`
   (txid gerado pela Efí). Assim, retry/reprocessamento do MESMO pagamento aponta
   para a MESMA cobrança — não duplica. O cliente Efí também só repete (retry)
   chamadas idempotentes (GET/PUT/token), nunca POST que cria recurso. **Boleto é o
   oposto:** `POST /charge/one-step` **NÃO é idempotente** (gera novo `charge_id`).
   Por isso o POST nunca é re-tentado **e** o lease do worker é validado no boot como
   `CHARGE_CLAIM_STALE_MS >= 2× EFI_REQUEST_TIMEOUT_MS` (uma réplica só re-reivindica
   depois que a outra já parou). Resíduo irredutível (resposta perdida pós-criação) é
   rastreável por `metadata.custom_id = paymentId`.

9. **Concorrência otimista.** `payments.version` + `save` com `UPDATE ... WHERE
   version = ?` evita lost-update e eventos duplicados quando dois writers
   (reconciliação × webhook, ou réplicas) tocam o mesmo pagamento. Conflito →
   `ConcurrencyConflictError` (o worker/handler trata como "o outro venceu").

6. **PCI.** Nunca persista o PAN do cartão — só `token` + `last4` + bandeira.

7. **Certificados são segredo.** `certs/`, `secrets/`, `*.p12`, `*.pem` estão no
   `.gitignore`/`.dockerignore`. Não commite. No Railway o cert vai em
   `EFI_CERTIFICATE_BASE64` (base64 do `.p12`). P12 protegido por senha →
   `EFI_CERTIFICATE_PASSWORD`. Se fornecer PEM já convertido, ele precisa conter
   **o certificado E a chave privada** (o boot falha alto se faltar metade).

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
  consumidor deve deduplicar). `claimDue` incrementa `attempts` NO claim (crash no
  meio conta como tentativa → eventualmente DEAD, sem re-entrega infinita). Fila
  alimentada por `registerPaymentEventHandlers` em `payment.paid`/`payment.failed`/
  `payment.expired`/`payment.refunded` (precisa de `consumers.webhook_url`).

**Outros:** rate limit por consumidor (`RATE_LIMIT_PER_MINUTE` → 429 + `Retry-After`,
em memória/por instância — troque por Redis p/ limite global); **job periódico de
limpeza** (fora do hot path): idempotência expirada + **retenção** das tabelas
append-only (`outbox`/`webhook_events`/`webhook_deliveries` terminais mais antigos
que `RETENTION_DAYS`); pool do Postgres em `DATABASE_POOL_MAX`; `GET /metrics` expõe
lag (outbox/charge/deliveries).

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
  usa `X-Forwarded-For`, pegando a `TRUSTED_PROXY_HOPS`-ésima entrada a partir da
  direita; **fail-closed**: cadeia mais curta que os hops → usa o IP do socket,
  nunca a entrada controlada pelo cliente);
- `X-Consumer-Id`;
- `X-Signature: t=<unix_ts>,v1=<hmac_sha256_hex>` onde a mensagem assinada é
  `"<ts>.<idempotencyKey>.<corpo_bruto>"` quando há `Idempotency-Key` (POST), ou
  `"<ts>.<corpo_bruto>"` sem ela (GET). Incluir a chave na assinatura impede
  replay com troca de `Idempotency-Key`. Tolerância de timestamp anti-replay.

## Como estender (adicionar um novo método de pagamento)

1. Adicione o método ao port `PaymentGateway` e implemente em `EfiClient` +
   `EfiPaymentGateway`.
2. `ProcessPaymentService.buildMethod` já cria os `PaymentMethod`; o caso de uso
   processa PIX, boleto e cartão. Para um método novo, habilite lá.
3. Reaproveite agregado/outbox/idempotência. Adicione testes em `tests/`.

### Recorrência (assinaturas de cartão — DONE)

Efí **Cobranças "Assinaturas"**: a Efí gerencia a recorrência (cria-se plano +
assinatura 1x e ela cobra o cartão guardado a cada ciclo, notificando pelo MESMO
token model do boleto/cartão) — **não há worker/scheduler de cobrança nosso**.
- Agregado `SubscriptionAggregate` (PENDING→ACTIVE→CANCELED/EXPIRED); ports
  `subscription-repository` + `subscription-plan-registry`; serviços
  `create/cancel/get-subscription`; rotas `POST/GET/DELETE /subscriptions`.
- **Cada ciclo é uma linha em `payments`** (CREDIT_CARD com `subscription_id`) →
  reaproveita `payment.paid`/outbox/webhook-delivery. `idempotencyKey` sintética
  `sub:<subId>:charge:<chargeId>`.
- Planos são **reutilizáveis** (tabela `subscription_plans`, chave
  `(provider, intervalMonths, repeats_key=repeats??-1)`, get-or-create via ON CONFLICT).
- Notificação: `HandleBoletoNotificationService` resolve o token 1x e despacha
  entradas com `subscriptionId` → `HandleSubscriptionNotificationService.handleCycle`.
  Um ciclo FALHO **não** cancela a assinatura (a Efí pode retentar).
- ⚠️ NÃO sandbox-verificado (precisa de `payment_token` de browser). Confirme os
  shapes via `bun run subscription:create --token <token> [--detail] [--cancel]`.
- **Pix Automático** (recorrência Pix nativa) é um esforço separado, ainda pendente.

## Banco — PADRÃO DO MONOREPO (1 Postgres, 1 schema por serviço)

Um **único Postgres compartilhado** (`sistemazero`), com **um schema por bounded
context**: `payments` (este package, via `pgSchema('payments')` + `schemaFilter`),
`funil` ([[funnel]]) e `auth` (identidade). Cada serviço roda seu próprio
`db:migrate` (cada migration cria o seu `CREATE SCHEMA`); não há FK cross-schema,
então a ordem não importa.

⚠️ **Journal de migrations POR PACOTE** (`migrations: { table: '<pkg>_migrations' }`
em cada `drizzle.config.ts`, todas no schema `drizzle`). NÃO compartilhe a tabela
`__drizzle_migrations` entre pacotes: o drizzle-kit deduplica por `created_at` (a
marca d'água da última migration aplicada), então um journal compartilhado faz a
migration de um pacote — gerada "mais cedo" — ser **PULADA em silêncio** ("applied
successfully" sem rodar). Foi exatamente o que aconteceu com auth/funnel antes do fix.

> Histórico: o payments já viveu no schema `public` do banco `payments`. Foi
> padronizado — banco renomeado p/ `sistemazero` e tabelas movidas p/ o schema
> `payments` (migrations regeneradas; era pré-lançamento, sem dados a preservar).

## Dev local

- Postgres via Docker na **porta 5433** (a 5432 costuma estar ocupada por outro
  projeto). `.env`: `DATABASE_URL=...localhost:5433/sistemazero` (banco compartilhado).
- Variáveis: copie de `.env.example`. `EFI_SANDBOX=true` para homologação.
- Teste sandbox: cobranças de **R$0,01 a R$10,00** são as usadas em homologação.
- O webhook precisa de URL pública (Efí não alcança `localhost`) → teste após o
  deploy ou via túnel.

## Deploy (Railway)

`Dockerfile` (oven/bun) + `railway.json` na raiz do repo (builder DOCKERFILE,
`preDeployCommand = db:migrate`). Variáveis chave: `DATABASE_URL`,
`TRUST_PROXY=true`, `EFI_*` e `EFI_CERTIFICATE_BASE64`. **Em produção o boot exige
`EFI_SANDBOX=false`** (refine fail-fast — evita apontar pro sandbox sem querer) e
`NODE_ENV=production` (desliga o Swagger e o log debug/pretty). `EFI_WEBHOOK_SECRET`
não pode ser string vazia (omita p/ desabilitar). Migrations geradas/commitadas via
`db:generate` (a última adicionou `idempotency_keys.reservation_id`). Detalhes no
`README.md`.

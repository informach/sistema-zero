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
> (`POST/GET/DELETE /subscriptions`). **Assinaturas VERIFICADAS em sandbox
> (13/07/2026):** plano + `one-step` (ACTIVE + 1ª cobrança) + detalhe + cancelamento
> ponta a ponta — ver §Recorrência. **Pix Automático** (recorrência Pix nativa) é o
> próximo passo.

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
| `bun test` | testes (unit + app com fakes + integração via `app.handle` + `tests/db/` contra Postgres real — estes PULAM sem banco na :5433) |
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
   **Efí FRIA é cara** (mTLS + OAuth ~15-16s sob Bun → era a causa dos 502 do 1º
   Pix): o boot faz `warmUp()` dos clients (best-effort) e um **re-warm periódico
   do token Pix** (`EFI_TOKEN_REWARM_INTERVAL_MS` = 45min; só o Pix — o da API
   Cobranças não usa mTLS e o token vive ~600s). Ver `composition-root.ts`.
   **Budget TOTAL de retry** (`EFI_TOTAL_RETRY_BUDGET_MS` = 30s): o timeout
   (`EFI_REQUEST_TIMEOUT_MS` = 20s) é POR TENTATIVA — sem o budget, o pior caso
   de uma chamada idempotente re-tentada era (3+1)×20s + backoff ≈ 86s, acima do
   timeout do gateway (35s) E do TTL de idempotência. O `withRetry` (`http.ts`)
   só re-tenta se a próxima tentativa couber INTEIRA no budget; a 1ª tentativa
   sempre roda. O boot valida `budget >= timeout` e `TTL*1000 >= budget + 10s`.

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
   A atomicidade (rollback CONJUNTO de pagamento + eventos numa falha no meio) é
   **provada contra Postgres real** em `tests/db/outbox-atomicity.test.ts` —
   banco dedicado `sistemazero_test` criado na mesma instância (:5433), migrations
   aplicadas pelo próprio teste; sem Postgres alcançável os testes são **pulados**
   (`bun test` segue verde sem infra; override: `TEST_DATABASE_URL`). O mesmo
   arquivo prova a corrida de `version` sem evento duplicado, a unique do txid e
   a reciclagem concorrente de reserva de idempotência. ⚠️ **bun:test gotcha**:
   NÃO use `expect(...).rejects` com promises do drizzle/postgres-js (thenable
   preguiçoso — a rejeição de um erro de query dentro de transação só chega
   quando o pool morre no teardown → timeout de 5s + teste "(unnamed)" fantasma);
   capture com try/catch (helper `rejectionOf` no próprio arquivo).

4. **Nunca confie no webhook.** `HandleProviderWebhookService` **re-consulta a
   cobrança na Efí** (`getPixCharge`) antes de marcar como pago, confere o **valor
   efetivamente PAGO** contra o cobrado (`getPixCharge` lê `pix[].valor` — o
   exemplo oficial da Efí mostra pago ≠ original; fallback no `valor.original`
   enquanto não há pagamento), e deduplica via `webhook_events` (o token só é
   consumido em `markProcessed` → falha no meio NÃO descarta a reentrega). **Mismatch de valor**
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
   Retry da MESMA chave com reserva `IN_FLIGHT` viva → **409 `IDEMPOTENCY_IN_FLIGHT`**
   (o funil traduz p/ `PAYMENT_IN_PROGRESS` "aguarde" + auto-retry no PixCheckout).
   O TTL da reserva (`IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS`, env, default 60s) é
   também o LOCKOUT pós-falha-com-efeito. A perna Efí agora é LIMITADA por
   `EFI_TOTAL_RETRY_BUDGET_MS` (30s) e o boot EXIGE `TTL*1000 >= budget + 10s`
   (refine) — a reserva expirar com a request original viva = novo paymentId/txid
   = risco de cobrança duplicada, então a invariante é validada, não convenção.
   `reserve` retorna `ReserveResult` (`{kind:'acquired',reservationId}` |
   `{kind:'existing',record}`); `complete`/`release` **exigem o `reservationId`** +
   `state='IN_FLIGHT'` → uma request zumbi (reserva já reciclada por outra) **não
   sobrescreve/apaga** a reserva viva. Reservas presas (crash) expiram por TTL curto
   e são recicladas. A chave é **por consumidor** → dois consumidores podem usar o
   mesmo valor sem colidir.

10. **Pix aceita `devedor` opcional.** Quando o consumidor envia `customer` num pagamento PIX
   (`name`+`document`), o adapter monta `devedor: { cpf|cnpj, nome }` na cob (chave escolhida pelo
   tamanho do documento: 11 = cpf, 14 = cnpj; a Efí valida os dígitos). Sem `customer`, a cob vai
   sem devedor (comportamento anterior). O funil envia os dados pessoais do checkout por aqui.

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
   `ConcurrencyConflictError` (o worker/handler trata como "o outro venceu";
   a reconciliação loga `reconcile.lost_race` em INFO — não é alarme). O `save`
   NÃO atualiza a `version` da instância em memória: para gravar de novo o mesmo
   agregado, **recarregue** (`findById`) antes (ver `RefundPaymentService`).
   `markPaid`/`markFailed`/`markExpired` são idempotentes no agregado (re-marcar
   estado terminal já alcançado = no-op, sem evento duplicado). O `restore` NÃO
   revalida CPF/e-mail (`Customer.restore` — endurecer validação não pode tornar
   registro antigo ilegível) e falha ALTO num CREDIT_CARD persistido sem `card`
   (sem fallback silencioso p/ PIX). `payments.txid` tem UNIQUE parcial no banco.

6. **PCI.** Nunca persista o PAN do cartão. O `payment_token` da Efí também **NÃO
   é persistido** (single-use, consumido na cobrança — `snapshotToRow` faz o strip;
   restore via `PaymentMethod.storedCard`, que preserva parcelas e tolera linhas
   legadas com token). No banco ficam só `brand` + `last4` + `installments`.

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
  **FAN-OUT (06/2026, migration 0004):** além do dono, o evento é entregue a todo
  consumer com o nome em `consumers.subscribed_events` (ex.: o **fiscal** assina
  `payment.paid`/`payment.refunded` p/ NFS-e; seed: `--subscribed-events "a,b"`).
  A unique `(consumer_id, event_name, dedup_key)` deduplica POR consumer; falha
  no lookup de subscribers não derruba a entrega ao dono (`findSubscribers` com
  cache TTL 30s no `CachingConsumerRepository`).

**Rota interna S2S (06/2026):** `GET /payments/internal/payments/:id` → `AdminPaymentView`
cross-consumer, auth = `x-internal-token` (`assertInternalCaller`). Consumida pelo **fiscal**
(o payload do webhook só traz ids; a view tem customer/valor/metadata/status). NÃO exposta no
gateway — private networking direto. Log `payments.internal_read`.

**Outros:** rate limit por consumidor (`RATE_LIMIT_PER_MINUTE` → 429 + `Retry-After`,
em memória/por instância — troque por Redis p/ limite global) + rate limit **GLOBAL
dos webhooks** (`WEBHOOK_RATE_LIMIT_PER_MINUTE`, chave única — backpressure, a auth é
o `EFI_WEBHOOK_SECRET`); **job periódico de limpeza** (fora do hot path): idempotência
expirada + **retenção** das tabelas append-only (`outbox`/`webhook_events`/
`webhook_deliveries` terminais mais antigos que `RETENTION_DAYS`) — gateado por
**advisory lock** (`pg_try_advisory_xact_lock`, só UMA réplica limpa por ciclo; a
chave é global ao banco compartilhado, não reutilize a constante); pool do Postgres
em `DATABASE_POOL_MAX` (default 20); **consumer cacheado** (TTL 30s,
`CachingConsumerRepository` — desativar um consumer vale em ≤30s; só cacheia
acertos); `GET /metrics` (TOKEN obrigatório em prod — `METRICS_TOKEN`, header
`x-metrics-token`/Bearer) expõe lag + **idade do backlog**
(`*OldestPendingAgeSeconds` — alerte na idade, pega poller morto) +
`amountMismatchPending` (divergência de valor pago → flag durável
`metadata.amountMismatch` via `flagAmountMismatch`, idempotente; setado pelo
webhook Pix, notificação Cobranças e reconciliação). **Access log** (`http.access`):
1 linha/request com o `X-Request-Id` do gateway (correlação), método, path, status
e latência; pula `/health`,`/readyz`,`/metrics`.

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
  nunca a entrada controlada pelo cliente; via private networking → `false`);
- `X-Consumer-Id`;
- `X-Signature: t=<unix_ts>,v1=<hmac_sha256_hex>` onde a mensagem assinada é
  `"<ts>.<MÉTODO>.<path>.<idempotencyKey>.<corpo_bruto>"` quando há
  `Idempotency-Key` (POST), ou `"<ts>.<MÉTODO>.<path>.<corpo_bruto>"` sem ela
  (`canonicalHmacMessage` do core; path = pathname SEM query). A chave na
  assinatura impede replay trocando a `Idempotency-Key`; **método+path impedem
  replay cross-endpoint** (a assinatura de um GET de corpo vazio valia num DELETE
  do mesmo recurso). Tolerância de timestamp anti-replay. ⚠️ Os webhooks de SAÍDA
  (entregas aos consumidores) continuam assinando SÓ o corpo — contrato público.

## Admin (painel @sistemazero/admin)

Rotas de **leitura + ações** para o dono operar, sob `/payments/admin/*` (caminho
distinto das rotas consumer `/payments`,`/payments/:id` — ≥3 segmentos, sem colisão).
O RBAC REAL é do **gateway** (JWT + `authorize.roles:[superadmin,admin,staff]`); o
serviço confere os headers `X-Auth-User-*` injetados (`requireAdmin` em
`interfaces/http/admin-auth.ts`, **defesa em profundidade**, ligada por `REQUIRE_ADMIN`,
default `true`). **Desde 06/2026 exige TAMBÉM o `x-internal-token`** injetado pelo
gateway (`INTERNAL_API_TOKEN`, MESMO valor do `PAYMENTS_INTERNAL_TOKEN` de lá;
`assertInternalCaller` em `interfaces/http/internal-auth.ts`, comparação em tempo
constante via `safeEqual` do core) — é a prova de que os `X-Auth-User-*` vieram do
gateway; sem ela, qualquer processo na rede interna forjaria um admin (estorno!)
chamando o serviço direto. Ausente em dev/local = checagem desligada; obrigatório
em produção (refine). Espelha members/catalog/messaging/auth. **Fail-closed**:
exige role E status PRESENTES (o gateway sempre injeta os dois; header de status
ausente = não passou pelo gateway → 401) e `status === 'active'` (senão 403) —
"ausente" nunca equivale a "ativo". Estas rotas **NÃO** usam auth de consumidor
(HMAC) nem `resign` no gateway. São cross-consumer (o painel enxerga todos).

## Sentry (monitoramento de erros)

`@sentry/bun` (estável — o `@sentry/elysia` é ALPHA, não usar em pagamentos),
ligado por `SENTRY_DSN` (ausente = no-op; projeto `sistema-zero-payments` na org
`informach-nucleo-de-aprendizag`). Init no TOPO do `index.ts` (após `loadEnv`),
`environment` = NODE_ENV, `release` = `RAILWAY_GIT_COMMIT_SHA`,
**`sendDefaultPii: false`** (pagamentos — nada de headers/IP) e `tracesSampleRate: 0`
(só erros). Três camadas (`infrastructure/observability/sentry.ts`):
1. **Espelho de logs** (`withSentryMirror`, no composition-root): TODO log de
   nível ERROR vira evento (fingerprint = nome do evento; contexto = extras) —
   cobre workers/outbox/mismatch sem tocar call sites. `MIRROR_SKIP` evita
   duplicar o que já é capturado como exceção (mantenha em sincronia!).
2. **`captureException` no error-handler** (500 `unhandled.error` + 502
   `EfiGatewayError`, fingerprint por providerCode) — evento canônico com stack.
3. **Process handlers/boot** (`index.ts`): captureException + `flushSentry()` no
   shutdown (entrega pendentes antes do exit).

- **Leitura:** `GET /payments/admin/payments` (`?q&status&method&consumerId&from&to&limit&offset`),
  `GET /payments/admin/payments/:id`, `GET /payments/admin/subscriptions` (`?q&status&consumerId&limit&offset`),
  `GET /payments/admin/subscriptions/:id`,
  **`GET /payments/admin/stats/subscriptions`** (`?from&to`, 07/2026 — recorrência do painel:
  ativas por periodicidade + **MRR = Σ(amount/intervalMonths) das ativas** [round de NUMERIC,
  bigint como string] + novas/canceladas na janela + churn = canceladas/(ativas+canceladas);
  `SubscriptionAdminReadRepository.stats` + `GetSubscriptionStatsService`),
  `GET /payments/admin/stats` (`?from&to` → receita/contagens),
  `GET /payments/admin/stats/daily` (`?from&to&offerIds` → série diária do painel "Gestão de vendas":
  buckets esparsos por dia civil em `America/Sao_Paulo` com líquido/recebido/estornado/transações/
  estornos; "recebido" agrupa por `paid_at` e INCLUI linhas hoje REFUNDED — o estorno desconta no
  dia em que ocorreu, via `metadata.refundedAt`/`updated_at`; `offerIds` = CSV de UUIDs, filtra
  `metadata->>'offerId'`; o BFF do admin densifica os dias vazios),
  `GET /payments/admin/ops` (lag de outbox/entregas/reconciliação). Ports de leitura
  dedicados (`*-admin-read.port` + `Drizzle*AdminReadRepository`) — **separados** do
  hot-path de escrita; devolvem agregados (a app mapeia via `toAdminPaymentView`/`toSubscriptionView`).
- **Ações:** `POST /payments/admin/payments/:id/refund` (estorno) e
  `DELETE /payments/admin/subscriptions/:id` (cancela, `CancelSubscriptionService.executeAdmin`).
- **Estorno (`RefundPaymentService`):** só `PAID`; **Pix** (devolução `PUT /v2/pix/:e2eId/devolucao/:id`,
  e2eId resolvido do detalhe do cob) e **cartão** (`POST /v1/charge/card/:id/refund`); **boleto não
  tem estorno programático** (→ `REFUND_NOT_SUPPORTED`). Idempotente (já `REFUNDED` → no-op);
  marca via `PaymentAggregate.refund({providerRefundId,refundedAt})` (grava em `metadata`, **sem
  coluna nova**) e emite `payment.refunded` (outbox → entrega ao consumidor revogar acesso).
  Métodos no port/adapter: `refundPixCharge`/`refundCardCharge`.
  ⚠️ **O refund de cartão NÃO é idempotente na Efí** (doc oficial: chamadas repetidas podem
  duplicar a devolução). Por isso o serviço faz um **claim otimista** (save que incrementa a
  `version`) ANTES de chamar o provedor: estornos concorrentes (duplo-clique) disputam o UPDATE
  e só o vencedor chama a Efí; o perdedor recebe **409 `REFUND_IN_PROGRESS`** (ou a view, se o
  vencedor já concluiu). Pix é idempotente no provedor (id de devolução determinístico).

## Minhas compras (app @sistemazero/community — self-service do comprador)

Rotas de leitura sob `/payments/my*` para o COMPRADOR ver as próprias compras
(`GET /payments/my` paginada + `GET /payments/my/:id`). A auth real é do **gateway**
(JWT + `authorize.statuses:['active']`, **sem roles** — qualquer conta ativa); o
serviço exige o `x-internal-token` do gateway (`INTERNAL_API_TOKEN` — mesma prova
de origem do admin, 06/2026) e lê o e-mail de `X-Auth-User-Email` (`requireBuyer`
em `interfaces/http/my-auth.ts`, defesa em profundidade). TODA consulta é **escopada
por `lower(customer->>'email')`** (índice de expressão `payments_customer_email_idx`)
— id de outro comprador → 404 (anti-IDOR). Port de leitura dedicado
(`payment-my-read.port` + `DrizzlePaymentMyReadRepository`), fora do hot-path;
resposta usa a `PaymentView` PÚBLICA (sem customer/provider/failureReason).
O vínculo compra↔conta é o E-MAIL (o fulfillment do funil registra o comprador no
auth com o mesmo e-mail do checkout; o perfil self-service do auth NÃO permite
trocar e-mail). O literal `/payments/my` vence o param `/payments/:id` tanto no
matcher do gateway quanto no Elysia (coberto por testes nos dois lados).

**Minhas ASSINATURAS (07/2026, migration `0005` = índice de expressão
`subscriptions_customer_email_idx` em `lower(customer->>'email')`):**
`GET /payments/my/subscriptions` (lista, view PÚBLICA `MySubscriptionView` — sem
consumerId/metadata/providerSubscriptionId) e `DELETE /payments/my/subscriptions/:id`
(cancela a PRÓPRIA — `CancelSubscriptionService.executeForEmail`, escopado por
e-mail, anti-IDOR; o acesso segue até o fim do ciclo + carência, o members expira
sozinho). Port dedicado `subscription-my-read` + `DrizzleSubscriptionMyReadRepository`.
⚠️ O literal `/payments/my/subscriptions` vence o param `/payments/my/:id` nos DOIS
matchers (gateway + Elysia — rota declarada ANTES do `/:id` e coberta por teste).

## Como estender (adicionar um novo método de pagamento)

1. Adicione o método ao port `PaymentGateway` e implemente em `EfiClient` +
   `EfiPaymentGateway`.
2. `ProcessPaymentService.buildMethod` já cria os `PaymentMethod`; o caso de uso
   processa PIX, boleto e cartão. Para um método novo, habilite lá.
3. Reaproveite agregado/outbox/idempotência. Adicione testes em `tests/`.

### Recorrência (assinaturas de cartão — DONE; consumidor real = FUNIL desde 07/2026)

Efí **Cobranças "Assinaturas"**: a Efí gerencia a recorrência (cria-se plano +
assinatura 1x e ela cobra o cartão guardado a cada ciclo, notificando pelo MESMO
token model do boleto/cartão) — **não há worker/scheduler de cobrança nosso**.

> ⚠️⚠️ **INCIDENTE 17/08/2026 — um assinante PAGOU a renovação e PERDEU o acesso.**
> A assinatura tinha `notification_url: **null**` na Efí, porque
> `EFI_BOLETO_NOTIFICATION_URL` **não existia no host de produção**. Sem aviso: nenhum
> ciclo virou linha, nenhum `payment.paid` saiu, o funil não estendeu a matrícula e ela
> venceu no fim da carência. O inbox `webhook_events` tinha **3 entradas na história
> inteira**, nenhuma de assinatura — e ninguém notou porque **a 1ª cobrança vem na
> resposta SÍNCRONA do `one-step`**, então só a 1ª RENOVAÇÃO revela o furo.
> Consertado com: a env nos dois ambientes, `PUT /v1/subscription/:id/metadata`
> (`{custom_id, notification_url}` — preservar o `custom_id`, que é o NOSSO id) nas
> assinaturas que já existiam, e as três redes abaixo. Detalhe em
> `~/.claude/memory/incidente-assinatura-sem-notification-url.md`.

- ⭐ **`SubscriptionReconciliationWorker`** (`infrastructure/workers/`, 08/2026) — a rede
  que faltava. Reivindica assinaturas `ACTIVE`
  (`SubscriptionRepository.claimActiveForReconcile`) em lote com transação CURTA,
  `FOR UPDATE SKIP LOCKED` e cursor durável `subscriptions.last_reconciled_at`
  (migration `0006`): nunca varrida primeiro, depois tentativa mais antiga. Isso
  divide réplicas e garante que um lote menor que o total ROTACIONE, sem manter
  transação aberta na chamada externa. Depois pede o histórico de ciclos
  (`PaymentGateway.listSubscriptionCharges` → o MESMO `GET /subscription/:id` do
  `getSubscription`) e, para cada cobrança `paid` sem linha em `payments`, chama
  `HandleSubscriptionNotificationService.handleCycle`. ⭐ Ela só DESCOBRE: quem age é o
  caminho da notificação, já idempotente (dedupe no inbox). Envs
  `SUBSCRIPTION_RECONCILE_INTERVAL_MS` (6h), `_BATCH_SIZE`, `_CONCURRENCY`.
  ⚠️ **Sem advisory lock de propósito**: ele exigiria manter a transação viva durante
  a Efí. O claim acima termina ANTES da rede; uma queda depois do claim só adia aquela
  linha até a rotação seguinte, e o caminho continua idempotente nas duas camadas.
  ⚠️ **`subscription.reconcile.cycle_recovered` sai em ERROR de propósito** (log ERROR =
  sinal alertável): recuperar um ciclo é sucesso, mas PROVA que a notificação se perdeu.
- **`subscriptionsOverdue` no `/metrics`**: assinaturas `ACTIVE` cujo último ciclo pago já
  passou do intervalo + `SUBSCRIPTION_OVERDUE_GRACE_DAYS` (3, espelha a carência do
  members). A conta é em SQL e em `America/Sao_Paulo`, espelhando a regra da Efí:
  se o ciclo atual caiu no último dia, o próximo também cai no último dia
  (28/02 → 31/03, não 28/03). Não aproxima mês por 30 dias em JS.
- ⚠️⚠️ **A cobrança de CARTÃO não tem `paid_at`** (medido na Efí real, 08/2026): o
  `GET /charge/:id` traz `payment.created_at` e um `history[]` cujas entradas têm
  `created_at` + `message` (texto em português) e **nenhum `status`** — diferente do
  `history` do `GET /subscription/:id`, que TEM `status`. O `parseCardDetailCharge`
  procurava `h.status` e nunca casava, então `paidAt` saía `undefined` e o `markPaid`
  carimbava a hora do PROCESSAMENTO (num ciclo recuperado dias depois, 3 dias de erro).
  Hoje lê `paid_at` → `payment.created_at` → última entrada do histórico; a `message`
  NUNCA é parseada. ⚠️ E os timestamps da Cobranças vêm **sem fuso, em horário de São
  Paulo**: `parseProviderDate` converte o formato ingênuo `YYYY-MM-DD HH:MM:SS` de SP
  para UTC (offset perguntado ao ICU, não cravado em -03:00) e deixa string com `Z`
  intocada. O parser exige round-trip dos componentes civis e de São Paulo: `Date.UTC`
  normaliza overflow, então sem essa prova `2026-99-99 25:61:00` virava uma data válida
  em 2034. Sem a conversão de fuso, em produção (TZ=UTC) todo pagamento de cartão ficava
  3h adiantado.
  ⚠️ Documentado e NÃO consertado: `markPaid` sai cedo se já está `PAID`, então uma
  notificação posterior não corrige uma data errada já gravada.
- Agregado `SubscriptionAggregate` (PENDING→ACTIVE→CANCELED/EXPIRED); ports
  `subscription-repository` + `subscription-plan-registry`; serviços
  `create/cancel/get-subscription`; rotas `POST/GET/DELETE /subscriptions`. O funil
  consome via gateway (rota `payments-subscriptions-create`, HMAC + resign, 35s).
- **Cada ciclo é uma linha em `payments`** (CREDIT_CARD com `subscription_id`) →
  reaproveita `payment.paid`/outbox/webhook-delivery. `idempotencyKey` sintética
  `sub:<subId>:charge:<chargeId>`. **O ciclo PROPAGA a `metadata` da assinatura**
  (07/2026 — leadId/offerId do funil: stats por oferta e NFS-e enxergam a
  recorrência) + `subscriptionId`.
- **`payment.paid`/`payment.failed` carregam `subscriptionId`** (07/2026, null em
  avulso) — é o que o webhook do funil usa p/ RAMIFICAR renovação (extend no
  members, sem welcome) e dunning (e-mail de falha de cobrança).
- **`SubscriptionView.firstPayment {id, status}`** (07/2026): a CRIAÇÃO expõe o
  pagamento do 1º ciclo quando a resposta da Efí o traz — o funil linka o
  `paymentId` ao lead sem esperar o webhook. Ausente/null nas leituras posteriores.
- Planos são **reutilizáveis** (tabela `subscription_plans`, chave
  `(provider, intervalMonths, repeats_key=repeats??-1)`, get-or-create via ON CONFLICT).
- Notificação: `HandleBoletoNotificationService` resolve o token 1x e despacha
  entradas com `subscriptionId` → `HandleSubscriptionNotificationService.handleCycle`.
  Um ciclo FALHO **não** cancela a assinatura (a Efí pode retentar).
- ✅ **Sandbox-verify COMPLETO (13/07): o `one-step` VOLTOU a funcionar** (o 504/500 de 10/07
  era instabilidade do sandbox da Efí, não nossa). `bun run subscription:create --token <tok>
  --amount 300 --detail --cancel`: `POST /plan` (70475) → `POST /subscription/one-step`
  (subscription **107051 ACTIVE** + 1ª cobrança **44986280**) → `GET /subscription/:id`
  (active, next_execution) → `PUT /:id/cancel` (200). Os parsers do mapper batem com a resposta
  REAL. ⚠️ **mínimo de cartão R$ 3,00** (R$1 → "valor inferior ao limite"). A 1ª cobrança fica
  `waiting` e vira `paid` pela notificação (não forçável numa sessão — coberto por fakes/integração).
  O `payment_token` é de BROWSER (vida curta): tokenizador local com `payment-token-efi`
  (`setAccount(<PUBLIC_EFI_ACCOUNT_IDENTIFIER>).setEnvironment('sandbox').setCreditCardData({...,
  reuse:true}).getPaymentToken()`, cartão aprovado `4485785674290087`).
- **Pix Automático** (recorrência Pix nativa) é um esforço separado, ainda pendente.
  Anual "à vista" via Pix/boleto NÃO passa por aqui — é pagamento único que o
  members converte em acesso de 12 meses (`accessPeriodMonths` no grant do funil).

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
- **Cartão em sandbox:** qualquer número **Luhn-válido**; o **último dígito** simula o resultado
  (1 = dados inválidos · 2 = recusa de segurança · 3 = tente mais tarde · resto = **aprovado**;
  ex. aprovado: visa `4485785674290087`; recusas: finais 1/2/3 — tabela com exemplos no `README.md`).
  Validade futura + CVV de 3-4 dígitos quaisquer; **CPF** do titular válido (ex. `529.982.247-25`).
- O webhook precisa de URL pública (Efí não alcança `localhost`) → teste após o
  deploy ou via túnel.

## Deploy (Railway)

`Dockerfile` (oven/bun) + `railway.json` na raiz do repo (builder DOCKERFILE,
`preDeployCommand = db:migrate`, **`healthcheckPath = /readyz`** — readiness =
banco OK + warm-up da Efí concluído; sem isso o redeploy promove a réplica fria e
o 1º Pix paga o mTLS de ~15s na request). Bind **dual-stack `::`** (env `HOST`)
— obrigatório p/ `payments.railway.internal` (private networking é IPv6). **Em
produção o boot exige** (refines fail-fast): `EFI_SANDBOX=false`,
**`EFI_WEBHOOK_SECRET`** (webhook é público; sem segredo = amplificação não
autenticada), **`METRICS_TOKEN`** (≥16 chars; /metrics fica em ingress público) e
**`INTERNAL_API_TOKEN`** (≥16 chars; prova de origem do gateway nas rotas
admin/minhas compras — MESMO valor do `PAYMENTS_INTERNAL_TOKEN` do gateway;
⚠️ setar a env no host de prod ANTES do próximo deploy, senão o boot falha).
`TRUST_PROXY` depende da topologia (ver `.env.example`): gateway via private
networking → `false` (socket IP = gateway; allowlist fd00::/8); via domínio
público → `true` + `HOPS=1`. ⚠️ **Migrations expand-then-contract** (o pre-deploy
roda com a réplica velha viva; índice em tabela grande → `CONCURRENTLY` custom).
Migrations geradas/commitadas via `db:generate` — `0002` = UNIQUE parcial do txid;
**`0003`** = `CREATE EXTENSION pg_trgm` (editada à mão) + índices trgm GIN da
busca `q` do admin (4 em payments, 3 em subscriptions — as expressões dos índices
DEVEM casar com o `buildWhere`) + `created_at` (payments/subscriptions) +
`paid_at` parcial. Detalhes no `README.md`.

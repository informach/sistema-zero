# @sistemazero/payments

Serviço de pagamentos/checkout consumido por outros sistemas internos. Processa
**Pix, boleto e cartão de crédito** (avulso e recorrente) através da **Efí Pay**.

Arquitetura: **DDD + Hexagonal (Ports & Adapters)**, SOLID, Clean Code. Foco em
performance, escala e segurança.

> Estado atual: **Pix e boleto** funcionando ponta-a-ponta (criar cobrança →
> webhook/notificação de confirmação → evento de domínio), nos modos síncrono e
> assíncrono. **Cartão** (avulso) e **assinaturas de cartão** (recorrência via
> Cobranças Efí) também implementados — domínio + aplicação + rotas
> `POST/GET/DELETE /subscriptions`; as assinaturas ainda não foram verificadas em
> sandbox. **Pix Automático** (recorrência Pix nativa) é o próximo passo.

## Camadas

```
src/
├── domain/          # núcleo puro (agregados, value objects, eventos, ports). Sem framework.
├── application/     # casos de uso (orquestração)
├── infrastructure/  # adapters: Efí, Drizzle/Postgres, outbox, config
└── interfaces/http/ # Elysia: rotas, middleware (IP allowlist + HMAC), webhooks
```

A regra de dependência aponta sempre para dentro: `interfaces → application → domain`
e `infrastructure → domain` (implementando os _ports_). O domínio não conhece
Elysia, Drizzle nem a Efí.

## Rodando localmente

```bash
# 1. Variáveis de ambiente
cp .env.example .env   # e preencha (credenciais Efí + DATABASE_URL)

# 2. Dependências (na raiz do monorepo)
bun install

# 3. Banco (PostgreSQL) — UM Postgres compartilhado por todo o monorepo
#    (`sistemazero`); cada serviço é dono do seu schema (payments/funil/auth).
docker run -d --name pg-payments -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sistemazero -p 5433:5432 postgres:16

# 4. Migrations (cria o schema `payments` no banco compartilhado)
bun run db:migrate    # aplica as migrations (db:generate só ao mudar o schema)

# 5. Subir o serviço
bun run dev           # ou, na raiz: bun run dev:payments
```

- API docs (OpenAPI/Swagger): `GET /swagger` — **apenas fora de produção**
  (`NODE_ENV != production`); em produção não é montado (não expõe o mapa de rotas).
- Health: `GET /health`

## Cartões de teste (sandbox da Efí)

Com `EFI_SANDBOX=true`, **qualquer número de cartão Luhn-válido funciona** e o **último
dígito** do número simula o resultado:

| Final | Resultado | Exemplo (Visa, Luhn-válido) |
|---|---|---|
| `1` | Recusado — "Dados do cartão inválidos" | `4485 7856 0000 0071` |
| `2` | Recusado — "não autorizada por motivos de segurança" | `4485 7856 0000 0022` |
| `3` | Recusado — "tente novamente mais tarde" | `4485 7856 0000 0063` |
| qualquer outro | ✅ **Aprovado** | `4485 7856 7429 0087` |

- **Validade:** qualquer data futura · **CVV:** 3 dígitos (4 para Amex).
- **CPF** do titular: use um válido, ex. `529.982.247-25`.
- Cobranças de homologação ficam entre **R$ 0,01 e R$ 10,00**.
- **Pix em sandbox:** a cobrança é criada de verdade (QR/copia-e-cola reais), mas **não
  compensa sozinha** — não há como "pagar" o QR de teste.
- A tokenização do cartão (`payment_token`) é feita no **browser do consumidor** (ex.: o
  checkout do funil, via `payment-token-efi`); o payments recebe só o token. Ao testar o
  checkout ponta a ponta, mantenha o **adblock desligado** (o fingerprint antifraude da
  ClearSale roda na página).

## Autenticação service-to-service

Todo consumidor é cadastrado na tabela `consumers` com: `allowed_cidrs` (IP
allowlist), `hmac_secret` e `is_active`. Cada requisição precisa de:

- estar dentro de um CIDR permitido (IPv4/IPv6; atrás de proxy, configure
  `TRUST_PROXY=true` + `TRUSTED_PROXY_HOPS`);
- header `X-Consumer-Id`;
- header `X-Signature: t=<unix_ts>,v1=<hmac_sha256_hex>` onde o HMAC é calculado
  sobre `"<ts>.<idempotencyKey>.<raw_body>"` quando há `Idempotency-Key` (POST), ou
  `"<ts>.<raw_body>"` sem ela (GET) — incluir a chave na assinatura impede replay
  com troca de `Idempotency-Key`. Usa o `hmac_secret` do consumidor.

Timestamps fora da tolerância (`HMAC_TOLERANCE_SECONDS`) são rejeitados (anti-replay).
O corpo é limitado a `MAX_REQUEST_BODY_BYTES` (413 acima disso, antes da auth).

## Como funciona (síncrono vs assíncrono) e escala

Criar a cobrança é **síncrono**; a confirmação do pagamento é **assíncrona**
(ninguém paga um Pix na mesma request — vem por webhook depois).

- **Modo síncrono (padrão):** `POST /payments` cria a cobrança na Efí
  (`PUT /v2/cob/{txid}` com `txid` **determinístico** derivado do pagamento →
  idempotente no provedor, retry não duplica) e responde **201** com `txid` +
  copia-e-cola + QR.
- **Modo assíncrono (`ASYNC_CHARGE_CREATION=true`, para picos/lançamento):**
  responde **202** sem chamar a Efí; o `ChargeCreationWorker` cria a cobrança
  depois, em lotes (suaviza o burst contra o rate limit da Efí). O cliente
  consulta `GET /payments/:id` até o `pix` aparecer.

Confirmação do pagamento:
- **Push (recomendado):** cadastre o `webhook_url` no consumidor (via
  `db:seed --webhook-url ...`) → ao pagar, o serviço entrega um webhook
  **assinado (HMAC, mesmo `hmac_secret`)** com retry/backoff. Headers:
  `X-Signature`, `X-Event-Type`, `X-Delivery-Id`; corpo
  `{ id, event, data: { paymentId, consumerId, txid, paidAt } }`. Entrega
  **at-least-once** → deduplique pelo `data.paymentId`/`X-Delivery-Id`.
- **Pull:** `GET /payments/:id` até `status = PAID`.

Componentes de escala/resiliência: outbox transacional + pollers com
`FOR UPDATE SKIP LOCKED` (seguro com várias réplicas) e **acordados na hora por
`LISTEN/NOTIFY`** (latência ~ms; o poll é a rede de segurança — desligável via
`PG_LISTEN_ENABLED=false` atrás de PgBouncer transaction pooling); idempotência
**escopada por consumidor** com concorrência otimista (coluna `version`) evitando
lost-update/eventos duplicados; rate limit por consumidor (429); dead-letter no
outbox (`OUTBOX_MAX_ATTEMPTS`); **retenção periódica** das tabelas append-only
(`outbox`/`webhook_events`/`webhook_deliveries` terminais > `RETENTION_DAYS`);
reconciliação (rede de segurança p/ webhooks perdidos) e `GET /metrics` (lag de
outbox/fila/dead-letter). O teto de throughput
é a **API da Efí** — daí o modo assíncrono + retry/backoff. Em escala, use um
**pooler** de Postgres (`DATABASE_POOL_MAX` × réplicas não pode estourar o
`max_connections`; o `LISTEN` usa +1 conexão dedicada por instância).

Chamadas à Efí têm **timeout por tentativa** (`EFI_REQUEST_TIMEOUT_MS`, 20s) e um
**budget total da operação** (`EFI_TOTAL_RETRY_BUDGET_MS`, 30s) que limita
tentativas + backoff somados — só chamadas idempotentes (GET/PUT/token) são
re-tentadas, e nunca além do budget. O boot **valida** que o budget cabe numa
tentativa inteira e que o TTL da reserva de idempotência
(`IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS`, 60s) cobre o budget com 10s de folga —
reserva expirar com a request original viva reabriria a janela de cobrança
duplicada.

## Segurança

- Nunca armazenamos PAN de cartão — apenas token + `last4` + bandeira (tokenização Efí).
- Pix exige certificado P12 da Efí (carregado no boot de `EFI_CERTIFICATE_PATH` ou
  `EFI_CERTIFICATE_BASE64`; senha opcional em `EFI_CERTIFICATE_PASSWORD`).
- Webhooks de entrada são deduplicados (o token de dedupe só é consumido após
  sucesso → falha no meio reprocessa), processados com **isolamento por item**, e a
  cobrança é **re-consultada** na Efí — conferindo o **valor efetivamente pago**
  (Pix: `pix[].valor`, que pode divergir do cobrado; boleto: o **principal**,
  ignorando multa/juros) — antes de confirmar. Divergência de valor não confirma,
  loga (alertável) e para de reprocessar. Opcionalmente exigem `?token=` ou header
  `x-webhook-token` (`EFI_WEBHOOK_SECRET`, comparação timing-safe).
- Idempotência via `Idempotency-Key` **por consumidor** para `POST /payments`
  (retries não duplicam cobrança). A reserva tem _fencing_ por `reservationId` (uma
  request zumbi reciclada não sobrescreve a reserva viva) e só é liberada na falha
  **se nenhuma cobrança/persistência ocorreu**; reservas presas por crash expiram por
  TTL curto (`IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS`, validado no boot contra o budget
  de retry da Efí). `payments.txid` tem **UNIQUE parcial** no banco (1 txid = 1
  pagamento por construção).
- **Estorno** (admin): o refund de **cartão não é idempotente na Efí** (chamadas
  repetidas podem duplicar a devolução), então o serviço faz um **claim otimista**
  (bump de `version`) antes de chamar o provedor — estornos concorrentes
  (duplo-clique) disputam o claim e só o vencedor chama a Efí; o perdedor recebe
  `409 REFUND_IN_PROGRESS` (ou a view atual, se o vencedor já concluiu).
- Atrás de proxy, a resolução do IP via `X-Forwarded-For` **falha fechada**: se a
  cadeia for mais curta que `TRUSTED_PROXY_HOPS`, usa o IP do socket (não a entrada
  controlada pelo cliente) — sem bypass da allowlist.
- Assinatura HMAC liga **método + path + `Idempotency-Key`** à mensagem assinada
  (`"<ts>.<MÉTODO>.<path>[.<idem>].<corpo>"`) — sem replay cross-endpoint (ex.:
  GET→DELETE) nem troca de chave; limite de corpo (anti-DoS, também no socket via
  `maxRequestBodySize` do Bun); o contêiner roda como usuário **não-root**;
  segredos/certs ficam fora do git e da imagem.

## Deploy (Railway)

O deploy usa `Dockerfile` (raiz: `packages/payments/Dockerfile`) + `railway.json`
(na raiz do repo — os demais serviços têm o seu em `packages/*/railway.json`).
O healthcheck aponta para **`/readyz`** (readiness: banco respondendo + warm-up
da Efí concluído) — a réplica nova só recebe tráfego com a Efí quente (sem isso
o redeploy reintroduzia o 502 do 1º Pix frio). Passo a passo:

1. **PostgreSQL**: adicione o plugin no projeto Railway e referencie
   `DATABASE_URL = ${{Postgres.DATABASE_URL}}` no serviço.
2. **Variáveis** no serviço: `NODE_ENV=production`, `EFI_CLIENT_ID`,
   `EFI_CLIENT_SECRET`, **`EFI_SANDBOX=false`** (obrigatório em produção — o boot
   **falha** se ficar `true`), `EFI_PIX_KEY`, o **certificado em base64** em
   `EFI_CERTIFICATE_BASE64` (não há upload de arquivo; senha do P12, se houver,
   em `EFI_CERTIFICATE_PASSWORD`), **`EFI_WEBHOOK_SECRET`** (obrigatório em
   produção — gate dos webhooks públicos) e **`METRICS_TOKEN`** (obrigatório em
   produção, ≥16 chars — protege o `GET /metrics` no ingress público).
   `TRUST_PROXY`: depende da topologia (ver `.env.example`) — gateway via
   **private networking** (recomendado) → `TRUST_PROXY=false` (IP do socket =
   IP privado do gateway); gateway via domínio público → `TRUST_PROXY=true` +
   `TRUSTED_PROXY_HOPS=1`. As demais alavancas têm defaults seguros e estão
   documentadas no `.env.example`; o boot valida as combinações perigosas.
3. O `railway.json` roda as migrations no **pre-deploy** (`db:migrate`) e sobe
   com `start`. Gere/commite as migrations antes: `bun run db:generate`.
   ⚠️ **Disciplina de migrations (expand-then-contract):** o pre-deploy roda com
   a réplica ANTIGA ainda servindo tráfego — toda migration precisa ser
   compatível com o código N-1 (adicionar antes de usar; nunca DROP/rename no
   mesmo deploy que para de usar). Índice em tabela grande → `CREATE INDEX
   CONCURRENTLY` em migration custom (não cabe em transação).
4. **Rede**: gere o domínio público (Settings → Networking → Generate Domain) —
   necessário porque a **Efí chama o webhook direto neste serviço** (o gateway
   não proxeia `/webhooks/efi`). O gateway alcança o payments pela rede privada:
   `PAYMENTS_URL=http://payments.railway.internal:<PORT>` no serviço do gateway
   (o bind é dual-stack `::` por default — env `HOST`).
5. **Consumidor** (sem ele toda chamada é 401):
   ```bash
   DATABASE_URL=... bun run db:seed --id gateway \
     --cidrs "fd00::/8" \
     --webhook-url https://<consumidor>/webhooks/pagamentos   # opcional (push)
   # imprime o HMAC secret — configure no gateway (resign)
   # private networking → CIDR privado (fd00::/8) ou o IP observado nos logs;
   # via domínio público → IP de egress público do gateway.
   ```
6. **Webhook** Pix (senão o pagamento fica eterno `PENDING`). ⚠️ A Efí
   **concatena `/pix` no FINAL da string registrada** — com query string, use o
   padrão oficial `&ignorar=` (o `/pix` extra cai no parâmetro dummy) e registre
   o **path completo** `/webhooks/efi/pix`:
   ```bash
   # via env (evita o shell comer o `&` no Windows):
   WEBHOOK_URL='https://<dominio>/webhooks/efi/pix?token=<EFI_WEBHOOK_SECRET>&ignorar=' \
     bun run webhook:register
   # a Efí chamará: .../webhooks/efi/pix?token=<segredo>&ignorar=/pix
   # usa validateMtls=false (skip mTLS) por padrão, necessário atrás de proxy
   # SEM token (só dev): --url https://<dominio>/webhooks/efi (a Efí acrescenta /pix ao path)
   ```
7. Valide em homologação (`EFI_SANDBOX=true`, `NODE_ENV` ≠ production) e só
   então troque credenciais + certificado + `EFI_SANDBOX=false` para produção
   (re-registre o webhook). Smoke: `/health`, `/readyz`, um Pix de valor mínimo
   ponta a ponta (cobrança → webhook → `payment.paid`).
8. **Monitoramento**: alerte sobre `GET /metrics` (com o token) —
   `outboxOldestPendingAgeSeconds`/`webhookDeliveriesOldestPendingAgeSeconds`
   (> 60s = poller parado), `*Dead` (> 0 = entregas mortas) e
   `amountMismatchPending` (> 0 = divergência de valor pago — revisão manual).

## Próximos passos

**Pix Automático** (recorrência Pix nativa) e o sandbox-check das assinaturas de
cartão (exigem `payment_token` de browser). Cartão avulso, assinaturas de cartão e
boleto (`/v1/charge/one-step`) já estão implementados (síncrono + assíncrono +
reconciliação + notificação por token). O serviço de catálogo (produtos/ofertas) já
existe (`@sistemazero/catalog`); o campo `metadata` do pagamento acomoda a origem
(ex.: `offerId`, enviado pelo funil).

Para escala/operação, considere ainda: rate limit/idempotência distribuídos
(Redis) para limite global preciso entre réplicas, e dashboards/alertas sobre o
`GET /metrics`.

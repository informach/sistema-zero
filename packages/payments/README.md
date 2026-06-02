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

## Segurança

- Nunca armazenamos PAN de cartão — apenas token + `last4` + bandeira (tokenização Efí).
- Pix exige certificado P12 da Efí (carregado no boot de `EFI_CERTIFICATE_PATH` ou
  `EFI_CERTIFICATE_BASE64`; senha opcional em `EFI_CERTIFICATE_PASSWORD`).
- Webhooks de entrada são deduplicados (o token de dedupe só é consumido após
  sucesso → falha no meio reprocessa), processados com **isolamento por item**, e a
  cobrança é **re-consultada** na Efí — conferindo inclusive o **valor pago** (no
  boleto, o **principal**, ignorando multa/juros) — antes de confirmar. Divergência
  de valor não confirma, loga (alertável) e para de reprocessar. Opcionalmente
  exigem `?token=` (`EFI_WEBHOOK_SECRET`).
- Idempotência via `Idempotency-Key` **por consumidor** para `POST /payments`
  (retries não duplicam cobrança). A reserva tem _fencing_ por `reservationId` (uma
  request zumbi reciclada não sobrescreve a reserva viva) e só é liberada na falha
  **se nenhuma cobrança/persistência ocorreu**; reservas presas por crash expiram por
  TTL curto.
- Atrás de proxy, a resolução do IP via `X-Forwarded-For` **falha fechada**: se a
  cadeia for mais curta que `TRUSTED_PROXY_HOPS`, usa o IP do socket (não a entrada
  controlada pelo cliente) — sem bypass da allowlist.
- Assinatura HMAC liga a `Idempotency-Key`; limite de corpo (anti-DoS, também no
  socket via `maxRequestBodySize` do Bun); o contêiner roda como usuário **não-root**;
  segredos/certs ficam fora do git e da imagem.

## Deploy (Railway)

O deploy usa `Dockerfile` (raiz: `packages/payments/Dockerfile`) + `railway.json`
(na raiz do repo). Passo a passo:

1. **PostgreSQL**: adicione o plugin no projeto Railway e referencie
   `DATABASE_URL = ${{Postgres.DATABASE_URL}}` no serviço.
2. **Variáveis** no serviço: `NODE_ENV=production`, `TRUST_PROXY=true`
   (obrigatório — Railway fica atrás de proxy, usa `X-Forwarded-For`) e
   `TRUSTED_PROXY_HOPS` = nº de proxies confiáveis na frente (Railway sozinho → 1;
   com Cloudflare na frente → 2), `EFI_CLIENT_ID`, `EFI_CLIENT_SECRET`,
   **`EFI_SANDBOX=false`** (em produção é obrigatório — o boot **falha** se ficar
   `true`), `EFI_PIX_KEY`, o **certificado em base64** em `EFI_CERTIFICATE_BASE64`
   (não há upload de arquivo; senha do P12, se houver, em `EFI_CERTIFICATE_PASSWORD`)
   e, opcionalmente, `EFI_WEBHOOK_SECRET` (token no webhook de entrada — **omita para
   desabilitar; string vazia não é aceita**).
3. O `railway.json` roda as migrations no **pre-deploy** (`db:migrate`) e sobe
   com `start`. Gere/commite as migrations antes: `bun run db:generate`.
4. **Domínio**: Settings → Networking → Generate Domain.
5. **Consumidor** (sem ele toda chamada é 401):
   ```bash
   DATABASE_URL=... bun run db:seed --id sistema-checkout \
     --cidrs "<ip-de-saida-do-consumidor>/32" \
     --webhook-url https://sistema-checkout.com/webhooks/pagamentos   # opcional (push)
   # imprime o HMAC secret — configure no sistema consumidor
   ```
6. **Webhook** Pix (senão o pagamento fica eterno `PENDING`):
   ```bash
   bun run webhook:register --url https://<seu-dominio>/webhooks/efi
   # a Efí acrescenta /pix → chama /webhooks/efi/pix
   # usa validateMtls=false (skip mTLS) por padrão, necessário atrás de proxy
   ```
7. Valide em homologação (`EFI_SANDBOX=true`) e só então troque credenciais +
   certificado + `EFI_SANDBOX=false` para produção (re-registre o webhook).

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

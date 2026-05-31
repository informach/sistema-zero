# @sistemazero/payments

Serviço de pagamentos/checkout consumido por outros sistemas internos. Processa
**Pix, boleto e cartão de crédito** (avulso e recorrente) através da **Efí Pay**.

Arquitetura: **DDD + Hexagonal (Ports & Adapters)**, SOLID, Clean Code. Foco em
performance, escala e segurança.

> Estado atual: scaffold completo + **fatia vertical de Pix** funcionando
> ponta-a-ponta (criar cobrança → webhook de confirmação → evento de domínio).
> Boleto, cartão e recorrência têm os _ports_/contratos prontos; os _adapters_
> são o próximo passo.

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

# 3. Banco (PostgreSQL). Exemplo com Docker:
docker run -d --name pg-payments -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=payments -p 5432:5432 postgres:16

# 4. Migrations
bun run db:generate   # gera SQL a partir do schema
bun run db:migrate    # aplica no banco

# 5. Subir o serviço
bun run dev           # ou, na raiz: bun run dev:payments
```

- API docs (OpenAPI/Swagger): `GET /swagger`
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
outbox (`OUTBOX_MAX_ATTEMPTS`); reconciliação (rede de segurança p/ webhooks
perdidos) e `GET /metrics` (lag de outbox/fila/dead-letter). O teto de throughput
é a **API da Efí** — daí o modo assíncrono + retry/backoff. Em escala, use um
**pooler** de Postgres (`DATABASE_POOL_MAX` × réplicas não pode estourar o
`max_connections`; o `LISTEN` usa +1 conexão dedicada por instância).

## Segurança

- Nunca armazenamos PAN de cartão — apenas token + `last4` + bandeira (tokenização Efí).
- Pix exige certificado P12 da Efí (carregado no boot a partir de `EFI_CERTIFICATE_PATH`).
- Webhooks de entrada são deduplicados (o token de dedupe só é consumido após
  sucesso → falha no meio reprocessa), processados com **isolamento por item**, e a
  cobrança é **re-consultada** na Efí — conferindo inclusive o **valor pago** —
  antes de confirmar. Opcionalmente exigem `?token=` (`EFI_WEBHOOK_SECRET`).
- Idempotência via `Idempotency-Key` **por consumidor** para `POST /payments`
  (retries não duplicam cobrança; reservas presas por crash expiram por TTL curto).
- Assinatura HMAC liga a `Idempotency-Key`; limite de corpo (anti-DoS); o
  contêiner roda como usuário **não-root**; segredos/certs ficam fora do git e da imagem.

## Deploy (Railway)

O deploy usa `Dockerfile` (raiz: `packages/payments/Dockerfile`) + `railway.json`
(na raiz do repo). Passo a passo:

1. **PostgreSQL**: adicione o plugin no projeto Railway e referencie
   `DATABASE_URL = ${{Postgres.DATABASE_URL}}` no serviço.
2. **Variáveis** no serviço: `NODE_ENV=production`, `TRUST_PROXY=true`
   (obrigatório — Railway fica atrás de proxy, usa `X-Forwarded-For`) e
   `TRUSTED_PROXY_HOPS` = nº de proxies confiáveis na frente (Railway sozinho → 1;
   com Cloudflare na frente → 2), `EFI_CLIENT_ID`, `EFI_CLIENT_SECRET`,
   `EFI_SANDBOX`, `EFI_PIX_KEY`, o **certificado em base64** em
   `EFI_CERTIFICATE_BASE64` (não há upload de arquivo) e, opcionalmente,
   `EFI_WEBHOOK_SECRET` (token no webhook de entrada).
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

Adapters de boleto (`/v1/charge/one-step`) e cartão (tokenização + `/charges`),
recorrência (assinaturas + Pix Automático) e integração com o futuro serviço de
produtos/ofertas (o campo `metadata` do pagamento já acomoda a origem).

Para escala/operação, considere ainda: rate limit/idempotência distribuídos
(Redis) para limite global preciso entre réplicas, e dashboards/alertas sobre o
`GET /metrics`.

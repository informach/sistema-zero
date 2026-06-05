import { describe, expect, test } from 'bun:test'
import { CancelSubscriptionService } from '../../src/application/cancel-subscription/cancel-subscription.service'
import { CreateSubscriptionService } from '../../src/application/create-subscription/create-subscription.service'
import { GetAdminPaymentService } from '../../src/application/get-admin-payment/get-admin-payment.service'
import { GetAdminSubscriptionService } from '../../src/application/get-admin-subscription/get-admin-subscription.service'
import { GetMyPaymentService } from '../../src/application/get-my-payment/get-my-payment.service'
import { GetPaymentService } from '../../src/application/get-payment/get-payment.service'
import { GetSubscriptionService } from '../../src/application/get-subscription/get-subscription.service'
import { HandleBoletoNotificationService } from '../../src/application/handle-boleto-notification/handle-boleto-notification.service'
import { HandleProviderWebhookService } from '../../src/application/handle-provider-webhook/handle-provider-webhook.service'
import { HandleSubscriptionNotificationService } from '../../src/application/handle-subscription-notification/handle-subscription-notification.service'
import { ListMyPaymentsService } from '../../src/application/list-my-payments/list-my-payments.service'
import { ListPaymentsService } from '../../src/application/list-payments/list-payments.service'
import { ListSubscriptionsService } from '../../src/application/list-subscriptions/list-subscriptions.service'
import { GetPaymentsOpsService } from '../../src/application/payments-ops/get-payments-ops.service'
import { GetDailyPaymentsStatsService } from '../../src/application/payments-stats/get-daily-payments-stats.service'
import { GetPaymentsStatsService } from '../../src/application/payments-stats/get-payments-stats.service'
import { ProcessPaymentService } from '../../src/application/process-payment/process-payment.service'
import { RefundPaymentService } from '../../src/application/refund-payment/refund-payment.service'
import type { PaymentAdminReadRepository } from '../../src/domain/ports/payment-admin-read.port'
import type { PaymentMyReadRepository } from '../../src/domain/ports/payment-my-read.port'
import type { SubscriptionAdminReadRepository } from '../../src/domain/ports/subscription-admin-read.port'
import type { Env } from '../../src/infrastructure/config/env'
import { signHmac } from '../../src/infrastructure/security/hmac'
import { InMemoryRateLimiter } from '../../src/infrastructure/security/rate-limiter'
import { createServer } from '../../src/interfaces/http/server'
import {
  FakePixGateway,
  InMemoryConsumerRepository,
  InMemoryIdempotencyStore,
  InMemoryPaymentRepository,
  InMemorySubscriptionPlanRegistry,
  InMemorySubscriptionRepository,
  InMemoryWebhookInbox,
  silentLogger,
} from '../fakes/in-memory'

interface BuildOpts {
  async?: boolean
  rateLimit?: number
  allowedCidrsA?: string[]
  maxBodyBytes?: number
  trustedProxyHops?: number
  /** Liga a checagem `requireAdmin` nas rotas `/payments/admin/*`. */
  requireAdmin?: boolean
  /** Token interno do gateway (`x-internal-token`) — admin + minhas compras. */
  internalToken?: string
  /** Define `EFI_WEBHOOK_SECRET` (gate `?token=`/`x-webhook-token` dos webhooks). */
  webhookSecret?: string
  /** Teto global das rotas de webhook (req/min). */
  webhookRateLimit?: number
  /** Define `METRICS_TOKEN` (gate do GET /metrics). */
  metricsToken?: string
  /** Resultado do probe de readiness (`/readyz`). Default: pronto. */
  readiness?: () => Promise<{ ready: boolean; checks: Record<string, string> }>
}

function buildApp(opts: BuildOpts = {}) {
  const repo = new InMemoryPaymentRepository()
  const subscriptionRepo = new InMemorySubscriptionRepository()
  const planRegistry = new InMemorySubscriptionPlanRegistry()
  const gateway = new FakePixGateway()
  const consumers = new InMemoryConsumerRepository()
    .add({
      id: 'sys-a',
      name: 'Sistema A',
      hmacSecret: 'secret-a',
      allowedCidrs: opts.allowedCidrsA ?? ['0.0.0.0/0'],
      isActive: true,
    })
    .add({
      id: 'sys-b',
      name: 'Sistema B',
      hmacSecret: 'secret-b',
      allowedCidrs: ['0.0.0.0/0'],
      isActive: true,
    })

  const env = {
    TRUST_PROXY: true,
    TRUSTED_PROXY_HOPS: opts.trustedProxyHops ?? 1,
    HMAC_TOLERANCE_SECONDS: 300,
    MAX_REQUEST_BODY_BYTES: opts.maxBodyBytes ?? 64 * 1024,
    EFI_WEBHOOK_SECRET: opts.webhookSecret,
    METRICS_TOKEN: opts.metricsToken,
  } as unknown as Env

  // Stubs de leitura admin (estas integrações não exercem dados de listagem).
  const paymentsAdminRead: PaymentAdminReadRepository = {
    list: async () => ({ items: [], total: 0 }),
    stats: async () => ({
      totalCount: 0,
      paidCount: 0,
      paidAmountInCents: '0',
      refundedAmountInCents: '0',
      byStatus: [],
      byMethod: [],
    }),
    // Ecoa a janela recebida (verifica o parse de from/to na rota) + 1 bucket fixo.
    statsDaily: async (range) => ({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      days: [
        {
          day: '2026-06-01',
          grossAmountInCents: '9700',
          refundedAmountInCents: '0',
          netAmountInCents: '9700',
          transactions: 2,
          cancellations: 0,
        },
      ],
    }),
    ops: async () => ({
      outboxPending: 0,
      outboxDead: 0,
      paymentsAwaitingCharge: 0,
      webhookDeliveriesPending: 0,
      webhookDeliveriesDead: 0,
      reconcilePending: 0,
      outboxOldestPendingAgeSeconds: null,
      webhookDeliveriesOldestPendingAgeSeconds: null,
      amountMismatchPending: 0,
    }),
  }
  const subscriptionsAdminRead: SubscriptionAdminReadRepository = {
    list: async () => ({ items: [], total: 0 }),
  }

  // Leitura "minhas compras" sobre o repositório em memória (espelha o adapter
  // real: escopo SEMPRE por e-mail do customer; id alheio → null).
  const emailOf = (p: { toSnapshot(): { customer?: { email: string } | null } }) =>
    p.toSnapshot().customer?.email?.toLowerCase() ?? null
  const paymentsMyRead: PaymentMyReadRepository = {
    async listByEmail({ email, limit, offset }) {
      const all = [...repo.byId.values()]
        .filter((p) => emailOf(p) === email.toLowerCase())
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      return { items: all.slice(offset, offset + limit), total: all.length }
    },
    async findByEmailAndId(email, id) {
      const p = repo.byId.get(id)
      return p && emailOf(p) === email.toLowerCase() ? p : null
    },
  }

  const app = createServer({
    env,
    logger: silentLogger,
    consumers,
    rateLimiter: new InMemoryRateLimiter(opts.rateLimit ?? 1000),
    webhookRateLimiter: new InMemoryRateLimiter(opts.webhookRateLimit ?? 1000),
    readiness: opts.readiness ?? (async () => ({ ready: true, checks: { db: 'ok' } })),
    processPayment: new ProcessPaymentService(
      repo,
      gateway,
      new InMemoryIdempotencyStore(),
      {
        pixKey: 'pix@loja.com',
        idempotencyTtlSeconds: 3600,
        idempotencyInFlightTtlSeconds: 120,
        asyncChargeCreation: opts.async ?? false,
        boletoDefaultExpiresDays: 3,
      },
      silentLogger,
    ),
    getPayment: new GetPaymentService(repo),
    createSubscription: new CreateSubscriptionService(
      subscriptionRepo,
      repo,
      planRegistry,
      gateway,
      new InMemoryIdempotencyStore(),
      { idempotencyTtlSeconds: 3600, idempotencyInFlightTtlSeconds: 120 },
      silentLogger,
    ),
    getSubscription: new GetSubscriptionService(subscriptionRepo),
    cancelSubscription: new CancelSubscriptionService(subscriptionRepo, gateway, silentLogger),
    handleWebhook: new HandleProviderWebhookService(
      repo,
      gateway,
      new InMemoryWebhookInbox(),
      silentLogger,
    ),
    handleBoletoNotification: new HandleBoletoNotificationService(
      repo,
      gateway,
      new InMemoryWebhookInbox(),
      silentLogger,
      new HandleSubscriptionNotificationService(
        subscriptionRepo,
        repo,
        gateway,
        new InMemoryWebhookInbox(),
        silentLogger,
      ),
    ),
    getMetrics: async () => ({
      outboxPending: 0,
      outboxDead: 0,
      paymentsAwaitingCharge: 0,
      webhookDeliveriesPending: 0,
      webhookDeliveriesDead: 0,
      outboxOldestPendingAgeSeconds: null,
      webhookDeliveriesOldestPendingAgeSeconds: null,
      amountMismatchPending: 0,
    }),
    requireAdminEnabled: opts.requireAdmin ?? false,
    internalToken: opts.internalToken,
    listPayments: new ListPaymentsService(paymentsAdminRead),
    getAdminPayment: new GetAdminPaymentService(repo),
    listSubscriptions: new ListSubscriptionsService(subscriptionsAdminRead),
    getAdminSubscription: new GetAdminSubscriptionService(subscriptionRepo),
    getPaymentsStats: new GetPaymentsStatsService(paymentsAdminRead),
    getDailyPaymentsStats: new GetDailyPaymentsStatsService(paymentsAdminRead),
    getPaymentsOps: new GetPaymentsOpsService(paymentsAdminRead),
    refundPayment: new RefundPaymentService(repo, gateway, silentLogger),
    listMyPayments: new ListMyPaymentsService(paymentsMyRead),
    getMyPayment: new GetMyPaymentService(paymentsMyRead),
  })

  return { app, repo, subscriptionRepo, gateway }
}

const now = () => Math.floor(Date.now() / 1000)
function sig(secret: string, msg: string): string {
  const t = now()
  return `t=${t},v1=${signHmac(secret, msg, t)}`
}

/** Mensagem canônica do consumer auth: "<MÉTODO>.<path>[.<key>].<body>". */
function canonical(method: string, path: string, body: string, key?: string): string {
  const head = `${method}.${path}`
  return key ? `${head}.${key}.${body}` : `${head}.${body}`
}

/** Headers de POST (default /payments): assina "POST.<path>.<idempotencyKey>.<body>". */
function postHeaders(
  body: string,
  opts: { consumerId?: string; secret?: string; key?: string; xff?: string; path?: string } = {},
) {
  const {
    consumerId = 'sys-a',
    secret = 'secret-a',
    key = 'idem-12345678',
    xff = '203.0.113.10',
    path = '/payments',
  } = opts
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-consumer-id': consumerId,
    'x-forwarded-for': xff,
    'x-signature': sig(secret, canonical('POST', path, body, key || undefined)),
  }
  if (key) headers['idempotency-key'] = key
  return headers
}

/** Headers de leitura/DELETE (corpo vazio, sem idempotency-key) — assina "<MÉTODO>.<path>.". */
function getHeaders(
  opts: { consumerId?: string; secret?: string; xff?: string; path?: string; method?: string } = {},
) {
  const {
    consumerId = 'sys-a',
    secret = 'secret-a',
    xff = '203.0.113.10',
    path = '/payments',
    method = 'GET',
  } = opts
  return {
    'x-consumer-id': consumerId,
    'x-forwarded-for': xff,
    'x-signature': sig(secret, canonical(method, path, '')),
  }
}

const PIX_BODY = JSON.stringify({ amountInCents: 1000, method: 'PIX', description: 'Pedido' })

const BOLETO_BODY = JSON.stringify({
  amountInCents: 5000,
  method: 'BOLETO',
  customer: {
    name: 'João da Silva',
    email: 'joao@example.com',
    document: '52998224725',
    phone: '11999998888',
    address: {
      street: 'Rua A',
      number: '100',
      neighborhood: 'Centro',
      zipcode: '01001000',
      city: 'São Paulo',
      state: 'SP',
    },
  },
})

const CARD_BODY = JSON.stringify({
  amountInCents: 3700,
  method: 'CREDIT_CARD',
  card: { token: 'paytok-abc', brand: 'visa', last4: '4242', installments: 3 },
  customer: {
    name: 'João da Silva',
    email: 'joao@example.com',
    document: '52998224725',
    phone: '11999998888',
    birth: '1990-05-10',
    address: {
      street: 'Rua A',
      number: '100',
      neighborhood: 'Centro',
      zipcode: '01001000',
      city: 'São Paulo',
      state: 'SP',
    },
  },
})

const SUB_BODY = JSON.stringify({
  amountInCents: 1000,
  intervalMonths: 1,
  card: { token: 'paytok-abc', brand: 'visa', last4: '4242' },
  customer: {
    name: 'João da Silva',
    email: 'joao@example.com',
    document: '52998224725',
    phone: '11999998888',
    birth: '1990-05-10',
    address: {
      street: 'Rua A',
      number: '100',
      neighborhood: 'Centro',
      zipcode: '01001000',
      city: 'São Paulo',
      state: 'SP',
    },
  },
})

describe('HTTP server', () => {
  test('GET /health responde 200', async () => {
    const { app } = buildApp()
    const res = await app.handle(new Request('http://localhost/health'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: 'ok', service: 'payments' })
  })

  test('GET /readyz pronto → 200; não-pronto → 503 (healthcheck do Railway)', async () => {
    const ready = buildApp()
    const ok = await ready.app.handle(new Request('http://localhost/readyz'))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toMatchObject({ status: 'ready' })

    // Warm-up da Efí ainda pendente → a réplica NÃO pode receber tráfego (o 1º
    // Pix pagaria o handshake mTLS frio dentro da request → 502 no funil).
    const warming = buildApp({
      readiness: async () => ({ ready: false, checks: { db: 'ok', efiWarmup: 'pending' } }),
    })
    const notReady = await warming.app.handle(new Request('http://localhost/readyz'))
    expect(notReady.status).toBe(503)
    expect(await notReady.json()).toMatchObject({
      status: 'unavailable',
      checks: { efiWarmup: 'pending' },
    })
  })

  describe('METRICS_TOKEN (gate do GET /metrics)', () => {
    const TOKEN = 'token-metrics-16chars'

    test('com token configurado: sem credencial → 401; errada → 401', async () => {
      const { app } = buildApp({ metricsToken: TOKEN })
      const bare = await app.handle(new Request('http://localhost/metrics'))
      expect(bare.status).toBe(401)
      const wrong = await app.handle(
        new Request('http://localhost/metrics', { headers: { 'x-metrics-token': 'errado' } }),
      )
      expect(wrong.status).toBe(401)
    })

    test('x-metrics-token ou Bearer corretos → 200', async () => {
      const { app } = buildApp({ metricsToken: TOKEN })
      const viaHeader = await app.handle(
        new Request('http://localhost/metrics', { headers: { 'x-metrics-token': TOKEN } }),
      )
      expect(viaHeader.status).toBe(200)
      const viaBearer = await app.handle(
        new Request('http://localhost/metrics', { headers: { authorization: `Bearer ${TOKEN}` } }),
      )
      expect(viaBearer.status).toBe(200)
      expect(await viaBearer.json()).toMatchObject({ outboxPending: 0 })
    })

    test('sem token configurado (dev), /metrics segue aberto', async () => {
      const { app } = buildApp()
      const res = await app.handle(new Request('http://localhost/metrics'))
      expect(res.status).toBe(200)
    })
  })

  test('webhooks têm rate limit global → 429 com Retry-After (backpressure)', async () => {
    const { app } = buildApp({ webhookRateLimit: 2 })
    const hook = () =>
      app.handle(
        new Request('http://localhost/webhooks/efi/pix', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ pix: [] }),
        }),
      )
    expect((await hook()).status).toBe(200)
    expect((await hook()).status).toBe(200)
    const limited = await hook()
    expect(limited.status).toBe(429)
    expect(limited.headers.get('retry-after')).toBeTruthy()
    // O limite é compartilhado entre as rotas de webhook (chave global única).
    const cobrancas = await app.handle(
      new Request('http://localhost/webhooks/efi/cobrancas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    )
    expect(cobrancas.status).toBe(429)
  })

  test('POST /payments sem autenticação → 401', async () => {
    const { app } = buildApp()
    const res = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: PIX_BODY,
      }),
    )
    expect(res.status).toBe(401)
  })

  test('POST /payments autenticado cria cobrança Pix → 201', async () => {
    const { app } = buildApp()
    const res = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: postHeaders(PIX_BODY),
        body: PIX_BODY,
      }),
    )
    expect(res.status).toBe(201)
    const json = (await res.json()) as { status: string; pix?: { copiaECola: string } }
    expect(json.status).toBe('PENDING')
    expect(json.pix?.copiaECola).toBeDefined()
  })

  test('POST /payments com assinatura inválida → 401', async () => {
    const { app } = buildApp()
    const headers = postHeaders(PIX_BODY)
    headers['x-signature'] = 't=1700000000,v1=deadbeef'
    const res = await app.handle(
      new Request('http://localhost/payments', { method: 'POST', headers, body: PIX_BODY }),
    )
    expect(res.status).toBe(401)
  })

  test('assinatura VÁLIDA mas com timestamp fora da tolerância (replay velho) → 401', async () => {
    const { app } = buildApp()
    // Assinatura criptograficamente correta, porém assinada 10min atrás
    // (tolerância: 300s) — anti-replay rejeita ANTES de comparar o HMAC.
    const oldTs = now() - 600
    const headers = postHeaders(PIX_BODY)
    headers['x-signature'] =
      `t=${oldTs},v1=${signHmac('secret-a', `POST./payments.idem-12345678.${PIX_BODY}`, oldTs)}`
    const res = await app.handle(
      new Request('http://localhost/payments', { method: 'POST', headers, body: PIX_BODY }),
    )
    expect(res.status).toBe(401)
  })

  test('replay trocando a Idempotency-Key (assinatura de outra chave) → 401', async () => {
    const { app } = buildApp()
    // A mensagem assinada inclui a Idempotency-Key ("<key>.<body>"); reusar a
    // assinatura com OUTRA chave (forçaria novo pagamento) não pode passar.
    const headers = postHeaders(PIX_BODY) // assina "POST./payments.idem-12345678.<body>"
    headers['idempotency-key'] = 'idem-OUTRA-CHAVE'
    const res = await app.handle(
      new Request('http://localhost/payments', { method: 'POST', headers, body: PIX_BODY }),
    )
    expect(res.status).toBe(401)
  })

  test('IP fora da allowlist → 403', async () => {
    const { app } = buildApp({ allowedCidrsA: ['10.0.0.0/8'] })
    const res = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: postHeaders(PIX_BODY, { xff: '203.0.113.10' }), // fora de 10.0.0.0/8
        body: PIX_BODY,
      }),
    )
    expect(res.status).toBe(403)
  })

  test('modo assíncrono → 202 sem pix', async () => {
    const { app } = buildApp({ async: true })
    const res = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: postHeaders(PIX_BODY),
        body: PIX_BODY,
      }),
    )
    expect(res.status).toBe(202)
    const json = (await res.json()) as { status: string; pix?: unknown }
    expect(json.pix).toBeUndefined()
  })

  test('excede o rate limit → 429', async () => {
    const { app } = buildApp({ rateLimit: 1 })
    const h1 = postHeaders(PIX_BODY, { key: 'idem-aaaaaaaa' })
    const h2 = postHeaders(PIX_BODY, { key: 'idem-bbbbbbbb' })
    const r1 = await app.handle(
      new Request('http://localhost/payments', { method: 'POST', headers: h1, body: PIX_BODY }),
    )
    const r2 = await app.handle(
      new Request('http://localhost/payments', { method: 'POST', headers: h2, body: PIX_BODY }),
    )
    expect(r1.status).toBe(201)
    expect(r2.status).toBe(429)
    expect(r2.headers.get('retry-after')).toBeTruthy()
  })

  test('mesma Idempotency-Key com payload diferente → 409', async () => {
    const { app } = buildApp()
    const body2 = JSON.stringify({ amountInCents: 2000, method: 'PIX' })
    const r1 = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: postHeaders(PIX_BODY, { key: 'idem-dup-001' }),
        body: PIX_BODY,
      }),
    )
    const r2 = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: postHeaders(body2, { key: 'idem-dup-001' }),
        body: body2,
      }),
    )
    expect(r1.status).toBe(201)
    expect(r2.status).toBe(409)
  })

  test('Idempotency-Key ausente → 400', async () => {
    const { app } = buildApp()
    const headers = postHeaders(PIX_BODY, { key: '' }) // sem idempotency-key (assina só o body)
    const res = await app.handle(
      new Request('http://localhost/payments', { method: 'POST', headers, body: PIX_BODY }),
    )
    expect(res.status).toBe(400)
  })

  test('corpo acima do limite → 413', async () => {
    const { app } = buildApp({ maxBodyBytes: 100 })
    const big = JSON.stringify({ amountInCents: 1000, method: 'PIX', description: 'x'.repeat(500) })
    const res = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: postHeaders(big),
        body: big,
      }),
    )
    expect(res.status).toBe(413)
  })

  test('X-Forwarded-For mais curto que os hops confiáveis → fail-closed (não confia no cliente)', async () => {
    // hops=2, mas o cliente envia só UMA entrada no XFF (forjada). Com a correção
    // fail-closed, essa entrada (controlada pelo cliente) NÃO é usada — cai no IP
    // do socket, que não casa a allowlist → 403 (sem bypass).
    const { app } = buildApp({ allowedCidrsA: ['203.0.113.10/32'], trustedProxyHops: 2 })
    const res = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: postHeaders(PIX_BODY, { xff: '203.0.113.10' }),
        body: PIX_BODY,
      }),
    )
    expect(res.status).toBe(403)
  })

  test('GET /payments/:id com id não-UUID → 400 (validação), não 500', async () => {
    const { app } = buildApp()
    const res = await app.handle(
      new Request('http://localhost/payments/not-a-uuid', {
        headers: getHeaders({ path: '/payments/not-a-uuid' }),
      }),
    )
    // O importante: 4xx limpo (validação) em vez de 500 da coluna `uuid` do Postgres.
    expect(res.status).toBe(400)
  })

  test('GET /payments/:id é escopado por consumidor (sem IDOR)', async () => {
    const { app } = buildApp()
    const created = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: postHeaders(PIX_BODY),
        body: PIX_BODY,
      }),
    )
    const { id } = (await created.json()) as { id: string }

    // dono (sys-a) → 200
    const own = await app.handle(
      new Request(`http://localhost/payments/${id}`, {
        headers: getHeaders({ path: `/payments/${id}` }),
      }),
    )
    expect(own.status).toBe(200)

    // outro consumidor (sys-b) → 404 (não revela o pagamento alheio)
    const other = await app.handle(
      new Request(`http://localhost/payments/${id}`, {
        headers: getHeaders({ consumerId: 'sys-b', secret: 'secret-b', path: `/payments/${id}` }),
      }),
    )
    expect(other.status).toBe(404)
  })

  test('POST /payments autenticado cria boleto → 201 com linha digitável', async () => {
    const { app } = buildApp()
    const res = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: postHeaders(BOLETO_BODY),
        body: BOLETO_BODY,
      }),
    )
    expect(res.status).toBe(201)
    const json = (await res.json()) as {
      status: string
      boleto?: { digitableLine: string; pdfUrl: string }
      pix?: unknown
    }
    expect(json.status).toBe('PENDING')
    expect(json.boleto?.digitableLine).toBeDefined()
    expect(json.boleto?.pdfUrl).toBeDefined()
    expect(json.pix).toBeUndefined()
  })

  test('POST /payments BOLETO sem pagador → 422', async () => {
    const { app } = buildApp()
    const body = JSON.stringify({ amountInCents: 5000, method: 'BOLETO' })
    const res = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: postHeaders(body),
        body,
      }),
    )
    expect(res.status).toBe(422)
  })

  test('modo assíncrono boleto → 202 sem boleto', async () => {
    const { app } = buildApp({ async: true })
    const res = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: postHeaders(BOLETO_BODY),
        body: BOLETO_BODY,
      }),
    )
    expect(res.status).toBe(202)
    const json = (await res.json()) as { boleto?: unknown }
    expect(json.boleto).toBeUndefined()
  })

  test('POST /webhooks/efi/cobrancas confirma o boleto pago', async () => {
    const { app, repo, gateway } = buildApp()
    const created = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: postHeaders(BOLETO_BODY),
        body: BOLETO_BODY,
      }),
    )
    const { id } = (await created.json()) as { id: string }
    const chargeId = (await repo.findById(id))!.providerPaymentId as string
    gateway.notificationChargeIds = [chargeId]
    gateway.boletoStatus = 'PAID'

    const notifBody = JSON.stringify({ notification: 'token-abc' })
    const res = await app.handle(
      new Request('http://localhost/webhooks/efi/cobrancas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: notifBody,
      }),
    )
    expect(res.status).toBe(200)
    expect((await repo.findById(id))!.status).toBe('PAID')
  })

  describe('EFI_WEBHOOK_SECRET (gate dos webhooks de entrada)', () => {
    const SECRET = 'segredo-webhook-forte'
    const pixHook = (url: string, headers: Record<string, string> = {}) =>
      new Request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify({ pix: [] }),
      })

    test('sem token → 401', async () => {
      const { app } = buildApp({ webhookSecret: SECRET })
      const res = await app.handle(pixHook('http://localhost/webhooks/efi/pix'))
      expect(res.status).toBe(401)
    })

    test('token errado → 401 (também no /cobrancas)', async () => {
      const { app } = buildApp({ webhookSecret: SECRET })
      const pix = await app.handle(pixHook('http://localhost/webhooks/efi/pix?token=errado'))
      expect(pix.status).toBe(401)
      const cob = await app.handle(
        new Request('http://localhost/webhooks/efi/cobrancas?token=errado', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ notification: 'tok' }),
        }),
      )
      expect(cob.status).toBe(401)
    })

    test('?token= correto → 200', async () => {
      const { app } = buildApp({ webhookSecret: SECRET })
      const res = await app.handle(pixHook(`http://localhost/webhooks/efi/pix?token=${SECRET}`))
      expect(res.status).toBe(200)
    })

    test('header x-webhook-token correto → 200', async () => {
      const { app } = buildApp({ webhookSecret: SECRET })
      const res = await app.handle(
        pixHook('http://localhost/webhooks/efi/pix', { 'x-webhook-token': SECRET }),
      )
      expect(res.status).toBe(200)
    })

    test('sem segredo configurado, webhook segue aberto (comportamento legado)', async () => {
      const { app } = buildApp()
      const res = await app.handle(pixHook('http://localhost/webhooks/efi/pix'))
      expect(res.status).toBe(200)
    })
  })

  test('POST /payments autenticado cobra cartão → 201 com dados do cartão, sem pix/boleto', async () => {
    const { app } = buildApp()
    const res = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: postHeaders(CARD_BODY),
        body: CARD_BODY,
      }),
    )
    expect(res.status).toBe(201)
    const json = (await res.json()) as {
      status: string
      card?: { brand: string; last4: string; installments: number }
      pix?: unknown
      boleto?: unknown
    }
    expect(json.status).toBe('PAID')
    expect(json.card).toEqual({ brand: 'visa', last4: '4242', installments: 3 })
    expect(json.pix).toBeUndefined()
    expect(json.boleto).toBeUndefined()
  })

  test('cartão IGNORA o modo assíncrono → 201 (cobrado na request, não 202)', async () => {
    const { app } = buildApp({ async: true })
    const res = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: postHeaders(CARD_BODY),
        body: CARD_BODY,
      }),
    )
    expect(res.status).toBe(201)
    const json = (await res.json()) as { status: string; card?: unknown }
    expect(json.status).toBe('PAID')
    expect(json.card).toBeDefined()
  })

  test('POST /payments CARTÃO sem data de nascimento → 201 (birth é opcional na Efí)', async () => {
    const { app } = buildApp()
    const body = JSON.stringify({
      amountInCents: 3700,
      method: 'CREDIT_CARD',
      card: { token: 'paytok-abc', brand: 'visa', last4: '4242', installments: 1 },
      customer: {
        name: 'João da Silva',
        email: 'joao@example.com',
        document: '52998224725',
        phone: '11999998888',
        address: {
          street: 'Rua A',
          number: '100',
          neighborhood: 'Centro',
          zipcode: '01001000',
          city: 'São Paulo',
          state: 'SP',
        },
      },
    })
    const res = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: postHeaders(body),
        body,
      }),
    )
    expect(res.status).toBe(201)
    const json = (await res.json()) as { status: string }
    expect(json.status).toBe('PAID')
  })

  test('POST /webhooks/efi/cobrancas confirma um cartão em análise (waiting) que vira pago', async () => {
    const { app, repo, gateway } = buildApp()
    // Cartão criado "em análise" → permanece PENDING com a cobrança registrada.
    gateway.cardStatus = 'PENDING'
    const created = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: postHeaders(CARD_BODY),
        body: CARD_BODY,
      }),
    )
    expect(created.status).toBe(201)
    const { id } = (await created.json()) as { id: string }
    expect((await repo.findById(id))!.status).toBe('PENDING')

    const chargeId = (await repo.findById(id))!.providerPaymentId as string
    gateway.notificationChargeIds = [chargeId]
    gateway.cardStatus = 'PAID'

    const notifBody = JSON.stringify({ notification: 'token-card' })
    const res = await app.handle(
      new Request('http://localhost/webhooks/efi/cobrancas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: notifBody,
      }),
    )
    expect(res.status).toBe(200)
    expect((await repo.findById(id))!.status).toBe('PAID')
  })

  test('POST /subscriptions autenticado cria assinatura → 201 com cartão, sem token', async () => {
    const { app } = buildApp()
    const res = await app.handle(
      new Request('http://localhost/subscriptions', {
        method: 'POST',
        headers: postHeaders(SUB_BODY, { key: 'idem-sub-aaaa', path: '/subscriptions' }),
        body: SUB_BODY,
      }),
    )
    expect(res.status).toBe(201)
    const json = (await res.json()) as {
      id: string
      status: string
      card?: { brand: string; last4: string; token?: string }
      intervalMonths: number
    }
    expect(json.status).toBe('ACTIVE')
    expect(json.card).toEqual({ brand: 'visa', last4: '4242' })
    expect((json.card as { token?: string }).token).toBeUndefined()
    expect(json.intervalMonths).toBe(1)
  })

  test('POST /subscriptions sem data de nascimento → 422', async () => {
    const { app } = buildApp()
    const body = JSON.stringify({
      amountInCents: 1000,
      intervalMonths: 1,
      card: { token: 'paytok-abc', brand: 'visa', last4: '4242' },
      customer: {
        name: 'João da Silva',
        email: 'joao@example.com',
        document: '52998224725',
        phone: '11999998888',
        address: {
          street: 'Rua A',
          number: '100',
          neighborhood: 'Centro',
          zipcode: '01001000',
          city: 'São Paulo',
          state: 'SP',
        },
      },
    })
    const res = await app.handle(
      new Request('http://localhost/subscriptions', {
        method: 'POST',
        headers: postHeaders(body, { key: 'idem-sub-bbbb', path: '/subscriptions' }),
        body,
      }),
    )
    expect(res.status).toBe(422)
  })

  test('GET /subscriptions/:id é escopado por consumidor (sem IDOR)', async () => {
    const { app } = buildApp()
    const created = await app.handle(
      new Request('http://localhost/subscriptions', {
        method: 'POST',
        headers: postHeaders(SUB_BODY, { key: 'idem-sub-cccc', path: '/subscriptions' }),
        body: SUB_BODY,
      }),
    )
    const { id } = (await created.json()) as { id: string }

    const own = await app.handle(
      new Request(`http://localhost/subscriptions/${id}`, {
        headers: getHeaders({ path: `/subscriptions/${id}` }),
      }),
    )
    expect(own.status).toBe(200)

    const other = await app.handle(
      new Request(`http://localhost/subscriptions/${id}`, {
        headers: getHeaders({
          consumerId: 'sys-b',
          secret: 'secret-b',
          path: `/subscriptions/${id}`,
        }),
      }),
    )
    expect(other.status).toBe(404)
  })

  test('DELETE /subscriptions/:id cancela', async () => {
    const { app, gateway } = buildApp()
    const created = await app.handle(
      new Request('http://localhost/subscriptions', {
        method: 'POST',
        headers: postHeaders(SUB_BODY, { key: 'idem-sub-dddd', path: '/subscriptions' }),
        body: SUB_BODY,
      }),
    )
    const { id, providerSubscriptionId } = (await created.json()) as {
      id: string
      providerSubscriptionId: string
    }

    const res = await app.handle(
      new Request(`http://localhost/subscriptions/${id}`, {
        method: 'DELETE',
        // A assinatura amarra o MÉTODO: a de um GET não vale num DELETE.
        headers: getHeaders({ method: 'DELETE', path: `/subscriptions/${id}` }),
      }),
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { status: string }
    expect(json.status).toBe('CANCELED')
    expect(gateway.canceledSubscriptionIds).toContain(providerSubscriptionId)
  })

  test('replay cross-endpoint: assinatura de GET NÃO vale num DELETE (método+path na mensagem)', async () => {
    const { app } = buildApp()
    const created = await app.handle(
      new Request('http://localhost/subscriptions', {
        method: 'POST',
        headers: postHeaders(SUB_BODY, { key: 'idem-sub-replay', path: '/subscriptions' }),
        body: SUB_BODY,
      }),
    )
    const { id } = (await created.json()) as { id: string }

    // Assinatura legítima de um GET (corpo vazio) na mesma janela de tolerância…
    const getSig = getHeaders({ path: `/subscriptions/${id}` })
    const getRes = await app.handle(
      new Request(`http://localhost/subscriptions/${id}`, { headers: getSig }),
    )
    expect(getRes.status).toBe(200)

    // …replayada num DELETE do MESMO path (corpo igualmente vazio) → 401.
    // Antes do binding método+path, as duas mensagens eram idênticas e o replay
    // CANCELARIA a assinatura.
    const replay = await app.handle(
      new Request(`http://localhost/subscriptions/${id}`, { method: 'DELETE', headers: getSig }),
    )
    expect(replay.status).toBe(401)
  })

  test('webhook de assinatura cria o pagamento de um ciclo recorrente', async () => {
    const { app, repo, subscriptionRepo, gateway } = buildApp()
    // Sem 1ª cobrança na criação → o webhook cria o ciclo.
    gateway.firstChargeStatus = undefined
    gateway.subscriptionStatus = 'PENDING'
    const created = await app.handle(
      new Request('http://localhost/subscriptions', {
        method: 'POST',
        headers: postHeaders(SUB_BODY, { key: 'idem-sub-eeee', path: '/subscriptions' }),
        body: SUB_BODY,
      }),
    )
    const { id, providerSubscriptionId } = (await created.json()) as {
      id: string
      providerSubscriptionId: string
    }

    gateway.cardStatus = 'PAID'
    gateway.notificationEntries = [
      { chargeId: 'cycle-http-1', subscriptionId: providerSubscriptionId },
    ]
    const res = await app.handle(
      new Request('http://localhost/webhooks/efi/cobrancas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notification: 'token-sub' }),
      }),
    )
    expect(res.status).toBe(200)

    const cycle = await repo.findByProviderPaymentId('EFI', 'cycle-http-1')
    expect(cycle?.status).toBe('PAID')
    expect(cycle?.subscriptionId).toBe(id)
    expect((await subscriptionRepo.findById(id))?.status).toBe('ACTIVE')
  })
})

/** Headers `X-Auth-User-*` que o gateway injeta (anti-spoof) para as rotas admin. */
function adminHeaders(role = 'admin', status = 'active'): Record<string, string> {
  return { 'x-auth-user-role': role, 'x-auth-user-status': status }
}

describe('Rotas admin (/payments/admin/*)', () => {
  test('GET /payments/admin/payments sem requireAdmin → 200 (envelope paginado)', async () => {
    const { app } = buildApp()
    const res = await app.handle(new Request('http://localhost/payments/admin/payments'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ items: [], total: 0, limit: 20, offset: 0 })
  })

  test('requireAdmin ligado: sem headers → 401', async () => {
    const { app } = buildApp({ requireAdmin: true })
    const res = await app.handle(new Request('http://localhost/payments/admin/payments'))
    expect(res.status).toBe(401)
  })

  test('requireAdmin ligado: role não-admin → 403', async () => {
    const { app } = buildApp({ requireAdmin: true })
    const res = await app.handle(
      new Request('http://localhost/payments/admin/payments', { headers: adminHeaders('member') }),
    )
    expect(res.status).toBe(403)
  })

  test('requireAdmin ligado: conta inativa → 403', async () => {
    const { app } = buildApp({ requireAdmin: true })
    const res = await app.handle(
      new Request('http://localhost/payments/admin/payments', {
        headers: adminHeaders('admin', 'suspended'),
      }),
    )
    expect(res.status).toBe(403)
  })

  test('requireAdmin ligado: role admin mas SEM header de status → 401 (fail-closed)', async () => {
    const { app } = buildApp({ requireAdmin: true })
    // O gateway sempre injeta status junto com role; ausência = não passou pelo
    // gateway. "Ausente" não pode equivaler a "ativo".
    const res = await app.handle(
      new Request('http://localhost/payments/admin/payments', {
        headers: { 'x-auth-user-role': 'admin' },
      }),
    )
    expect(res.status).toBe(401)
  })

  test('requireAdmin ligado: admin ativo → 200', async () => {
    const { app } = buildApp({ requireAdmin: true })
    const res = await app.handle(
      new Request('http://localhost/payments/admin/payments', { headers: adminHeaders() }),
    )
    expect(res.status).toBe(200)
  })

  test('requireAdmin + internalToken: sem x-internal-token → 401 (mesmo com role admin)', async () => {
    const { app } = buildApp({ requireAdmin: true, internalToken: 'tok-interno-de-teste-16' })
    const res = await app.handle(
      new Request('http://localhost/payments/admin/payments', { headers: adminHeaders() }),
    )
    expect(res.status).toBe(401)
  })

  test('requireAdmin + internalToken: token errado → 401; token certo → 200', async () => {
    const { app } = buildApp({ requireAdmin: true, internalToken: 'tok-interno-de-teste-16' })
    const wrong = await app.handle(
      new Request('http://localhost/payments/admin/payments', {
        headers: { ...adminHeaders(), 'x-internal-token': 'errado' },
      }),
    )
    expect(wrong.status).toBe(401)
    const ok = await app.handle(
      new Request('http://localhost/payments/admin/payments', {
        headers: { ...adminHeaders(), 'x-internal-token': 'tok-interno-de-teste-16' },
      }),
    )
    expect(ok.status).toBe(200)
  })

  test('requireAdmin ligado: TODAS as rotas admin passam o gate com admin ativo', async () => {
    const { app } = buildApp({ requireAdmin: true })
    const ID = '00000000-0000-0000-0000-000000000000'
    // [rota, método, status esperado] — 200 = stub vazio; 404 = id inexistente
    // (mas JÁ passou pela auth — sem o gate seria 401).
    const cases: [string, string, number][] = [
      ['/payments/admin/payments', 'GET', 200],
      [`/payments/admin/payments/${ID}`, 'GET', 404],
      ['/payments/admin/subscriptions', 'GET', 200],
      [`/payments/admin/subscriptions/${ID}`, 'GET', 404],
      ['/payments/admin/stats', 'GET', 200],
      ['/payments/admin/stats/daily', 'GET', 200],
      ['/payments/admin/ops', 'GET', 200],
      [`/payments/admin/payments/${ID}/refund`, 'POST', 404],
      [`/payments/admin/subscriptions/${ID}`, 'DELETE', 404],
    ]
    for (const [path, method, expected] of cases) {
      const res = await app.handle(
        new Request(`http://localhost${path}`, { method, headers: adminHeaders() }),
      )
      expect(`${method} ${path} → ${res.status}`).toBe(`${method} ${path} → ${expected}`)
    }
  })

  test('GET /payments/admin/payments/:id com UUID malformado → 400 (não 500)', async () => {
    const { app } = buildApp()
    const res = await app.handle(new Request('http://localhost/payments/admin/payments/nao-uuid'))
    expect(res.status).toBe(400)
  })

  test('GET /payments/admin/payments/:id inexistente → 404', async () => {
    const { app } = buildApp()
    const res = await app.handle(
      new Request('http://localhost/payments/admin/payments/00000000-0000-0000-0000-000000000000'),
    )
    expect(res.status).toBe(404)
  })

  test('GET /payments/admin/stats → 200', async () => {
    const { app } = buildApp()
    const res = await app.handle(new Request('http://localhost/payments/admin/stats'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ totalCount: 0, paidCount: 0 })
  })

  test('GET /payments/admin/stats/daily → 200 (janela explícita ecoada + buckets)', async () => {
    const { app } = buildApp()
    const res = await app.handle(
      new Request(
        'http://localhost/payments/admin/stats/daily?from=2026-06-01T00:00:00.000Z&to=2026-06-03T00:00:00.000Z',
      ),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      from: string
      to: string
      days: { day: string; netAmountInCents: string; transactions: number }[]
    }
    expect(body.from).toBe('2026-06-01T00:00:00.000Z')
    expect(body.to).toBe('2026-06-03T00:00:00.000Z')
    expect(body.days.length).toBe(1)
    expect(body.days[0]).toMatchObject({
      day: '2026-06-01',
      netAmountInCents: '9700',
      transactions: 2,
    })
  })

  test('GET /payments/admin/stats/daily sem from/to → 200 (default últimos 30 dias)', async () => {
    const { app } = buildApp()
    const res = await app.handle(new Request('http://localhost/payments/admin/stats/daily'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { from: string; to: string }
    const windowMs = new Date(body.to).getTime() - new Date(body.from).getTime()
    expect(windowMs).toBe(30 * 24 * 60 * 60 * 1000)
  })

  test('requireAdmin ligado: stats/daily sem headers → 401', async () => {
    const { app } = buildApp({ requireAdmin: true })
    const res = await app.handle(new Request('http://localhost/payments/admin/stats/daily'))
    expect(res.status).toBe(401)
  })

  test('GET /payments/admin/ops → 200', async () => {
    const { app } = buildApp()
    const res = await app.handle(new Request('http://localhost/payments/admin/ops'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ outboxPending: 0, reconcilePending: 0 })
  })

  test('GET /payments/admin/subscriptions → 200 (envelope paginado)', async () => {
    const { app } = buildApp()
    const res = await app.handle(new Request('http://localhost/payments/admin/subscriptions'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ items: [], total: 0 })
  })

  test('POST /payments/admin/payments/:id/refund inexistente → 404', async () => {
    const { app } = buildApp()
    const res = await app.handle(
      new Request(
        'http://localhost/payments/admin/payments/00000000-0000-0000-0000-000000000000/refund',
        { method: 'POST' },
      ),
    )
    expect(res.status).toBe(404)
  })

  test('POST refund: requireAdmin ligado sem headers → 401', async () => {
    const { app } = buildApp({ requireAdmin: true })
    const res = await app.handle(
      new Request(
        'http://localhost/payments/admin/payments/00000000-0000-0000-0000-000000000000/refund',
        { method: 'POST' },
      ),
    )
    expect(res.status).toBe(401)
  })

  test('DELETE /payments/admin/subscriptions/:id inexistente → 404', async () => {
    const { app } = buildApp()
    const res = await app.handle(
      new Request(
        'http://localhost/payments/admin/subscriptions/00000000-0000-0000-0000-000000000000',
        { method: 'DELETE' },
      ),
    )
    expect(res.status).toBe(404)
  })
})

describe('Minhas compras (/payments/my — self-service do comprador)', () => {
  /** Cria um boleto via API (popula `customer.email`) e devolve o id. */
  async function createBoletoFor(
    app: ReturnType<typeof buildApp>['app'],
    email: string,
    key: string,
  ): Promise<string> {
    const body = JSON.stringify({
      ...JSON.parse(BOLETO_BODY),
      customer: { ...JSON.parse(BOLETO_BODY).customer, email },
    })
    const res = await app.handle(
      new Request('http://localhost/payments', {
        method: 'POST',
        headers: postHeaders(body, { key }),
        body,
      }),
    )
    expect(res.status).toBe(201)
    const json = (await res.json()) as { id: string }
    return json.id
  }

  test('sem X-Auth-User-Email → 401 (e NÃO cai na rota HMAC /payments/:id)', async () => {
    const { app } = buildApp()
    const res = await app.handle(new Request('http://localhost/payments/my'))
    expect(res.status).toBe(401)
    const json = (await res.json()) as { error: { code: string } }
    // 401 do requireBuyer (autenticação necessária), não o da auth de consumer.
    expect(json.error.code).toBe('UNAUTHORIZED')
  })

  test('com internalToken: sem/errado x-internal-token → 401; com o token → 200', async () => {
    const { app } = buildApp({ internalToken: 'tok-interno-de-teste-16' })
    const missing = await app.handle(
      new Request('http://localhost/payments/my', {
        headers: { 'x-auth-user-email': 'aluno@example.com' },
      }),
    )
    expect(missing.status).toBe(401)
    const wrong = await app.handle(
      new Request('http://localhost/payments/my', {
        headers: { 'x-auth-user-email': 'aluno@example.com', 'x-internal-token': 'errado' },
      }),
    )
    expect(wrong.status).toBe(401)
    const ok = await app.handle(
      new Request('http://localhost/payments/my', {
        headers: {
          'x-auth-user-email': 'aluno@example.com',
          'x-internal-token': 'tok-interno-de-teste-16',
        },
      }),
    )
    expect(ok.status).toBe(200)
  })

  test('lista SÓ as compras do e-mail das claims (sem vazar de outros)', async () => {
    const { app } = buildApp()
    const mine = await createBoletoFor(app, 'aluno@example.com', 'idem-my-1')
    await createBoletoFor(app, 'outra@example.com', 'idem-my-2')

    const res = await app.handle(
      new Request('http://localhost/payments/my', {
        headers: { 'x-auth-user-email': 'Aluno@Example.com' }, // case-insensitive
      }),
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      items: Array<Record<string, unknown>>
      total: number
    }
    expect(json.total).toBe(1)
    expect(json.items[0]?.id).toBe(mine)
    // PaymentView pública: sem dados do cliente/provedor (≠ AdminPaymentView).
    expect(json.items[0]?.customer).toBeUndefined()
    expect(json.items[0]?.provider).toBeUndefined()
  })

  test('detalhe de compra alheia → 404 (anti-IDOR); a própria → 200', async () => {
    const { app } = buildApp()
    const mine = await createBoletoFor(app, 'aluno@example.com', 'idem-my-3')
    const other = await createBoletoFor(app, 'outra@example.com', 'idem-my-4')
    const headers = { 'x-auth-user-email': 'aluno@example.com' }

    const stranger = await app.handle(
      new Request(`http://localhost/payments/my/${other}`, { headers }),
    )
    expect(stranger.status).toBe(404)

    const own = await app.handle(new Request(`http://localhost/payments/my/${mine}`, { headers }))
    expect(own.status).toBe(200)
    const json = (await own.json()) as { id: string; boleto?: { digitableLine: string } }
    expect(json.id).toBe(mine)
    expect(json.boleto?.digitableLine).toBeDefined()
  })

  test('paginação (limit/offset) e UUID malformado → 400', async () => {
    const { app } = buildApp()
    await createBoletoFor(app, 'aluno@example.com', 'idem-my-5')
    await createBoletoFor(app, 'aluno@example.com', 'idem-my-6')
    const headers = { 'x-auth-user-email': 'aluno@example.com' }

    const page = await app.handle(
      new Request('http://localhost/payments/my?limit=1&offset=1', { headers }),
    )
    expect(page.status).toBe(200)
    const json = (await page.json()) as { items: unknown[]; total: number; limit: number }
    expect(json.total).toBe(2)
    expect(json.items).toHaveLength(1)
    expect(json.limit).toBe(1)

    const bad = await app.handle(new Request('http://localhost/payments/my/nao-uuid', { headers }))
    expect(bad.status).toBe(400)
  })
})

import { describe, expect, test } from 'bun:test'
import { CancelSubscriptionService } from '../../src/application/cancel-subscription/cancel-subscription.service'
import { CreateSubscriptionService } from '../../src/application/create-subscription/create-subscription.service'
import { GetPaymentService } from '../../src/application/get-payment/get-payment.service'
import { GetSubscriptionService } from '../../src/application/get-subscription/get-subscription.service'
import { HandleBoletoNotificationService } from '../../src/application/handle-boleto-notification/handle-boleto-notification.service'
import { HandleProviderWebhookService } from '../../src/application/handle-provider-webhook/handle-provider-webhook.service'
import { HandleSubscriptionNotificationService } from '../../src/application/handle-subscription-notification/handle-subscription-notification.service'
import { ProcessPaymentService } from '../../src/application/process-payment/process-payment.service'
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
    EFI_WEBHOOK_SECRET: undefined,
  } as unknown as Env

  const app = createServer({
    env,
    logger: silentLogger,
    consumers,
    rateLimiter: new InMemoryRateLimiter(opts.rateLimit ?? 1000),
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
    }),
  })

  return { app, repo, subscriptionRepo, gateway }
}

const now = () => Math.floor(Date.now() / 1000)
function sig(secret: string, msg: string): string {
  const t = now()
  return `t=${t},v1=${signHmac(secret, msg, t)}`
}

/** Headers de POST /payments: assina "<idempotencyKey>.<body>". */
function postHeaders(
  body: string,
  opts: { consumerId?: string; secret?: string; key?: string; xff?: string } = {},
) {
  const {
    consumerId = 'sys-a',
    secret = 'secret-a',
    key = 'idem-12345678',
    xff = '203.0.113.10',
  } = opts
  // Mensagem canônica: com key → "<key>.<body>"; sem key → "<body>".
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-consumer-id': consumerId,
    'x-forwarded-for': xff,
    'x-signature': sig(secret, key ? `${key}.${body}` : body),
  }
  if (key) headers['idempotency-key'] = key
  return headers
}

/** Headers de GET (corpo vazio, sem idempotency-key). */
function getHeaders(opts: { consumerId?: string; secret?: string; xff?: string } = {}) {
  const { consumerId = 'sys-a', secret = 'secret-a', xff = '203.0.113.10' } = opts
  return { 'x-consumer-id': consumerId, 'x-forwarded-for': xff, 'x-signature': sig(secret, '') }
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
      new Request('http://localhost/payments/not-a-uuid', { headers: getHeaders() }),
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
      new Request(`http://localhost/payments/${id}`, { headers: getHeaders() }),
    )
    expect(own.status).toBe(200)

    // outro consumidor (sys-b) → 404 (não revela o pagamento alheio)
    const other = await app.handle(
      new Request(`http://localhost/payments/${id}`, {
        headers: getHeaders({ consumerId: 'sys-b', secret: 'secret-b' }),
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
        headers: postHeaders(SUB_BODY, { key: 'idem-sub-aaaa' }),
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
        headers: postHeaders(body, { key: 'idem-sub-bbbb' }),
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
        headers: postHeaders(SUB_BODY, { key: 'idem-sub-cccc' }),
        body: SUB_BODY,
      }),
    )
    const { id } = (await created.json()) as { id: string }

    const own = await app.handle(
      new Request(`http://localhost/subscriptions/${id}`, { headers: getHeaders() }),
    )
    expect(own.status).toBe(200)

    const other = await app.handle(
      new Request(`http://localhost/subscriptions/${id}`, {
        headers: getHeaders({ consumerId: 'sys-b', secret: 'secret-b' }),
      }),
    )
    expect(other.status).toBe(404)
  })

  test('DELETE /subscriptions/:id cancela', async () => {
    const { app, gateway } = buildApp()
    const created = await app.handle(
      new Request('http://localhost/subscriptions', {
        method: 'POST',
        headers: postHeaders(SUB_BODY, { key: 'idem-sub-dddd' }),
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
        headers: getHeaders(),
      }),
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { status: string }
    expect(json.status).toBe('CANCELED')
    expect(gateway.canceledSubscriptionIds).toContain(providerSubscriptionId)
  })

  test('webhook de assinatura cria o pagamento de um ciclo recorrente', async () => {
    const { app, repo, subscriptionRepo, gateway } = buildApp()
    // Sem 1ª cobrança na criação → o webhook cria o ciclo.
    gateway.firstChargeStatus = undefined
    gateway.subscriptionStatus = 'PENDING'
    const created = await app.handle(
      new Request('http://localhost/subscriptions', {
        method: 'POST',
        headers: postHeaders(SUB_BODY, { key: 'idem-sub-eeee' }),
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

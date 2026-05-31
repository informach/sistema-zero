import { describe, expect, test } from 'bun:test'
import { GetPaymentService } from '../../src/application/get-payment/get-payment.service'
import { HandleProviderWebhookService } from '../../src/application/handle-provider-webhook/handle-provider-webhook.service'
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
  InMemoryWebhookInbox,
  silentLogger,
} from '../fakes/in-memory'

interface BuildOpts {
  async?: boolean
  rateLimit?: number
  allowedCidrsA?: string[]
  maxBodyBytes?: number
}

function buildApp(opts: BuildOpts = {}) {
  const repo = new InMemoryPaymentRepository()
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
    TRUSTED_PROXY_HOPS: 1,
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
      },
      silentLogger,
    ),
    getPayment: new GetPaymentService(repo),
    handleWebhook: new HandleProviderWebhookService(repo, gateway, new InMemoryWebhookInbox(), silentLogger),
    getMetrics: async () => ({
      outboxPending: 0,
      outboxDead: 0,
      paymentsAwaitingCharge: 0,
      webhookDeliveriesPending: 0,
      webhookDeliveriesDead: 0,
    }),
  })

  return { app, repo, gateway }
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
  const { consumerId = 'sys-a', secret = 'secret-a', key = 'idem-12345678', xff = '203.0.113.10' } = opts
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
      new Request('http://localhost/payments', { method: 'POST', headers: postHeaders(PIX_BODY), body: PIX_BODY }),
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
    const res = await app.handle(new Request('http://localhost/payments', { method: 'POST', headers, body: PIX_BODY }))
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
      new Request('http://localhost/payments', { method: 'POST', headers: postHeaders(PIX_BODY), body: PIX_BODY }),
    )
    expect(res.status).toBe(202)
    const json = (await res.json()) as { status: string; pix?: unknown }
    expect(json.pix).toBeUndefined()
  })

  test('excede o rate limit → 429', async () => {
    const { app } = buildApp({ rateLimit: 1 })
    const h1 = postHeaders(PIX_BODY, { key: 'idem-aaaaaaaa' })
    const h2 = postHeaders(PIX_BODY, { key: 'idem-bbbbbbbb' })
    const r1 = await app.handle(new Request('http://localhost/payments', { method: 'POST', headers: h1, body: PIX_BODY }))
    const r2 = await app.handle(new Request('http://localhost/payments', { method: 'POST', headers: h2, body: PIX_BODY }))
    expect(r1.status).toBe(201)
    expect(r2.status).toBe(429)
    expect(r2.headers.get('retry-after')).toBeTruthy()
  })

  test('mesma Idempotency-Key com payload diferente → 409', async () => {
    const { app } = buildApp()
    const body2 = JSON.stringify({ amountInCents: 2000, method: 'PIX' })
    const r1 = await app.handle(
      new Request('http://localhost/payments', { method: 'POST', headers: postHeaders(PIX_BODY, { key: 'idem-dup-001' }), body: PIX_BODY }),
    )
    const r2 = await app.handle(
      new Request('http://localhost/payments', { method: 'POST', headers: postHeaders(body2, { key: 'idem-dup-001' }), body: body2 }),
    )
    expect(r1.status).toBe(201)
    expect(r2.status).toBe(409)
  })

  test('Idempotency-Key ausente → 400', async () => {
    const { app } = buildApp()
    const headers = postHeaders(PIX_BODY, { key: '' }) // sem idempotency-key (assina só o body)
    const res = await app.handle(new Request('http://localhost/payments', { method: 'POST', headers, body: PIX_BODY }))
    expect(res.status).toBe(400)
  })

  test('corpo acima do limite → 413', async () => {
    const { app } = buildApp({ maxBodyBytes: 100 })
    const big = JSON.stringify({ amountInCents: 1000, method: 'PIX', description: 'x'.repeat(500) })
    const res = await app.handle(
      new Request('http://localhost/payments', { method: 'POST', headers: postHeaders(big), body: big }),
    )
    expect(res.status).toBe(413)
  })

  test('GET /payments/:id é escopado por consumidor (sem IDOR)', async () => {
    const { app } = buildApp()
    const created = await app.handle(
      new Request('http://localhost/payments', { method: 'POST', headers: postHeaders(PIX_BODY), body: PIX_BODY }),
    )
    const { id } = (await created.json()) as { id: string }

    // dono (sys-a) → 200
    const own = await app.handle(new Request(`http://localhost/payments/${id}`, { headers: getHeaders() }))
    expect(own.status).toBe(200)

    // outro consumidor (sys-b) → 404 (não revela o pagamento alheio)
    const other = await app.handle(
      new Request(`http://localhost/payments/${id}`, { headers: getHeaders({ consumerId: 'sys-b', secret: 'secret-b' }) }),
    )
    expect(other.status).toBe(404)
  })
})

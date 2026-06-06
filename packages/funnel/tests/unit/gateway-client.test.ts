import { describe, expect, test } from 'bun:test'
import { canonicalHmacMessage, verifyHmacSignature } from '@sistemazero/core/security'
import { createGatewayClient } from '../../src/lib/gateway-client'

const SECRET = 'segredo-de-borda-do-funil'

describe('createGatewayClient (assinatura HMAC de borda)', () => {
  test('POST assina o canônico "<ts>.POST.<path>.<idempotencyKey>.<corpo>" que o gateway verifica', async () => {
    let captured: { url: string; init: RequestInit } | undefined
    const fetchImpl = (async (url: string, init: RequestInit) => {
      captured = { url, init }
      return new Response(JSON.stringify({ id: 'p1', status: 'PENDING' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    }) as unknown as typeof fetch

    const gw = createGatewayClient({
      baseUrl: 'http://gateway',
      consumerId: 'funnel',
      hmacSecret: SECRET,
      fetchImpl,
    })

    const idem = 'funil-lead-1'
    const res = await gw.createPayment({ amountInCents: 3700, method: 'PIX' }, idem)
    expect(res.status).toBe(201)

    const headers = captured?.init.headers as Record<string, string>
    const rawBody = captured?.init.body as string
    expect(headers['x-consumer-id']).toBe('funnel')
    expect(headers['idempotency-key']).toBe(idem)
    expect(captured?.url).toBe('http://gateway/payments')

    const verdict = verifyHmacSignature({
      secret: SECRET,
      body: canonicalHmacMessage({
        method: 'POST',
        path: '/payments',
        idempotencyKey: idem,
        body: rawBody,
      }),
      signatureHeader: headers['x-signature'],
      nowSeconds: Math.floor(Date.now() / 1000),
      toleranceSeconds: 300,
    })
    expect(verdict.valid).toBe(true)
  })

  test('GET assina "<ts>.GET.<path>." (corpo vazio, sem idempotency-key)', async () => {
    let captured: { url: string; init: RequestInit } | undefined
    const fetchImpl = (async (url: string, init: RequestInit) => {
      captured = { url, init }
      return new Response(JSON.stringify({ id: 'p1', status: 'PAID' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }) as unknown as typeof fetch

    const gw = createGatewayClient({
      baseUrl: 'http://gateway',
      consumerId: 'funnel',
      hmacSecret: SECRET,
      fetchImpl,
    })

    await gw.getPayment('pay-9')
    const headers = captured?.init.headers as Record<string, string>
    expect(headers['idempotency-key']).toBeUndefined()
    expect(captured?.url).toBe('http://gateway/payments/pay-9')

    const verdict = verifyHmacSignature({
      secret: SECRET,
      body: canonicalHmacMessage({ method: 'GET', path: '/payments/pay-9', body: '' }),
      signatureHeader: headers['x-signature'],
      nowSeconds: Math.floor(Date.now() / 1000),
      toleranceSeconds: 300,
    })
    expect(verdict.valid).toBe(true)
  })

  test('ensureBuyer faz POST /auth/internal/ensure-buyer COM HMAC de borda (rota S2S)', async () => {
    let captured: { url: string; init: RequestInit } | undefined
    const fetchImpl = (async (url: string, init: RequestInit) => {
      captured = { url, init }
      return new Response(JSON.stringify({ userId: 'u1', created: true }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    }) as unknown as typeof fetch

    const gw = createGatewayClient({
      baseUrl: 'http://gateway',
      consumerId: 'funnel',
      hmacSecret: SECRET,
      fetchImpl,
    })

    const res = await gw.ensureBuyer({
      email: 'ana@example.com',
      password: 'senha-temporaria-1234',
      firstName: 'Ana',
      lastName: 'Souza',
      source: 'funnel',
    })
    expect(res.status).toBe(201)
    expect(res.body as { userId: string; created: boolean }).toEqual({
      userId: 'u1',
      created: true,
    })

    const headers = captured?.init.headers as Record<string, string>
    const rawBody = captured?.init.body as string
    expect(captured?.url).toBe('http://gateway/auth/internal/ensure-buyer')
    expect(headers['x-consumer-id']).toBe('funnel')
    // Rota interna S2S: o funil assina HMAC de borda (corpo sem idempotency-key).
    expect(headers['idempotency-key']).toBeUndefined()
    const verdict = verifyHmacSignature({
      secret: SECRET,
      body: canonicalHmacMessage({
        method: 'POST',
        path: '/auth/internal/ensure-buyer',
        body: rawBody,
      }),
      signatureHeader: headers['x-signature'],
      nowSeconds: Math.floor(Date.now() / 1000),
      toleranceSeconds: 300,
    })
    expect(verdict.valid).toBe(true)
  })
})

describe('timeout/falha de rede (nunca pendura o handler nem lança)', () => {
  test('gateway pendurado → aborta no timeout e devolve 504 GATEWAY_TIMEOUT', async () => {
    // fetch falso que só "responde" quando o AbortSignal dispara — simula o
    // gateway segurando a conexão p/ sempre.
    const fetchImpl = ((_url: string, init: RequestInit) =>
      new Promise((_, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal?.reason))
      })) as unknown as typeof fetch

    const gw = createGatewayClient({
      baseUrl: 'http://gateway',
      consumerId: 'funnel',
      hmacSecret: SECRET,
      fetchImpl,
      timeoutMs: 20,
    })
    const res = await gw.getPayment('p1')
    expect(res.status).toBe(504)
    expect((res.body as { error: { code: string } }).error.code).toBe('GATEWAY_TIMEOUT')
  })

  test('rede fora (fetch rejeita) → 502 GATEWAY_UNREACHABLE, sem exceção', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('fetch failed')
    }) as unknown as typeof fetch

    const gw = createGatewayClient({
      baseUrl: 'http://gateway',
      consumerId: 'funnel',
      hmacSecret: SECRET,
      fetchImpl,
    })
    const res = await gw.createPayment({ amountInCents: 3700, method: 'PIX' }, 'k1')
    expect(res.status).toBe(502)
    expect((res.body as { error: { code: string } }).error.code).toBe('GATEWAY_UNREACHABLE')
  })
})

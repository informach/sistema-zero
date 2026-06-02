import { describe, expect, test } from 'bun:test'
import { verifyHmacSignature } from '@sistemazero/core/security'
import { createGatewayClient } from '../../src/lib/gateway-client'

const SECRET = 'segredo-de-borda-do-funil'

describe('createGatewayClient (assinatura HMAC de borda)', () => {
  test('POST assina o canônico "<ts>.<idempotencyKey>.<corpo>" que o gateway verifica', async () => {
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
      body: `${idem}.${rawBody}`,
      signatureHeader: headers['x-signature'],
      nowSeconds: Math.floor(Date.now() / 1000),
      toleranceSeconds: 300,
    })
    expect(verdict.valid).toBe(true)
  })

  test('GET assina o corpo vazio "<ts>." (sem idempotency-key)', async () => {
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
      body: '',
      signatureHeader: headers['x-signature'],
      nowSeconds: Math.floor(Date.now() / 1000),
      toleranceSeconds: 300,
    })
    expect(verdict.valid).toBe(true)
  })

  test('registerBuyer faz POST /auth/register em JSON, SEM HMAC (rota pública do gateway)', async () => {
    let captured: { url: string; init: RequestInit } | undefined
    const fetchImpl = (async (url: string, init: RequestInit) => {
      captured = { url, init }
      return new Response(JSON.stringify({ user: { id: 'u1' } }), {
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

    const res = await gw.registerBuyer({
      email: 'ana@example.com',
      password: 'senha-temporaria-1234',
      firstName: 'Ana',
      lastName: 'Souza',
      source: 'funnel',
    })
    expect(res.status).toBe(201)
    expect((res.body as { user: { id: string } }).user.id).toBe('u1')

    const headers = captured?.init.headers as Record<string, string>
    expect(captured?.url).toBe('http://gateway/auth/register')
    expect(headers['content-type']).toBe('application/json')
    // Rota pública: o funil NÃO assina HMAC de borda no registro.
    expect(headers['x-signature']).toBeUndefined()
    expect(headers['x-consumer-id']).toBeUndefined()
  })
})

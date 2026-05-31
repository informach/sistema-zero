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
})

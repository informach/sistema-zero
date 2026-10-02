import { expect, test } from 'bun:test'
import { PaymentsHttpClient } from '../../src/infrastructure/gateways/payments-http.client'

test('consulta data da assinatura pelo contrato interno e recusa data ausente/inválida', async () => {
  const originalFetch = globalThis.fetch
  const requests: { url: string; token: string | null }[] = []
  let response = Response.json({ id: 'sub-1', createdAt: '2026-10-02T12:00:00Z' })
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    requests.push({ url: String(url), token: new Headers(init?.headers).get('x-internal-token') })
    return response
  }) as typeof fetch
  try {
    const client = new PaymentsHttpClient({
      baseUrl: 'http://payments.test',
      internalToken: 'token-local-de-teste',
      timeoutMs: 5000,
    })
    expect(await client.getSubscriptionCreatedAt('sub-1')).toEqual(new Date('2026-10-02T12:00:00Z'))
    expect(requests[0]).toEqual({
      url: 'http://payments.test/payments/internal/subscriptions/sub-1',
      token: 'token-local-de-teste',
    })
    for (const body of [{}, { createdAt: 'inválida' }]) {
      response = Response.json(body)
      await expect(client.getSubscriptionCreatedAt('sub-1')).rejects.toThrow()
    }
    response = new Response(null, { status: 503 })
    await expect(client.getSubscriptionCreatedAt('sub-1')).rejects.toThrow()
    response = new Response(null, { status: 404 })
    expect(await client.getSubscriptionCreatedAt('sub-1')).toBeNull()
  } finally {
    globalThis.fetch = originalFetch
  }
})

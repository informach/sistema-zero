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

test('ofertas já pagas: manda e-mail, data e o pagamento de fora; recusa resposta ou rota ausente', async () => {
  const originalFetch = globalThis.fetch
  const urls: string[] = []
  let response = Response.json({ offerIds: ['offer-1'] })
  globalThis.fetch = (async (url: unknown) => {
    urls.push(String(url))
    return response
  }) as typeof fetch
  try {
    const client = new PaymentsHttpClient({ baseUrl: 'http://payments.test', timeoutMs: 5000 })
    const input = {
      email: 'ana+teste@example.com',
      before: new Date('2026-11-25T12:00:00Z'),
      excludePaymentId: 'pay-1',
    }
    expect(await client.listPaidOfferIds(input)).toEqual(['offer-1'])
    const url = new URL(urls[0]!)
    expect(url.pathname).toBe('/payments/internal/customers/paid-offers')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      email: 'ana+teste@example.com',
      before: '2026-11-25T12:00:00.000Z',
      exclude: 'pay-1',
    })
    // Payments sem a rota (antigo) não vira "sem histórico".
    response = new Response(null, { status: 404 })
    await expect(client.listPaidOfferIds(input)).rejects.toThrow()
    response = Response.json({ offerIds: [1] })
    await expect(client.listPaidOfferIds(input)).rejects.toThrow()
  } finally {
    globalThis.fetch = originalFetch
  }
})

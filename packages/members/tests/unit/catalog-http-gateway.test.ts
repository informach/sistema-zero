import { describe, expect, it } from 'bun:test'
import { createCatalogHttpGateway } from '../../src/infrastructure/gateways/catalog-http.gateway'

const OFFER_BODY = JSON.stringify({
  offerId: 'of-1',
  offerSlug: 'oferta',
  items: [
    {
      productId: 'p-1',
      sku: 'sku',
      name: 'Produto',
      kind: 'ebook',
      isPrimary: true,
      fulfillment: { accessType: 'course', courseRef: 'curso' },
    },
  ],
})

function fetchSpy(status = 200) {
  const calls: { url: string; headers: Record<string, string> }[] = []
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(input),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
    })
    return new Response(status === 200 ? OFFER_BODY : null, { status })
  }) as typeof fetch
  return { calls, impl }
}

describe('catalog-http.gateway — token interno', () => {
  it('envia x-internal-token quando configurado (rota de entitlements exige)', async () => {
    const { calls, impl } = fetchSpy()
    const gateway = createCatalogHttpGateway({
      baseUrl: 'http://catalog:3003',
      internalToken: 'token-interno-de-teste-catalogo',
      fetchImpl: impl,
    })
    const offer = await gateway.resolveOfferEntitlements('oferta')
    expect(offer?.offerId).toBe('of-1')
    expect(calls[0]?.headers['x-internal-token']).toBe('token-interno-de-teste-catalogo')
  })

  it('NÃO envia o header quando o token não está configurado (dev/local)', async () => {
    const { calls, impl } = fetchSpy()
    const gateway = createCatalogHttpGateway({ baseUrl: 'http://catalog:3003', fetchImpl: impl })
    await gateway.resolveOfferEntitlements('oferta')
    expect('x-internal-token' in (calls[0]?.headers ?? {})).toBe(false)
  })
})

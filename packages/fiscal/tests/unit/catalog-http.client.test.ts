import { expect, test } from 'bun:test'
import { CatalogHttpClient } from '../../src/infrastructure/gateways/catalog-http.client'

type FetchMock = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

async function withFetchMock<T>(mock: FetchMock, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: mock, writable: true })
  try {
    return await run()
  } finally {
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: original,
      writable: true,
    })
  }
}

test('CatalogHttpClient recusa garantia inválida para não antecipar a emissão', async () => {
  const fetchMock: FetchMock = async () =>
    Response.json({
      id: 'offer_1',
      name: 'Oferta',
      guaranteeDays: -1,
      product: { name: 'Curso' },
    })

  await withFetchMock(fetchMock, async () => {
    const client = new CatalogHttpClient({ baseUrl: 'http://catalog.test', timeoutMs: 1000 })
    await expect(client.getOfferById('offer_1')).rejects.toThrow('catalog: guaranteeDays inválido')
  })
})

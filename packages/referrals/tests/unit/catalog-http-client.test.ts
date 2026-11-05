import { afterEach, expect, test } from 'bun:test'
import { CatalogHttpClient } from '../../src/infrastructure/gateways/catalog-http.client'

const original = globalThis.fetch
afterEach(() => {
  globalThis.fetch = original
})
test.each([
  1,
  12,
  null,
])('catalog preserva ciclo %s para selecionar comissão', async (billingIntervalMonths) => {
  globalThis.fetch = (async () =>
    Response.json({
      id: 'offer',
      slug: 'comunidade',
      billingIntervalMonths,
    })) as unknown as typeof fetch
  const client = new CatalogHttpClient({ baseUrl: 'https://catalog.test', timeoutMs: 1000 })
  expect((await client.getOfferById('offer'))?.billingIntervalMonths).toBe(billingIntervalMonths)
})

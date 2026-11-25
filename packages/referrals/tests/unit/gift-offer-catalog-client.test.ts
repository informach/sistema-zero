import { describe, expect, test } from 'bun:test'
import { GiftOfferCatalogHttpClient } from '../../src/infrastructure/gateways/gift-offer-catalog.client'

const OFFER_ID = '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d01'

/** As duas leituras do catálogo: a view pública e os entitlements (com o token interno). */
function catalog(overrides: { view?: object; entitlements?: object; status?: number } = {}) {
  const seen: { url: string; headers: Record<string, string> }[] = []
  const fetchImpl = (async (url: unknown, init?: RequestInit) => {
    const href = String(url)
    seen.push({ url: href, headers: (init?.headers ?? {}) as Record<string, string> })
    if (overrides.status) return new Response('{}', { status: overrides.status })
    if (href.endsWith('/entitlements'))
      return Response.json({
        offerId: OFFER_ID,
        offerSlug: 'cade-todo-mundo-7-dias',
        accessMode: 'fixed',
        items: [
          {
            productId: 'p1',
            sku: 'cade-todo-mundo',
            name: 'Cadê Todo Mundo?',
            kind: 'course',
            isPrimary: true,
            fulfillment: { accessType: 'course', courseRef: 'cade-todo-mundo' },
          },
          {
            productId: 'p2',
            sku: 'mural-dos-criadores',
            name: 'Mural',
            kind: 'community',
            isPrimary: false,
            fulfillment: { accessType: 'community', courseRef: 'mural-dos-criadores' },
          },
        ],
        ...overrides.entitlements,
      })
    return Response.json({
      id: OFFER_ID,
      slug: 'cade-todo-mundo-7-dias',
      name: 'Cadê Todo Mundo? · 7 dias',
      status: 'active',
      accessMode: 'fixed',
      accessDurationValue: 7,
      accessDurationUnit: 'days',
      product: { audience: 'kids', slug: 'cade-todo-mundo', sku: 'cade-todo-mundo' },
      ...overrides.view,
    })
  }) as typeof fetch
  const client = new GiftOfferCatalogHttpClient({
    baseUrl: 'http://catalog.test',
    internalToken: 'token-interno-do-catalogo',
    timeoutMs: 1000,
    fetchImpl,
  })
  return { client, seen }
}

describe('GiftOfferCatalogHttpClient', () => {
  test('prazo divulgado: lido do content só abaixo do prazo real em dias', async () => {
    const real15 = catalog({
      view: { accessDurationValue: 15, content: { advertisedAccessDays: 7 } },
    })
    expect((await real15.client.resolve('cade-todo-mundo-7-dias'))?.advertisedAccessDays).toBe(7)
    const igual = catalog({ view: { content: { advertisedAccessDays: 7 } } })
    expect((await igual.client.resolve('cade-todo-mundo-7-dias'))?.advertisedAccessDays).toBeNull()
  })

  test('resume a oferta: público do produto, política, curso principal e Mural', async () => {
    const { client, seen } = catalog()
    expect(await client.resolve('cade-todo-mundo-7-dias')).toEqual({
      offerId: OFFER_ID,
      offerSlug: 'cade-todo-mundo-7-dias',
      name: 'Cadê Todo Mundo? · 7 dias',
      status: 'active',
      audience: 'kids',
      accessMode: 'fixed',
      accessDurationValue: 7,
      accessDurationUnit: 'days',
      advertisedAccessDays: null,
      courseSlug: 'cade-todo-mundo',
      includesMural: true,
      pageSellable: false,
      productSku: 'cade-todo-mundo',
    })
    const entitlements = seen.find((call) => call.url.endsWith('/entitlements'))!
    expect(entitlements.url).toBe(
      'http://catalog.test/catalog/offers/cade-todo-mundo-7-dias/entitlements',
    )
    expect(entitlements.headers['x-internal-token']).toBe('token-interno-do-catalogo')
    // Cache curto pelo slug e pelo UUID: a landing não refaz as duas leituras a cada visita.
    await client.resolve(OFFER_ID)
    expect(seen).toHaveLength(2)
  })

  test('Mural adulto também conta; oferta sem curso tem courseSlug nulo', async () => {
    const { client } = catalog({
      entitlements: {
        items: [
          {
            kind: 'community',
            isPrimary: true,
            fulfillment: { accessType: 'community', courseRef: 'adult-mural-dos-criadores' },
          },
        ],
      },
      view: { product: { audience: 'adult' } },
    })
    expect(await client.resolve(OFFER_ID)).toMatchObject({
      audience: 'adult',
      courseSlug: null,
      includesMural: true,
    })
  })

  test('a situação no Catálogo chega na oferta (arquivada e pausada também)', async () => {
    for (const status of ['archived', 'paused'] as const)
      expect(await catalog({ view: { status } }).client.resolve(OFFER_ID)).toMatchObject({
        status,
      })
    await expect(catalog({ view: { status: 'outra' } }).client.resolve(OFFER_ID)).rejects.toThrow()
  })

  test('404 = oferta inexistente; outra falha lança', async () => {
    expect(await catalog({ status: 404 }).client.resolve('nao-existe')).toBeNull()
    await expect(catalog({ status: 401 }).client.resolve('cade')).rejects.toThrow()
  })
})

import { beforeEach, describe, expect, test } from 'bun:test'
import type { CommerceCatalogOffer } from '@sistemazero/core/commerce'
import {
  clearPrimaryOfferCache,
  pageSellableStatus,
  primaryOfferSlugFor,
} from '../src/server/page-sellable'

/** A régua única de "vende na página do curso" e a memória da oferta principal (revisão do Lote 6). */
const target = (over: Partial<CommerceCatalogOffer> = {}): CommerceCatalogOffer =>
  ({
    id: 'o1',
    slug: 'guia-1-ano',
    name: 'Guia',
    isAvailable: true,
    priceCents: 2700,
    pricingMode: 'one_time',
    accessMode: 'fixed',
    guaranteeDays: 7,
    product: { id: 'p1', audience: 'kids', sku: 'guia', name: 'Guia', status: 'active' },
    content: null,
    ...over,
  }) as unknown as CommerceCatalogOffer

function fetcher(result: { status: number; body?: { primaryOfferSlug?: unknown } } | null) {
  const calls: string[] = []
  const fn = async (sku: string) => {
    calls.push(sku)
    return result
  }
  return { fn, calls }
}

beforeEach(() => clearPrimaryOfferCache())

describe('pageSellableStatus', () => {
  test('a oferta principal do produto vende', async () => {
    const { fn } = fetcher({ status: 200, body: { primaryOfferSlug: 'guia-1-ano' } })
    expect(await pageSellableStatus(target(), fn)).toBe('sellable')
  })

  test('a marcada para a página vende sem perguntar a principal', async () => {
    const { fn, calls } = fetcher(null)
    expect(await pageSellableStatus(target({ content: { pageSellable: true } } as never), fn)).toBe(
      'sellable',
    )
    expect(calls).toEqual([])
  })

  test('o presente do mesmo produto não vende', async () => {
    const { fn } = fetcher({ status: 200, body: { primaryOfferSlug: 'guia-1-ano' } })
    expect(await pageSellableStatus(target({ slug: 'guia-presente' }), fn)).toBe('not-sellable')
  })

  test('produto não ativo ou oferta indisponível nunca vende', async () => {
    const { fn } = fetcher({ status: 200, body: { primaryOfferSlug: 'guia-1-ano' } })
    const paused = target({
      content: { pageSellable: true },
      product: { id: 'p1', audience: 'kids', sku: 'guia', name: 'Guia', status: 'paused' },
    } as never)
    expect(await pageSellableStatus(paused, fn)).toBe('not-sellable')
    expect(await pageSellableStatus(target({ isAvailable: false }), fn)).toBe('not-sellable')
  })

  test('catálogo fora é "indisponível", nunca "não vende"', async () => {
    expect(await pageSellableStatus(target(), fetcher(null).fn)).toBe('unavailable')
    expect(await pageSellableStatus(target(), fetcher({ status: 503 }).fn)).toBe('unavailable')
  })
})

describe('primaryOfferSlugFor: 60 s na memória', () => {
  test('a segunda leitura no prazo não vai ao catálogo; depois do prazo vai', async () => {
    const { fn, calls } = fetcher({ status: 200, body: { primaryOfferSlug: 'guia-1-ano' } })
    expect(await primaryOfferSlugFor(fn, 'guia', 0)).toBe('guia-1-ano')
    expect(await primaryOfferSlugFor(fn, 'guia', 59_000)).toBe('guia-1-ano')
    expect(calls.length).toBe(1)
    await primaryOfferSlugFor(fn, 'guia', 61_000)
    expect(calls.length).toBe(2)
  })

  test('404 guarda "sem principal"; falha não é guardada', async () => {
    const missing = fetcher({ status: 404 })
    expect(await primaryOfferSlugFor(missing.fn, 'sem', 0)).toBeNull()
    expect(await primaryOfferSlugFor(missing.fn, 'sem', 1000)).toBeNull()
    expect(missing.calls.length).toBe(1)
    const down = fetcher({ status: 502 })
    expect(await primaryOfferSlugFor(down.fn, 'fora', 0)).toBe('unavailable')
    expect(await primaryOfferSlugFor(down.fn, 'fora', 1000)).toBe('unavailable')
    expect(down.calls.length).toBe(2)
  })

  test('erro lançado vira indisponível', async () => {
    const boom = async () => {
      throw new Error('rede')
    }
    expect(await primaryOfferSlugFor(boom, 'x', 0)).toBe('unavailable')
  })
})

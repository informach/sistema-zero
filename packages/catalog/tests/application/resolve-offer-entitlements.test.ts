import { beforeEach, describe, expect, it } from 'bun:test'
import { ResolveOfferEntitlementsService } from '../../src/application/resolve-offer-entitlements/resolve-offer-entitlements.service'
import { OfferAggregate } from '../../src/domain/offer/offer.aggregate'
import { ProductAggregate } from '../../src/domain/product/product.aggregate'
import { Sku } from '../../src/domain/value-objects/sku'
import { Slug } from '../../src/domain/value-objects/slug'
import { InMemoryProductRepository } from '../fakes/in-memory'

function product(
  id: string,
  components?: { componentProductId: string; sortOrder: number; isPrimary: boolean }[],
) {
  return ProductAggregate.create({
    id,
    sku: Sku.create(id),
    slug: Slug.create(id),
    name: id.toUpperCase(),
    kind: components ? 'bundle' : 'ebook',
    components,
  })
}

describe('ResolveOfferEntitlementsService (carrega o fechamento e resolve)', () => {
  let products: InMemoryProductRepository
  let resolver: ResolveOfferEntitlementsService

  beforeEach(() => {
    products = new InMemoryProductRepository()
    resolver = new ResolveOfferEntitlementsService(products)
  })

  it('resolve combo + item de oferta, carregando os componentes transitivamente', async () => {
    await products.create(product('ebook'))
    await products.create(product('kit'))
    await products.create(product('brinde'))
    await products.create(
      product('combo', [
        { componentProductId: 'ebook', sortOrder: 1, isPrimary: true },
        { componentProductId: 'kit', sortOrder: 2, isPrimary: false },
      ]),
    )

    const offer = OfferAggregate.create({
      id: 'offer-1',
      productId: 'combo',
      code: Sku.create('combo-oferta'),
      slug: Slug.create('combo-oferta'),
      name: 'Combo',
      priceCents: 9700,
      items: [{ productId: 'brinde', sortOrder: 0 }],
    })

    const result = await resolver.execute(offer)
    const ids = result.map((r) => r.productId).sort()
    expect(ids).toEqual(['brinde', 'ebook', 'kit'])
    expect(result.find((r) => r.productId === 'ebook')?.isPrimary).toBe(true)
    expect(result.find((r) => r.productId === 'brinde')?.isPrimary).toBe(false)
  })
})

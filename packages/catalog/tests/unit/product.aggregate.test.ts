import { describe, expect, it } from 'bun:test'
import { ProductAggregate } from '../../src/domain/product/product.aggregate'
import { ValidationError } from '../../src/domain/shared/errors'
import { Sku } from '../../src/domain/value-objects/sku'
import { Slug } from '../../src/domain/value-objects/slug'

function makeProduct(overrides?: {
  components?: { componentProductId: string; sortOrder: number; isPrimary: boolean }[]
}) {
  return ProductAggregate.create({
    id: 'prod-1',
    sku: Sku.create('no-comando-da-ia'),
    slug: Slug.create('no-comando-da-ia'),
    name: 'No Comando da IA',
    kind: 'ebook',
    components: overrides?.components,
  })
}

describe('ProductAggregate', () => {
  it('cria com defaults e emite product.created', () => {
    const product = makeProduct()
    expect(product.status).toBe('draft')
    expect(product.sellable).toBe(true)
    expect(product.isBundle()).toBe(false)
    const events = product.pullEvents()
    expect(events.map((e) => e.eventName)).toContain('product.created')
  })

  it('um combo tem componentes e ordena por sortOrder', () => {
    const product = makeProduct({
      components: [
        { componentProductId: 'x', sortOrder: 2, isPrimary: false },
        { componentProductId: 'main', sortOrder: 1, isPrimary: true },
      ],
    })
    expect(product.isBundle()).toBe(true)
    expect(product.components.map((c) => c.componentProductId)).toEqual(['main', 'x'])
  })

  it('rejeita auto-referência no combo', () => {
    expect(() =>
      makeProduct({
        components: [{ componentProductId: 'prod-1', sortOrder: 1, isPrimary: true }],
      }),
    ).toThrow(ValidationError)
  })

  it('rejeita componente duplicado', () => {
    expect(() =>
      makeProduct({
        components: [
          { componentProductId: 'x', sortOrder: 1, isPrimary: false },
          { componentProductId: 'x', sortOrder: 2, isPrimary: false },
        ],
      }),
    ).toThrow(ValidationError)
  })

  it('rejeita mais de um componente principal', () => {
    expect(() =>
      makeProduct({
        components: [
          { componentProductId: 'a', sortOrder: 1, isPrimary: true },
          { componentProductId: 'b', sortOrder: 2, isPrimary: true },
        ],
      }),
    ).toThrow(ValidationError)
  })

  it('updateDetails altera campos e marca updatedAt', () => {
    const product = makeProduct()
    product.pullEvents()
    const before = product.updatedAt
    product.updateDetails({
      name: 'Novo nome',
      sellable: false,
      now: new Date(before.getTime() + 1000),
    })
    expect(product.name).toBe('Novo nome')
    expect(product.sellable).toBe(false)
    expect(product.updatedAt.getTime()).toBeGreaterThan(before.getTime())
    expect(product.pullEvents().map((e) => e.eventName)).toContain('product.updated')
  })
})

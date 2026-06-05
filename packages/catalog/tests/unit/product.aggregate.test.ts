import { describe, expect, it } from 'bun:test'
import type { FulfillmentSpec } from '../../src/domain/product/fulfillment'
import { ProductAggregate } from '../../src/domain/product/product.aggregate'
import type { ProductKind } from '../../src/domain/product/product.kind'
import type { ProductStatus } from '../../src/domain/product/product.status'
import { ValidationError } from '../../src/domain/shared/errors'
import { Sku } from '../../src/domain/value-objects/sku'
import { Slug } from '../../src/domain/value-objects/slug'

function makeProduct(overrides?: {
  kind?: ProductKind
  status?: ProductStatus
  fulfillment?: FulfillmentSpec | null
  components?: { componentProductId: string; sortOrder: number; isPrimary: boolean }[]
}) {
  return ProductAggregate.create({
    id: 'prod-1',
    sku: Sku.create('no-comando-da-ia'),
    slug: Slug.create('no-comando-da-ia'),
    name: 'No Comando da IA',
    kind: overrides?.kind ?? 'ebook',
    status: overrides?.status,
    fulfillment: overrides?.fulfillment,
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
      kind: 'bundle',
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
        kind: 'bundle',
        components: [{ componentProductId: 'prod-1', sortOrder: 1, isPrimary: true }],
      }),
    ).toThrow(ValidationError)
  })

  it('rejeita componente duplicado', () => {
    expect(() =>
      makeProduct({
        kind: 'bundle',
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
        kind: 'bundle',
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

  // ── Coerência kind ↔ fulfillment ↔ components ↔ status (assertCoherent) ──

  it('rascunho é livre: cria sem fulfillment e sem componentes', () => {
    expect(() => makeProduct({ status: 'draft' })).not.toThrow()
  })

  it('produto ativo não-combo exige entrega definida', () => {
    expect(() => makeProduct({ status: 'active' })).toThrow(ValidationError)
  })

  it('produto ativo com entrega por curso exige courseRef', () => {
    expect(() => makeProduct({ status: 'active', fulfillment: { accessType: 'course' } })).toThrow(
      ValidationError,
    )
    expect(() =>
      makeProduct({
        status: 'active',
        fulfillment: { accessType: 'course', courseRef: 'curso-ia' },
      }),
    ).not.toThrow()
  })

  it('chave-mestra (all_courses) ativa não leva courseRef', () => {
    expect(() =>
      makeProduct({ status: 'active', fulfillment: { accessType: 'all_courses' } }),
    ).not.toThrow()
    expect(() =>
      makeProduct({
        status: 'active',
        fulfillment: { accessType: 'all_courses', courseRef: 'curso-ia' },
      }),
    ).toThrow(ValidationError)
  })

  it('combo não tem entrega própria (fulfillment deve ser null)', () => {
    expect(() =>
      makeProduct({
        kind: 'bundle',
        fulfillment: { accessType: 'course', courseRef: 'curso-ia' },
        components: [{ componentProductId: 'a', sortOrder: 0, isPrimary: true }],
      }),
    ).toThrow(ValidationError)
  })

  it('combo ativo exige pelo menos um componente; rascunho não', () => {
    expect(() => makeProduct({ kind: 'bundle', status: 'active' })).toThrow(ValidationError)
    expect(() => makeProduct({ kind: 'bundle', status: 'draft' })).not.toThrow()
    expect(() =>
      makeProduct({
        kind: 'bundle',
        status: 'active',
        components: [{ componentProductId: 'a', sortOrder: 0, isPrimary: true }],
      }),
    ).not.toThrow()
  })

  it('produto não-combo não aceita componentes', () => {
    expect(() =>
      makeProduct({
        kind: 'ebook',
        components: [{ componentProductId: 'a', sortOrder: 0, isPrimary: false }],
      }),
    ).toThrow(ValidationError)
  })

  it('ativar rascunho incoerente falha na checagem consolidada (assertCoherent)', () => {
    const product = makeProduct({ status: 'draft' }) // sem fulfillment
    product.setStatus('active')
    expect(() => product.assertCoherent()).toThrow(ValidationError)
  })
})

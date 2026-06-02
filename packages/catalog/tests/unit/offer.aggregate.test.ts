import { describe, expect, it } from 'bun:test'
import { OfferAggregate } from '../../src/domain/offer/offer.aggregate'
import { InvalidStateTransitionError, ValidationError } from '../../src/domain/shared/errors'
import { Sku } from '../../src/domain/value-objects/sku'
import { Slug } from '../../src/domain/value-objects/slug'

function makeOffer(
  overrides?: Partial<{
    priceCents: number
    compareAtPriceCents: number
    status: 'draft' | 'active' | 'paused' | 'archived'
  }>,
) {
  return OfferAggregate.create({
    id: 'offer-1',
    productId: 'prod-1',
    code: Sku.create('ncia-padrao'),
    slug: Slug.create('no-comando-da-ia'),
    name: 'Oferta padrão',
    priceCents: overrides?.priceCents ?? 3700,
    compareAtPriceCents: overrides?.compareAtPriceCents,
    status: overrides?.status,
  })
}

describe('OfferAggregate', () => {
  it('cria com preço válido e emite offer.created', () => {
    const offer = makeOffer()
    expect(offer.priceCents).toBe(3700)
    expect(offer.status).toBe('draft')
    expect(offer.pullEvents().map((e) => e.eventName)).toContain('offer.created')
  })

  it('rejeita preço negativo', () => {
    expect(() => makeOffer({ priceCents: -1 })).toThrow(ValidationError)
  })

  it('rejeita compareAt menor que o preço de venda', () => {
    expect(() => makeOffer({ priceCents: 3700, compareAtPriceCents: 1000 })).toThrow(
      ValidationError,
    )
  })

  it('isAvailable só quando ativa e dentro da janela', () => {
    const offer = makeOffer({ status: 'active' })
    expect(offer.isAvailable()).toBe(true)
    offer.updateDetails({ availableUntil: new Date(Date.now() - 1000) })
    expect(offer.isAvailable()).toBe(false)
  })

  it('transições válidas: draft → active → paused → active → archived', () => {
    const offer = makeOffer()
    offer.setStatus('active')
    expect(offer.status).toBe('active')
    offer.setStatus('paused')
    offer.setStatus('active')
    offer.setStatus('archived')
    expect(offer.status).toBe('archived')
  })

  it('rejeita transição inválida (archived → active)', () => {
    const offer = makeOffer({ status: 'archived' })
    expect(() => offer.setStatus('active')).toThrow(InvalidStateTransitionError)
  })

  it('rejeita item de oferta repetindo o produto principal', () => {
    expect(() =>
      OfferAggregate.create({
        id: 'o',
        productId: 'prod-1',
        code: Sku.create('c'),
        slug: Slug.create('s'),
        name: 'x',
        priceCents: 100,
        items: [{ productId: 'prod-1', sortOrder: 0 }],
      }),
    ).toThrow(ValidationError)
  })
})

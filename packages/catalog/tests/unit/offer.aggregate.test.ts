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

  it('rejeita preço zero', () => {
    expect(() => makeOffer({ priceCents: 0 })).toThrow(ValidationError)
    const offer = makeOffer()
    expect(() => offer.updateDetails({ priceCents: 0 })).toThrow(ValidationError)
  })

  it('rejeita compareAt menor que o preço de venda', () => {
    expect(() => makeOffer({ priceCents: 3700, compareAtPriceCents: 1000 })).toThrow(
      ValidationError,
    )
  })

  it('rejeita subir o preço acima do compareAt existente (PATCH só do preço)', () => {
    const offer = makeOffer({ priceCents: 3700, compareAtPriceCents: 9700 })
    expect(() => offer.updateDetails({ priceCents: 10000 })).toThrow(ValidationError)
    // Subindo os dois coerentemente, passa.
    offer.updateDetails({ priceCents: 10000, compareAtPriceCents: 14700 })
    expect(offer.priceCents).toBe(10000)
    expect(offer.compareAtPriceCents).toBe(14700)
  })

  it('rejeita janela de disponibilidade invertida (create e update)', () => {
    const from = new Date('2026-06-10T00:00:00Z')
    const until = new Date('2026-06-01T00:00:00Z')
    expect(() =>
      OfferAggregate.create({
        id: 'o-win',
        productId: 'prod-1',
        code: Sku.create('win'),
        slug: Slug.create('win'),
        name: 'Janela',
        priceCents: 100,
        availableFrom: from,
        availableUntil: until,
      }),
    ).toThrow(ValidationError)

    const offer = makeOffer()
    offer.updateDetails({ availableFrom: until, availableUntil: from }) // ordem correta
    expect(() => offer.updateDetails({ availableUntil: new Date('2026-05-01T00:00:00Z') })).toThrow(
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

function makeSubscription(overrides?: {
  billingIntervalMonths?: number | null
  status?: 'draft' | 'active'
  pricingMode?: 'one_time' | 'subscription'
}) {
  return OfferAggregate.create({
    id: 'offer-sub',
    productId: 'prod-1',
    code: Sku.create('sub'),
    slug: Slug.create('assinatura'),
    name: 'Assinatura',
    priceCents: 4700,
    pricingMode: overrides?.pricingMode ?? 'subscription',
    billingIntervalMonths: overrides?.billingIntervalMonths,
    status: overrides?.status,
  })
}

describe('OfferAggregate — periodicidade da assinatura (billingIntervalMonths)', () => {
  it('one_time normaliza o intervalo para null (mesmo se enviado)', () => {
    const offer = makeSubscription({ pricingMode: 'one_time', billingIntervalMonths: 12 })
    expect(offer.billingIntervalMonths).toBeNull()
  })

  it('assinatura em rascunho pode existir sem intervalo (cadastro progressivo)', () => {
    const offer = makeSubscription()
    expect(offer.billingIntervalMonths).toBeNull()
    expect(offer.status).toBe('draft')
  })

  it('assinatura ATIVA sem intervalo é rejeitada no create', () => {
    expect(() => makeSubscription({ status: 'active' })).toThrow(ValidationError)
  })

  it('ativar assinatura sem intervalo é rejeitado no setStatus', () => {
    const offer = makeSubscription()
    expect(() => offer.setStatus('active')).toThrow(ValidationError)
    // Com o intervalo preenchido, a ativação passa.
    offer.updateDetails({ billingIntervalMonths: 1 })
    offer.setStatus('active')
    expect(offer.status).toBe('active')
  })

  it('mensal=1 e anual=12 ativam normalmente', () => {
    expect(
      makeSubscription({ billingIntervalMonths: 1, status: 'active' }).billingIntervalMonths,
    ).toBe(1)
    expect(
      makeSubscription({ billingIntervalMonths: 12, status: 'active' }).billingIntervalMonths,
    ).toBe(12)
  })

  it('rejeita intervalo não-positivo', () => {
    expect(() => makeSubscription({ billingIntervalMonths: 0 })).toThrow(ValidationError)
    expect(() => makeSubscription({ billingIntervalMonths: -3 })).toThrow(ValidationError)
  })

  it('mudar assinatura ativa para one_time normaliza o intervalo para null', () => {
    const offer = makeSubscription({ billingIntervalMonths: 12, status: 'active' })
    offer.updateDetails({ pricingMode: 'one_time' })
    expect(offer.billingIntervalMonths).toBeNull()
  })

  it('limpar o intervalo de assinatura ATIVA é rejeitado (funil depende dele)', () => {
    const offer = makeSubscription({ billingIntervalMonths: 12, status: 'active' })
    expect(() => offer.updateDetails({ billingIntervalMonths: null })).toThrow(ValidationError)
  })

  it('virar assinatura via updateDetails sem intervalo em oferta ativa é rejeitado', () => {
    const offer = makeOffer({ status: 'active' })
    expect(() => offer.updateDetails({ pricingMode: 'subscription' })).toThrow(ValidationError)
    // Consolidado com intervalo junto, passa.
    offer.updateDetails({ pricingMode: 'subscription', billingIntervalMonths: 1 })
    expect(offer.billingIntervalMonths).toBe(1)
  })
})

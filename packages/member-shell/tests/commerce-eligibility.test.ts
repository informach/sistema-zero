import { describe, expect, test } from 'bun:test'
import { CommerceCatalogOfferSchema } from '@sistemazero/core/commerce'
import {
  commerceEligibility,
  giftAlreadyIncluded,
  hasOngoingSubscription,
} from '../src/lib/commerce-eligibility'
import type { MySubscriptionView } from '../src/lib/subscription-card'

const offer = CommerceCatalogOfferSchema.parse({
  id: '20000000-0000-4000-8000-000000000001',
  slug: 'comunidade',
  name: 'Comunidade',
  status: 'active',
  isAvailable: true,
  priceCents: 9900,
  pricingMode: 'subscription',
  billingIntervalMonths: 1,
  installmentsMax: null,
  accessMode: 'billing_cycle',
  accessDurationValue: null,
  accessDurationUnit: null,
  product: {
    id: '30000000-0000-4000-8000-000000000001',
    sku: 'COMUNIDADE',
    name: 'Comunidade',
    status: 'active',
    audience: 'kids',
  },
  content: null,
  includes: [],
})
describe('ofertas para a família', () => {
  test.each([
    'paid',
    'manual',
    'gift',
  ] as const)('a chave mestra Kids inclui o presente, origem %s', (kind) => {
    expect(
      giftAlreadyIncluded(
        [
          {
            productId: 'comunidade',
            offerId: null,
            expiresAt: null,
            kind,
            accessType: 'all_kids_courses',
          },
        ],
        'cade-todo-mundo',
        'kids',
      ),
    ).toBe(true)
  })
  test('assinatura cancelada sem período pago não bloqueia nova oferta; pendência e período pago permanecem protegidos', () => {
    const subscription: MySubscriptionView = {
      id: 'legacy',
      status: 'CANCELED',
      intervalMonths: 1,
      repeats: null,
      amountInCents: '9900',
      currency: 'BRL',
      card: { brand: 'visa', last4: '1111' },
      cyclesCompleted: 1,
      lastChargeAt: null,
      description: null,
      canceledAt: '2026-01-01',
      createdAt: '2025-01-01',
      pendingOperation: null,
      billing: { nextExecution: null, scheduleObservedAt: null, paidPeriod: null },
    }
    const now = new Date('2026-11-19T12:00:00Z')
    expect(hasOngoingSubscription(subscription, now)).toBe(false)
    expect(hasOngoingSubscription({ ...subscription, status: 'PENDING' }, now)).toBe(true)
    expect(
      hasOngoingSubscription(
        { ...subscription, pendingOperation: { kind: 'CANCEL', state: 'UNKNOWN' } },
        now,
      ),
    ).toBe(true)
    expect(
      hasOngoingSubscription(
        {
          ...subscription,
          billing: {
            ...subscription.billing,
            paidPeriod: { startsAt: '2026-11-01T12:00:00Z', endsAt: '2026-12-01T12:00:00Z' },
          },
        },
        now,
      ),
    ).toBe(true)
  })
  test('quem já tem acesso pago ou manual gerencia o acesso em vez de comprar novamente', () => {
    expect(
      commerceEligibility(
        offer,
        [{ productId: offer.product.id, offerId: offer.id, kind: 'paid', expiresAt: null }],
        [],
      ).kind,
    ).toBe('manage')
    expect(
      commerceEligibility(
        offer,
        [{ productId: offer.product.id, offerId: offer.id, kind: 'manual', expiresAt: null }],
        [],
      ).kind,
    ).toBe('manage')
  })
  test('o presente permite a assinatura e preserva a data do benefício atual', () => {
    expect(
      commerceEligibility(
        offer,
        [
          {
            productId: offer.product.id,
            offerId: offer.id,
            kind: 'gift',
            expiresAt: '2026-11-26T12:00:00Z',
          },
        ],
        [],
      ),
    ).toEqual({ kind: 'purchase', giftEndsAt: '2026-11-26T12:00:00Z' })
  })
  test('um curso isolado não é confundido com assinatura da comunidade', () => {
    expect(
      commerceEligibility(
        offer,
        [{ productId: 'outro-curso', offerId: null, kind: 'paid', expiresAt: null }],
        [],
      ).kind,
    ).toBe('purchase')
  })
})

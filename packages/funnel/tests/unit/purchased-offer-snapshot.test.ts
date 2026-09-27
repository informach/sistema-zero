import { describe, expect, test } from 'bun:test'
import type { ResolvedCharge } from '../../src/server/catalog'
import {
  createPurchasedOfferSnapshot,
  parsePurchasedOfferSnapshot,
  termsVersionForFunnel,
} from '../../src/server/purchased-offer-snapshot'

function charge(patch: Partial<ResolvedCharge> = {}): ResolvedCharge {
  return {
    offerId: 'offer-1',
    offerSlug: 'desafio-primeiro-jogo-30-dias',
    pricingMode: 'one_time',
    billingIntervalMonths: null,
    accessMode: 'fixed',
    accessDurationValue: 30,
    accessDurationUnit: 'days',
    listPriceCents: 6700,
    discountCents: 0,
    amountInCents: 6700,
    couponCode: null,
    currency: 'BRL',
    guaranteeDays: 7,
    ...patch,
  }
}

describe('snapshot imutável da oferta comprada', () => {
  test('congela prazo fixo de 30 dias e versão dos termos kids', () => {
    expect(
      createPurchasedOfferSnapshot(charge(), {
        termsVersion: termsVersionForFunnel('kids/desafio-primeiro-jogo'),
      }),
    ).toEqual({
      version: 1,
      offerId: 'offer-1',
      offerSlug: 'desafio-primeiro-jogo-30-dias',
      pricingMode: 'one_time',
      billingIntervalMonths: null,
      accessMode: 'fixed',
      accessDurationValue: 30,
      accessDurationUnit: 'days',
      listPriceCents: 6700,
      couponCode: null,
      discountCents: 0,
      chargedPriceCents: 6700,
      currency: 'BRL',
      guaranteeDays: 7,
      termsVersion: 'kids-2026-09-16',
    })
  })

  test('congela vitalício, assinatura e desconto', () => {
    expect(
      createPurchasedOfferSnapshot(
        charge({
          accessMode: 'lifetime',
          accessDurationValue: null,
          accessDurationUnit: null,
          listPriceCents: 6700,
          discountCents: 3000,
          amountInCents: 3700,
          couponCode: 'EVENTO-ABC',
        }),
        { termsVersion: 'kids-2026-09-16' },
      ),
    ).toMatchObject({
      accessMode: 'lifetime',
      listPriceCents: 6700,
      discountCents: 3000,
      chargedPriceCents: 3700,
      couponCode: 'EVENTO-ABC',
    })

    expect(
      createPurchasedOfferSnapshot(
        charge({
          pricingMode: 'subscription',
          billingIntervalMonths: 1,
          accessMode: 'billing_cycle',
          accessDurationValue: null,
          accessDurationUnit: null,
        }),
        { termsVersion: 'kids-2026-09-16' },
      ),
    ).toMatchObject({
      pricingMode: 'subscription',
      billingIntervalMonths: 1,
      accessMode: 'billing_cycle',
    })
  })

  test('anual quitado à vista vira contrato fixo de 12 meses', () => {
    const snapshot = createPurchasedOfferSnapshot(
      charge({
        pricingMode: 'subscription',
        billingIntervalMonths: 12,
        accessMode: 'billing_cycle',
        accessDurationValue: null,
        accessDurationUnit: null,
      }),
      { termsVersion: 'kids-2026-09-16', annualUpfront: true },
    )
    expect(snapshot).toMatchObject({
      pricingMode: 'one_time',
      billingIntervalMonths: null,
      accessMode: 'fixed',
      accessDurationValue: 12,
      accessDurationUnit: 'months',
    })
  })

  test('recusa snapshot malformado em vez de reinterpretá-lo', () => {
    expect(
      parsePurchasedOfferSnapshot({
        ...createPurchasedOfferSnapshot(charge(), { termsVersion: 'kids-2026-09-16' }),
        accessDurationValue: null,
      }),
    ).toBeNull()
  })
})

import { beforeEach, describe, expect, test } from 'bun:test'
import type { GatewayClient, GatewayResult } from '../../src/lib/gateway-client'
import { clearOfferCache, getActiveOffer, parseCatalogOffer } from '../../src/server/catalog'

function offerBody(
  slug: string,
  priceCents: number,
  policy: Record<string, unknown> = {
    accessMode: 'lifetime',
    accessDurationValue: null,
    accessDurationUnit: null,
  },
) {
  return {
    id: `id-${slug}`,
    slug,
    name: `Oferta ${slug}`,
    priceCents,
    compareAtPriceCents: null,
    currency: 'BRL',
    guaranteeDays: 7,
    installmentsMax: 12,
    pricingMode: 'one_time',
    billingIntervalMonths: null,
    isAvailable: true,
    product: { name: `Produto ${slug}`, sku: slug },
    includes: [{ name: `Produto ${slug}`, isPrimary: true }],
    ...policy,
  }
}

beforeEach(clearOfferCache)

describe('parseCatalogOffer — política de acesso', () => {
  test.each([
    [
      {
        pricingMode: 'one_time',
        accessMode: 'lifetime',
        accessDurationValue: null,
        accessDurationUnit: null,
      },
      { accessMode: 'lifetime', accessDurationValue: null, accessDurationUnit: null },
    ],
    [
      {
        pricingMode: 'one_time',
        accessMode: 'fixed',
        accessDurationValue: 30,
        accessDurationUnit: 'days',
      },
      { accessMode: 'fixed', accessDurationValue: 30, accessDurationUnit: 'days' },
    ],
    [
      {
        pricingMode: 'subscription',
        billingIntervalMonths: 1,
        accessMode: 'billing_cycle',
        accessDurationValue: null,
        accessDurationUnit: null,
      },
      { accessMode: 'billing_cycle', accessDurationValue: null, accessDurationUnit: null },
    ],
  ])('aceita uma política coerente', (policy, expected) => {
    expect(parseCatalogOffer(offerBody('coerente', 6700, policy))).toMatchObject(expected)
  })

  test.each([
    {
      pricingMode: 'subscription',
      accessMode: 'lifetime',
      accessDurationValue: null,
      accessDurationUnit: null,
    },
    {
      pricingMode: 'one_time',
      accessMode: 'billing_cycle',
      accessDurationValue: null,
      accessDurationUnit: null,
    },
    {
      pricingMode: 'one_time',
      accessMode: 'lifetime',
      accessDurationValue: 30,
      accessDurationUnit: 'days',
    },
    {
      pricingMode: 'one_time',
      accessMode: 'fixed',
      accessDurationValue: null,
      accessDurationUnit: null,
    },
    {
      pricingMode: 'one_time',
      accessMode: 'fixed',
      accessDurationValue: 0,
      accessDurationUnit: 'days',
    },
  ])('recusa combinações incoerentes na borda', (policy) => {
    expect(parseCatalogOffer(offerBody('incoerente', 6700, policy))).toBeNull()
  })

  test('aplica fallback somente à resposta realmente legada e registra warning estruturado', () => {
    const warnings: Array<{ event: string; meta?: Record<string, unknown> }> = []
    const legacy = offerBody('legada', 3700, {})
    const parsed = parseCatalogOffer(legacy, {
      log: (event, meta) => warnings.push({ event, meta }),
    })

    expect(parsed).toMatchObject({
      accessMode: 'lifetime',
      accessDurationValue: null,
      accessDurationUnit: null,
    })
    expect(warnings).toEqual([
      {
        event: 'catalog.offer_access_policy_legacy_fallback',
        meta: {
          offerId: 'id-legada',
          offerSlug: 'legada',
          pricingMode: 'one_time',
          fallbackAccessMode: 'lifetime',
        },
      },
    ])

    expect(
      parseCatalogOffer(
        offerBody('assinatura-legada', 9700, {
          pricingMode: 'subscription',
          billingIntervalMonths: 1,
        }),
        { log: (event, meta) => warnings.push({ event, meta }) },
      ),
    ).toMatchObject({
      accessMode: 'billing_cycle',
      accessDurationValue: null,
      accessDurationUnit: null,
    })
    expect(warnings[1]).toMatchObject({
      event: 'catalog.offer_access_policy_legacy_fallback',
      meta: { pricingMode: 'subscription', fallbackAccessMode: 'billing_cycle' },
    })

    expect(
      parseCatalogOffer(
        offerBody('parcial', 3700, {
          accessDurationValue: 30,
          accessDurationUnit: 'days',
        }),
        { log: () => warnings.push({ event: 'não deveria registrar' }) },
      ),
    ).toBeNull()
    expect(warnings).toHaveLength(2)
  })
})

describe('getActiveOffer cache', () => {
  test('não reaproveita cache de outro slug quando o catálogo falha', async () => {
    const gateway = {
      async getOffer(slug: string): Promise<GatewayResult> {
        if (slug === 'oferta-a') return { status: 200, body: offerBody(slug, 3700) }
        return { status: 502, body: { error: { code: 'GATEWAY_ERROR' } } }
      },
    } as unknown as GatewayClient

    const a = await getActiveOffer(gateway, 'oferta-a', { ttlMs: 1, now: 1 })
    const b = await getActiveOffer(gateway, 'oferta-b', { ttlMs: 1, now: 3 })

    expect(a?.slug).toBe('oferta-a')
    expect(b).toBeNull()
  })

  test('preço e política são renovados juntos no mesmo objeto de cache', async () => {
    let current = offerBody('oferta-cache', 3700)
    const gateway = {
      async getOffer(): Promise<GatewayResult> {
        return { status: 200, body: current }
      },
    } as unknown as GatewayClient

    const first = await getActiveOffer(gateway, 'oferta-cache', { ttlMs: 100, now: 1 })
    current = offerBody('oferta-cache', 6700, {
      accessMode: 'fixed',
      accessDurationValue: 30,
      accessDurationUnit: 'days',
    })
    const cached = await getActiveOffer(gateway, 'oferta-cache', { ttlMs: 100, now: 50 })
    const refreshed = await getActiveOffer(gateway, 'oferta-cache', { ttlMs: 100, now: 102 })

    expect(first).toMatchObject({ priceCents: 3700, accessMode: 'lifetime' })
    expect(cached).toMatchObject({ priceCents: 3700, accessMode: 'lifetime' })
    expect(refreshed).toMatchObject({
      priceCents: 6700,
      accessMode: 'fixed',
      accessDurationValue: 30,
      accessDurationUnit: 'days',
    })
  })

  test('oferta pausada invalida a cópia em cache quando o catálogo responde', async () => {
    let current = offerBody('oferta-pausada', 6700)
    const gateway = {
      async getOffer(): Promise<GatewayResult> {
        return { status: 200, body: current }
      },
    } as unknown as GatewayClient

    expect(await getActiveOffer(gateway, 'oferta-pausada', { ttlMs: 10, now: 1 })).not.toBeNull()
    current = { ...current, isAvailable: false }

    expect(await getActiveOffer(gateway, 'oferta-pausada', { ttlMs: 10, now: 12 })).toBeNull()
  })
})

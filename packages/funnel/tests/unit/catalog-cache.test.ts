import { describe, expect, test } from 'bun:test'
import type { GatewayClient, GatewayResult } from '../../src/lib/gateway-client'
import { getActiveOffer } from '../../src/server/catalog'

function offerBody(slug: string, priceCents: number) {
  return {
    id: `id-${slug}`,
    slug,
    name: `Oferta ${slug}`,
    priceCents,
    compareAtPriceCents: null,
    currency: 'BRL',
    guaranteeDays: 7,
    installmentsMax: 12,
    product: { name: `Produto ${slug}`, sku: slug },
    includes: [{ name: `Produto ${slug}`, isPrimary: true }],
  }
}

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
})

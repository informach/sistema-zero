import { FUNNEL_KEYS, getFunnelByKey } from '../funnels/registry'
import type { Env } from '../lib/env'
import type { GatewayClient } from '../lib/gateway-client'
import { getActiveOffer } from './catalog'

/** Só encaminha a páginas cujo checkout vende a oferta exata no público solicitado. */
export async function resolveCouponOfferPath(
  env: Env,
  gateway: GatewayClient,
  slug: string,
  audience: string,
): Promise<string | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !['kids', 'adult'].includes(audience)) return null
  const targetAudience = audience === 'adult' ? 'pro' : 'kids'
  for (const key of FUNNEL_KEYS) {
    const funnel = getFunnelByKey(key)
    if (!funnel || funnel.audience !== targetAudience) continue
    if (env.offerByFunnel[key] === slug) return `${funnel.basePath}/oferta`
  }
  for (const key of FUNNEL_KEYS) {
    const funnel = getFunnelByKey(key)
    if (!funnel || funnel.audience !== targetAudience) continue
    const primary = env.offerByFunnel[key]
    if (!primary) continue
    const offer = await getActiveOffer(gateway, primary)
    if (offer?.altOffer?.slug === slug)
      return `${funnel.basePath}/checkout?oferta=${encodeURIComponent(slug)}`
  }
  return null
}

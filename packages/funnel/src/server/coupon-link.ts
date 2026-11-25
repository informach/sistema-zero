import { FUNNEL_KEYS, getFunnelByKey } from '../funnels/registry'
import type { Env } from '../lib/env'
import type { GatewayClient } from '../lib/gateway-client'
import { getActiveOffer } from './catalog'

/**
 * O funil que vende a oferta exata no público pedido: a principal (env do funil) ou a irmã do
 * alternador (`altOffer`, mensal e anual). `null` = nenhuma página de compra vende essa oferta.
 */
export async function resolveOfferFunnel(
  env: Env,
  gateway: GatewayClient,
  slug: string,
  audience: string,
): Promise<{ basePath: string; alt: boolean } | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !['kids', 'adult'].includes(audience)) return null
  const targetAudience = audience === 'adult' ? 'pro' : 'kids'
  for (const key of FUNNEL_KEYS) {
    const funnel = getFunnelByKey(key)
    if (!funnel || funnel.audience !== targetAudience) continue
    if (env.offerByFunnel[key] === slug) return { basePath: funnel.basePath, alt: false }
  }
  for (const key of FUNNEL_KEYS) {
    const funnel = getFunnelByKey(key)
    if (!funnel || funnel.audience !== targetAudience) continue
    const primary = env.offerByFunnel[key]
    if (!primary) continue
    const offer = await getActiveOffer(gateway, primary)
    if (offer?.altOffer?.slug === slug) return { basePath: funnel.basePath, alt: true }
  }
  return null
}

/** Só encaminha a páginas cujo checkout vende a oferta exata no público solicitado. */
export async function resolveCouponOfferPath(
  env: Env,
  gateway: GatewayClient,
  slug: string,
  audience: string,
): Promise<string | null> {
  const funnel = await resolveOfferFunnel(env, gateway, slug, audience)
  if (!funnel) return null
  return funnel.alt
    ? `${funnel.basePath}/checkout?oferta=${encodeURIComponent(slug)}`
    : `${funnel.basePath}/oferta`
}

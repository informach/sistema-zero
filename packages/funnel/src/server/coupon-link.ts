import type { GatewayClient } from '../lib/gateway-client'
import { pageForOffer } from './page-offer'

/**
 * O funil que vende a oferta exata no público pedido: o do PRODUTO da oferta (25/11/2026; a
 * oferta principal vem do catálogo). `primary` = é a principal (página sem `?oferta=`); `alt` = é
 * a irmã do alternador da principal (o plano se escolhe no checkout). `null` = nenhuma página
 * vende essa oferta.
 */
export async function resolveOfferFunnel(
  gateway: Pick<GatewayClient, 'getOffer' | 'getProduct'>,
  slug: string,
  audience: string,
): Promise<{ basePath: string; primary: boolean; alt: boolean } | null> {
  const page = await pageForOffer(gateway, slug, audience)
  return page ? { basePath: page.funnel.basePath, primary: page.primary, alt: page.alt } : null
}

/** Só encaminha a páginas cujo checkout vende a oferta exata no público solicitado. */
export async function resolveCouponOfferPath(
  gateway: Pick<GatewayClient, 'getOffer' | 'getProduct'>,
  slug: string,
  audience: string,
): Promise<string | null> {
  const funnel = await resolveOfferFunnel(gateway, slug, audience)
  if (!funnel) return null
  if (funnel.alt) return `${funnel.basePath}/checkout?oferta=${encodeURIComponent(slug)}`
  return funnel.primary
    ? `${funnel.basePath}/oferta`
    : `${funnel.basePath}/oferta?oferta=${encodeURIComponent(slug)}`
}

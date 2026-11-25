import { DEFAULT_FUNNEL, getFunnelByKey } from '../funnels/registry'
import type { GatewayClient } from '../lib/gateway-client'
import type { ResolvedOffer } from './checkout'
import { primaryOfferSlug } from './page-offer'

/**
 * Resolvedor de oferta do checkout a partir do funil do lead (`leads.funnel` → registry → a
 * oferta PRINCIPAL do produto da página, marcada no catálogo, 25/11/2026). `null` no funil é
 * legado pré-multifunil e pertence ao funil default; chave desconhecida LANÇA (a cobrança não
 * inventa uma oferta). Produto sem oferta principal marcada → `null` (página indisponível).
 */
export function makeResolveOffer(
  gateway: Pick<GatewayClient, 'getProduct'>,
  log?: (event: string, meta?: Record<string, unknown>) => void,
): (funnel: string | null) => Promise<ResolvedOffer | null> {
  return async (funnel) => {
    const f = funnel ? getFunnelByKey(funnel) : DEFAULT_FUNNEL
    if (!f) {
      throw new Error(`Funil desconhecido ao resolver a oferta: "${funnel}".`)
    }
    const offerSlug = await primaryOfferSlug(gateway, f.productSku, { log })
    if (!offerSlug) return null
    return {
      offerSlug,
      productName: f.chargeName ?? f.productName,
      productSku: f.productSku,
      offerContract: f.offerContract,
    }
  }
}

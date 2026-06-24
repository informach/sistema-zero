import { getFunnelByKey } from '../funnels/registry'
import type { Env } from '../lib/env'
import type { ResolvedOffer } from './checkout'

/**
 * Constrói o resolvedor de oferta do checkout: a partir do funil do lead
 * (`leads.funnel` → registry) com FALLBACK no env (`CATALOG_OFFER_SLUG`/`PRODUCT_*`)
 * para leads legados sem funil. A dependência do env/registry fica na borda (rota),
 * mantendo os handlers de `checkout.ts` puros (recebem só o resolvedor por deps).
 */
export function makeResolveOffer(env: Env): (funnel: string | null) => ResolvedOffer {
  return (funnel) => {
    const f = getFunnelByKey(funnel)
    if (f) {
      return { offerSlug: f.catalogOfferSlug, productName: f.productName, productSku: f.productSku }
    }
    return {
      offerSlug: env.CATALOG_OFFER_SLUG,
      productName: env.PRODUCT_NAME,
      productSku: env.PRODUCT_SKU,
    }
  }
}

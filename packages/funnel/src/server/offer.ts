import { DEFAULT_FUNNEL, getFunnelByKey } from '../funnels/registry'
import type { Env } from '../lib/env'
import type { ResolvedOffer } from './checkout'

/**
 * Slug da oferta que ESTE funil vende — vem 100% da env `FUNNEL_OFFER_<KEY>`
 * (carregada/validada no boot por `lib/env.ts`; sem fallback no código). É a fonte
 * ÚNICA usada na página (preço exibido) E no checkout (cobrança), p/ nunca mostrar
 * uma oferta e cobrar outra. Funil sem a env não chega aqui (o boot já falhou), mas
 * lançamos por segurança.
 */
export function resolveOfferSlug(env: Env, funnelKey: string): string {
  const slug = env.offerByFunnel[funnelKey]
  if (!slug) {
    throw new Error(`Oferta não configurada p/ o funil "${funnelKey}" (env FUNNEL_OFFER_*).`)
  }
  return slug
}

/**
 * Resolvedor de oferta do checkout a partir do funil do lead (`leads.funnel` →
 * registry → env). `null` é legado pré-multifunil e pertence ao funil default;
 * chave desconhecida ainda LANÇA (a cobrança não inventa uma oferta).
 */
export function makeResolveOffer(env: Env): (funnel: string | null) => ResolvedOffer {
  return (funnel) => {
    const f = funnel ? getFunnelByKey(funnel) : DEFAULT_FUNNEL
    if (!f) {
      throw new Error(`Funil desconhecido ao resolver a oferta: "${funnel}".`)
    }
    return {
      offerSlug: resolveOfferSlug(env, f.key),
      productName: f.productName,
      productSku: f.productSku,
    }
  }
}

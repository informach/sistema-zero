import type { FunnelDef } from '../funnels/registry'
import { formatBRLFromCents } from '../lib/money'
import { getActiveOffer } from './catalog'
import { getDeps } from './deps'
import { resolveOfferSlug } from './offer'
import { checkOfferContract } from './offer-contract'

/** A orientação continua útil quando a oferta está indisponível, sem inventar um preço. */
export async function desafioQuizPrice(f: FunnelDef): Promise<string | null> {
  const { env, gateway, log } = getDeps()
  const offer = await getActiveOffer(gateway, resolveOfferSlug(env, f.key), { log })
  return offer && checkOfferContract(f.offerContract, offer).ok
    ? formatBRLFromCents(offer.priceCents)
    : null
}

import type { FunnelOfferContract } from '../funnels/registry'

type OfferAccessPolicy = {
  pricingMode: 'one_time' | 'subscription'
  accessMode: 'lifetime' | 'fixed' | 'billing_cycle'
  accessDurationValue: number | null
  accessDurationUnit: 'days' | 'months' | null
}

export type OfferContractCheck =
  | { ok: true }
  | {
      ok: false
      reason: 'offer_unavailable' | 'policy_mismatch'
      expected?: FunnelOfferContract
      actual?: OfferAccessPolicy
    }

/** Confere a promessa rígida do funil antes de exibir ou cobrar a oferta configurada. */
export function checkOfferContract(
  contract: FunnelOfferContract | undefined,
  offer: OfferAccessPolicy | null,
): OfferContractCheck {
  if (!contract) return { ok: true }
  if (!offer) return { ok: false, reason: 'offer_unavailable' }

  const matches =
    offer.pricingMode === contract.pricingMode &&
    offer.accessMode === contract.accessMode &&
    offer.accessDurationValue === contract.accessDurationValue &&
    offer.accessDurationUnit === contract.accessDurationUnit
  return matches
    ? { ok: true }
    : { ok: false, reason: 'policy_mismatch', expected: contract, actual: offer }
}

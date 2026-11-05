/** Immutable promotional receipt identity; no card token or customer data. */
export interface FirstChargePricing {
  amountInCents: number
  providerChargeId: string | null
  renewalPriceConfirmed: boolean
}

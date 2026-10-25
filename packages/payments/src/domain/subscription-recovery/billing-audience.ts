/** Only the checkout registry can label an automatic recovery audience. */
export function verifiedBillingAudience(
  metadata: Record<string, unknown>,
): 'kids' | 'adult' | null {
  return metadata.billingAudienceSource === 'funnel-registry-v1' &&
    typeof metadata.billingFunnelKey === 'string' &&
    metadata.billingFunnelKey.length > 0 &&
    (metadata.billingAudience === 'kids' || metadata.billingAudience === 'adult')
    ? metadata.billingAudience
    : null
}

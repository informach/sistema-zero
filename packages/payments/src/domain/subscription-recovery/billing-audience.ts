/** Only a server-resolved checkout can label an automatic recovery audience. */
export function verifiedBillingAudience(
  metadata: Record<string, unknown>,
): 'kids' | 'adult' | null {
  if (
    metadata.billingAudienceSource === 'member-commerce-v1' &&
    typeof metadata.accountUserId === 'string' &&
    /^[0-9a-f-]{36}$/i.test(metadata.accountUserId) &&
    typeof metadata.offerId === 'string' &&
    metadata.offerId.length > 0 &&
    (metadata.billingAudience === 'kids' || metadata.billingAudience === 'adult')
  )
    return metadata.billingAudience
  return metadata.billingAudienceSource === 'funnel-registry-v1' &&
    typeof metadata.billingFunnelKey === 'string' &&
    metadata.billingFunnelKey.length > 0 &&
    (metadata.billingAudience === 'kids' || metadata.billingAudience === 'adult')
    ? metadata.billingAudience
    : null
}

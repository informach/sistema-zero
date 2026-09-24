import type { GatewayClient } from '../lib/gateway-client'

export type ReferralGiftPage =
  | { kind: 'ready' | 'preparing'; referrerName: string }
  | { kind: 'not_found' | 'unavailable' }

/** Never expose the claim form without an explicit availability confirmation. */
export async function resolveReferralGiftPage(
  gateway: Pick<GatewayClient, 'resolveReferralCode'>,
  code: string,
): Promise<ReferralGiftPage> {
  if (!/^[a-z0-9-]{4,32}$/.test(code)) return { kind: 'not_found' }

  const result = await gateway.resolveReferralCode(code)
  if (result.status === 404) return { kind: 'not_found' }
  if (result.status !== 200) return { kind: 'unavailable' }

  const body = result.body as { displayName?: unknown; giftAvailable?: unknown } | null
  if (
    typeof body?.displayName !== 'string' ||
    !body.displayName.trim() ||
    typeof body.giftAvailable !== 'boolean'
  ) {
    return { kind: 'unavailable' }
  }
  return {
    kind: body.giftAvailable ? 'ready' : 'preparing',
    referrerName: body.displayName.trim(),
  }
}

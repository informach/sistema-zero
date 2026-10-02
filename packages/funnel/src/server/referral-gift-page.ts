import type { ReferralGiftView } from '@sistemazero/core/referrals'
import type { GatewayClient } from '../lib/gateway-client'

export type ReferralGiftPage =
  | {
      kind: 'ready' | 'preparing' | 'scheduled' | 'paused' | 'ended'
      referrerName: string
      gift: ReferralGiftView
    }
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

  const body = legacyGiftView(result.body as Partial<ReferralGiftView> | null)
  if (
    body?.code !== code ||
    typeof body?.displayName !== 'string' ||
    !body.displayName.trim() ||
    typeof body.giftAvailable !== 'boolean' ||
    !body.source ||
    typeof body.source.name !== 'string' ||
    !body.source.name.trim() ||
    body.ownerKind !== body.source.kind ||
    !['ambassador', 'account', 'campaign'].includes(body.source.kind) ||
    !body.state ||
    !['active', 'scheduled', 'paused', 'ended'].includes(body.state) ||
    (body.source.kind === 'campaign' &&
      (typeof body.startsAt !== 'string' ||
        typeof body.endsAt !== 'string' ||
        !Number.isFinite(Date.parse(body.startsAt)) ||
        !Number.isFinite(Date.parse(body.endsAt)) ||
        Date.parse(body.endsAt) <= Date.parse(body.startsAt)))
  ) {
    return { kind: 'unavailable' }
  }
  return {
    kind: body.state === 'active' ? (body.giftAvailable ? 'ready' : 'preparing') : body.state,
    referrerName: body.displayName.trim(),
    gift: body as ReferralGiftView,
  }
}

/**
 * O referrals anterior às campanhas responde só `code/ownerKind/displayName/giftAvailable`.
 * Enquanto o funil sobe antes dele, o convite de embaixador ou de conta vale como ativo, com o
 * nome de quem indicou como origem; campanha sem `source`/`state` continua falhando fechada.
 */
function legacyGiftView(body: Partial<ReferralGiftView> | null): Partial<ReferralGiftView> | null {
  if (!body || body.source || body.state) return body
  if (body.ownerKind !== 'ambassador' && body.ownerKind !== 'account') return body
  if (typeof body.displayName !== 'string') return body
  return {
    ...body,
    source: { kind: body.ownerKind, name: body.displayName },
    state: 'active',
    startsAt: null,
    endsAt: null,
  }
}

import type { CampaignCouponPolicy } from '@sistemazero/core/referrals'
import { z } from 'zod'
import type { CampaignPolicyClient } from '../../domain/ports/campaign-policy.port'

const policySchema = z
  .object({
    couponId: z.uuid(),
    offerId: z.uuid(),
    audience: z.enum(['kids', 'adult']),
    status: z.enum(['draft', 'active', 'paused', 'ended']),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
  })
  .refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt))

export class CampaignPolicyHttpClient implements CampaignPolicyClient {
  constructor(private readonly options: { baseUrl?: string; internalToken?: string }) {}
  async get(campaignId: string): Promise<CampaignCouponPolicy | null> {
    if (!this.options.baseUrl || !this.options.internalToken)
      throw new Error('Política de campanha indisponível.')
    const response = await fetch(
      `${this.options.baseUrl}/referrals/internal/campaigns/${encodeURIComponent(campaignId)}/coupon-policy`,
      {
        headers: { 'x-internal-token': this.options.internalToken },
        signal: AbortSignal.timeout(5000),
      },
    )
    if (response.status === 404) return null
    if (!response.ok) throw new Error('Não foi possível consultar a campanha.')
    return policySchema.parse(await response.json())
  }
}

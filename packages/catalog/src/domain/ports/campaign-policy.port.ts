import type { CampaignCouponPolicy } from '@sistemazero/core/referrals'

export interface CampaignPolicyClient {
  get(campaignId: string): Promise<CampaignCouponPolicy | null>
}

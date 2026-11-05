import type {
  CampaignCouponDetails,
  CampaignCouponLink,
  GiftAudience,
} from '@sistemazero/core/referrals'

export interface CampaignCouponCatalog {
  get(
    link: CampaignCouponLink,
    campaignId: string,
    audience: GiftAudience,
  ): Promise<CampaignCouponDetails | null>
}

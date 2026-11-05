import type { CampaignCouponDetails, GiftAudience } from '@sistemazero/core/referrals'
import { couponCampaignId } from '../../domain/coupon/campaign-coupon'
import type { CouponRepository } from '../../domain/ports/coupon-repository.port'
import type { OfferRepository } from '../../domain/ports/offer-repository.port'
import type { ProductRepository } from '../../domain/ports/product-repository.port'

/** Leitura interna para mostrar exatamente os termos atuais do Catálogo na campanha. */
export class CampaignCouponService {
  constructor(
    private readonly coupons: CouponRepository,
    private readonly offers: OfferRepository,
    private readonly products: ProductRepository,
  ) {}
  async get(input: {
    couponId: string
    offerId: string
    campaignId: string
    audience: GiftAudience
  }): Promise<CampaignCouponDetails | null> {
    const [coupon, offer] = await Promise.all([
      this.coupons.findById(input.couponId),
      this.offers.findById(input.offerId),
    ])
    if (
      !coupon ||
      !offer ||
      couponCampaignId(coupon.metadata) !== input.campaignId ||
      coupon.audience !== input.audience ||
      coupon.appliesToAll ||
      coupon.offerIds.length !== 1 ||
      coupon.offerIds[0] !== offer.id
    )
      return null
    const product = await this.products.findById(offer.productId)
    if (product?.audience !== input.audience) return null
    let available = offer.isAvailable() && offer.content?.allowsCoupon === true
    try {
      coupon.assertApplicable(offer.id, offer.priceCents)
    } catch {
      available = false
    }
    if (offer.priceCents - coupon.computeDiscountCents(offer.priceCents) <= 0) available = false
    if (
      offer.pricingMode === 'subscription' &&
      offer.priceCents - coupon.computeDiscountCents(offer.priceCents) < 300
    )
      available = false
    return {
      couponId: coupon.id,
      offerId: offer.id,
      code: coupon.code,
      offerSlug: offer.slug,
      offerName: offer.name,
      percentOff: coupon.percentOff,
      amountOffCents: coupon.amountOffCents,
      currency: coupon.currency,
      accessMode: offer.accessMode,
      accessDurationValue: offer.accessDurationValue,
      accessDurationUnit: offer.accessDurationUnit,
      available,
    }
  }
}

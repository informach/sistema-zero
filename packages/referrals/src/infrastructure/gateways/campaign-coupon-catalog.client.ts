import type {
  CampaignCouponDetails,
  CampaignCouponLink,
  GiftAudience,
} from '@sistemazero/core/referrals'
import { z } from 'zod'
import type { CampaignCouponCatalog } from '../../domain/ports/campaign-coupon-catalog.port'

const detailsSchema = z
  .object({
    couponId: z.uuid(),
    offerId: z.uuid(),
    code: z.string().min(1).max(60),
    offerSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    offerName: z.string().min(1),
    percentOff: z.number().int().min(1).max(100).nullable(),
    amountOffCents: z.number().int().positive().nullable(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    accessMode: z.enum(['fixed', 'lifetime', 'billing_cycle']),
    accessDurationValue: z.number().int().positive().nullable(),
    accessDurationUnit: z.enum(['days', 'months']).nullable(),
    available: z.boolean(),
  })
  .refine((value) => (value.percentOff === null) !== (value.amountOffCents === null))

export class CampaignCouponCatalogHttpClient implements CampaignCouponCatalog {
  constructor(
    private readonly options: { baseUrl: string; internalToken?: string; timeoutMs: number },
  ) {}
  async get(
    link: CampaignCouponLink,
    campaignId: string,
    audience: GiftAudience,
  ): Promise<CampaignCouponDetails | null> {
    if (!this.options.internalToken) throw new Error('Consulta de cupons não configurada.')
    const query = new URLSearchParams({ campaignId, offerId: link.offerId, audience })
    const response = await fetch(
      `${this.options.baseUrl}/catalog/internal/coupons/${encodeURIComponent(link.couponId)}/campaign?${query}`,
      {
        headers: { 'x-internal-token': this.options.internalToken },
        signal: AbortSignal.timeout(this.options.timeoutMs),
      },
    )
    if (response.status === 404) return null
    if (!response.ok) throw new Error('Não foi possível conferir o cupom no Catálogo.')
    const details = detailsSchema.parse(await response.json())
    if (details.couponId !== link.couponId || details.offerId !== link.offerId)
      throw new Error('O Catálogo retornou outro cupom ou oferta.')
    return details
  }
}

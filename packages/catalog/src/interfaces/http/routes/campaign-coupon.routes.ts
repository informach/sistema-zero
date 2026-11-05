import { envelope } from '@sistemazero/core/http'
import { Elysia, t } from 'elysia'
import type { CampaignCouponService } from '../../../application/campaign-coupon/campaign-coupon.service'
import { assertInternalCaller } from '../auth'

export function campaignCouponRoutes(service: CampaignCouponService, internalToken?: string) {
  return new Elysia({ prefix: '/catalog/internal/coupons' })
    .onTransform(({ headers }) => assertInternalCaller(headers['x-internal-token'], internalToken))
    .get(
      '/:id/campaign',
      async ({ params, query, set }) => {
        const details = await service.get({ couponId: params.id, ...query })
        if (!details) {
          set.status = 404
          return envelope('COUPON_NOT_FOUND', 'Cupom não encontrado')
        }
        return details
      },
      {
        params: t.Object({ id: t.String({ format: 'uuid' }) }),
        query: t.Object({
          campaignId: t.String({ format: 'uuid' }),
          offerId: t.String({ format: 'uuid' }),
          audience: t.Union([t.Literal('kids'), t.Literal('adult')]),
        }),
      },
    )
}

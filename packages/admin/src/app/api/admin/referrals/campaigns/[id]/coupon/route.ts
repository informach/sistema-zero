import { prepareCampaignCoupon } from '@/lib/prepare-campaign-coupon'
import { createCoupon, listCoupons } from '@/server/catalog'
import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'
import { getCampaign, saveCampaign } from '@/server/referrals'

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const input = await req.json().catch(() => null)
  return forwardUpstream(
    await prepareCampaignCoupon(
      {
        campaign: getCampaign,
        coupons: listCoupons,
        create: createCoupon,
        save: saveCampaign,
        offer: (offerId) => gatewayFetch(`/catalog/offers/${encodeURIComponent(offerId)}`),
        offerLink: async (slug, audience, campaignUrl) => {
          const url = new URL('/api/oferta-link', campaignUrl)
          url.search = new URLSearchParams({ oferta: slug, publico: audience }).toString()
          const response = await fetch(url, {
            cache: 'no-store',
            signal: AbortSignal.timeout(10_000),
          })
          if (!response.ok) throw new Error('Não foi possível conferir a página de compra.')
          const body = (await response.json()) as { available?: unknown }
          return body.available === true
        },
      },
      id,
      input,
    ),
  )
}

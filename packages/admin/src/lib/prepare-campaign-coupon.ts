import type { CampaignDetailView, CampaignView } from '@sistemazero/core/referrals'
import { z } from 'zod'
import type { CouponView, OfferListItem, Paginated } from './types'

export const CampaignCouponDraftSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(60)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/)
    .transform((v) => v.toUpperCase()),
  percentOff: z.number().int().min(1).max(99),
  offerId: z.string().uuid(),
  expectedUpdatedAt: z.string().datetime(),
  audience: z.enum(['kids', 'adult']),
})
export type CampaignCouponDraft = Omit<
  z.infer<typeof CampaignCouponDraftSchema>,
  'expectedUpdatedAt' | 'audience'
>
type Reply<T = unknown> = { status: number; body: T }
export interface PrepareCampaignCouponDeps {
  campaign(id: string, audience: string): Promise<Reply<CampaignDetailView>>
  coupons(query: {
    audience: string
    q: string
    limit: number
    offset: number
  }): Promise<Reply<Paginated<CouponView>>>
  offer(id: string): Promise<Reply<OfferListItem & { product?: { audience?: string } }>>
  offerLink(slug: string, audience: string, campaignUrl: string): Promise<boolean>
  create(body: unknown): Promise<Reply<CouponView>>
  save(body: unknown, id: string): Promise<Reply<{ campaign: CampaignView }>>
}
const failure = (status: number, message: string): Reply => ({
  status,
  body: { error: { code: 'CAMPAIGN_COUPON_ERROR', message } },
})

/** Cupom criado sem vínculo efetivo é recusado pelo Catálogo. Retry recupera pelo código único. */
export async function prepareCampaignCoupon(
  deps: PrepareCampaignCouponDeps,
  id: string,
  input: unknown,
): Promise<Reply> {
  const parsed = CampaignCouponDraftSchema.safeParse(input)
  if (!parsed.success) return failure(400, 'Confira o código, a oferta e o desconto de 1 a 99%.')
  const data = parsed.data
  const campaignResult = await deps.campaign(id, data.audience)
  if (campaignResult.status !== 200) return campaignResult
  const campaign = campaignResult.body.campaign
  if (campaign.updatedAt !== data.expectedUpdatedAt)
    return failure(409, 'A campanha mudou. Atualize antes de vincular o cupom.')
  if (!campaign.schedule)
    return failure(400, 'Defina a data da campanha e os prazos antes de cadastrar o cupom.')
  const offerResult = await deps.offer(data.offerId)
  if (offerResult.status !== 200) return offerResult
  const offer = offerResult.body
  if (
    offer.product?.audience !== campaign.audience ||
    !offer.isAvailable ||
    offer.content?.allowsCoupon !== true
  )
    return failure(400, 'Escolha uma oferta disponível, que aceite cupom, da mesma comunidade.')
  if (
    offer.pricingMode === 'subscription' &&
    offer.priceCents - Math.floor((offer.priceCents * data.percentOff) / 100) < 300
  )
    return failure(
      400,
      'O desconto deve manter a primeira cobrança da assinatura em pelo menos R$ 3,00.',
    )
  if (!(await deps.offerLink(offer.slug, campaign.audience, campaign.shareUrl)))
    return failure(
      400,
      'Esta oferta ainda não tem uma página de compra configurada. Configure a página antes de divulgar o cupom da campanha.',
    )
  async function findCoupon(): Promise<CouponView | Reply> {
    for (let offset = 0; ; offset += 100) {
      const page = await deps.coupons({
        audience: campaign.audience,
        q: data.code,
        limit: 100,
        offset,
      })
      if (page.status !== 200) return page
      const found = page.body.items.find((c) => c.code.toUpperCase() === data.code)
      if (found) return found
      if (offset + page.body.items.length >= page.body.total || !page.body.items.length)
        return failure(404, 'Cupom ainda não cadastrado.')
    }
  }
  let found = await findCoupon()
  if ('body' in found && found.status === 404) {
    const created = await deps.create({
      audience: campaign.audience,
      code: data.code,
      type: 'percent',
      percentOff: data.percentOff,
      currency: offer.currency,
      status: 'active',
      appliesToAll: false,
      offerIds: [offer.id],
      metadata: { campaignId: campaign.id },
    })
    if (created.status === 201) found = created.body
    else if (created.status === 409 || created.status >= 500) found = await findCoupon()
    else return created
  }
  if ('body' in found) return found
  if (
    found.metadata?.campaignId !== campaign.id ||
    found.status !== 'active' ||
    found.audience !== campaign.audience ||
    found.type !== 'percent' ||
    found.percentOff !== data.percentOff ||
    found.currency !== offer.currency ||
    found.appliesToAll ||
    found.offerIds.length !== 1 ||
    found.offerIds[0] !== offer.id ||
    found.validFrom ||
    found.validUntil ||
    found.minPurchaseCents ||
    found.maxRedemptions
  )
    return failure(
      409,
      'Este código já existe com outras condições. Escolha um novo código para esta campanha.',
    )
  return deps.save(
    {
      name: campaign.name,
      publicTitle: campaign.publicTitle,
      description: campaign.description,
      context: campaign.context,
      code: campaign.code,
      channel: campaign.channel,
      status: campaign.status,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      audience: campaign.audience,
      schedule: campaign.schedule,
      ambassadorId: campaign.ambassadorId,
      commissionEnabled: campaign.commissionEnabled,
      commissionAmountCents: campaign.commissionAmountCents,
      commissionAnnualAmountCents: campaign.commissionAnnualAmountCents,
      commissionWindowDays: campaign.commissionWindowDays,
      expectedUpdatedAt: data.expectedUpdatedAt,
      coupon: { couponId: found.id, offerId: offer.id },
    },
    id,
  )
}

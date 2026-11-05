import { expect, test } from 'bun:test'
import type { CampaignDetailView, CampaignView } from '@sistemazero/core/referrals'
import {
  type PrepareCampaignCouponDeps,
  prepareCampaignCoupon,
} from '../src/lib/prepare-campaign-coupon'
import type { CouponView, OfferListItem } from '../src/lib/types'

const baseCoupon: CouponView = {
  id: '33333333-3333-4333-8333-333333333333',
  version: 0,
  audience: 'kids',
  code: 'ENCONTRO50',
  type: 'percent',
  percentOff: 50,
  amountOffCents: null,
  currency: 'BRL',
  status: 'active',
  appliesToAll: false,
  minPurchaseCents: null,
  maxRedemptions: null,
  timesRedeemed: 0,
  validFrom: null,
  validUntil: null,
  offerIds: ['22222222-2222-4222-8222-222222222222'],
  createdAt: '2026-11-05T12:00:00.000Z',
  updatedAt: '2026-11-05T12:00:00.000Z',
}

function setup() {
  const campaign = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Evento',
    publicTitle: 'Encontro',
    code: 'encontro',
    description: '',
    context: 'event',
    channel: '',
    status: 'active',
    audience: 'kids',
    startsAt: '2026-11-06T03:00:00Z',
    endsAt: '2026-11-09T03:00:00Z',
    updatedAt: '2026-11-05T12:00:00.000Z',
    shareUrl: 'https://example.test/bolsa/encontro',
    schedule: { eventDate: '2026-11-06', giftClaimDays: 3, couponClaimDays: 7 },
  } as CampaignView
  const offer = {
    id: '22222222-2222-4222-8222-222222222222',
    slug: 'desafio',
    isAvailable: true,
    currency: 'BRL',
    content: { allowsCoupon: true },
    product: { audience: 'kids' },
  } as OfferListItem & { product: { audience: string } }
  const draft = {
    code: 'ENCONTRO50',
    percentOff: 50,
    offerId: offer.id,
    expectedUpdatedAt: campaign.updatedAt,
    audience: 'kids',
  }
  let coupon: CouponView | null = null
  let creates = 0,
    saves = 0
  let ambiguous = false,
    conflict = false
  const deps: PrepareCampaignCouponDeps = {
    campaign: async () => ({ status: 200, body: { campaign } as CampaignDetailView }),
    offer: async () => ({ status: 200, body: offer }),
    offerLink: async () => true,
    coupons: async () => ({
      status: 200,
      body: { items: coupon ? [coupon] : [], total: coupon ? 1 : 0, limit: 100, offset: 0 },
    }),
    create: async (body) => {
      creates++
      if (!body || typeof body !== 'object') throw new Error('Expected coupon input')
      coupon = { ...baseCoupon, ...body }
      return { status: ambiguous ? 502 : 201, body: coupon }
    },
    save: async (body) => {
      saves++
      if (conflict) return { status: 409, body: { campaign } }
      return { status: 200, body: { campaign: { ...campaign, ...(body as CampaignView) } } }
    },
  }
  return {
    deps,
    draft,
    campaign,
    offer,
    counts: () => ({ creates, saves }),
    ambiguous() {
      ambiguous = true
    },
    conflict(value: boolean) {
      conflict = value
    },
    coupon(value: CouponView) {
      coupon = value
    },
  }
}

test('cria cupom com escopo e calendário vinculados sem copiar datas', async () => {
  const f = setup()
  const result = await prepareCampaignCoupon(f.deps, f.campaign.id, f.draft)
  expect(result.status).toBe(200)
  expect(f.counts()).toEqual({ creates: 1, saves: 1 })
  const page = await f.deps.coupons({ audience: 'kids', q: '', limit: 100, offset: 0 })
  expect(page.body.items[0]).toMatchObject({
    metadata: { campaignId: f.campaign.id },
    appliesToAll: false,
    offerIds: [f.offer.id],
    percentOff: 50,
  })
  expect(page.body.items[0]?.validUntil).toBeNull()
})
test('resposta ambígua e conflito no vínculo recuperam o mesmo cupom, sem novo POST', async () => {
  const f = setup()
  f.ambiguous()
  f.conflict(true)
  expect((await prepareCampaignCoupon(f.deps, f.campaign.id, f.draft)).status).toBe(409)
  f.conflict(false)
  expect((await prepareCampaignCoupon(f.deps, f.campaign.id, f.draft)).status).toBe(200)
  expect(f.counts()).toEqual({ creates: 1, saves: 2 })
})
test('não cria cupom com versão antiga, oferta de outro público ou sem página de compra', async () => {
  const f = setup()
  expect(
    (
      await prepareCampaignCoupon(f.deps, f.campaign.id, {
        ...f.draft,
        expectedUpdatedAt: '2026-11-04T12:00:00.000Z',
      })
    ).status,
  ).toBe(409)
  f.offer.product.audience = 'adult'
  expect((await prepareCampaignCoupon(f.deps, f.campaign.id, f.draft)).status).toBe(400)
  f.offer.product.audience = 'kids'
  f.deps.offerLink = async () => false
  expect((await prepareCampaignCoupon(f.deps, f.campaign.id, f.draft)).status).toBe(400)
  expect(f.counts()).toEqual({ creates: 0, saves: 0 })
})
test('código de outra campanha não é reaproveitado', async () => {
  const f = setup()
  f.coupon({ ...baseCoupon, metadata: { campaignId: 'outro' } })
  expect((await prepareCampaignCoupon(f.deps, f.campaign.id, f.draft)).status).toBe(409)
  expect(f.counts()).toEqual({ creates: 0, saves: 0 })
})

test('cupom inativo não é vinculado; código com ponto é permitido', async () => {
  const f = setup()
  f.coupon({ ...baseCoupon, status: 'inactive', metadata: { campaignId: f.campaign.id } })
  expect((await prepareCampaignCoupon(f.deps, f.campaign.id, f.draft)).status).toBe(409)
  const dotted = setup()
  expect(
    (
      await prepareCampaignCoupon(dotted.deps, dotted.campaign.id, {
        ...dotted.draft,
        code: 'EVENTO.50',
      })
    ).status,
  ).toBe(200)
})

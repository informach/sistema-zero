import { describe, expect, test } from 'bun:test'
import type { CampaignInput } from '@sistemazero/core/referrals'
import { AcquisitionMaintenanceService } from '../../src/application/acquisitions/acquisition-maintenance.service'
import { AcquisitionReportsService } from '../../src/application/acquisitions/acquisition-reports.service'
import { AmbassadorOffersService } from '../../src/application/ambassador-offers/ambassador-offers.service'
import { CampaignAdminService } from '../../src/application/campaigns/campaign-admin.service'
import { ReferralLinkService } from '../../src/application/links/referral-link.service'
import { AmbassadorOfferValidationError } from '../../src/domain/ambassador-offers'
import {
  CampaignKindLockedError,
  CampaignRedirectTakenError,
  CampaignValidationError,
} from '../../src/domain/campaign'
import { referralLinkUrl } from '../../src/domain/links'
import type { GiftOffer } from '../../src/domain/ports/gift-offer-catalog.port'
import { InMemoryAcquisitionRepository } from '../fakes/acquisitions'
import { InMemoryCampaignRepository } from '../fakes/campaigns'
import {
  FakeGiftOfferCatalog,
  InMemoryReferralRepository,
  KIDS_GIFT_OFFER,
  silentLogger,
} from '../fakes/in-memory'

const DAY = 86_400_000
const now = new Date()

/** Assinatura da Comunidade (indicação) e o Desafio (venda avulsa e presente). */
const COMMUNITY: GiftOffer = {
  ...KIDS_GIFT_OFFER,
  offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d10',
  offerSlug: 'comunidade-dos-criadores-mensal',
  name: 'Comunidade dos Criadores',
  accessMode: 'billing_cycle',
  accessDurationValue: null,
  accessDurationUnit: null,
}
const DESAFIO: GiftOffer = {
  ...KIDS_GIFT_OFFER,
  offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d11',
  offerSlug: 'desafio-primeiro-jogo-30-dias',
  name: 'Desafio do Primeiro Jogo',
  accessDurationValue: 30,
}

class MemoryOfferLists {
  rows: {
    audience: 'kids' | 'adult'
    kind: 'gift' | 'referral'
    offerId: string
    enabled: boolean
    position: number
  }[] = []
  async list(audience: 'kids' | 'adult', kind?: 'gift' | 'referral') {
    return this.rows
      .filter((r) => r.audience === audience && (!kind || r.kind === kind))
      .sort((a, b) => a.position - b.position)
      .map((r) => ({ ...r, updatedAt: now.toISOString() }))
  }
  async replace(
    audience: 'kids' | 'adult',
    kind: 'gift' | 'referral',
    items: { offerId: string; enabled: boolean }[],
  ) {
    this.rows = this.rows.filter((r) => !(r.audience === audience && r.kind === kind))
    for (const [position, item] of items.entries())
      this.rows.push({ audience, kind, ...item, position })
    return this.list(audience, kind)
  }
}

function base() {
  const referrals = new InMemoryReferralRepository()
  const campaigns = new InMemoryCampaignRepository(referrals)
  const acquisitions = new InMemoryAcquisitionRepository(referrals)
  const catalog = new FakeGiftOfferCatalog()
  catalog.add(COMMUNITY)
  catalog.add(DESAFIO)
  const lists = new MemoryOfferLists()
  const offers = new AmbassadorOffersService(lists, catalog, silentLogger)
  const reports = new AcquisitionReportsService(acquisitions, campaigns, referrals)
  const admin = new CampaignAdminService(
    campaigns,
    referrals,
    'https://funil.test',
    () => now,
    undefined,
    catalog,
    reports,
  )
  const links = new ReferralLinkService(referrals, campaigns, catalog, offers, undefined, () => now)
  return { referrals, campaigns, acquisitions, catalog, lists, offers, reports, admin, links }
}

const saleInput: CampaignInput = {
  name: 'Black Friday do Desafio',
  publicTitle: 'Desafio com desconto',
  description: '',
  context: 'ad',
  code: 'black-desafio',
  startsAt: new Date(now.getTime() - DAY).toISOString(),
  endsAt: new Date(now.getTime() + DAY).toISOString(),
  status: 'active',
  channel: 'instagram',
  kind: 'sale',
  saleOfferId: DESAFIO.offerId,
  linkTarget: 'checkout',
}

describe('campanha de venda e endereço antigo', () => {
  test('campanha de venda grava a oferta à venda, não dá presente e o link vai ao pagamento', async () => {
    const { admin } = base()
    const view = await admin.create(saleInput, 'Helena')
    expect(view).toMatchObject({
      kind: 'sale',
      saleOfferId: DESAFIO.offerId,
      giftOfferId: null,
      linkTarget: 'checkout',
      shareUrl: 'https://funil.test/i/black-desafio/pagamento',
    })
  })

  test('venda sem oferta, ou oferta de outro público, é recusada', async () => {
    const { admin, catalog } = base()
    await expect(admin.create({ ...saleInput, saleOfferId: null }, 'Helena')).rejects.toThrow(
      CampaignValidationError,
    )
    catalog.add({ ...DESAFIO, offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d12', audience: 'adult' })
    await expect(
      admin.create({ ...saleInput, saleOfferId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d12' }, 'Helena'),
    ).rejects.toThrow(CampaignValidationError)
  })

  test('o tipo só muda em rascunho sem cadastros', async () => {
    const { admin } = base()
    const created = await admin.create(saleInput, 'Helena')
    await expect(
      admin.update(
        created!.id,
        {
          ...saleInput,
          kind: 'gift',
          giftOfferId: KIDS_GIFT_OFFER.offerId,
          expectedUpdatedAt: created!.updatedAt,
        },
        'Helena',
      ),
    ).rejects.toThrow(CampaignKindLockedError)
  })

  test('endereço antigo: caminho válido, data futura, até um ano e de uma campanha só', async () => {
    const { admin } = base()
    const until = new Date(now.getTime() + 30 * DAY).toISOString()
    const gift: CampaignInput = {
      ...saleInput,
      kind: 'gift',
      saleOfferId: null,
      giftOfferId: KIDS_GIFT_OFFER.offerId,
      code: 'guia-pais-presente',
      redirectPath: '/kids/vilao-em-aliado',
      redirectUntil: until,
    }
    const created = await admin.create(gift, 'Helena')
    expect(created).toMatchObject({ redirectPath: '/kids/vilao-em-aliado' })
    await expect(admin.create({ ...gift, code: 'outra-campanha' }, 'Helena')).rejects.toThrow(
      CampaignRedirectTakenError,
    )
    for (const bad of [
      { redirectPath: '/bolsa/abcd', redirectUntil: until },
      { redirectPath: '/kids/vilao', redirectUntil: new Date(now.getTime() - DAY).toISOString() },
      {
        redirectPath: '/kids/vilao',
        redirectUntil: new Date(now.getTime() + 400 * DAY).toISOString(),
      },
      { redirectPath: '/kids/vilao', redirectUntil: null },
    ])
      await expect(admin.create({ ...gift, code: 'mais-uma', ...bad }, 'Helena')).rejects.toThrow(
        CampaignValidationError,
      )
  })
})

describe('listas de ofertas dos embaixadores', () => {
  test('presente aceita só pagamento único; indicação aceita a assinatura', async () => {
    const { offers } = base()
    await expect(
      offers.replace({
        audience: 'kids',
        kind: 'gift',
        items: [{ offerId: COMMUNITY.offerId, enabled: true }],
      }),
    ).rejects.toThrow(AmbassadorOfferValidationError)
    const saved = await offers.replace({
      audience: 'kids',
      kind: 'referral',
      items: [
        { offerId: COMMUNITY.offerId, enabled: true },
        { offerId: DESAFIO.offerId, enabled: true },
      ],
    })
    expect(saved.map((s) => s.position)).toEqual([0, 1])
  })

  test('a mesma oferta duas vezes ou de outro público é recusada', async () => {
    const { offers } = base()
    await expect(
      offers.replace({
        audience: 'kids',
        kind: 'referral',
        items: [
          { offerId: DESAFIO.offerId, enabled: true },
          { offerId: DESAFIO.offerId, enabled: false },
        ],
      }),
    ).rejects.toThrow(AmbassadorOfferValidationError)
    await expect(
      offers.replace({
        audience: 'adult',
        kind: 'referral',
        items: [{ offerId: DESAFIO.offerId, enabled: true }],
      }),
    ).rejects.toThrow(AmbassadorOfferValidationError)
  })

  test('as opções da página saem só das ligadas, na ordem, e marcam a assinatura', async () => {
    const { offers } = base()
    await offers.replace({
      audience: 'kids',
      kind: 'referral',
      items: [
        { offerId: DESAFIO.offerId, enabled: false },
        { offerId: COMMUNITY.offerId, enabled: true },
      ],
    })
    const options = await offers.options('kids')
    expect(options.map((o) => [o.offerSlug, o.subscription])).toEqual([
      ['comunidade-dos-criadores-mensal', true],
    ])
  })
})

describe('links de indicação', () => {
  async function ambassadorWithLists() {
    const ctx = base()
    const created = await ctx.referrals.createAmbassadorWithCode({
      name: 'Mariana Lopes',
      email: 'mariana@example.com',
      pageToken: 'm'.repeat(43),
      code: 'mari-x7k2',
    })
    if (created.kind !== 'created') throw new Error('seed')
    await ctx.offers.replace({
      audience: 'kids',
      kind: 'gift',
      items: [{ offerId: KIDS_GIFT_OFFER.offerId, enabled: true }],
    })
    await ctx.offers.replace({
      audience: 'kids',
      kind: 'referral',
      items: [{ offerId: DESAFIO.offerId, enabled: true }],
    })
    return ctx
  }

  test('embaixador: presente da lista, oferta da lista (página ou pagamento), fora da lista 404', async () => {
    const { links } = await ambassadorWithLists()
    const gift = await links.resolve('mari-x7k2', 'cade-todo-mundo-7-dias', false)
    expect(gift).toMatchObject({ kind: 'ok', link: { mode: 'gift', sourceKind: 'ambassador' } })
    const sale = await links.resolve('mari-x7k2', 'desafio-primeiro-jogo-30-dias', true)
    expect(sale).toMatchObject({ kind: 'ok', link: { mode: 'sale', target: 'checkout' } })
    expect((await links.resolve('mari-x7k2', 'comunidade-dos-criadores-mensal', false)).kind).toBe(
      'not_found',
    )
  })

  test('embaixador sem oferta no link: o presente padrão (os links antigos)', async () => {
    const { links } = await ambassadorWithLists()
    expect(await links.resolve('mari-x7k2', null, false)).toMatchObject({
      kind: 'ok',
      link: { mode: 'gift', offerSlug: 'cade-todo-mundo-7-dias' },
    })
  })

  test('campanha de venda abre a oferta dela no destino escolhido; rascunho é 404', async () => {
    const { admin, links } = base()
    const created = await admin.create({ ...saleInput, linkTarget: 'page' }, 'Helena')
    expect(await links.resolve('black-desafio', null, false)).toMatchObject({
      kind: 'ok',
      link: { mode: 'sale', target: 'page', offerSlug: DESAFIO.offerSlug, state: 'active' },
    })
    expect(await links.resolve('black-desafio', null, true)).toMatchObject({
      link: { target: 'checkout' },
    })
    await admin.update(
      created!.id,
      { ...saleInput, status: 'draft', expectedUpdatedAt: created!.updatedAt },
      'Helena',
    )
    expect((await links.resolve('black-desafio', null, false)).kind).toBe('not_found')
  })

  test('catálogo fora devolve upstream_error, não 404', async () => {
    const { links, catalog } = await ambassadorWithLists()
    catalog.fail = true
    expect((await links.resolve('mari-x7k2', null, false)).kind).toBe('upstream_error')
  })

  test('o link reserva o segmento "pagamento" e codifica os pedaços', () => {
    expect(referralLinkUrl('https://f.test/', 'mari-x7k2', { offerSlug: 'desafio' })).toBe(
      'https://f.test/i/mari-x7k2/desafio',
    )
    expect(() => referralLinkUrl('https://f.test', 'x', { offerSlug: 'pagamento' })).toThrow()
  })
})

describe('manutenção e relatórios', () => {
  test('presente concluído sem aquisição é reparado; o antigo ganha o prazo longo', async () => {
    const { referrals, acquisitions, catalog } = base()
    const created = await referrals.createAmbassadorWithCode({
      name: 'Vó Cida',
      email: 'cida@example.com',
      pageToken: 'c'.repeat(43),
      code: 'cida-x7k2',
    })
    if (created.kind !== 'created') throw new Error('seed')
    const { redemption } = await referrals.insertRedemption({
      audience: 'kids',
      codeId: created.code.id,
      email: 'paula@example.com',
      name: 'Paula',
      phone: null,
    })
    await referrals.markRedemptionGranted(redemption.id, new Date(now.getTime() - 60 * DAY))
    const stored = referrals.redemptions.find((r) => r.id === redemption.id)!
    stored.completedAt = new Date(now.getTime() - 60 * DAY)
    const maintenance = new AcquisitionMaintenanceService(
      acquisitions,
      {
        getOfferById: async (id) => ({
          id,
          slug: (await catalog.resolve(id))?.offerSlug ?? 'x',
          name: '',
        }),
      },
      {
        defaults: { amounts: null, legacyCents: 3000, windowDays: 45 },
        repairWindowDays: 3650,
        batchSize: 50,
        conversionOfferSlugs: [],
      },
      silentLogger,
      () => now,
    )
    expect(await maintenance.repairGifts()).toBe(1)
    expect(await maintenance.repairGifts()).toBe(0)
    expect(acquisitions.items[0]).toMatchObject({
      kind: 'gift',
      originKind: 'ambassador',
      bonusTerms: { windowDays: 3650 },
    })
  })

  test('resultado por origem: pessoas distintas, compras, assinaturas e faturamento sem estorno', async () => {
    const { acquisitions, reports, admin } = base()
    const campaign = await admin.create(saleInput, 'Helena')
    const row = (
      paymentId: string,
      kind: 'one_time' | 'subscription',
      amount: bigint,
      email: string,
    ) =>
      acquisitions.insert({
        email,
        accountUserId: null,
        audience: 'kids',
        kind,
        offerId: DESAFIO.offerId,
        offerSlug: DESAFIO.offerSlug,
        amountCents: amount,
        paymentId,
        subscriptionId: kind === 'subscription' ? `sub-${paymentId}` : null,
        redemptionId: null,
        acquiredAt: now,
        originKind: 'campaign',
        codeId: null,
        campaignId: campaign!.id,
        ambassadorId: null,
        place: null,
        utm: null,
        bonusTerms: null,
      })
    await row('p1', 'one_time', 3350n, 'a@x.com')
    await row('p2', 'one_time', 3350n, 'a@x.com')
    await row('p3', 'subscription', 9700n, 'b@x.com')
    await row('p4', 'one_time', 3350n, 'c@x.com')
    await acquisitions.markRefundedByPayment('p4')
    const results = (await reports.campaignResults([campaign!.id])).get(campaign!.id)
    expect(results).toEqual({
      people: 2,
      gifts: 0,
      purchases: 2,
      subscriptions: 1,
      revenueCents: '16400',
    })
    const report = await reports.originReport({
      audience: 'kids',
      from: new Date(now.getTime() - DAY),
      to: new Date(now.getTime() + DAY),
    })
    expect(report.totals).toMatchObject({ newPeople: 2, purchases: 2, subscriptions: 1 })
    expect(report.byOrigin.find((r) => r.origin === 'campaign')?.revenueCents).toBe('16400')
    expect(report.totals.referralShare).toBe(1)
    const detail = await reports.campaignDetail(campaign!.id)
    expect(detail.peopleTotal).toBe(2)
    expect(detail.people.find((p) => p.email === 'a@x.com')?.later).toHaveLength(1)
  })
})

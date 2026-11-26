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
  GiftCatalogUnavailableError,
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

describe('lista do embaixador: meses e catálogo fora', () => {
  test('oferta de venda em meses sai com accessMonths, nunca como dias', async () => {
    const { offers, catalog } = base()
    const anual: GiftOffer = {
      ...DESAFIO,
      offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d20',
      offerSlug: 'cade-todo-mundo-1-ano',
      accessDurationValue: 12,
      accessDurationUnit: 'months',
    }
    catalog.add(anual)
    await offers.replace({
      audience: 'kids',
      kind: 'referral',
      items: [{ offerId: anual.offerId, enabled: true }],
    })
    const [option] = await offers.options('kids')
    expect(option).toMatchObject({ accessDays: null, accessMonths: 12 })
    expect(await offers.allowed('kids', 'referral', 'cade-todo-mundo-1-ano')).toMatchObject({
      accessMonths: 12,
    })
  })

  test('catálogo fora ao conferir a escolha LANÇA (vira "tente de novo"), não devolve null', async () => {
    const { offers, catalog } = base()
    await offers.replace({
      audience: 'kids',
      kind: 'gift',
      items: [{ offerId: KIDS_GIFT_OFFER.offerId, enabled: true }],
    })
    catalog.fail = true
    await expect(offers.allowed('kids', 'gift', KIDS_GIFT_OFFER.offerSlug)).rejects.toThrow(
      GiftCatalogUnavailableError,
    )
  })
})

describe('uma oferta por produto em cada lista, e o link curto pelo produto', () => {
  test('duas ofertas LIGADAS do mesmo produto na mesma lista são recusadas; listas são independentes', async () => {
    const { offers, catalog } = base()
    const quinze = catalog.add({
      ...KIDS_GIFT_OFFER,
      offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d30',
      offerSlug: 'cade-15-dias',
      productSku: 'cade-todo-mundo',
    })
    const sete = catalog.add({
      ...KIDS_GIFT_OFFER,
      offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d34',
      offerSlug: 'cade-7-dias',
      productSku: 'cade-todo-mundo',
    })
    await expect(
      offers.replace({
        audience: 'kids',
        kind: 'gift',
        items: [
          { offerId: quinze.offerId, enabled: true },
          { offerId: sete.offerId, enabled: true },
        ],
      }),
    ).rejects.toThrow('são do mesmo curso')
    // Desligada não conta; e a venda do mesmo curso vai na outra lista.
    await offers.replace({
      audience: 'kids',
      kind: 'gift',
      items: [
        { offerId: quinze.offerId, enabled: true },
        { offerId: sete.offerId, enabled: false },
      ],
    })
    const anual = catalog.add({
      ...DESAFIO,
      offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d31',
      offerSlug: 'cade-1-ano',
      accessDurationValue: 12,
      accessDurationUnit: 'months',
      productSku: 'cade-todo-mundo',
    })
    await offers.replace({
      audience: 'kids',
      kind: 'referral',
      items: [{ offerId: anual.offerId, enabled: true }],
    })
  })

  test('o link curto acha a oferta do produto na lista do tipo pedido', async () => {
    const { referrals, offers, catalog, links } = base()
    await referrals.createAmbassadorWithCode({
      name: 'Mariana',
      email: 'mariana@example.com',
      pageToken: 'm'.repeat(43),
      code: 'mari-x7k2',
    })
    const quinze = catalog.add({
      ...KIDS_GIFT_OFFER,
      offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d32',
      offerSlug: 'cade-15-dias',
      productSku: 'cade-todo-mundo',
    })
    const anual = catalog.add({
      ...DESAFIO,
      offerId: '7a0f6a52-3c1e-4c55-9d1b-6f1c0a1e7d33',
      offerSlug: 'cade-1-ano',
      accessDurationValue: 12,
      accessDurationUnit: 'months',
      productSku: 'cade-todo-mundo',
    })
    await offers.replace({
      audience: 'kids',
      kind: 'gift',
      items: [{ offerId: quinze.offerId, enabled: true }],
    })
    await offers.replace({
      audience: 'kids',
      kind: 'referral',
      items: [{ offerId: anual.offerId, enabled: true }],
    })
    const skus = ['cade-todo-mundo', 'cade-todo-mundo-adulto']
    expect(await links.resolveForProduct('mari-x7k2', 'gift', skus, false)).toMatchObject({
      kind: 'ok',
      link: { mode: 'gift', offerSlug: 'cade-15-dias' },
    })
    expect(await links.resolveForProduct('mari-x7k2', 'referral', skus, true)).toMatchObject({
      kind: 'ok',
      link: { mode: 'sale', offerSlug: 'cade-1-ano', target: 'checkout' },
    })
    expect((await links.resolveForProduct('mari-x7k2', 'gift', ['outro'], false)).kind).toBe(
      'not_found',
    )
    // Catálogo fora: "tente de novo" (upstream_error), nunca "link não existe".
    catalog.fail = true
    expect((await links.resolveForProduct('mari-x7k2', 'gift', skus, false)).kind).toBe(
      'upstream_error',
    )
  })
})

describe('campanha de venda: só a principal ou oferta marcada para a página', () => {
  class CatalogWithPrimary extends FakeGiftOfferCatalog {
    primaries = new Map<string, string>()
    async primaryOfferSlugOf(sku: string) {
      return this.primaries.get(sku) ?? null
    }
  }
  function withPrimary() {
    const referrals = new InMemoryReferralRepository()
    const campaigns = new InMemoryCampaignRepository(referrals)
    const catalog = new CatalogWithPrimary()
    const desafio = catalog.add({ ...DESAFIO, productSku: 'desafio-primeiro-jogo' })
    const admin = new CampaignAdminService(
      campaigns,
      referrals,
      'https://funil.test',
      () => now,
      undefined,
      catalog,
    )
    return { catalog, admin, desafio }
  }

  test('oferta que não é a principal nem está marcada é recusada', async () => {
    const { catalog, admin } = withPrimary()
    catalog.primaries.set('desafio-primeiro-jogo', 'outra-oferta')
    await expect(admin.create(saleInput, 'Helena')).rejects.toThrow(CampaignValidationError)
  })

  test('a principal do produto e a oferta marcada para a página passam', async () => {
    const principal = withPrimary()
    principal.catalog.primaries.set('desafio-primeiro-jogo', DESAFIO.offerSlug)
    expect(await principal.admin.create(saleInput, 'Helena')).toMatchObject({ kind: 'sale' })
    const marcada = withPrimary()
    marcada.desafio.pageSellable = true
    expect(await marcada.admin.create(saleInput, 'Helena')).toMatchObject({ kind: 'sale' })
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

  test('resultados por comunidade: o embaixador tem código nos dois públicos e a lente não soma', async () => {
    const { acquisitions, reports } = base()
    const row = (paymentId: string, audience: 'kids' | 'adult', email: string) =>
      acquisitions.insert({
        email,
        accountUserId: null,
        audience,
        kind: 'subscription',
        offerId: COMMUNITY.offerId,
        offerSlug: COMMUNITY.offerSlug,
        amountCents: 9700n,
        paymentId,
        subscriptionId: `sub-${paymentId}`,
        redemptionId: null,
        acquiredAt: now,
        originKind: 'ambassador',
        codeId: null,
        campaignId: null,
        ambassadorId: 'amb-1',
        place: null,
        utm: null,
        bonusTerms: null,
      })
    await row('k1', 'kids', 'a@x.com')
    await row('k2', 'kids', 'b@x.com')
    await row('a1', 'adult', 'c@x.com')
    expect((await reports.ambassadorResults(['amb-1'])).get('amb-1')?.subscriptions).toBe(3)
    expect((await reports.ambassadorResults(['amb-1'], 'kids')).get('amb-1')?.subscriptions).toBe(2)
    const detail = await reports.ambassadorDetail('amb-1', 0, 'adult')
    expect(detail.peopleTotal).toBe(1)
  })
})

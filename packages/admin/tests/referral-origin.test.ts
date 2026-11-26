import { describe, expect, test } from 'bun:test'
import type { AcquisitionView, OriginReport } from '@sistemazero/core/referrals'
import {
  buildCatalogOffers,
  offerSummary,
} from '../src/app/admin/embaixadores/ambassador-offer-catalog'
import { sameCourseProblem, swapItems } from '../src/app/admin/embaixadores/ambassador-offers-panel'
import { normalizeRedirectPath } from '../src/app/admin/embaixadores/campaign-shared'
import { filterCampaigns, tabAfterKey } from '../src/app/admin/embaixadores/convites-client'
import {
  bonusTotalsByEmail,
  sortAmbassadors,
} from '../src/app/admin/embaixadores/embaixadores-client'
import {
  arrivalText,
  firstAcquisition,
} from '../src/app/admin/membros/[userId]/purchases-origin-tab'
import { originChartPoints, weekLabel } from '../src/app/admin/origem-das-vendas/origin-chart'
import {
  acquisitionOrigin,
  bonusCameBy,
  isOriginDetail,
  isOriginReport,
  moneyFromCents,
  moneyRounded,
  originPeriodRange,
  percent,
  placeLabel,
  toCsv,
} from '../src/lib/referral-origin'
import type { ConversionAdminView, OfferListItem, ProductView } from '../src/lib/types'

/** As réguas das telas de origem do Admin (Lote 7, 25/11/2026). */

const acq = (over: Partial<AcquisitionView> = {}): AcquisitionView => ({
  id: 'a1',
  email: 'juliana@exemplo.com',
  audience: 'kids',
  kind: 'gift',
  offerId: null,
  offerSlug: 'cade-todo-mundo-7-dias',
  amountCents: '0',
  originKind: 'campaign',
  campaignId: 'c1',
  campaignTitle: 'Palestra na clínica Laopa',
  ambassadorId: 'p1',
  ambassadorName: 'Patrícia Ramos',
  place: null,
  utmSource: null,
  status: 'active',
  acquiredAt: '2026-11-06T13:00:00.000Z',
  firstEntry: true,
  ...over,
})
const names = new Map([
  ['cade-todo-mundo-7-dias', 'Cadê Todo Mundo? · 7 dias'],
  ['desafio', 'Desafio do Primeiro Jogo'],
])

describe('números e textos', () => {
  test('dinheiro a partir da string de centavos e o número redondo dos cartões', () => {
    expect(moneyFromCents('97000').replace(/\s/g, ' ')).toBe('R$ 970,00')
    expect(moneyRounded('473550').replace(/\s/g, ' ')).toBe('R$ 4.736')
    expect(moneyFromCents(null).replace(/\s/g, ' ')).toBe('R$ 0,00')
  })
  test('percentual com uma casa e sem base', () => {
    expect(percent(11, 175)).toBe('6,3%')
    expect(percent(1, 0)).toBe('0%')
  })
  test('o período do relatório fica dentro do teto de um ano', () => {
    const now = new Date('2026-11-25T12:00:00.000Z')
    const { from, to } = originPeriodRange('year', now)
    expect(Date.parse(to) - Date.parse(from)).toBeLessThanOrEqual(366 * 86_400_000)
    expect(originPeriodRange('7d', now).from).toBe('2026-11-18T12:00:00.000Z')
  })
  test('o lugar do botão tem nome; lugar novo aparece cru', () => {
    expect(placeLabel('pais-curso-fechado')).toBe('Área dos pais · curso fechado')
    expect(placeLabel('crianca-curso-fechado')).toBe('Kids · curso fechado')
    expect(placeLabel('lugar-novo')).toBe('lugar-novo')
  })
  test('a origem de cada aquisição, com o detalhe', () => {
    expect(acquisitionOrigin(acq())).toEqual({
      label: 'Campanha',
      detail: 'Palestra na clínica Laopa · com Patrícia Ramos',
    })
    expect(acquisitionOrigin(acq({ originKind: 'platform', place: 'pais-inicio' }))).toEqual({
      label: 'Botão',
      detail: 'Área dos pais · cartão do Início',
    })
    expect(acquisitionOrigin(acq({ originKind: 'none' })).detail).toBeNull()
  })
  test('planilha com separador ; e aspas quando precisa', () => {
    expect(toCsv([['a;b', 'c"d', 1]])).toBe('﻿"a;b";"c""d";1')
  })
  test('as formas das respostas: serviço antigo ou erro não quebram a tela', () => {
    expect(isOriginReport({ items: [] })).toBe(false)
    expect(isOriginDetail({})).toBe(false)
    const report = {
      from: '',
      to: '',
      totals: {
        newPeople: 0,
        gifts: 0,
        purchases: 0,
        subscriptions: 0,
        revenueCents: '0',
        referralShare: 0,
      },
      byOrigin: [],
      weeks: [],
      places: [],
      paths: [],
      ambassadors: [],
      campaigns: [],
      latest: [],
    } satisfies OriginReport
    expect(isOriginReport(report)).toBe(true)
  })
})

describe('bônus: "Veio por"', () => {
  test('a primeira aquisição ativa com o embaixador do bônus', () => {
    const items = [
      acq({
        id: 'b',
        acquiredAt: '2026-11-10T13:00:00.000Z',
        kind: 'one_time',
        offerSlug: 'desafio',
      }),
      acq({
        id: 'a',
        originKind: 'ambassador',
        campaignTitle: null,
        acquiredAt: '2026-10-30T13:00:00.000Z',
        kind: 'one_time',
        offerSlug: 'desafio',
      }),
    ]
    expect(bonusCameBy(items, { id: 'p1', name: 'Patrícia Ramos' }, names)).toEqual({
      label: 'Link pessoal',
      detail: 'comprou Desafio do Primeiro Jogo em 30/10',
    })
    expect(bonusCameBy(items, { id: 'p2', name: 'Outra pessoa' }, names)).toBeNull()
  })
  test('casa pelo id: outra embaixadora com o mesmo nome não leva o "Veio por"', () => {
    const items = [acq({ ambassadorId: 'p9', ambassadorName: 'Patrícia Ramos' })]
    expect(bonusCameBy(items, { id: 'p1', name: 'Patrícia Ramos' }, names)).toBeNull()
    // Referrals anterior (sem o id no bônus): o nome ainda serve.
    expect(bonusCameBy(items, { id: null, name: 'Patrícia Ramos' }, names)).not.toBeNull()
  })
  test('estornada não conta', () => {
    expect(
      bonusCameBy([acq({ status: 'refunded' })], { id: 'p1', name: 'Patrícia Ramos' }, names),
    ).toBeNull()
  })
})

describe('as abas e a lista de campanhas', () => {
  test('as setas giram pelas três abas; Home e End vão às pontas', () => {
    expect(tabAfterKey('campaigns', 'ArrowRight')).toBe('people')
    expect(tabAfterKey('people', 'ArrowRight')).toBe('offers')
    expect(tabAfterKey('offers', 'ArrowRight')).toBe('campaigns')
    expect(tabAfterKey('campaigns', 'ArrowLeft')).toBe('offers')
    expect(tabAfterKey('people', 'Home')).toBe('campaigns')
    expect(tabAfterKey('campaigns', 'End')).toBe('offers')
    expect(tabAfterKey('campaigns', 'a')).toBeNull()
  })
  test('filtra por tipo (antiga sem tipo é presente) e por situação', () => {
    const items = [
      { id: '1', kind: 'sale', state: 'active' },
      { id: '2', state: 'ended' },
      { id: '3', kind: 'gift', state: 'active' },
    ] as never
    expect(filterCampaigns(items, { kind: 'gift', state: 'all' }).map((c) => c.id)).toEqual([
      '2',
      '3',
    ])
    expect(filterCampaigns(items, { kind: 'all', state: 'active' }).map((c) => c.id)).toEqual([
      '1',
      '3',
    ])
  })
  test('o endereço antigo digitado vira caminho', () => {
    expect(normalizeRedirectPath('https://sistemazero.com.br/kids/vilao-em-aliado/')).toBe(
      '/kids/vilao-em-aliado',
    )
    expect(normalizeRedirectPath('kids/Vilao-Em-Aliado?x=1')).toBe('/kids/vilao-em-aliado')
  })
})

describe('embaixadores', () => {
  test('soma os bônus por e-mail e ordena', () => {
    const conv = (status: string, bonusCents: number, email = 'm@x.com') =>
      ({ status, bonusCents, ambassadorEmail: email }) as ConversionAdminView
    const totals = bonusTotalsByEmail([
      conv('eligible', 3000),
      conv('pending', 8000),
      conv('paid', 3000),
      conv('canceled', 3000),
    ])
    expect(totals.get('m@x.com')).toEqual({ toPay: 3000, pending: 8000, paid: 3000 })
    const list = [
      { id: 'a', createdAt: '2026-10-01', results: { subscriptions: 1, revenueCents: '9700' } },
      { id: 'b', createdAt: '2026-11-01', results: { subscriptions: 9, revenueCents: '100' } },
    ] as never
    expect(sortAmbassadors(list, 'subscriptions').map((x) => x.id)).toEqual(['b', 'a'])
    expect(sortAmbassadors(list, 'revenue').map((x) => x.id)).toEqual(['a', 'b'])
    expect(sortAmbassadors(list, 'recent').map((x) => x.id)).toEqual(['b', 'a'])
  })
})

describe('ofertas dos embaixadores', () => {
  const offer = (over: Partial<OfferListItem>): OfferListItem =>
    ({
      id: 'o',
      slug: 'o',
      name: 'Oferta',
      status: 'active',
      priceCents: 6700,
      pricingMode: 'one_time',
      accessMode: 'fixed',
      accessDurationValue: 30,
      accessDurationUnit: 'days',
      billingIntervalMonths: null,
      productId: 'p1',
      productName: 'Desafio',
      items: [],
      content: null,
      ...over,
    }) as OfferListItem
  const product = (over: Partial<ProductView>): ProductView =>
    ({
      id: 'p1',
      sku: 'desafio',
      status: 'active',
      primaryOfferId: 'o',
      fulfillment: null,
      ...over,
    }) as ProductView
  test('presente, página de venda e curso para os pais', () => {
    const [main, gift, parents] = buildCatalogOffers(
      [
        offer({ id: 'o' }),
        offer({ id: 'g', status: 'paused', priceCents: 0 }),
        offer({
          id: 'v',
          productId: 'p2',
          accessMode: 'lifetime',
          content: { pageSellable: true },
        }),
      ],
      [
        product({}),
        product({
          id: 'p2',
          sku: 'vilao',
          primaryOfferId: null,
          fulfillment: { accessType: 'course', courseRef: 'vilao' },
        }),
      ],
      [{ slug: 'vilao', learner: 'parents' }] as never,
    )
    expect(main).toMatchObject({ pageEligible: true, giftEligible: true, forParents: false })
    // Pausada serve de presente, mas não tem página de venda.
    expect(gift).toMatchObject({ pageEligible: false, giftEligible: true })
    expect(parents).toMatchObject({ pageEligible: true, forParents: true, productSku: 'vilao' })
    expect(offerSummary(offer({})).replace(/\s/g, ' ')).toBe('Pagamento único R$ 67,00 · 30 dias')
  })
  test('oferta principal esgotada ou fora da janela de venda não tem página (a régua do member-shell)', () => {
    const [soldOut] = buildCatalogOffers(
      [offer({ id: 'o', isAvailable: false })],
      [product({})],
      [],
    )
    expect(soldOut?.pageEligible).toBe(false)
  })
  test('subir e descer trocam com a vizinha do MESMO grupo, onde quer que ela esteja', () => {
    // [filho A, pais B, filho C]: subir o filho C troca com o filho A, não com o pais B.
    expect(swapItems(['A', 'B', 'C'], 2, 0)).toEqual(['C', 'B', 'A'])
    expect(swapItems(['A', 'B', 'C'], 1, 1)).toEqual(['A', 'B', 'C'])
    expect(swapItems(['A', 'B', 'C'], 0, 9)).toEqual(['A', 'B', 'C'])
  })
  test('duas ligadas do mesmo curso: o recado do referrals, antes de gravar', () => {
    const catalog = new Map([
      ['a', { name: 'Guia 1 ano', productSku: 'guia' }],
      ['b', { name: 'Guia 15 dias', productSku: 'guia' }],
    ] as never)
    expect(
      sameCourseProblem(
        [
          { offerId: 'a', enabled: true },
          { offerId: 'b', enabled: true },
        ],
        catalog,
      ),
    ).toBe('Guia 1 ano e Guia 15 dias são do mesmo curso. Deixe só uma delas ligada nesta lista.')
    expect(
      sameCourseProblem(
        [
          { offerId: 'a', enabled: true },
          { offerId: 'b', enabled: false },
        ],
        catalog,
      ),
    ).toBeNull()
  })
})

describe('Origem das vendas e a ficha', () => {
  test('as semanas em reais por origem', () => {
    const [week] = originChartPoints([
      {
        weekStart: '2026-11-23',
        revenueByOrigin: {
          ambassador: '6900',
          campaign: '0',
          platform: '100',
          ads: '0',
          none: '0',
        },
      },
    ])
    expect(week).toMatchObject({ week: '2026-11-23', ambassador: 69, platform: 1, total: 70 })
    expect(weekLabel('2026-11-23')).toBe('23/11')
  })
  test('como chegou: a primeira entrada', () => {
    const items = [
      acq({ id: 'x', firstEntry: false, acquiredAt: '2026-11-20T13:00:00.000Z' }),
      acq({ id: 'y' }),
    ]
    expect(firstAcquisition(items)?.id).toBe('y')
    expect(arrivalText(acq(), names)).toBe(
      'Ganhou Cadê Todo Mundo? · 7 dias de presente. A campanha tem o embaixador Patrícia Ramos.',
    )
    expect(firstAcquisition([])).toBeNull()
  })
})

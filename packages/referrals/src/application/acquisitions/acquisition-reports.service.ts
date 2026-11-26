import type {
  AcquisitionView,
  AmbassadorOfferCounts,
  GiftAudience,
  OriginDetail,
  OriginGiftCourse,
  OriginPersonView,
  OriginRankingRow,
  OriginReport,
  OriginResults,
} from '@sistemazero/core/referrals'
import type { AcquisitionRecord } from '../../domain/acquisition'
import {
  acquisitionView,
  breakdownByOrigin,
  byPlace,
  firstByPerson,
  originResults,
  pathsToSubscription,
  resultsByOffer,
  revenueByWeek,
} from '../../domain/acquisition-reports'
import {
  type AcquisitionRepository,
  REPORT_ROW_LIMIT,
} from '../../domain/ports/acquisition-repository.port'
import type { CampaignRepository } from '../../domain/ports/campaign-repository.port'
import type { CourseBenefitRepository } from '../../domain/ports/course-benefit-repository.port'
import type {
  ConversionRecord,
  ReferralRepository,
} from '../../domain/ports/referral-repository.port'

const PEOPLE_PAGE = 25
const LATEST = 20
const RANKING = 5
/** Contas por curso do presente no fio serviço→BFF (o BFF pergunta ao members em lotes). */
const GIFT_ACCOUNTS_LIMIT = 5000

/** O bônus da assinatura de uma pessoa, na ficha do Admin (nunca a chave Pix). */
export interface AccountBonusView {
  id: string
  audience: GiftAudience | null
  offerSlug: string
  status: string
  bonusCents: number
  paidAt: string
  maturesAt: string
  paidMarkedAt: string | null
  ambassadorId: string | null
  ambassadorName: string | null
  /** A campanha da aquisição que ganhou o bônus, quando veio por uma. */
  campaignTitle: string | null
}

/**
 * Os relatórios de origem do Admin (25/11/2026): resultado por campanha e por embaixador, o
 * detalhe de cada um (vendas por oferta e as pessoas que entraram), a página "Origem das vendas"
 * e as aquisições de uma conta. Tudo sai das aquisições; estornos não contam.
 */
export class AcquisitionReportsService {
  constructor(
    private readonly acquisitions: AcquisitionRepository,
    private readonly campaigns: Pick<CampaignRepository, 'findById'>,
    private readonly referrals: ReferralRepository,
    private readonly benefits?: CourseBenefitRepository,
  ) {}

  async courseBenefits(audience: GiftAudience, courseSlug?: string) {
    const benefits = this.benefits
    if (!benefits) return []
    const list = await benefits.list(audience, courseSlug)
    return Promise.all(
      list.map(async (b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        audience: b.audience,
        courseSlug: b.courseSlug,
        giftOfferId: b.giftOfferId,
        status: b.status,
        createdAt: b.createdAt.toISOString(),
        results: originResults(await benefits.acquisitions(b.id)),
      })),
    )
  }

  async courseBenefitDetail(
    id: string,
    audience: GiftAudience,
    offset = 0,
    from?: Date,
    to?: Date,
  ) {
    const benefits = this.benefits
    if (!benefits) return null
    const benefit = await benefits.findById(id)
    if (!benefit || benefit.audience !== audience) return null
    const rows = (await benefits.acquisitions(id)).filter(
      (r) => (!from || r.acquiredAt >= from) && (!to || r.acquiredAt < to),
    )
    return {
      benefit: {
        id: benefit.id,
        code: benefit.code,
        name: benefit.name,
        audience: benefit.audience,
        courseSlug: benefit.courseSlug,
        giftOfferId: benefit.giftOfferId,
        status: benefit.status,
        createdAt: benefit.createdAt.toISOString(),
      },
      results: originResults(rows),
      detail: await this.detail(rows, offset),
      period: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
    }
  }

  /**
   * `audience` (25/11/2026, revisão do Lote 7): os números de UMA comunidade. O embaixador tem
   * código nos dois públicos; sem o filtro, a lente Kids somava as assinaturas adultas.
   */
  async campaignResults(
    campaignIds: string[],
    audience?: GiftAudience,
  ): Promise<Map<string, OriginResults>> {
    const rows = ofAudience(await this.acquisitions.listByCampaigns(campaignIds), audience)
    return groupResults(campaignIds, rows, (a) => a.campaignId)
  }

  async ambassadorResults(
    ambassadorIds: string[],
    audience?: GiftAudience,
  ): Promise<Map<string, OriginResults>> {
    const rows = ofAudience(await this.acquisitions.listByAmbassadors(ambassadorIds), audience)
    return groupResults(ambassadorIds, rows, (a) => a.ambassadorId)
  }

  async campaignDetail(
    campaignId: string,
    offset = 0,
    audience?: GiftAudience,
  ): Promise<OriginDetail> {
    const rows = await this.acquisitions.listByCampaigns([campaignId])
    return this.detail(ofAudience(rows, audience), offset)
  }

  async ambassadorDetail(
    ambassadorId: string,
    offset = 0,
    audience?: GiftAudience,
  ): Promise<OriginDetail> {
    const rows = await this.acquisitions.listByAmbassadors([ambassadorId])
    return this.detail(ofAudience(rows, audience), offset)
  }

  /** Tudo o que o e-mail recebeu ou comprou, nos dois públicos, com a origem de cada um. */
  async accountAcquisitions(email: string): Promise<AcquisitionView[]> {
    const rows = await this.acquisitions.listByEmail(email)
    const firstIds = new Set([...firstByPerson(rows).values()].map((a) => a.id))
    const names = await this.names(rows)
    return rows.map((a) => acquisitionView(a, names, firstIds))
  }

  /**
   * "Bônus da assinatura" da ficha (25/11/2026): as conversões do e-mail (fora as substituídas),
   * com o embaixador e a campanha. Sem chave Pix nem e-mail do embaixador.
   */
  async accountBonuses(email: string): Promise<AccountBonusView[]> {
    const normalized = email.trim().toLowerCase()
    const conversions = (await this.referrals.listConversionsBySubscribers([normalized])).filter(
      (c) => c.status !== 'superseded',
    )
    if (conversions.length === 0) return []
    const rows = await this.acquisitions.listByEmail(normalized)
    const byId = new Map(rows.map((a) => [a.id, a]))
    const names = await this.names(rows)
    const ambassadors = new Map(names.ambassadors)
    for (const id of new Set(conversions.flatMap((c) => (c.ambassadorId ? [c.ambassadorId] : []))))
      if (!ambassadors.has(id)) {
        const ambassador = await this.referrals.findAmbassadorById(id)
        if (ambassador) ambassadors.set(id, ambassador.name)
      }
    return conversions
      .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())
      .map((c) => {
        const campaignId = c.acquisitionId ? (byId.get(c.acquisitionId)?.campaignId ?? null) : null
        return {
          id: c.id,
          audience: c.audience,
          offerSlug: c.offerSlug,
          status: c.status,
          bonusCents: c.bonusCents,
          paidAt: c.paidAt.toISOString(),
          maturesAt: c.maturesAt.toISOString(),
          paidMarkedAt: c.paidMarkedAt?.toISOString() ?? null,
          ambassadorId: c.ambassadorId,
          ambassadorName: c.ambassadorId ? (ambassadors.get(c.ambassadorId) ?? null) : null,
          campaignTitle: campaignId ? (names.campaigns.get(campaignId) ?? null) : null,
        }
      })
  }

  /** O painel das listas: quanto cada oferta já rendeu pelos links pessoais dos embaixadores. */
  async ambassadorOfferCounts(
    audience: GiftAudience,
  ): Promise<Record<string, AmbassadorOfferCounts>> {
    const counts: Record<string, AmbassadorOfferCounts> = {}
    for (const row of await this.acquisitions.countAmbassadorAcquisitionsByOffer(audience)) {
      const entry = counts[row.offerId] ?? { gifts: 0, purchases: 0, subscriptions: 0 }
      if (row.kind === 'gift') entry.gifts += row.count
      else if (row.kind === 'one_time') entry.purchases += row.count
      else entry.subscriptions += row.count
      counts[row.offerId] = entry
    }
    return counts
  }

  async originReport(input: {
    audience?: GiftAudience
    from: Date
    to: Date
    /** Só estas ofertas (o filtro "Todas as ofertas" do Admin, por produto). */
    offerIds?: readonly string[]
  }): Promise<OriginReport> {
    const offers = input.offerIds?.length ? new Set(input.offerIds) : null
    const ofOffer = (a: AcquisitionRecord) =>
      !offers || (a.offerId !== null && offers.has(a.offerId))
    const period = (await this.acquisitions.listInPeriod(input)).filter(ofOffer)
    // O histórico das pessoas do período, para saber a PRIMEIRA entrada de cada uma.
    const history: AcquisitionRecord[] = []
    for (const audience of input.audience ? [input.audience] : (['kids', 'adult'] as const)) {
      const emails = [...new Set(period.filter((a) => a.audience === audience).map((a) => a.email))]
      history.push(...(await this.acquisitions.listForEmails(audience, emails)))
    }
    history.sort((a, b) => a.acquiredAt.getTime() - b.acquiredAt.getTime())
    // Com o filtro de oferta, "pessoa nova" é quem ENTROU por uma dessas ofertas.
    const firsts = new Map([...firstByPerson(history)].filter(([, first]) => ofOffer(first)))
    const firstsInPeriod = [...firsts.values()].filter(
      (f) => f.acquiredAt >= input.from && f.acquiredAt < input.to,
    )
    const byOrigin = breakdownByOrigin(period, firsts, input.from, input.to)
    const totalCents = byOrigin.reduce((t, r) => t + BigInt(r.revenueCents), 0n)
    const referralCents = byOrigin
      .filter((r) => r.origin === 'ambassador' || r.origin === 'campaign')
      .reduce((t, r) => t + BigInt(r.revenueCents), 0n)
    const names = await this.names(period)
    const firstIds = new Set([...firsts.values()].map((a) => a.id))
    return {
      from: input.from.toISOString(),
      to: input.to.toISOString(),
      totals: {
        newPeople: firstsInPeriod.length,
        gifts: byOrigin.reduce((t, r) => t + r.gifts, 0),
        purchases: byOrigin.reduce((t, r) => t + r.purchases, 0),
        subscriptions: byOrigin.reduce((t, r) => t + r.subscriptions, 0),
        revenueCents: totalCents.toString(),
        referralShare: totalCents > 0n ? Number((referralCents * 1000n) / totalCents) / 1000 : 0,
      },
      byOrigin,
      weeks: revenueByWeek(period),
      places: byPlace(period),
      paths: pathsToSubscription(firstsInPeriod, history),
      ambassadors: ranking(period, (a) => a.ambassadorId, names.ambassadors),
      campaigns: ranking(period, (a) => a.campaignId, names.campaigns),
      latest: period
        .slice(-LATEST)
        .reverse()
        .map((a) => acquisitionView(a, names, firstIds)),
      ...(period.length >= REPORT_ROW_LIMIT ? { truncated: true } : {}),
    }
  }

  private async detail(rows: AcquisitionRecord[], offset: number): Promise<OriginDetail> {
    // A entrada de cada pessoa por ESTA origem (a primeira, se ela veio mais de uma vez).
    const entries = [...firstByPerson(rows).values()].sort(
      (a, b) => b.acquiredAt.getTime() - a.acquiredAt.getTime(),
    )
    const page = entries.slice(offset, offset + PEOPLE_PAGE)
    const people: OriginPersonView[] = []
    const conversions = await this.referrals.listConversionsBySubscribers(page.map((e) => e.email))
    const all: AcquisitionRecord[] = []
    for (const audience of ['kids', 'adult'] as const) {
      const emails = page.filter((e) => e.audience === audience).map((e) => e.email)
      all.push(...(await this.acquisitions.listForEmails(audience, emails)))
    }
    const names = await this.names([...rows, ...all])
    const firstIds = new Set([...firstByPerson(all).values()].map((a) => a.id))
    for (const entry of page) {
      const later = all.filter(
        (a) =>
          a.email === entry.email &&
          a.audience === entry.audience &&
          a.id !== entry.id &&
          a.acquiredAt >= entry.acquiredAt,
      )
      people.push({
        email: entry.email,
        entry: acquisitionView(entry, names, firstIds),
        later: later.map((a) => acquisitionView(a, names, firstIds)),
        conversion: conversionOf(conversions, entry, rows),
        accountUserId:
          entry.accountUserId ?? later.find((a) => a.accountUserId)?.accountUserId ?? null,
      })
    }
    return {
      results: originResults(rows),
      byOffer: resultsByOffer(rows),
      people,
      peopleTotal: entries.length,
      giftCourses: await this.giftCourses(entries),
    }
  }

  /** Quem entrou por um presente desta origem, por curso do presente (todas as páginas). */
  private async giftCourses(entries: AcquisitionRecord[]): Promise<OriginGiftCourse[]> {
    const gifts = entries.filter((e) => e.kind === 'gift' && e.status === 'active')
    const slugs = await this.acquisitions.giftCourseSlugs(
      gifts.flatMap((g) => (g.redemptionId ? [g.redemptionId] : [])),
    )
    const byCourse = new Map<string, { people: number; accounts: Set<string> }>()
    for (const gift of gifts) {
      const slug = gift.redemptionId ? slugs.get(gift.redemptionId) : undefined
      if (!slug) continue
      const group = byCourse.get(slug) ?? { people: 0, accounts: new Set<string>() }
      group.people++
      if (gift.accountUserId && group.accounts.size < GIFT_ACCOUNTS_LIMIT)
        group.accounts.add(gift.accountUserId)
      byCourse.set(slug, group)
    }
    return [...byCourse].map(([courseSlug, g]) => ({
      courseSlug,
      people: g.people,
      accountUserIds: [...g.accounts],
    }))
  }

  private async names(rows: AcquisitionRecord[]) {
    const campaigns = new Map<string, string>()
    const ambassadors = new Map<string, string>()
    for (const id of new Set(rows.flatMap((a) => (a.campaignId ? [a.campaignId] : [])))) {
      const campaign = await this.campaigns.findById(id)
      if (campaign) campaigns.set(id, campaign.publicTitle)
    }
    for (const id of new Set(rows.flatMap((a) => (a.ambassadorId ? [a.ambassadorId] : [])))) {
      const ambassador = await this.referrals.findAmbassadorById(id)
      if (ambassador) ambassadors.set(id, ambassador.name)
    }
    const benefits = await this.benefits?.contexts(
      rows.flatMap((a) => (a.redemptionId ? [a.redemptionId] : [])),
    )
    return { campaigns, ambassadors, benefits }
  }
}

function groupResults(
  ids: string[],
  rows: AcquisitionRecord[],
  key: (a: AcquisitionRecord) => string | null,
): Map<string, OriginResults> {
  return new Map(ids.map((id) => [id, originResults(rows.filter((a) => key(a) === id))]))
}

function ranking(
  rows: AcquisitionRecord[],
  key: (a: AcquisitionRecord) => string | null,
  names: Map<string, string>,
): OriginRankingRow[] {
  const ids = [...new Set(rows.flatMap((a) => (key(a) ? [key(a) as string] : [])))]
  return ids
    .map((id) => ({
      id,
      name: names.get(id) ?? '',
      ...originResults(rows.filter((a) => key(a) === id)),
    }))
    .sort((a, b) => b.subscriptions - a.subscriptions || b.people - a.people)
    .slice(0, RANKING)
}

/** A conversão da pessoa ligada a esta origem (pela aquisição vencedora ou, legado, o código). */
function conversionOf(
  conversions: ConversionRecord[],
  entry: AcquisitionRecord,
  originRows: AcquisitionRecord[],
): OriginPersonView['conversion'] {
  const ids = new Set(originRows.map((a) => a.id))
  const codes = new Set(originRows.flatMap((a) => (a.codeId ? [a.codeId] : [])))
  const match = conversions.find(
    (c) =>
      c.subscriberEmail === entry.email &&
      c.status !== 'superseded' &&
      ((c.acquisitionId && ids.has(c.acquisitionId)) || codes.has(c.codeId)),
  )
  return match
    ? { status: match.status, bonusCents: match.bonusCents, paidAt: match.paidAt.toISOString() }
    : null
}

/** Só as aquisições da comunidade pedida (sem `audience`, as duas). */
function ofAudience(rows: AcquisitionRecord[], audience?: GiftAudience): AcquisitionRecord[] {
  return audience ? rows.filter((a) => a.audience === audience) : rows
}

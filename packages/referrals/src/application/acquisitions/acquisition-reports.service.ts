import type {
  AcquisitionView,
  GiftAudience,
  OriginDetail,
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
import type {
  ConversionRecord,
  ReferralRepository,
} from '../../domain/ports/referral-repository.port'

const PEOPLE_PAGE = 25
const LATEST = 20
const RANKING = 5

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
  ) {}

  async campaignResults(campaignIds: string[]): Promise<Map<string, OriginResults>> {
    const rows = await this.acquisitions.listByCampaigns(campaignIds)
    return groupResults(campaignIds, rows, (a) => a.campaignId)
  }

  async ambassadorResults(ambassadorIds: string[]): Promise<Map<string, OriginResults>> {
    const rows = await this.acquisitions.listByAmbassadors(ambassadorIds)
    return groupResults(ambassadorIds, rows, (a) => a.ambassadorId)
  }

  async campaignDetail(campaignId: string, offset = 0): Promise<OriginDetail> {
    return this.detail(await this.acquisitions.listByCampaigns([campaignId]), offset)
  }

  async ambassadorDetail(ambassadorId: string, offset = 0): Promise<OriginDetail> {
    return this.detail(await this.acquisitions.listByAmbassadors([ambassadorId]), offset)
  }

  /** Tudo o que o e-mail recebeu ou comprou, nos dois públicos, com a origem de cada um. */
  async accountAcquisitions(email: string): Promise<AcquisitionView[]> {
    const rows = await this.acquisitions.listByEmail(email)
    const firstIds = new Set([...firstByPerson(rows).values()].map((a) => a.id))
    const names = await this.names(rows)
    return rows.map((a) => acquisitionView(a, names, firstIds))
  }

  async originReport(input: {
    audience?: GiftAudience
    from: Date
    to: Date
  }): Promise<OriginReport> {
    const period = await this.acquisitions.listInPeriod(input)
    // O histórico das pessoas do período, para saber a PRIMEIRA entrada de cada uma.
    const history: AcquisitionRecord[] = []
    for (const audience of input.audience ? [input.audience] : (['kids', 'adult'] as const)) {
      const emails = [...new Set(period.filter((a) => a.audience === audience).map((a) => a.email))]
      history.push(...(await this.acquisitions.listForEmails(audience, emails)))
    }
    history.sort((a, b) => a.acquiredAt.getTime() - b.acquiredAt.getTime())
    const firsts = firstByPerson(history)
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
      })
    }
    return {
      results: originResults(rows),
      byOffer: resultsByOffer(rows),
      people,
      peopleTotal: entries.length,
    }
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
    return { campaigns, ambassadors }
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

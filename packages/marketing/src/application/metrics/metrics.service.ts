import { ValidationError } from '@sistemazero/core/errors'
import type {
  BestTimesView,
  FollowersSeriesView,
  MetricsSummaryView,
  PublicationMetricsSnapshot,
} from '@sistemazero/marketing-contracts'

export type {
  BestTimesView,
  FollowersSeriesView,
  MetricsSummaryView,
} from '@sistemazero/marketing-contracts'

import { PublicationNotFoundError } from '../../domain/marketing-errors'
import { followerValue, metricSnapshotView, metricValue } from '../../domain/metrics/availability'
import type { MetricsRepository } from '../../domain/ports/metrics-repository.port'
import type { PublicationRepository } from '../../domain/ports/publication-repository.port'
import type { SocialAccountRepository } from '../../domain/ports/social-account-repository.port'
import type { Network } from '../../domain/publication/publication'
import type { SocialAccount } from '../../domain/social-account/social-account'

/** Redes com conta conectável hoje (ordem de exibição do dashboard). */
const NETWORKS: Network[] = ['instagram', 'facebook', 'youtube', 'tiktok']

const TOTALS_WINDOW_DAYS = 28
const TOP_WINDOW_DAYS = 90
const TOP_LIMIT = 10

/** Dia 'YYYY-MM-DD' no fuso de SP (o dia "humano" da equipe). */
const SP_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Dia-da-semana + hora em SP (o heatmap fala o fuso da equipe, não UTC). */
const SP_DOW_HOUR = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  weekday: 'short',
  hour: '2-digit',
  hour12: false,
})
const DOW_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

function spDowHour(date: Date): { dow: number; hour: number } {
  const parts = SP_DOW_HOUR.formatToParts(date)
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun'
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '0'
  // `% 24` cobre engines que formatam meia-noite como '24' com hour12:false.
  return { dow: DOW_INDEX[weekday] ?? 0, hour: Number(hour) % 24 }
}

/**
 * Leitura das métricas (F3): cards por conta, comparativos por rede (28d),
 * top publicações (90d) e a série diária de seguidores. Agregação em JS —
 * o volume é pequeno (dezenas de publicações, 1 snapshot/dia/conta).
 */
export class MetricsService {
  constructor(
    private readonly accounts: SocialAccountRepository,
    private readonly publications: PublicationRepository,
    private readonly metrics: MetricsRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async connectedAccounts(network?: Network): Promise<SocialAccount[]> {
    const networks = network ? [network] : NETWORKS
    const lists = await Promise.all(networks.map((n) => this.accounts.listByNetwork(n)))
    return lists.flat().filter((a) => a.status === 'connected')
  }

  async summary(): Promise<MetricsSummaryView> {
    const now = this.now()
    const connected = await this.connectedAccounts()
    const accountSnapshots = await this.metrics.latestAccountSnapshots(connected.map((a) => a.id))
    const accounts = connected.map((account) => {
      const snapshot = accountSnapshots.get(account.id)
      return {
        accountId: account.id,
        network: account.network,
        displayName: account.displayName,
        followers: snapshot ? followerValue(snapshot) : null,
        availability:
          snapshot && snapshot.collectionVersion < 1 && snapshot.followers === 0
            ? ('legacy-unknown' as const)
            : !snapshot || followerValue(snapshot) === null
              ? ('unavailable' as const)
              : ('observed' as const),
        capturedAt: snapshot?.capturedAt.toISOString() ?? null,
      }
    })

    // UMA busca (90d) alimenta os totais (28d) e o top (90d).
    const since90 = new Date(now.getTime() - TOP_WINDOW_DAYS * 86_400_000)
    const since28 = new Date(now.getTime() - TOTALS_WINDOW_DAYS * 86_400_000)
    const candidates = await this.publications.listRecentPublished({
      since: since90,
      until: now,
      limit: 301,
    })
    const recent = candidates.slice(0, 300),
      next = candidates[300]
    const coverage = {
      includedPosts: recent.length,
      limit: 300,
      topTruncated: !!next,
      totalsTruncated: !!next?.publication.publishedAt && next.publication.publishedAt >= since28,
    }
    const stats = await this.metrics.latestPublicationStats(
      recent.map((item) => item.publication.id),
    )

    const totalsByNetwork = new Map<
      Network,
      {
        posts: number
        views: number | null
        likes: number | null
        comments: number | null
        observedPosts: { views: number; likes: number; comments: number }
      }
    >()
    for (const item of recent) {
      const publishedAt = item.publication.publishedAt
      if (!publishedAt || publishedAt.getTime() < since28.getTime()) continue
      const network = item.publication.network
      const totals = totalsByNetwork.get(network) ?? {
        posts: 0,
        views: null,
        likes: null,
        comments: null,
        observedPosts: { views: 0, likes: 0, comments: 0 },
      }
      totals.posts += 1
      const stat = stats.get(item.publication.id)
      if (stat) {
        for (const key of ['views', 'likes', 'comments'] as const) {
          const value = metricValue(stat, key)
          if (value !== null) {
            totals[key] = (totals[key] ?? 0) + value
            totals.observedPosts[key]++
          }
        }
      }
      totalsByNetwork.set(network, totals)
    }
    const networkTotals = NETWORKS.flatMap((network) => {
      const totals = totalsByNetwork.get(network)
      return totals ? [{ network, ...totals }] : []
    })

    const topPublications = recent
      .flatMap((item) => {
        const stat = stats.get(item.publication.id)
        if (!stat) return []
        return [
          {
            publicationId: item.publication.id,
            contentId: item.publication.contentId,
            contentTitle: item.contentTitle,
            network: item.publication.network,
            format: item.publication.format,
            publishedAt: item.publication.publishedAt?.toISOString() ?? null,
            views: metricValue(stat, 'views'),
            likes: metricValue(stat, 'likes'),
            comments: metricValue(stat, 'comments'),
            capturedAt: stat.capturedAt.toISOString(),
          },
        ]
      })
      .sort((a, b) => (b.views ?? -1) - (a.views ?? -1))
      .slice(0, TOP_LIMIT)

    return { accounts, networkTotals, topPublications, coverage }
  }

  /**
   * Melhores horários: publicações PUBLICADAS na janela agrupadas por
   * (dia-da-semana × hora) em SP, com os totais do último snapshot de cada
   * uma. A intensidade/normalização do heatmap é do front.
   */
  async bestTimes(input: { network?: Network; days: number }): Promise<BestTimesView> {
    if (input.days < 1 || input.days > 365) {
      throw new ValidationError('`days` deve estar entre 1 e 365')
    }
    const until = this.now(),
      since = new Date(until.getTime() - input.days * 86_400_000)
    const candidates = await this.publications.listRecentPublished({
      since,
      until,
      network: input.network,
      limit: 501,
    })
    const recent = candidates.slice(0, 500)
    const filtered = recent.filter(
      (item) =>
        item.publication.publishedAt !== null &&
        (!input.network || item.publication.network === input.network),
    )
    const stats = await this.metrics.latestPublicationStats(
      filtered.map((item) => item.publication.id),
    )
    const cells = new Map<string, BestTimesView['cells'][number]>()
    for (const item of filtered) {
      const publishedAt = item.publication.publishedAt as Date
      const { dow, hour } = spDowHour(publishedAt)
      const key = `${dow}:${hour}`
      const cell = cells.get(key) ?? {
        dow,
        hour,
        posts: 0,
        views: null,
        likes: null,
        viewsObserved: 0,
        likesObserved: 0,
      }
      cell.posts += 1
      const stat = stats.get(item.publication.id)
      if (stat) {
        const views = metricValue(stat, 'views'),
          likes = metricValue(stat, 'likes')
        if (views !== null) {
          cell.views = (cell.views ?? 0) + views
          cell.viewsObserved++
        }
        if (likes !== null) {
          cell.likes = (cell.likes ?? 0) + likes
          cell.likesObserved++
        }
      }
      cells.set(key, cell)
    }
    return {
      cells: [...cells.values()].sort((a, b) => a.dow - b.dow || a.hour - b.hour),
      totalPosts: filtered.length,
      coverage: { truncated: candidates.length > 500, limit: 500 },
    }
  }

  /** Série de seguidores: 1 ponto por DIA (SP) por conta = último snapshot do dia. */
  async followersSeries(input: { network?: Network; days: number }): Promise<FollowersSeriesView> {
    if (input.days < 1 || input.days > 365) {
      throw new ValidationError('`days` deve estar entre 1 e 365')
    }
    const connected = await this.connectedAccounts(input.network)
    if (connected.length === 0) return { series: [] }
    const since = new Date(this.now().getTime() - input.days * 86_400_000)
    const snapshots = await this.metrics.listAccountSnapshotsSince(
      connected.map((a) => a.id),
      since,
    )
    const byAccount = new Map<string, Map<string, number | null>>()
    for (const snapshot of snapshots) {
      const day = SP_DAY.format(snapshot.capturedAt)
      let days = byAccount.get(snapshot.socialAccountId)
      if (!days) {
        days = new Map()
        byAccount.set(snapshot.socialAccountId, days)
      }
      // snapshots vêm em capturedAt ASC — o último do dia vence.
      days.set(day, followerValue(snapshot))
    }
    return {
      series: connected.flatMap((account) => {
        const days = byAccount.get(account.id)
        if (!days || days.size === 0) return []
        return [
          {
            accountId: account.id,
            network: account.network,
            displayName: account.displayName,
            points: [...days.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, followers]) => ({ date, followers })),
          },
        ]
      }),
    }
  }

  async publicationSnapshots(publicationId: string): Promise<{
    snapshots: PublicationMetricsSnapshot[]
  }> {
    const pub = await this.publications.byId(publicationId)
    if (!pub) throw new PublicationNotFoundError()
    const snapshots = await this.metrics.listPublicationSnapshots(publicationId, 30)
    return {
      snapshots: snapshots.map(metricSnapshotView),
    }
  }
}

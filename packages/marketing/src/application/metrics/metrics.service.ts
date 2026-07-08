import { ValidationError } from '@sistemazero/core/errors'
import { PublicationNotFoundError } from '../../domain/marketing-errors'
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

/** CONTRATO do dashboard (fixo entre backend e front — não mudar à toa). */
export interface MetricsSummaryView {
  accounts: Array<{
    accountId: string
    network: Network
    displayName: string
    followers: number
    capturedAt: string
  }>
  /** Totais dos últimos 28 dias por rede (posts publicados + último snapshot). */
  networkTotals: Array<{
    network: Network
    posts: number
    views: number
    likes: number
    comments: number
  }>
  /** Top 10 por views na janela de 90 dias. */
  topPublications: Array<{
    publicationId: string
    contentId: string
    contentTitle: string
    network: Network
    format: string
    publishedAt: string | null
    views: number
    likes: number
    comments: number
    capturedAt: string
  }>
}

export interface FollowersSeriesView {
  series: Array<{
    accountId: string
    network: Network
    displayName: string
    points: Array<{ date: string; followers: number }>
  }>
}

/** Dia 'YYYY-MM-DD' no fuso de SP (o dia "humano" da equipe). */
const SP_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

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
    const accounts = connected.flatMap((account) => {
      const snapshot = accountSnapshots.get(account.id)
      if (!snapshot) return []
      return [
        {
          accountId: account.id,
          network: account.network,
          displayName: account.displayName,
          followers: snapshot.followers,
          capturedAt: snapshot.capturedAt.toISOString(),
        },
      ]
    })

    // UMA busca (90d) alimenta os totais (28d) e o top (90d).
    const since90 = new Date(now.getTime() - TOP_WINDOW_DAYS * 86_400_000)
    const since28 = new Date(now.getTime() - TOTALS_WINDOW_DAYS * 86_400_000)
    const recent = await this.publications.listRecentPublished({ since: since90, limit: 300 })
    const stats = await this.metrics.latestPublicationStats(
      recent.map((item) => item.publication.id),
    )

    const totalsByNetwork = new Map<
      Network,
      { posts: number; views: number; likes: number; comments: number }
    >()
    for (const item of recent) {
      const publishedAt = item.publication.publishedAt
      if (!publishedAt || publishedAt.getTime() < since28.getTime()) continue
      const network = item.publication.network
      const totals = totalsByNetwork.get(network) ?? { posts: 0, views: 0, likes: 0, comments: 0 }
      totals.posts += 1
      const stat = stats.get(item.publication.id)
      if (stat) {
        totals.views += stat.views
        totals.likes += stat.likes
        totals.comments += stat.comments
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
            format: item.publication.format as string,
            publishedAt: item.publication.publishedAt?.toISOString() ?? null,
            views: stat.views,
            likes: stat.likes,
            comments: stat.comments,
            capturedAt: stat.capturedAt.toISOString(),
          },
        ]
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, TOP_LIMIT)

    return { accounts, networkTotals, topPublications }
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
    const byAccount = new Map<string, Map<string, number>>()
    for (const snapshot of snapshots) {
      const day = SP_DAY.format(snapshot.capturedAt)
      let days = byAccount.get(snapshot.socialAccountId)
      if (!days) {
        days = new Map()
        byAccount.set(snapshot.socialAccountId, days)
      }
      // snapshots vêm em capturedAt ASC — o último do dia vence.
      days.set(day, snapshot.followers)
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
    snapshots: Array<{
      capturedAt: string
      views: number
      likes: number
      comments: number
    }>
  }> {
    const pub = await this.publications.byId(publicationId)
    if (!pub) throw new PublicationNotFoundError()
    const snapshots = await this.metrics.listPublicationSnapshots(publicationId, 30)
    return {
      snapshots: snapshots.map((s) => ({
        capturedAt: s.capturedAt.toISOString(),
        views: s.views,
        likes: s.likes,
        comments: s.comments,
      })),
    }
  }
}

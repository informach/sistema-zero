import { PublicationNotFoundError } from '../../domain/marketing-errors'
import type { MetricsRepository } from '../../domain/ports/metrics-repository.port'
import type { PublicationRepository } from '../../domain/ports/publication-repository.port'
import type { SocialAccountRepository } from '../../domain/ports/social-account-repository.port'

export interface MetricsSummaryView {
  account: {
    displayName: string
    channelTitle: string | null
    followers: number
    capturedAt: string
  } | null
  topPublications: Array<{
    publicationId: string
    contentId: string
    contentTitle: string
    format: string
    publishedAt: string | null
    views: number
    likes: number
    comments: number
    capturedAt: string
  }>
}

/**
 * Leitura das métricas BÁSICAS do YouTube (F2): último snapshot do canal +
 * desempenho das publicações publicadas. O dashboard completo (comparativos,
 * heatmap 7×24, Meta Insights) é a F3.
 */
export class MetricsService {
  constructor(
    private readonly accounts: SocialAccountRepository,
    private readonly publications: PublicationRepository,
    private readonly metrics: MetricsRepository,
  ) {}

  async summary(): Promise<MetricsSummaryView> {
    const accounts = await this.accounts.listByNetwork('youtube')
    const connected = accounts.find((a) => a.status === 'connected') ?? accounts[0] ?? null
    let account: MetricsSummaryView['account'] = null
    if (connected) {
      const snapshot = await this.metrics.latestAccountSnapshot(connected.id)
      if (snapshot) {
        const metadata = connected.metadata as { channelTitle?: unknown }
        account = {
          displayName: connected.displayName,
          channelTitle: typeof metadata.channelTitle === 'string' ? metadata.channelTitle : null,
          followers: snapshot.followers,
          capturedAt: snapshot.capturedAt.toISOString(),
        }
      }
    }
    // Últimas publicadas do YouTube → junta o último snapshot de cada uma e
    // ordena por views (top posts da fase básica).
    const { items } = await this.publications.listByWindow({
      statuses: ['published'],
      network: 'youtube',
      limit: 50,
      offset: 0,
    })
    const stats = await this.metrics.latestPublicationStats(items.map((i) => i.publication.id))
    const topPublications = items
      .flatMap((item) => {
        const stat = stats.get(item.publication.id)
        if (!stat) return []
        return [
          {
            publicationId: item.publication.id,
            contentId: item.publication.contentId,
            contentTitle: item.contentTitle,
            format: item.publication.format,
            publishedAt: item.publication.publishedAt?.toISOString() ?? null,
            views: stat.views,
            likes: stat.likes,
            comments: stat.comments,
            capturedAt: stat.capturedAt.toISOString(),
          },
        ]
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)
    return { account, topPublications }
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

import type { YtQuotaGuard } from '../../../application/publications/yt-quota-guard'
import type {
  AccountMetricsSample,
  MetricsSource,
  PublicationMetricsSample,
} from '../../../domain/ports/metrics-source.port'
import type { Publication } from '../../../domain/publication/publication-record'
import type { SocialAccount } from '../../../domain/social-account/social-account'
import type { YoutubeApi } from './youtube-api.port'

/**
 * Fonte de métricas do YouTube (canal via channels.list, vídeos via videos.list
 * em lotes de 50 ids — 1 unit cada). A QUOTA é particularidade do YouTube e
 * vive aqui: sem orçamento, o ciclo é pulado (o decaimento reagenda sozinho).
 */
export class YoutubeMetricsSource implements MetricsSource {
  readonly network = 'youtube' as const

  constructor(
    private readonly api: YoutubeApi,
    private readonly quota: YtQuotaGuard,
  ) {}

  async collectAccount(
    _account: SocialAccount,
    accessToken: string,
  ): Promise<AccountMetricsSample | null> {
    if (!(await this.quota.tryReserve({ units: 1, isUpload: false }))) return null
    const stats = await this.api.getChannelStats(accessToken)
    if (!stats) return null
    return { followers: stats.subscriberCount, raw: { ...stats } }
  }

  async collectPublications(
    publications: Publication[],
    _account: SocialAccount,
    accessToken: string,
  ): Promise<Map<string, PublicationMetricsSample>> {
    const map = new Map<string, PublicationMetricsSample>()
    if (publications.length === 0) return map
    if (!(await this.quota.tryReserve({ units: 1, isUpload: false }))) return map
    const videoIds = publications
      .map((p) => p.externalPostId)
      .filter((id): id is string => id !== null)
    const stats = await this.api.getVideoStats(accessToken, videoIds)
    for (const pub of publications) {
      const stat = pub.externalPostId ? stats.get(pub.externalPostId) : undefined
      if (stat) {
        map.set(pub.id, {
          views: stat.views,
          likes: stat.likes,
          comments: stat.comments,
          raw: { ...stat },
        })
      }
    }
    return map
  }
}

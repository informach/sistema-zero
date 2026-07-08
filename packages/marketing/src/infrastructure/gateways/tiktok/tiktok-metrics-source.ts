import type {
  AccountMetricsSample,
  MetricsSource,
  PublicationMetricsSample,
} from '../../../domain/ports/metrics-source.port'
import type { Publication } from '../../../domain/publication/publication-record'
import type { SocialAccount } from '../../../domain/social-account/social-account'
import type { TikTokApi } from './tiktok-api.port'

/**
 * Fonte de métricas do TikTok (Display API): seguidores via user/info
 * (user.info.stats) e stats dos próprios vídeos via video/query em lotes de
 * 20 (video.list). Post apagado fica fora do mapa — o decaimento reagenda.
 */
export class TikTokMetricsSource implements MetricsSource {
  readonly network = 'tiktok' as const

  constructor(private readonly api: TikTokApi) {}

  async collectAccount(
    _account: SocialAccount,
    accessToken: string,
  ): Promise<AccountMetricsSample | null> {
    const stats = await this.api.getUserStats(accessToken)
    return { followers: stats.followers, raw: stats.raw }
  }

  async collectPublications(
    publications: Publication[],
    _account: SocialAccount,
    accessToken: string,
  ): Promise<Map<string, PublicationMetricsSample>> {
    const map = new Map<string, PublicationMetricsSample>()
    const ids = publications.map((p) => p.externalPostId).filter((id): id is string => id !== null)
    if (ids.length === 0) return map
    const stats = await this.api.queryVideoStats({ accessToken, videoIds: ids })
    for (const pub of publications) {
      const stat = pub.externalPostId ? stats.get(pub.externalPostId) : undefined
      if (!stat) continue
      map.set(pub.id, {
        views: stat.views,
        likes: stat.likes,
        comments: stat.comments,
        shares: stat.shares,
        raw: stat.raw,
      })
    }
    return map
  }
}

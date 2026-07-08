import type {
  AccountMetricsSample,
  MetricsSource,
  PublicationMetricsSample,
} from '../../../domain/ports/metrics-source.port'
import type { Publication } from '../../../domain/publication/publication-record'
import type { SocialAccount } from '../../../domain/social-account/social-account'
import type { MetaApi } from './meta-api.port'

/**
 * Fonte de métricas da Meta — UMA classe, DUAS instâncias. IG usa fields +
 * insights VIVOS (views/reach/saved/shares; impressions/plays morreram); FB
 * usa SÓ fields estáveis (reactions/comments summary + shares — o Page
 * Insights por post foi deprecado em 11/2025, views só existiria em vídeo).
 */
export class MetaMetricsSource implements MetricsSource {
  readonly network: 'instagram' | 'facebook'

  constructor(
    private readonly api: MetaApi,
    network: 'instagram' | 'facebook',
  ) {
    this.network = network
  }

  async collectAccount(
    account: SocialAccount,
    accessToken: string,
  ): Promise<AccountMetricsSample | null> {
    const stats =
      this.network === 'instagram'
        ? await this.api.getIgAccountStats({ accessToken, igUserId: account.externalId })
        : await this.api.getFbPageStats({ accessToken, pageId: account.externalId })
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
    if (this.network === 'instagram') {
      const stats = await this.api.getIgMediaStats({ accessToken, mediaIds: ids })
      for (const pub of publications) {
        const stat = pub.externalPostId ? stats.get(pub.externalPostId) : undefined
        if (!stat) continue
        map.set(pub.id, {
          views: stat.views,
          likes: stat.likes,
          comments: stat.comments,
          shares: stat.shares,
          saves: stat.saves,
          reach: stat.reach,
          raw: stat.raw,
        })
      }
      return map
    }
    const stats = await this.api.getFbPostStats({ accessToken, postIds: ids })
    for (const pub of publications) {
      const stat = pub.externalPostId ? stats.get(pub.externalPostId) : undefined
      if (!stat) continue
      map.set(pub.id, {
        views: 0,
        likes: stat.likes,
        comments: stat.comments,
        shares: stat.shares,
        raw: stat.raw,
      })
    }
    return map
  }
}

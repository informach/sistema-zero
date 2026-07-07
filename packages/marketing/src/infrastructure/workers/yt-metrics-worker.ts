import { randomUUID } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import type { AccountService } from '../../application/accounts/account.service'
import type { YtQuotaGuard } from '../../application/publications/yt-quota-guard'
import type { MetricsRepository } from '../../domain/ports/metrics-repository.port'
import type { PublicationRepository } from '../../domain/ports/publication-repository.port'
import type { SocialAccountRepository } from '../../domain/ports/social-account-repository.port'
import type { YoutubeApi } from '../gateways/youtube/youtube-api.port'

export interface YtMetricsWorkerConfig {
  intervalMs: number
  /** Vídeos publicados há mais que isso saem do radar de coleta. */
  maxAgeDays: number
}

export interface YtMetricsWorkerDeps {
  api: YoutubeApi
  accounts: SocialAccountRepository
  accountService: AccountService
  publications: PublicationRepository
  metrics: MetricsRepository
  quota: YtQuotaGuard
  /** Gate de exclusividade (advisory lock do composition-root) — 1 réplica por ciclo. */
  withLock: (fn: () => Promise<void>) => Promise<void>
  now: () => Date
  logger: Logger
  config: YtMetricsWorkerConfig
}

/**
 * Métricas BÁSICAS do YouTube (F2): a cada ciclo (6h), snapshot do canal
 * (channels.list, 1 unit) + views/likes/comments das publicadas recentes
 * (videos.list em lotes de 50 ids a 1 unit) nas tabelas append-only.
 * Custo desprezível (~2-3 units/ciclo) ante o orçamento de 9000. O worker
 * COMPLETO (decaimento de frequência, Meta Insights) é a F3.
 */
export class YtMetricsWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private inFlight: Promise<void> | null = null

  constructor(private readonly deps: YtMetricsWorkerDeps) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      this.inFlight = this.tick()
    }, this.deps.config.intervalMs)
    this.deps.logger.info('yt_metrics.worker.started', {
      intervalMs: this.deps.config.intervalMs,
    })
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.inFlight) await this.inFlight
  }

  async tick(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await this.deps.withLock(() => this.collect())
    } catch (error) {
      this.deps.logger.error('yt_metrics.tick_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.running = false
    }
  }

  private async collect(): Promise<void> {
    const accounts = await this.deps.accounts.listByNetwork('youtube')
    const connected = accounts.find((a) => a.status === 'connected')
    if (!connected) return
    const now = this.deps.now()
    let accessToken: string
    try {
      accessToken = await this.deps.accountService.getFreshAccessToken(connected)
    } catch {
      // needs_reauth já foi marcado/alertado pelo AccountService.
      return
    }

    // Snapshot do canal (1 unit).
    if (await this.deps.quota.tryReserve({ units: 1, isUpload: false })) {
      try {
        const stats = await this.deps.api.getChannelStats(accessToken)
        if (stats) {
          await this.deps.metrics.insertAccountSnapshot({
            id: randomUUID(),
            socialAccountId: connected.id,
            capturedAt: now,
            followers: stats.subscriberCount,
            raw: { ...stats },
          })
        }
      } catch (error) {
        this.deps.logger.warn('yt_metrics.channel_failed', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Publicações publicadas recentes com coleta vencida (lotes de 50 = 1 unit).
    const since = new Date(now.getTime() - this.deps.config.maxAgeDays * 86_400_000)
    const staleBefore = new Date(now.getTime() - this.deps.config.intervalMs)
    const due = await this.deps.publications.listPublishedForMetrics({
      network: 'youtube',
      since,
      staleBefore,
      limit: 50,
    })
    if (due.length === 0) return
    if (!(await this.deps.quota.tryReserve({ units: 1, isUpload: false }))) return
    try {
      const videoIds = due.map((p) => p.externalPostId).filter((id): id is string => id !== null)
      const stats = await this.deps.api.getVideoStats(accessToken, videoIds)
      const snapshots = due.flatMap((pub) => {
        const stat = pub.externalPostId ? stats.get(pub.externalPostId) : undefined
        if (!stat) return []
        return [
          {
            id: randomUUID(),
            publicationId: pub.id,
            capturedAt: now,
            views: stat.views,
            likes: stat.likes,
            comments: stat.comments,
            raw: { ...stat },
          },
        ]
      })
      await this.deps.metrics.insertPublicationSnapshots(snapshots)
      // Marca a coleta de TODAS as consultadas (mesmo sem stat — vídeo apagado
      // não volta a gastar quota a cada ciclo).
      await this.deps.publications.updateMetricsCollectedAt(
        due.map((p) => p.id),
        now,
      )
      this.deps.logger.info('yt_metrics.collected', {
        publications: snapshots.length,
      })
    } catch (error) {
      this.deps.logger.warn('yt_metrics.videos_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

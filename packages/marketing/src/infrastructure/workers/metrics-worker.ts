import { randomUUID } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import type { AccountService } from '../../application/accounts/account.service'
import { nextCollectAt } from '../../domain/metrics/collection-schedule'
import type { MetricsRepository } from '../../domain/ports/metrics-repository.port'
import type { MetricsSource } from '../../domain/ports/metrics-source.port'
import type { PublicationRepository } from '../../domain/ports/publication-repository.port'
import type { SocialAccountRepository } from '../../domain/ports/social-account-repository.port'

export interface MetricsWorkerConfig {
  intervalMs: number
  /** Publicações mais velhas que isso saem do radar de coleta. */
  maxAgeDays: number
  /** Teto de publicações coletadas por rede por ciclo. */
  batchSize: number
}

export interface MetricsWorkerDeps {
  /** Uma fonte por rede (YouTube na F2; Instagram/Facebook na F3). */
  sources: readonly MetricsSource[]
  accounts: SocialAccountRepository
  accountService: AccountService
  publications: PublicationRepository
  metrics: MetricsRepository
  /** Gate de exclusividade (advisory lock do composition-root) — 1 réplica por ciclo. */
  withLock: (fn: () => Promise<void>) => Promise<void>
  now: () => Date
  logger: Logger
  config: MetricsWorkerConfig
}

/**
 * Metrics-worker GENÉRICO com decaimento de frequência: a cada ciclo, para
 * cada rede com fonte registrada — snapshot da conta + coleta das publicações
 * ELEGÍVEIS (`metrics_next_collect_at <= now`), reagendando cada uma pela
 * idade (`nextCollectAt`: <48h→1h · <14d→6h · <90d→24h · depois semanal · fora
 * do radar → para). Séries são APPEND-ONLY nas tabelas metric_*.
 */
export class MetricsWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private inFlight: Promise<void> | null = null

  constructor(private readonly deps: MetricsWorkerDeps) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      this.inFlight = this.tick()
    }, this.deps.config.intervalMs)
    this.deps.logger.info('metrics.worker.started', {
      intervalMs: this.deps.config.intervalMs,
      networks: this.deps.sources.map((s) => s.network),
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
      await this.deps.withLock(async () => {
        for (const source of this.deps.sources) {
          try {
            await this.collectNetwork(source)
          } catch (error) {
            // Uma rede com problema (rate/rede fora) não derruba as demais; o
            // decaimento reagenda as publicações que ficaram para trás.
            this.deps.logger.warn('metrics.network_failed', {
              network: source.network,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }
      })
    } catch (error) {
      this.deps.logger.error('metrics.tick_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.running = false
    }
  }

  private async collectNetwork(source: MetricsSource): Promise<void> {
    const accounts = await this.deps.accounts.listByNetwork(source.network)
    const connected = accounts.filter((a) => a.status === 'connected')
    if (connected.length === 0) return
    const now = this.deps.now()

    // Token por CONTA (na Meta cada Página tem o próprio page token) +
    // snapshot de seguidores de TODAS — os cards do dashboard são por conta.
    const tokens = new Map<string, string>()
    for (const account of connected) {
      let accessToken: string
      try {
        accessToken = await this.deps.accountService.getFreshAccessToken(account)
      } catch {
        // needs_reauth já foi marcado/alertado pelo AccountService.
        continue
      }
      tokens.set(account.id, accessToken)
      try {
        const sample = await source.collectAccount(account, accessToken)
        if (sample) {
          await this.deps.metrics.insertAccountSnapshot({
            id: randomUUID(),
            socialAccountId: account.id,
            capturedAt: now,
            followers: sample.followers,
            raw: sample.raw,
          })
        }
      } catch (error) {
        this.deps.logger.warn('metrics.account_failed', {
          network: source.network,
          accountId: account.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
    if (tokens.size === 0) return

    // Publicações elegíveis pelo decaimento, agrupadas pela conta DONA do post
    // (o token daquela conta é o que enxerga as métricas do post).
    const due = await this.deps.publications.listDueForMetrics({
      network: source.network,
      now,
      limit: this.deps.config.batchSize,
    })
    if (due.length === 0) return
    const fallback = connected.find((a) => tokens.has(a.id))
    const byAccount = new Map<string, typeof due>()
    for (const pub of due) {
      const owner =
        pub.socialAccountId && tokens.has(pub.socialAccountId) ? pub.socialAccountId : fallback?.id
      if (!owner) continue
      const group = byAccount.get(owner) ?? []
      group.push(pub)
      byAccount.set(owner, group)
    }
    const snapshots = []
    for (const [accountId, group] of byAccount) {
      const account = connected.find((a) => a.id === accountId)
      const accessToken = tokens.get(accountId)
      if (!account || !accessToken) continue
      const samples = await source.collectPublications(group, account, accessToken)
      for (const pub of group) {
        const sample = samples.get(pub.id)
        if (!sample) continue
        snapshots.push({
          id: randomUUID(),
          publicationId: pub.id,
          capturedAt: now,
          views: sample.views,
          likes: sample.likes,
          comments: sample.comments,
          shares: sample.shares ?? 0,
          saves: sample.saves ?? 0,
          reach: sample.reach ?? null,
          watchTimeSeconds: sample.watchTimeSeconds ?? null,
          avgWatchRatio: sample.avgWatchRatio ?? null,
          raw: sample.raw,
        })
      }
    }
    await this.deps.metrics.insertPublicationSnapshots(snapshots)
    // Reagenda TODAS as consultadas (mesmo sem sample — post apagado não volta
    // a gastar chamada a cada ciclo; o decaimento continua andando).
    await this.deps.publications.updateMetricsSchedule(
      due.map((pub) => ({
        id: pub.id,
        collectedAt: now,
        nextCollectAt: pub.publishedAt
          ? nextCollectAt(pub.publishedAt, now, this.deps.config.maxAgeDays)
          : null,
      })),
    )
    this.deps.logger.info('metrics.collected', {
      network: source.network,
      publications: snapshots.length,
      scheduled: due.length,
    })
  }
}

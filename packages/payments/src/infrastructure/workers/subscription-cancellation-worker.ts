import type { CancelSubscriptionService } from '../../application/cancel-subscription/cancel-subscription.service'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import type { Logger } from '../logging/logger'
import { ConcurrencyConflictError } from '../persistence/drizzle/concurrency.error'

/** Retoma somente pedidos explícitos já persistidos; não decide a política D7. */
export class SubscriptionCancellationWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private inFlight: Promise<void> | null = null
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly cancellation: Pick<CancelSubscriptionService, 'executeAdmin'>,
    private readonly logger: Logger,
    private readonly options: {
      intervalMs: number
      leaseMs: number
      batchSize: number
      concurrency: number
    },
  ) {}

  start(): void {
    if (this.timer) return
    void this.tick()
    this.timer = setInterval(() => {
      void this.tick()
    }, this.options.intervalMs)
  }
  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    await this.inFlight
  }
  tick(): Promise<void> {
    if (this.inFlight) return this.inFlight
    const work = this.runTick()
    this.inFlight = work
    void work.finally(() => {
      if (this.inFlight === work) this.inFlight = null
    })
    return work
  }
  private async runTick(): Promise<void> {
    try {
      let processed = 0
      while (processed < this.options.batchSize) {
        // Reivindicar apenas quem inicia nesta rodada; nenhuma lease envelhece na fila local.
        const group = await this.subscriptions.claimCancellationRequests(
          Math.min(this.options.concurrency, this.options.batchSize - processed),
          this.options.leaseMs,
        )
        if (group.length === 0) break
        processed += group.length
        await Promise.all(
          group.map(async (subscription) => {
            try {
              await this.cancellation.executeAdmin(subscription.id)
            } catch (error) {
              if (error instanceof ConcurrencyConflictError) {
                this.logger.info('subscription.cancel.lost_race', {
                  subscriptionId: subscription.id,
                })
              } else {
                // Nenhum erro cru da operadora, token ou dado do comprador no log.
                this.logger.warn('subscription.cancel.pending', { subscriptionId: subscription.id })
              }
            }
          }),
        )
      }
    } catch {
      this.logger.error('subscription.cancel.scan_failed')
    }
  }
}

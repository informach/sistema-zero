import type { FirstChargeSetupService } from '../../application/create-subscription/first-charge-setup.service'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import type { Logger } from '../logging/logger'

/** Durable lease in PostgreSQL; runs on boot and every minute, including pending activations. */
export class FirstChargeSetupWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private inFlight: Promise<void> | null = null
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly setup: FirstChargeSetupService,
    private readonly logger: Logger,
  ) {}
  start() {
    if (this.timer) return
    void this.tick()
    this.timer = setInterval(() => {
      void this.tick()
    }, 60_000)
  }
  async stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    await this.inFlight
  }
  tick(): Promise<void> {
    if (this.inFlight) return this.inFlight
    this.inFlight = this.run().finally(() => {
      this.inFlight = null
    })
    return this.inFlight
  }
  private async run() {
    try {
      const batch = await this.subscriptions.claimFirstChargeSetups(10)
      await Promise.all(
        batch.map(async (subscription) => {
          try {
            await this.setup.resume(subscription.id)
          } catch {
            this.logger.error('subscription.first_charge.reconciliation_failed', {
              subscriptionId: subscription.id,
            })
          }
        }),
      )
    } catch {
      this.logger.error('subscription.first_charge.worker_failed')
    }
  }
}

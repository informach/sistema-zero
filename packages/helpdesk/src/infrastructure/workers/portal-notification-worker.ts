import type { Logger } from '@sistemazero/core/logging'
import type { MessagingGateway } from '../../domain/ports/messaging-gateway.port'
import type { PortalNotificationOutboxRepository } from '../../domain/ports/portal-notification-outbox.port'

export interface PortalNotificationWorkerConfig {
  intervalMs: number
  leaseMs: number
  retryBaseMs: number
  retryMaxMs: number
}

export interface PortalNotificationWorkerDeps {
  outbox: PortalNotificationOutboxRepository
  messaging: MessagingGateway
  now: () => Date
  logger: Logger
  config: PortalNotificationWorkerConfig
}

/** Entrega eventual dos avisos do portal; falhas sempre voltam para a fila. */
export class PortalNotificationWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private inFlight: Promise<void> | null = null

  constructor(private readonly deps: PortalNotificationWorkerDeps) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      if (!this.running) this.inFlight = this.tick()
    }, this.deps.config.intervalMs)
    this.deps.logger.info('portal_notification.worker.started', {
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
      const job = await this.deps.outbox.claimDue(this.deps.config.leaseMs, this.deps.now())
      if (!job) return
      try {
        await this.deps.messaging.sendEmail(job.payload)
        const sent = await this.deps.outbox.markSent(job.id, job.attempts, this.deps.now())
        if (sent) {
          this.deps.logger.info('portal_notification.sent', {
            outboxId: job.id,
            ticketId: job.ticketId,
            messageId: job.messageId,
            attempts: job.attempts,
          })
        }
      } catch (error) {
        const at = this.deps.now()
        const backoff = Math.min(
          this.deps.config.retryBaseMs * 2 ** Math.max(0, job.attempts - 1),
          this.deps.config.retryMaxMs,
        )
        const message = error instanceof Error ? error.message : String(error)
        const scheduled = await this.deps.outbox.scheduleRetry(
          job.id,
          job.attempts,
          new Date(at.getTime() + backoff),
          message,
          at,
        )
        if (scheduled) {
          const context = {
            outboxId: job.id,
            ticketId: job.ticketId,
            messageId: job.messageId,
            attempts: job.attempts,
            retryInMs: backoff,
            error: message,
          }
          if (job.attempts >= 5) {
            this.deps.logger.error('portal_notification.repeated_failure', context)
          } else {
            this.deps.logger.warn('portal_notification.retry_scheduled', context)
          }
        }
      }
    } catch (error) {
      this.deps.logger.error('portal_notification.worker.tick_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.running = false
    }
  }
}

import type { RecoveryAdmissionService } from '../../application/subscription-recovery/recovery-admission.service'
import type { RecoveryAdmissionRepository } from '../../domain/subscription-recovery/recovery-admission.port'
import type { Logger } from '../logging/logger'
import { ConcurrencyConflictError } from '../persistence/drizzle/concurrency.error'

/** Bounded serial discovery/inspection. It never sends notices or financial commands. */
export class RecoveryAdmissionWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private inFlight: Promise<void> | null = null
  constructor(
    private readonly admissions: RecoveryAdmissionRepository,
    private readonly service: Pick<RecoveryAdmissionService, 'process'>,
    private readonly logger: Logger,
    private readonly options: { intervalMs: number; batchSize: number; leaseMs: number },
    private readonly clock: () => Date = () => new Date(),
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
      await this.admissions.discover({ now: this.clock(), limit: this.options.batchSize })
      for (let count = 0; count < this.options.batchSize; count++) {
        const [lease] = await this.admissions.claim({
          now: this.clock(),
          limit: 1,
          leaseMs: this.options.leaseMs,
        })
        if (!lease) break
        try {
          await this.service.process(lease)
        } catch (error) {
          if (error instanceof ConcurrencyConflictError) {
            this.logger.info('subscription.recovery.admission_lost_race', {
              paymentId: lease.paymentId,
            })
          } else {
            this.logger.warn('subscription.recovery.admission_pending', {
              paymentId: lease.paymentId,
            })
            if (this.clock() < lease.leaseUntil) await this.admissions.retry(lease, this.clock())
          }
        }
      }
    } catch {
      this.logger.error('subscription.recovery.admission_scan_failed')
    }
  }
}

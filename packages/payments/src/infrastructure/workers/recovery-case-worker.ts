import type { RecoveryCoordinatorService } from '../../application/subscription-recovery/recovery-coordinator.service'
import type { RecoveryPolicyRepository } from '../../domain/subscription-recovery/recovery-policy-repository.port'
import type { SubscriptionRecoveryRepository } from '../../domain/subscription-recovery/recovery-repository.port'
import type { Logger } from '../logging/logger'
import { ConcurrencyConflictError } from '../persistence/drizzle/concurrency.error'

/** One case is claimed only when it is about to run; no lease waits in a local queue. */
export class RecoveryCaseWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private inFlight: Promise<void> | null = null
  private stopping = false
  constructor(
    private readonly policies: Pick<RecoveryPolicyRepository, 'get'>,
    private readonly cases: SubscriptionRecoveryRepository,
    private readonly service: Pick<RecoveryCoordinatorService, 'process'>,
    private readonly logger: Logger,
    private readonly options: { intervalMs: number; batchSize: number; leaseMs: number },
    private readonly clock: () => Date = () => new Date(),
  ) {}
  start(): void {
    if (this.timer) return
    this.stopping = false
    void this.tick()
    this.timer = setInterval(() => {
      void this.tick()
    }, this.options.intervalMs)
  }
  async stop(): Promise<void> {
    this.stopping = true
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    await this.inFlight
  }
  tick(): Promise<void> {
    if (this.stopping) return Promise.resolve()
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
      for (let index = 0; index < this.options.batchSize; index++) {
        if (this.stopping) return
        if (!(await this.policies.get())?.enabled) return
        const [lease] = await this.cases.claimDue({
          now: this.clock(),
          leaseMs: this.options.leaseMs,
          limit: 1,
        })
        if (!lease) return
        try {
          await this.service.process(lease)
        } catch (error) {
          if (error instanceof ConcurrencyConflictError)
            this.logger.info('subscription.recovery.case_lost_race', { caseId: lease.item.id })
          else this.logger.warn('subscription.recovery.case_pending', { caseId: lease.item.id })
        }
      }
    } catch {
      this.logger.error('subscription.recovery.case_scan_failed')
    }
  }
}

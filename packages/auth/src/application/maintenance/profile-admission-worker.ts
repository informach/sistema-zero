import type { Logger } from '@sistemazero/core/logging'
import type { ProfileAdmissionService } from '../profiles/profile-admission.service'

/** One bounded cycle per replica; DB leases coordinate replicas, and stop drains owned work. */
export class ProfileAdmissionWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private active: Promise<void> | null = null

  constructor(
    private readonly admission: Pick<ProfileAdmissionService, 'runCycle'>,
    private readonly logger: Logger,
    private readonly intervalMs = 15_000,
  ) {}

  start(): void {
    if (this.running) return
    this.running = true
    this.tick()
    this.timer = setInterval(() => this.tick(), this.intervalMs)
  }

  async stop(): Promise<void> {
    this.running = false
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    await this.active
  }

  private tick(): void {
    if (!this.running || this.active) return
    this.active = this.admission
      .runCycle(() => this.running)
      .then(() => undefined)
      .catch(() => this.logger.error('profile.admission.cycle_failed'))
      .finally(() => {
        this.active = null
      })
  }
}

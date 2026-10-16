import type { Logger } from '@sistemazero/core/logging'
import type { EngagementEngine } from '../../domain/ports/engagement-engine.port'
import type { EngagementProvider } from '../../domain/ports/engagement-provider.port'
export class EngagementWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running: Promise<void> | null = null
  private stopping = false
  private maintenanceAt = 0
  constructor(
    private readonly maintain: (now: Date) => Promise<void>,
    private readonly runtime: { engine: EngagementEngine; provider: EngagementProvider } | null,
    private readonly logger: Logger,
    private readonly intervalMs = 2000,
  ) {}
  async tick() {
    const now = new Date()
    if (now.getTime() - this.maintenanceAt > 60000) {
      await this.maintain(now)
      this.maintenanceAt = now.getTime()
    }
    if (!this.runtime) return
    const { engine, provider } = this.runtime
    for (const binding of await engine.bindings()) {
      if (this.stopping) return
      try {
        await engine.bind(binding, await provider.verifyPost(binding.account, binding.mediaId))
      } catch {
        this.logger.warn('engagement.binding.unavailable', { activationId: binding.id })
      }
    }
    await engine.process(new Date())
    for (let i = 0; i < 20 && !this.stopping; i++) {
      const dispatch = await engine.claim(new Date())
      if (!dispatch) break
      const outcome = await provider
        .send(dispatch.account, dispatch.recipient, dispatch.commentId, dispatch.message)
        .catch(() => ({
          status: 'uncertain' as const,
          reason: 'Adaptador interrompido após reserva; reconciliar',
        }))
      await engine.finish(dispatch, outcome, new Date())
    }
  }
  start() {
    if (this.timer) return
    this.stopping = false
    const poll = () => {
      if (this.running || this.stopping) return
      this.running = this.tick()
        .catch(() => this.logger.error('engagement.worker.failed', { retry: 'next-cycle' }))
        .finally(() => {
          this.running = null
        })
    }
    this.timer = setInterval(poll, this.intervalMs)
    poll()
  }
  async stop() {
    this.stopping = true
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    await this.running
  }
}

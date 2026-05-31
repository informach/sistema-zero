import type { Logger } from '@sistemazero/core/logging'
import type { HealthRegistry } from '../../domain/resilience/health.port'

export interface ProbeTarget {
  id: string
  baseUrl: string
  healthCheckPath: string
}

/**
 * Probe ativo: faz GET periódico no health-check de cada destino e atualiza o
 * `HealthRegistry`. Readmite destinos que voltaram. Iniciado no composition-root.
 */
export class ActiveHealthProbe {
  private timer: ReturnType<typeof setInterval> | undefined
  private probing = false

  constructor(
    private readonly targets: readonly ProbeTarget[],
    private readonly health: HealthRegistry,
    private readonly intervalMs: number,
    private readonly logger: Logger,
    private readonly timeoutMs = 2_000,
  ) {}

  start(): void {
    if (this.targets.length === 0 || this.timer) return // idempotente (não vaza timer)
    this.timer = setInterval(() => void this.probeAll(), this.intervalMs)
    this.timer.unref?.()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
  }

  private async probeAll(): Promise<void> {
    if (this.probing) return // evita rodadas sobrepostas (não pressiona upstream doente)
    this.probing = true
    try {
      await Promise.allSettled(this.targets.map((t) => this.probe(t)))
    } finally {
      this.probing = false
    }
  }

  private async probe(t: ProbeTarget): Promise<void> {
    const ctrl = new AbortController()
    const to = setTimeout(() => ctrl.abort(), this.timeoutMs)
    to.unref?.()
    try {
      const res = await fetch(`${t.baseUrl.replace(/\/$/, '')}${t.healthCheckPath}`, {
        signal: ctrl.signal,
      })
      void res.body?.cancel()
      if (res.ok) this.health.recordSuccess(t.id)
      else this.health.recordFailure(t.id)
    } catch {
      this.health.recordFailure(t.id)
      this.logger.debug('health.probe_failed', { target: t.id })
    } finally {
      clearTimeout(to)
    }
  }
}

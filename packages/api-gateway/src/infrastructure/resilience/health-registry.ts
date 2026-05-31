import type { HealthRegistry } from '../../domain/resilience/health.port'

interface TargetHealth {
  healthy: boolean
  consecutiveFailures: number
}

/**
 * Registro de saúde por réplica: ejeção passiva após N falhas consecutivas;
 * readmissão em qualquer sucesso (incl. o probe ativo). Fail-open: alvos
 * desconhecidos começam saudáveis.
 */
export class InMemoryHealthRegistry implements HealthRegistry {
  private readonly state = new Map<string, TargetHealth>()

  constructor(private readonly failureThreshold = 3) {}

  private entry(id: string): TargetHealth {
    let s = this.state.get(id)
    if (!s) {
      s = { healthy: true, consecutiveFailures: 0 }
      this.state.set(id, s)
    }
    return s
  }

  isHealthy(id: string): boolean {
    // Leitura PURA (não cria entrada): chamada no hot path a cada tentativa.
    return this.state.get(id)?.healthy ?? true
  }

  recordSuccess(id: string): void {
    const s = this.entry(id)
    s.consecutiveFailures = 0
    s.healthy = true
  }

  recordFailure(id: string): void {
    const s = this.entry(id)
    s.consecutiveFailures++
    if (s.consecutiveFailures >= this.failureThreshold) s.healthy = false
  }

  snapshot(): Record<string, boolean> {
    const out: Record<string, boolean> = {}
    for (const [k, v] of this.state) out[k] = v.healthy
    return out
  }
}

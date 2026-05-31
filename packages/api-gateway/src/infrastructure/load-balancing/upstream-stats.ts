import type { UpstreamStatsView } from '../../domain/load-balancing/load-balancer.port'

/**
 * Estatísticas por destino, em memória (por réplica): requisições em voo e
 * latência EWMA. Lidas por estratégias de LB (least-connections, p2c-ewma).
 */
export class UpstreamStats implements UpstreamStatsView {
  private readonly inFlightMap = new Map<string, number>()
  private readonly ewma = new Map<string, number>()

  constructor(private readonly alpha = 0.2) {}

  inFlight(id: string): number {
    return this.inFlightMap.get(id) ?? 0
  }

  ewmaLatencyMs(id: string): number {
    return this.ewma.get(id) ?? 0
  }

  begin(id: string): void {
    this.inFlightMap.set(id, this.inFlight(id) + 1)
  }

  end(id: string, latencyMs: number): void {
    this.inFlightMap.set(id, Math.max(0, this.inFlight(id) - 1))
    // Amostra de latência nunca negativa (defesa contra clock não-monotônico do chamador).
    const sample = Math.max(0, latencyMs)
    const prev = this.ewma.get(id)
    this.ewma.set(id, prev === undefined ? sample : this.alpha * sample + (1 - this.alpha) * prev)
  }
}

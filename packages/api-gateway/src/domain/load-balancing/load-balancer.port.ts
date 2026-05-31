import type { LbStrategyName } from '../routing/route'

/** Um destino concreto (instância) de um serviço upstream. */
export interface UpstreamTarget {
  readonly id: string
  readonly baseUrl: string
  readonly weight: number
}

/** Estatísticas em memória (por réplica) consultadas por estratégias de LB. */
export interface UpstreamStatsView {
  inFlight(id: string): number
  ewmaLatencyMs(id: string): number
}

export interface PickContext {
  readonly healthy: readonly UpstreamTarget[]
  readonly stickyKey?: string
  readonly stats: UpstreamStatsView
}

/**
 * Strategy: escolhe um destino dentre os saudáveis. Implementações: round-robin,
 * least-connections, weighted, p2c-ewma (e o decorator sticky sobre qualquer uma).
 */
export interface LoadBalancer {
  readonly name: LbStrategyName
  pick(ctx: PickContext): UpstreamTarget | undefined
}

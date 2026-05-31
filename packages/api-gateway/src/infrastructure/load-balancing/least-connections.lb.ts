import type {
  LoadBalancer,
  PickContext,
  UpstreamTarget,
} from '../../domain/load-balancing/load-balancer.port'

/** Least-connections (ponderado pelo peso): escolhe o destino com menor carga relativa. */
export class LeastConnectionsLoadBalancer implements LoadBalancer {
  readonly name = 'least-connections' as const

  pick(ctx: PickContext): UpstreamTarget | undefined {
    let best: UpstreamTarget | undefined
    let bestLoad = Number.POSITIVE_INFINITY
    for (const t of ctx.healthy) {
      const load = ctx.stats.inFlight(t.id) / Math.max(1, t.weight)
      if (load < bestLoad) {
        bestLoad = load
        best = t
      }
    }
    return best
  }
}

import type {
  LoadBalancer,
  PickContext,
  UpstreamTarget,
} from '../../domain/load-balancing/load-balancer.port'

/**
 * Smooth Weighted Round-Robin (algoritmo do Nginx): distribui proporcional ao
 * peso, mas de forma suave (não em rajadas como o WRR ingênuo).
 */
export class WeightedLoadBalancer implements LoadBalancer {
  readonly name = 'weighted' as const
  private readonly current = new Map<string, number>()

  pick(ctx: PickContext): UpstreamTarget | undefined {
    const targets = ctx.healthy
    if (targets.length === 0) return undefined

    let total = 0
    let best: UpstreamTarget | undefined
    let bestCurrent = Number.NEGATIVE_INFINITY
    for (const t of targets) {
      const cur = (this.current.get(t.id) ?? 0) + t.weight
      this.current.set(t.id, cur)
      total += t.weight
      if (cur > bestCurrent) {
        bestCurrent = cur
        best = t
      }
    }
    if (best) this.current.set(best.id, (this.current.get(best.id) ?? 0) - total)
    return best
  }
}

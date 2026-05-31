import type {
  LoadBalancer,
  PickContext,
  UpstreamTarget,
} from '../../domain/load-balancing/load-balancer.port'

/**
 * Power-of-two-choices sobre EWMA: sorteia 2 destinos e escolhe o de menor custo
 * estimado (latência EWMA × (em-voo + 1) / peso). Boa cauda de latência sob carga.
 */
export class P2cEwmaLoadBalancer implements LoadBalancer {
  readonly name = 'p2c-ewma' as const

  pick(ctx: PickContext): UpstreamTarget | undefined {
    const t = ctx.healthy
    const n = t.length
    if (n === 0) return undefined
    if (n === 1) return t[0]

    const a = Math.floor(Math.random() * n)
    let b = Math.floor(Math.random() * (n - 1))
    if (b >= a) b++
    const ta = t[a]
    const tb = t[b]
    if (!ta) return tb
    if (!tb) return ta

    const cost = (x: UpstreamTarget) =>
      ((ctx.stats.ewmaLatencyMs(x.id) || 1) * (ctx.stats.inFlight(x.id) + 1)) /
      Math.max(1, x.weight)
    return cost(ta) <= cost(tb) ? ta : tb
  }
}

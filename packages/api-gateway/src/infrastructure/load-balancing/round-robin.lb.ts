import type {
  LoadBalancer,
  PickContext,
  UpstreamTarget,
} from '../../domain/load-balancing/load-balancer.port'

/** Round-robin simples: alterna sequencialmente entre os destinos saudáveis. */
export class RoundRobinLoadBalancer implements LoadBalancer {
  readonly name = 'round-robin' as const
  private cursor = 0

  pick(ctx: PickContext): UpstreamTarget | undefined {
    const targets = ctx.healthy
    if (targets.length === 0) return undefined
    const idx = this.cursor % targets.length
    this.cursor = (this.cursor + 1) % 1_000_000
    return targets[idx]
  }
}

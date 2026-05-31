import { sha256Hex } from '@sistemazero/core/security'
import type {
  LoadBalancer,
  PickContext,
  UpstreamTarget,
} from '../../domain/load-balancing/load-balancer.port'
import type { LbStrategyName } from '../../domain/routing/route'

/**
 * Decorator: sessão pegajosa (sticky). Com `stickyKey`, mapeia de forma
 * determinística para um destino (hash); sem ela, delega à estratégia interna.
 */
export class StickyLoadBalancer implements LoadBalancer {
  readonly name: LbStrategyName

  constructor(private readonly inner: LoadBalancer) {
    this.name = inner.name
  }

  pick(ctx: PickContext): UpstreamTarget | undefined {
    if (!ctx.stickyKey) return this.inner.pick(ctx)
    const targets = ctx.healthy
    if (targets.length === 0) return undefined
    const hash = sha256Hex(ctx.stickyKey)
    const idx = Number(BigInt(`0x${hash.slice(0, 8)}`) % BigInt(targets.length))
    return targets[idx]
  }
}

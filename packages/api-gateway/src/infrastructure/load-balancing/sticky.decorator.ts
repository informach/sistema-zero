import { sha256Hex } from '@sistemazero/core/security'
import type {
  LoadBalancer,
  PickContext,
  UpstreamTarget,
} from '../../domain/load-balancing/load-balancer.port'
import type { LbStrategyName } from '../../domain/routing/route'

/**
 * Decorator: sessão pegajosa (sticky) por **rendezvous hashing (HRW)**. Para cada
 * destino calcula `hash(stickyKey:targetId)` e escolhe o de maior score. Vantagem
 * sobre `hash % N`: quando um destino entra/sai, só ~1/N das sessões remapeiam
 * (não quase todas) — preserva a localidade de sessão/cache sob mudança de saúde.
 * Sem `stickyKey`, delega à estratégia interna.
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
    let best: UpstreamTarget | undefined
    let bestScore = -1n
    for (const t of targets) {
      // 64 bits do digest bastam para um tie-break uniforme entre destinos.
      const score = BigInt(`0x${sha256Hex(`${ctx.stickyKey}:${t.id}`).slice(0, 16)}`)
      if (score > bestScore) {
        bestScore = score
        best = t
      }
    }
    return best
  }
}

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
    // Mantém o cursor pequeno sem introduzir viés (o `% N` periódico de um teto que
    // não é múltiplo de N desbalanceava); reinicia em múltiplos do tamanho do pool.
    this.cursor = idx + 1 >= targets.length ? 0 : this.cursor + 1
    return targets[idx]
  }
}

import type { LoadBalancer } from '../../domain/load-balancing/load-balancer.port'
import type { LbStrategyName } from '../../domain/routing/route'
import { LeastConnectionsLoadBalancer } from './least-connections.lb'
import { P2cEwmaLoadBalancer } from './p2c-ewma.lb'
import { RoundRobinLoadBalancer } from './round-robin.lb'
import { StickyLoadBalancer } from './sticky.decorator'
import { WeightedLoadBalancer } from './weighted.lb'

/** Cria a estratégia de LB pelo nome, opcionalmente envolvida pelo decorator sticky. */
export function createLoadBalancer(name: LbStrategyName, sticky = false): LoadBalancer {
  const base: LoadBalancer =
    name === 'least-connections'
      ? new LeastConnectionsLoadBalancer()
      : name === 'weighted'
        ? new WeightedLoadBalancer()
        : name === 'p2c-ewma'
          ? new P2cEwmaLoadBalancer()
          : new RoundRobinLoadBalancer()
  return sticky ? new StickyLoadBalancer(base) : base
}

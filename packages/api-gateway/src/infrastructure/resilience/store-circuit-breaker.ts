import type { GatewayStore } from '../../domain/ports/gateway-store.port'
import type {
  BreakerDecision,
  BreakerState,
  CircuitBreaker,
} from '../../domain/resilience/circuit-breaker.port'
import type { CircuitBreakerConfig } from '../config/gateway-config.schema'

interface StoredState {
  state: BreakerState
  openedAt: number
}

const TRIAL = 'trial'

/**
 * Circuit breaker com estado no `GatewayStore` (compartilhado entre réplicas,
 * com TTL) + cache local curto (~250ms) para tirar o store do hot path. Abre por
 * taxa de falha numa janela; após o cooldown entra em half-open (uma tentativa);
 * sucesso fecha, falha reabre. Eventualmente consistente entre réplicas.
 */
export class StoreCircuitBreaker implements CircuitBreaker {
  private readonly cache = new Map<string, { st: StoredState | null; at: number }>()

  constructor(
    private readonly store: GatewayStore,
    private readonly getConfig: (serviceId: string) => CircuitBreakerConfig | undefined,
    private readonly localCacheMs = 250,
  ) {}

  async beforeCall(serviceId: string, upstreamId: string): Promise<BreakerDecision> {
    const cfg = this.getConfig(serviceId)
    if (!cfg?.enabled) return { allow: true, state: 'closed' }

    const key = this.stateKey(serviceId, upstreamId)
    const st = await this.readState(key)
    const now = Date.now()

    if (!st || st.state === 'closed') return { allow: true, state: 'closed' }

    if (st.state === 'open') {
      if (now - st.openedAt >= cfg.cooldownMs) {
        const half: StoredState = { state: 'half-open', openedAt: st.openedAt }
        await this.writeState(key, half, cfg.cooldownMs * 2)
        return { allow: true, state: 'half-open', token: TRIAL }
      }
      return { allow: false, state: 'open' }
    }

    // half-open: libera uma tentativa de teste.
    return { allow: true, state: 'half-open', token: TRIAL }
  }

  async onResult(
    serviceId: string,
    upstreamId: string,
    ok: boolean,
    token?: string,
  ): Promise<void> {
    const cfg = this.getConfig(serviceId)
    if (!cfg?.enabled) return
    const key = this.stateKey(serviceId, upstreamId)

    if (token === TRIAL) {
      if (ok) {
        await this.store.del(key)
        await this.store.reset(this.counterKey('total', serviceId, upstreamId))
        await this.store.reset(this.counterKey('fail', serviceId, upstreamId))
        this.cache.delete(key)
      } else {
        await this.open(key, cfg)
      }
      return
    }

    // Caminho fechado: contabiliza e avalia a taxa de falha apenas em falhas.
    if (ok) {
      await this.store.increment(this.counterKey('total', serviceId, upstreamId), cfg.cooldownMs)
      return
    }
    const total = (
      await this.store.increment(this.counterKey('total', serviceId, upstreamId), cfg.cooldownMs)
    ).count
    const fails = (
      await this.store.increment(this.counterKey('fail', serviceId, upstreamId), cfg.cooldownMs)
    ).count
    if (total >= cfg.minThroughput && fails / total >= cfg.failureRate) {
      await this.open(key, cfg)
    }
  }

  private async open(key: string, cfg: CircuitBreakerConfig): Promise<void> {
    const v: StoredState = { state: 'open', openedAt: Date.now() }
    await this.writeState(key, v, cfg.cooldownMs * 2)
  }

  private async readState(key: string): Promise<StoredState | null> {
    const cached = this.cache.get(key)
    const now = Date.now()
    if (cached && now - cached.at < this.localCacheMs) return cached.st
    const st = await this.store.get<StoredState>(key)
    this.cache.set(key, { st, at: now })
    return st
  }

  private async writeState(key: string, st: StoredState, ttlMs: number): Promise<void> {
    await this.store.set(key, st, ttlMs)
    this.cache.set(key, { st, at: Date.now() })
  }

  private stateKey(s: string, u: string): string {
    return `cb:state:${s}:${u}`
  }
  private counterKey(kind: 'total' | 'fail', s: string, u: string): string {
    return `cb:${kind}:${s}:${u}`
  }
}

import { randomUUID } from 'node:crypto'
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
  /** Token único da tentativa de half-open em curso (correlaciona o `onResult`). */
  trialToken?: string
}

/**
 * Circuit breaker com estado no `GatewayStore` (compartilhado entre réplicas,
 * com TTL) + cache local curto (~250ms) para tirar o store do hot path. Abre por
 * taxa de falha numa janela; após o cooldown, UMA tentativa de half-open é liberada
 * (gate atômico via `increment` — o chamador cujo `count===1` vence, mesmo entre
 * réplicas); sucesso fecha, falha reabre. Eventualmente consistente entre réplicas.
 *
 * Resiliência: qualquer erro do store é tratado como FAIL-OPEN (permite a chamada)
 * — uma indisponibilidade do backend de estado não pode bloquear todo o tráfego.
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
    let st: StoredState | null
    try {
      st = await this.readState(key)
    } catch {
      return { allow: true, state: 'closed' } // fail-open
    }
    const now = Date.now()

    if (!st || st.state === 'closed') return { allow: true, state: 'closed' }

    if (st.state === 'open') {
      if (now - st.openedAt < cfg.cooldownMs) return { allow: false, state: 'open' }

      // Cooldown vencido: disputa o ÚNICO slot de tentativa (atômico no store).
      // Só quem incrementar o gate para 1 roda o teste; os demais seguem barrados.
      let won: boolean
      try {
        const hit = await this.store.increment(this.trialKey(serviceId, upstreamId), cfg.cooldownMs)
        won = hit.count === 1
      } catch {
        return { allow: true, state: 'closed' } // fail-open
      }
      if (!won) return { allow: false, state: 'open' }

      const token = randomUUID()
      const half: StoredState = { state: 'half-open', openedAt: st.openedAt, trialToken: token }
      try {
        await this.writeState(key, half, cfg.cooldownMs * 2)
      } catch {
        // best-effort: o gate já garante exclusividade; segue com a tentativa.
      }
      return { allow: true, state: 'half-open', token }
    }

    // half-open: a tentativa pertence a quem venceu o gate → barra os demais.
    return { allow: false, state: 'half-open' }
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

    try {
      if (token) {
        // Resultado de uma tentativa de half-open: só age se for a tentativa ATUAL
        // (token confere) — um resultado atrasado de tentativa antiga é ignorado.
        const st = await this.readState(key)
        if (st?.state !== 'half-open' || st.trialToken !== token) return
        if (ok) {
          await this.store.reset(key)
          await this.store.reset(this.countsKey(serviceId, upstreamId))
          await this.store.reset(this.trialKey(serviceId, upstreamId))
          this.cache.delete(key)
        } else {
          await this.open(key, cfg)
          await this.store.reset(this.trialKey(serviceId, upstreamId))
        }
        return
      }

      // Caminho fechado: contabiliza total/fail ATOMICAMENTE e avalia a taxa.
      const { total, fail } = await this.store.recordOutcome(
        this.countsKey(serviceId, upstreamId),
        ok,
        cfg.cooldownMs,
      )
      if (total >= cfg.minThroughput && fail / total >= cfg.failureRate) {
        await this.open(key, cfg)
      }
    } catch {
      // best-effort: um soluço do store não pode quebrar o caminho da requisição.
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
  private countsKey(s: string, u: string): string {
    return `cb:counts:${s}:${u}`
  }
  private trialKey(s: string, u: string): string {
    return `cb:trial:${s}:${u}`
  }
}

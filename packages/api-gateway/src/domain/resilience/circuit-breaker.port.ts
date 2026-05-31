export type BreakerState = 'closed' | 'open' | 'half-open'

export interface BreakerDecision {
  readonly allow: boolean
  readonly state: BreakerState
  /** Token opaco devolvido em `onResult` para correlacionar a tentativa (ex.: half-open). */
  readonly token?: string
}

/**
 * Circuit breaker por (serviço, upstream). Estado compartilhado no GatewayStore
 * (TTL) para coordenar réplicas sem líder. closed → open (falhas) → half-open
 * (trial após cooldown) → closed/open.
 */
export interface CircuitBreaker {
  beforeCall(serviceId: string, upstreamId: string): Promise<BreakerDecision>
  onResult(serviceId: string, upstreamId: string, ok: boolean, token?: string): Promise<void>
}

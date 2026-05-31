/** Resultado de um incremento de janela de rate limit. */
export interface RateLimitHit {
  count: number
  nextReset: number // epoch ms em que a janela reinicia
  start: number // epoch ms de início da janela
}

/**
 * Único ponto de estado mutável compartilhado do gateway (rate limit, cache de
 * sessão/JWKS, estado de circuit breaker). Modelado na interface `Context` do
 * `elysia-rate-limit`. Adapters: in-memory (dev/single-replica) e Redis (escala).
 *
 * Manter o gateway atrás desta porta é o que o torna stateless → N réplicas sem
 * líder (mitiga o SPOF).
 */
export interface GatewayStore {
  init(): Promise<void>
  /** Incrementa o contador da `key` na janela `windowMs`; cria a janela se necessário. */
  increment(key: string, windowMs: number, now?: number): Promise<RateLimitHit>
  /** Desfaz um incremento (refund — ex.: requisição que falhou e não deve contar). */
  decrement(key: string): Promise<void>
  reset(key?: string): Promise<void>
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlMs: number): Promise<void>
  del(key: string): Promise<void>
  kill(): Promise<void>
}

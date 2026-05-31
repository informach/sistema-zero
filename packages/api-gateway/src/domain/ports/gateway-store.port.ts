/** Resultado de um incremento de contador de janela fixa (circuit breaker). */
export interface RateLimitHit {
  count: number
  nextReset: number // epoch ms em que a janela reinicia
  start: number // epoch ms de início da janela
}

/** Resultado de um hit de rate limit por janela deslizante. */
export interface SlidingWindowHit {
  /** Contagem PONDERADA (pode ser fracionária): prev × peso + curr. */
  count: number
  /** Fim da janela atual (epoch ms) — usado para Retry-After / RateLimit-Reset. */
  resetMs: number
}

/** Contadores de janela do circuit breaker (total e falhas), atualizados juntos. */
export interface BreakerCounters {
  total: number
  fail: number
}

/**
 * Único ponto de estado mutável compartilhado do gateway (rate limit, cache de
 * sessão/JWKS, estado de circuit breaker). Adapters: in-memory (dev/single-replica)
 * e Redis (escala). Manter o gateway atrás desta porta é o que o torna stateless
 * → N réplicas sem líder (mitiga o SPOF).
 */
export interface GatewayStore {
  init(): Promise<void>

  /**
   * Rate limit por **janela deslizante** (sliding-window-counter): suaviza a
   * virada da janela (sem o burst de 2× do fixed-window). Conta a requisição e
   * devolve a estimativa ponderada.
   */
  slidingWindow(key: string, windowMs: number, now?: number): Promise<SlidingWindowHit>
  /**
   * Devolve 1 unidade à janela (ex.: não contar uma resposta 5xx do upstream).
   * `windowResetMs` (o `resetMs` do hit original) garante que só a MESMA janela é
   * debitada — após um rollover, um refund tardio não credita a janela nova.
   */
  slidingWindowRefund(key: string, windowResetMs?: number): Promise<void>

  /**
   * Contador de **janela fixa** (usado como gate atômico de tentativa do circuit
   * breaker: o chamador cujo `count === 1` ganha o slot de half-open).
   */
  increment(key: string, windowMs: number, now?: number): Promise<RateLimitHit>

  /**
   * Registra um resultado (ok/falha) do circuit breaker numa janela fixa,
   * incrementando `total` e (em falha) `fail` ATOMICAMENTE, e devolve ambos. Evita
   * a corrida de dois `increment` separados (denominador inconsistente entre réplicas).
   */
  recordOutcome(key: string, ok: boolean, windowMs: number, now?: number): Promise<BreakerCounters>

  reset(key?: string): Promise<void>
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlMs: number): Promise<void>
  del(key: string): Promise<void>
  kill(): Promise<void>
}

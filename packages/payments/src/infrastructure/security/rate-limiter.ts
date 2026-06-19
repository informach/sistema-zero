// Re-export de @sistemazero/core — fonte única da verdade (movido do payments).

import type { RateLimitResult as CoreRateLimitResult } from '@sistemazero/core/security'

export type { RateLimitResult } from '@sistemazero/core/security'
export { InMemoryRateLimiter } from '@sistemazero/core/security'

/**
 * Abstração leve para rate limiter de borda. Pode ser sincrona (in-memory)
 * ou distribuída (Postgres). O retorno permite implementar ambos sem mudar as
 * dependências de rota.
 */
export type RateLimiter = {
  check(key: string): CoreRateLimitResult | Promise<CoreRateLimitResult>
}

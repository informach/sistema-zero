import type { AuthStrategyKind } from '../../domain/routing/route'
import type { GatewayContext } from '../pipeline/stage.port'

/** Identidade autenticada de quem chama o gateway. */
export interface Principal {
  readonly kind: AuthStrategyKind
  readonly subject: string
  readonly claims?: Record<string, unknown>
  readonly scopes?: readonly string[]
}

/**
 * Resultado de uma estratégia de auth:
 * - `{ ok: true }`   → autenticou;
 * - `{ ok: false }`  → falhou (curto-circuita com status);
 * - `{ ok: 'skip' }` → não se aplica (ex.: sem header Bearer) → tenta a próxima.
 */
export type AuthResult =
  | { ok: true; principal: Principal }
  | { ok: false; status: 401 | 403; code: string; message: string }
  | { ok: 'skip' }

/** Strategy de autenticação plugável (jwt/session/hmac). */
export interface AuthStrategy {
  readonly name: AuthStrategyKind
  authenticate(ctx: GatewayContext): Promise<AuthResult>
}

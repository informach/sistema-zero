import type { AuthStrategyKind } from '../../domain/routing/route'
import type { RouteAuthPolicy } from '../../infrastructure/config/gateway-config.schema'
import type { GatewayContext } from '../pipeline/stage.port'
import type { AuthResult, AuthStrategy } from './auth-strategy.port'

export type AuthStrategyMap = Partial<Record<AuthStrategyKind, AuthStrategy>>

export interface AuthChain {
  authenticate(ctx: GatewayContext, policy: RouteAuthPolicy): Promise<AuthResult>
}

/**
 * Cadeia de autenticação (Chain of Responsibility + Strategy). Por rota:
 *  - `any`: passa se QUALQUER estratégia autenticar; senão a 1ª falha (ou 401);
 *  - `all`: TODAS as estratégias listadas precisam autenticar.
 */
export function createAuthChain(strategies: AuthStrategyMap): AuthChain {
  return {
    async authenticate(ctx, policy): Promise<AuthResult> {
      if (policy === 'public') return { ok: 'skip' }

      const chain = policy.strategies
        .map((k) => strategies[k])
        .filter((s): s is AuthStrategy => Boolean(s))
      if (chain.length === 0) {
        return {
          ok: false,
          status: 401,
          code: 'AUTH_UNAVAILABLE',
          message: 'Nenhuma estratégia de auth configurada',
        }
      }

      if (policy.mode === 'all') {
        let last: Extract<AuthResult, { ok: true }> | undefined
        for (const s of chain) {
          const r = await s.authenticate(ctx)
          if (r.ok === false) return r
          if (r.ok === 'skip') {
            return {
              ok: false,
              status: 401,
              code: 'UNAUTHENTICATED',
              message: `Credencial "${s.name}" ausente`,
            }
          }
          last = r
        }
        return (
          last ?? { ok: false, status: 401, code: 'UNAUTHENTICATED', message: 'Não autenticado' }
        )
      }

      // modo 'any'
      let firstFailure: Extract<AuthResult, { ok: false }> | undefined
      for (const s of chain) {
        const r = await s.authenticate(ctx)
        if (r.ok === true) return r
        if (r.ok === false && !firstFailure) firstFailure = r
      }
      if (firstFailure) return firstFailure
      return policy.required
        ? { ok: false, status: 401, code: 'UNAUTHENTICATED', message: 'Não autenticado' }
        : { ok: 'skip' }
    },
  }
}

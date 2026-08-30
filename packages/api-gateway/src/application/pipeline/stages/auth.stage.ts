import type { AuthChain } from '../../auth/auth-chain'
import { errorResponse } from '../responses'
import type { Stage } from '../stage.port'

/** Roda a cadeia de auth conforme a política da rota; anexa o principal ao contexto. */
export function createAuthStage(chain: AuthChain): Stage {
  return {
    name: 'auth',
    async run(ctx) {
      if (!ctx.route) return undefined
      const auth = ctx.route.route.auth
      const result = await chain.authenticate(ctx, auth)
      if (result.ok === true) {
        // Allowlist de consumers HMAC da rota: assinatura válida NÃO basta —
        // o consumer precisa ser um dos esperados (um consumer de e-mail não
        // pode alcançar o grant-manual só por existir no registry).
        const allowed = typeof auth === 'object' ? auth.allowedConsumers : undefined
        if (
          allowed &&
          result.principal.kind === 'hmac' &&
          !allowed.includes(result.principal.subject)
        ) {
          ctx.logger.warn('gateway.consumer_not_allowed', {
            requestId: ctx.requestId,
            route: ctx.route.route.id,
            consumer: result.principal.subject,
          })
          return errorResponse(403, 'CONSUMER_NOT_ALLOWED', 'Consumer não autorizado nesta rota')
        }
        ctx.principal = result.principal
        return undefined
      }
      if (result.ok === 'skip') return undefined
      ctx.logger.warn('gateway.auth_denied', {
        requestId: ctx.requestId,
        route: ctx.route.route.id,
        code: result.code,
      })
      return errorResponse(result.status, result.code, result.message)
    },
  }
}

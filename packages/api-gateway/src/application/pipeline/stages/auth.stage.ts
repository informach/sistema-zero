import type { AuthChain } from '../../auth/auth-chain'
import { errorResponse } from '../responses'
import type { Stage } from '../stage.port'

/** Roda a cadeia de auth conforme a política da rota; anexa o principal ao contexto. */
export function createAuthStage(chain: AuthChain): Stage {
  return {
    name: 'auth',
    async run(ctx) {
      if (!ctx.route) return undefined
      const result = await chain.authenticate(ctx, ctx.route.route.auth)
      if (result.ok === true) {
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

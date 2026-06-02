import { errorResponse } from '../responses'
import type { Stage } from '../stage.port'

/**
 * Autorização (RBAC) por rota. Aplica a política `authorize` da rota sobre o
 * usuário resolvido (`ctx.user`):
 *  - exige um usuário resolvido (token de usuário) → senão 401;
 *  - `status` deve estar em `statuses` (default: só `active`) → senão 403;
 *  - `roles` (se definido) deve conter o papel do usuário → senão 403;
 *  - `scopes` (se definido) deve ser subconjunto dos scopes do principal → senão 403.
 * Rotas sem `authorize` não passam por aqui (autenticação já basta).
 */
export function createAuthorizationStage(): Stage {
  return {
    name: 'authorization',
    run(ctx) {
      if (!ctx.route) return undefined
      const authz = ctx.route.route.authorize
      if (!authz) return undefined

      const deny = (status: 401 | 403, code: string, message: string) => {
        ctx.logger.warn('gateway.authz_denied', {
          requestId: ctx.requestId,
          route: ctx.route?.route.id,
          code,
          role: ctx.user?.role,
          status: ctx.user?.status,
        })
        return errorResponse(status, code, message)
      }

      // `authorize` exige uma identidade de usuário resolvida.
      if (!ctx.user) {
        return deny(401, 'UNAUTHENTICATED', 'Autenticação de usuário requerida')
      }

      const allowedStatuses = authz.statuses ?? ['active']
      if (!allowedStatuses.includes(ctx.user.status)) {
        return deny(403, 'FORBIDDEN', 'Conta sem acesso (status)')
      }

      if (authz.roles && authz.roles.length > 0 && !authz.roles.includes(ctx.user.role)) {
        return deny(403, 'FORBIDDEN', 'Papel sem permissão para esta rota')
      }

      if (authz.scopes && authz.scopes.length > 0) {
        const granted = new Set(ctx.principal?.scopes ?? [])
        const missing = authz.scopes.filter((s) => !granted.has(s))
        if (missing.length > 0) {
          return deny(403, 'FORBIDDEN', 'Escopo insuficiente')
        }
      }

      return undefined
    },
  }
}

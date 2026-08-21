import { errorResponse } from '../responses'
import type { Stage } from '../stage.port'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Trocar/encerrar o perfil é necessário para navegar na própria impersonação.
// Ambas as operações reemitem a sessão em readonly no auth.
const READONLY_CONTROL_ROUTES = new Set(['auth-profile-select', 'auth-profile-session-exit'])
// Credenciais são tratadas pelos fluxos administrativos auditados, nunca por
// uma sessão que age como o cliente (evita takeover acidental).
const NEVER_WRITABLE_ROUTES = new Set(['auth-me-password'])

/**
 * Defesa central contra escrita acidental durante suporte. O BFF melhora a UX,
 * mas esta barreira no gateway impede bypass por chamada direta aos serviços.
 */
export function createImpersonationWriteStage(): Stage {
  return {
    name: 'impersonation-write',
    run(ctx) {
      const user = ctx.user
      if (!user?.impersonatorId || !MUTATING_METHODS.has(ctx.method)) return undefined
      if (READONLY_CONTROL_ROUTES.has(ctx.route?.route.id ?? '')) return undefined
      if (NEVER_WRITABLE_ROUTES.has(ctx.route?.route.id ?? '')) {
        return errorResponse(
          403,
          'IMPERSONATION_CREDENTIALS_FORBIDDEN',
          'Credenciais não podem ser alteradas durante uma sessão de suporte.',
        )
      }
      if (user.impersonationMode === 'write') return undefined

      ctx.logger.warn('gateway.impersonation_write_denied', {
        requestId: ctx.requestId,
        route: ctx.route?.route.id,
        impersonatorId: user.impersonatorId,
        effectiveUserId: user.id,
      })
      return errorResponse(
        403,
        'IMPERSONATION_READONLY',
        'Ative o modo de edição para realizar esta ação.',
      )
    },
  }
}

import { Elysia } from 'elysia'
import type { OAuthService } from '../../../application/connection/oauth.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
import { OAuthCallbackQuery, ProviderParams } from '../dtos'

export interface OAuthRoutesDeps {
  oauth: OAuthService
  internalToken?: string
  requireStaffEnabled: boolean
}

/**
 * Fluxo OAuth (conectar a caixa do Gmail). O `start` é admin+ NO GATEWAY (rota
 * helpdesk-oauth-start com audit); aqui staff+ é defesa em profundidade. O
 * `callback` é rota PÚBLICA no gateway (o Google redireciona o browser) — sem
 * X-Auth-User-*, mas o gateway ainda injeta o x-internal-token.
 */
export function oauthRoutes(deps: OAuthRoutesDeps) {
  return new Elysia()
    .post(
      '/helpdesk/oauth/:provider/start',
      ({ headers, params }) => {
        assertInternalCaller(headers['x-internal-token'], deps.internalToken)
        requireStaff(headers, deps.requireStaffEnabled)
        return deps.oauth.start(resolveActor(headers), params.provider)
      },
      { params: ProviderParams },
    )
    .get(
      '/helpdesk/oauth/:provider/callback',
      async ({ headers, params, query, set }) => {
        assertInternalCaller(headers['x-internal-token'], deps.internalToken)
        const location = await deps.oauth.handleCallback(params.provider, {
          code: query.code,
          state: query.state,
          error: query.error,
        })
        // Navegação de browser: o resultado é SEMPRE 302 pro app (nunca JSON).
        set.status = 302
        set.headers.location = location
        return ''
      },
      { params: ProviderParams, query: OAuthCallbackQuery },
    )
}

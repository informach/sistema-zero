import { Elysia } from 'elysia'
import type { ExchangeImpersonationTokenService } from '../../../application/impersonation/exchange-impersonation-token.service'
import { type AuthContext, resolveClientIp } from '../auth'
import { ImpersonateExchangeBody } from '../dtos'

export interface ImpersonationRoutesDeps {
  trustProxy: boolean
  trustedProxyHops: number
  exchange: ExchangeImpersonationTokenService
}

/**
 * Exchange do token de handoff de impersonação. Rota PÚBLICA (como o /login —
 * quem chama é o servidor da community, sem Bearer): a segurança vem do próprio
 * token (single-use, TTL ~60s, consumo atômico) + rate limit por IP no gateway.
 * O token trafega no CORPO (nunca na URL desta chamada — não vaza em access log).
 */
export function impersonationRoutes(deps: ImpersonationRoutesDeps) {
  const clientIp = (ctx: AuthContext): string =>
    resolveClientIp(ctx, deps.trustProxy, deps.trustedProxyHops)

  return new Elysia({ prefix: '/auth/impersonate' }).post(
    '/exchange',
    async ({ body, request, server, headers }) => {
      return deps.exchange.execute({
        token: body.token,
        userAgent: headers['user-agent'] ?? null,
        ip: clientIp({ request, server, headers }),
      })
    },
    { body: ImpersonateExchangeBody },
  )
}

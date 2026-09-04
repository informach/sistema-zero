import { swagger } from '@elysiajs/swagger'
import { PayloadTooLargeError } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import { Elysia } from 'elysia'
import type { Env } from '../../infrastructure/config/env'
import { buildErrorResponse } from './error-handler'
import { type ConnectionRoutesDeps, connectionRoutes } from './routes/connection.routes'
import {
  type CustomerTicketsRoutesDeps,
  customerTicketsRoutes,
} from './routes/customer-tickets.routes'
import { healthRoutes, type ReadinessProbe } from './routes/health.routes'
import { type KbRoutesDeps, kbRoutes } from './routes/kb.routes'
import { type OAuthRoutesDeps, oauthRoutes } from './routes/oauth.routes'
import { type SettingsRoutesDeps, settingsRoutes } from './routes/settings.routes'
import { type TicketsRoutesDeps, ticketsRoutes } from './routes/tickets.routes'

export interface HttpDeps {
  env: Env
  logger: Logger
  /** Probe de readiness (`/readyz`): banco alcançável. */
  readiness: ReadinessProbe
  tickets: TicketsRoutesDeps
  customerTickets: CustomerTicketsRoutesDeps
  kb: KbRoutesDeps
  settings: SettingsRoutesDeps
  connection: ConnectionRoutesDeps
  oauth: OAuthRoutesDeps
}

const OVERSIZE = new WeakSet<Request>()

/**
 * Monta a app Elysia: teto de corpo (anti-DoS), tratamento central de erros,
 * Swagger (fora de produção) e as rotas de negócio.
 */
export function createServer(deps: HttpDeps) {
  const app = new Elysia({
    serve: { maxRequestBodySize: deps.env.MAX_REQUEST_BODY_BYTES },
  })
    .onParse({ as: 'global' }, async ({ request, contentType }) => {
      const maxBytes = deps.env.MAX_REQUEST_BODY_BYTES
      const declared = Number(request.headers.get('content-length') ?? '0')
      if (Number.isFinite(declared) && declared > maxBytes) {
        OVERSIZE.add(request)
        return undefined
      }
      if (contentType?.includes('application/json')) {
        const text = await request.text()
        if (Buffer.byteLength(text, 'utf8') > maxBytes) {
          OVERSIZE.add(request)
          return {}
        }
        return text.length > 0 ? JSON.parse(text) : {}
      }
      return undefined
    })
    // Corpo acima do teto (marcado no onParse) → 413 explícito em TODA rota.
    .onTransform({ as: 'global' }, ({ request }) => {
      if (OVERSIZE.has(request)) {
        throw new PayloadTooLargeError('Corpo da requisição excede o limite')
      }
    })
    .onError({ as: 'global' }, ({ code, error, set }) => {
      const { status, body } = buildErrorResponse({ code, error, logger: deps.logger })
      set.status = status
      return body
    })

  if (deps.env.NODE_ENV !== 'production') {
    app.use(
      swagger({
        path: '/swagger',
        documentation: {
          info: {
            title: 'Sistema Zero — Helpdesk API',
            version: '0.1.0',
            description:
              'Help desk com IA copiloto: tickets do Gmail e portal, com respostas sempre aprovadas por humanos.',
          },
        },
      }),
    )
  }

  return app
    .use(healthRoutes(deps.readiness))
    .use(ticketsRoutes(deps.tickets))
    .use(customerTicketsRoutes(deps.customerTickets))
    .use(kbRoutes(deps.kb))
    .use(settingsRoutes(deps.settings))
    .use(connectionRoutes(deps.connection))
    .use(oauthRoutes(deps.oauth))
}

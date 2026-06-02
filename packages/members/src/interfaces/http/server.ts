import { swagger } from '@elysiajs/swagger'
import type { Logger } from '@sistemazero/core/logging'
import { Elysia } from 'elysia'
import type { Env } from '../../infrastructure/config/env'
import { buildErrorResponse } from './error-handler'
import { markOversizeBody, setRawBody } from './raw-body'
import { healthRoutes } from './routes/health.routes'
import { type MembersRoutesDeps, membersRoutes } from './routes/members.routes'
import { type WebhooksRoutesDeps, webhooksRoutes } from './routes/webhooks.routes'

export interface HttpDeps {
  env: Env
  logger: Logger
  members: MembersRoutesDeps
  webhooks: WebhooksRoutesDeps
}

/**
 * Monta a app Elysia: teto de corpo (anti-DoS) + captura do corpo bruto (p/ HMAC),
 * tratamento central de erros, Swagger (fora de produção) e as rotas.
 */
export function createServer(deps: HttpDeps) {
  const app = new Elysia({
    serve: { maxRequestBodySize: deps.env.MAX_REQUEST_BODY_BYTES },
  })
    .onParse({ as: 'global' }, async ({ request, contentType }) => {
      const maxBytes = deps.env.MAX_REQUEST_BODY_BYTES
      const declared = Number(request.headers.get('content-length') ?? '0')
      if (Number.isFinite(declared) && declared > maxBytes) {
        markOversizeBody(request)
        return undefined
      }
      if (contentType?.includes('application/json')) {
        const text = await request.text()
        if (Buffer.byteLength(text, 'utf8') > maxBytes) {
          markOversizeBody(request)
          return {}
        }
        // Guarda o corpo BRUTO p/ a verificação HMAC dos webhooks.
        setRawBody(request, text)
        return text.length > 0 ? JSON.parse(text) : {}
      }
      return undefined
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
            title: 'Sistema Zero — Members API',
            version: '0.1.0',
            description:
              'Área de membros: matrícula/entitlement, cursos (módulos/aulas) e progresso.',
          },
        },
      }),
    )
  }

  return app.use(healthRoutes()).use(membersRoutes(deps.members)).use(webhooksRoutes(deps.webhooks))
}

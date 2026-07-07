import { swagger } from '@elysiajs/swagger'
import { PayloadTooLargeError } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import { Elysia } from 'elysia'
import type { Env } from '../../infrastructure/config/env'
import { buildErrorResponse } from './error-handler'
import { type AccountsRoutesDeps, accountsRoutes } from './routes/accounts.routes'
import { type ContentsRoutesDeps, contentsRoutes } from './routes/contents.routes'
import { type DriveRoutesDeps, driveRoutes } from './routes/drive.routes'
import { healthRoutes, type ReadinessProbe } from './routes/health.routes'
import { type IdeasRoutesDeps, ideasRoutes } from './routes/ideas.routes'
import { type MediaRoutesDeps, mediaRoutes } from './routes/media.routes'
import { type MetricsRoutesDeps, metricsRoutes } from './routes/metrics.routes'
import { type OAuthRoutesDeps, oauthRoutes } from './routes/oauth.routes'
import { type PublicationsRoutesDeps, publicationsRoutes } from './routes/publications.routes'

export interface HttpDeps {
  env: Env
  logger: Logger
  /** Probe de readiness (`/readyz`): banco alcançável. */
  readiness: ReadinessProbe
  ideas: IdeasRoutesDeps
  contents: ContentsRoutesDeps
  publications: PublicationsRoutesDeps
  media: MediaRoutesDeps
  oauth: OAuthRoutesDeps
  accounts: AccountsRoutesDeps
  drive: DriveRoutesDeps
  metrics: MetricsRoutesDeps
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
            title: 'Sistema Zero — Marketing API',
            version: '0.1.0',
            description:
              'Gerenciamento de marketing digital: pipeline de conteúdo, publicações, mídia e métricas.',
          },
        },
      }),
    )
  }

  return app
    .use(healthRoutes(deps.readiness))
    .use(ideasRoutes(deps.ideas))
    .use(contentsRoutes(deps.contents))
    .use(publicationsRoutes(deps.publications))
    .use(mediaRoutes(deps.media))
    .use(oauthRoutes(deps.oauth))
    .use(accountsRoutes(deps.accounts))
    .use(driveRoutes(deps.drive))
    .use(metricsRoutes(deps.metrics))
}

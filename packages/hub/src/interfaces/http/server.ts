import { swagger } from '@elysiajs/swagger'
import { PayloadTooLargeError } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import { Elysia } from 'elysia'
import type { Env } from '../../infrastructure/config/env'
import { buildErrorResponse } from './error-handler'
import { isOversizeBody, markOversizeBody, setRawBody } from './raw-body'
import { type AdminRoutesDeps, adminRoutes } from './routes/admin.routes'
import { type AttachmentsRoutesDeps, attachmentsRoutes } from './routes/attachments.routes'
import { healthRoutes, type ReadinessProbe } from './routes/health.routes'
import { type ModerationRoutesDeps, moderationRoutes } from './routes/moderation.routes'
import { type ReactionsRoutesDeps, reactionsRoutes } from './routes/reactions.routes'
import { type ReportRoutesDeps, reportRoutes } from './routes/report.routes'
import { type ShowcaseRoutesDeps, showcaseRoutes } from './routes/showcase.routes'
import { type SpacesRoutesDeps, spacesRoutes } from './routes/spaces.routes'
import { type ThreadsRoutesDeps, threadsRoutes } from './routes/threads.routes'
import { type WebhooksRoutesDeps, webhooksRoutes } from './routes/webhooks.routes'

export interface HttpDeps {
  env: Env
  logger: Logger
  /** Probe de readiness (`/readyz`): banco alcançável. */
  readiness: ReadinessProbe
  spaces: SpacesRoutesDeps
  threads: ThreadsRoutesDeps
  attachments: AttachmentsRoutesDeps
  reactions: ReactionsRoutesDeps
  report: ReportRoutesDeps
  showcase: ShowcaseRoutesDeps
  admin: AdminRoutesDeps
  moderation: ModerationRoutesDeps
  webhooks: WebhooksRoutesDeps
}

/**
 * Monta a app Elysia: teto de corpo (anti-DoS) + captura do corpo bruto (p/ HMAC),
 * tratamento central de erros, Swagger (fora de produção) e as rotas. As rotas de
 * negócio são adicionadas pelas fatias seguintes (spaces/channels/threads/...).
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
    // Corpo acima do teto (marcado no onParse) → 413 explícito em TODA rota — sem
    // isto o aluno/BFF cairia num 422 confuso com corpo vazio. Espelha o members.
    .onTransform({ as: 'global' }, ({ request }) => {
      if (isOversizeBody(request)) {
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
            title: 'Sistema Zero — Hub (Comunidade) API',
            version: '0.1.0',
            description: 'Comunidade em fórum: servidores, canais, tópicos, comentários e reações.',
          },
        },
      }),
    )
  }

  return app
    .use(healthRoutes(deps.readiness))
    .use(spacesRoutes(deps.spaces))
    .use(threadsRoutes(deps.threads))
    .use(attachmentsRoutes(deps.attachments))
    .use(reactionsRoutes(deps.reactions))
    .use(reportRoutes(deps.report))
    .use(showcaseRoutes(deps.showcase))
    .use(adminRoutes(deps.admin))
    .use(moderationRoutes(deps.moderation))
    .use(webhooksRoutes(deps.webhooks))
}

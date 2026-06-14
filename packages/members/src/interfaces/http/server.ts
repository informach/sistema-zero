import { swagger } from '@elysiajs/swagger'
import { PayloadTooLargeError } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import { Elysia } from 'elysia'
import type { Env } from '../../infrastructure/config/env'
import { buildErrorResponse } from './error-handler'
import { isOversizeBody, markOversizeBody, setRawBody } from './raw-body'
import { type AdminRoutesDeps, adminRoutes } from './routes/admin.routes'
import { type ContentRoutesDeps, contentRoutes } from './routes/content.routes'
import { healthRoutes, type ReadinessProbe } from './routes/health.routes'
import { type InternalRoutesDeps, internalRoutes } from './routes/internal.routes'
import { type MembersRoutesDeps, membersRoutes } from './routes/members.routes'
import { type WebhooksRoutesDeps, webhooksRoutes } from './routes/webhooks.routes'

export interface HttpDeps {
  env: Env
  logger: Logger
  /** Probe de readiness (`/readyz`): banco alcançável. */
  readiness: ReadinessProbe
  members: MembersRoutesDeps
  webhooks: WebhooksRoutesDeps
  admin: AdminRoutesDeps
  content: ContentRoutesDeps
  internal: InternalRoutesDeps
}

// Rotas que carregam o projeto do Estúdio (entrega do aluno + autoria do bloco):
// corpo muito maior que os JSONs normais. Recebem o teto `MAX_STUDIO_BODY_BYTES`;
// o resto fica no teto pequeno (anti-DoS por rota, espelha o `maxBodyBytes` da borda).
const STUDIO_SUBMISSION_PATH = /\/studio-submission$/
const ADMIN_BLOCK_CREATE_PATH = /\/members\/admin\/lessons\/[^/]+\/blocks$/
const ADMIN_BLOCK_UPDATE_PATH = /\/members\/admin\/blocks\/[^/]+$/

function bodyLimitForPath(pathname: string, env: Env): number {
  if (
    STUDIO_SUBMISSION_PATH.test(pathname) ||
    ADMIN_BLOCK_CREATE_PATH.test(pathname) ||
    ADMIN_BLOCK_UPDATE_PATH.test(pathname)
  ) {
    return Math.max(env.MAX_STUDIO_BODY_BYTES, env.MAX_REQUEST_BODY_BYTES)
  }
  return env.MAX_REQUEST_BODY_BYTES
}

/**
 * Monta a app Elysia: teto de corpo (anti-DoS) + captura do corpo bruto (p/ HMAC),
 * tratamento central de erros, Swagger (fora de produção) e as rotas.
 */
export function createServer(deps: HttpDeps) {
  // O teto do Bun.serve é o MAIOR dos limites — o per-rota (mais estrito) é
  // aplicado no `onParse`; senão o Bun cortaria a entrega do Estúdio antes dela.
  const serveCeiling = Math.max(deps.env.MAX_REQUEST_BODY_BYTES, deps.env.MAX_STUDIO_BODY_BYTES)
  const app = new Elysia({
    serve: { maxRequestBodySize: serveCeiling },
  })
    .onParse({ as: 'global' }, async ({ request, contentType }) => {
      const maxBytes = bodyLimitForPath(new URL(request.url).pathname, deps.env)
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
    // Corpo acima do teto (marcado no onParse) → 413 em TODAS as rotas. `transform`
    // roda just-before-validation (→ 413 antes de 422) e antes do `beforeHandle`. O
    // webhook re-checa antes do HMAC; sem este global, só os webhooks barravam o
    // oversize — as rotas de aluno/admin caíam em validação confusa (422 com `{}`).
    .onTransform({ as: 'global' }, ({ request }) => {
      if (isOversizeBody(request)) throw new PayloadTooLargeError()
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

  return app
    .use(healthRoutes(deps.readiness))
    .use(membersRoutes(deps.members))
    .use(webhooksRoutes(deps.webhooks))
    .use(adminRoutes(deps.admin))
    .use(contentRoutes(deps.content))
    .use(internalRoutes(deps.internal))
}

import { swagger } from '@elysiajs/swagger'
import {
  type AccountDeletionFence,
  assertAccountMutationAllowed,
  PayloadTooLargeError,
} from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import { Elysia } from 'elysia'
import type { LiveMaterialsService } from '../../application/live/live-materials.service'
import type { LivePublicationService } from '../../application/live/live-publication.service'
import type { LiveWorkspaceService } from '../../application/live/live-workspace.service'
import type { LiveBenefitsPort } from '../../domain/ports/live-benefits.port'
import type { Env } from '../../infrastructure/config/env'
import type { CloudflareSfuMediaProvider } from '../../infrastructure/live/cloudflare-sfu.provider'
import { liveMediaRoutes } from '../../infrastructure/live/live-media.routes'
import { liveRecordingRoutes } from '../../infrastructure/live/live-recording.routes'
import type { OwnRecordingProvider } from '../../infrastructure/live/own-recording.provider'
import { buildErrorResponse } from './error-handler'
import { isOversizeBody, markOversizeBody, setRawBody } from './raw-body'
import { type AdminRoutesDeps, adminRoutes } from './routes/admin.routes'
import { type ContentRoutesDeps, contentRoutes } from './routes/content.routes'
import { creationCleanupRoutes } from './routes/creation-cleanup.routes'
import { type CreationsRoutesDeps, creationsRoutes } from './routes/creations.routes'
import { healthRoutes, type ReadinessProbe } from './routes/health.routes'
import { type HelpRoutesDeps, helpRoutes } from './routes/help.routes'
import { type InternalRoutesDeps, internalRoutes } from './routes/internal.routes'
import { type LearningRoutesDeps, learningRoutes } from './routes/learning.routes'
import { type LiveRoutesDeps, liveRoutes } from './routes/live.routes'
import { type LiveCourseRoutesDeps, liveCourseRoutes } from './routes/live-course.routes'
import { liveMaterialsRoutes } from './routes/live-materials.routes'
import { livePublicationRoutes } from './routes/live-publication.routes'
import { liveWorkspaceRoutes } from './routes/live-workspaces.routes'
import { type MembersRoutesDeps, membersRoutes } from './routes/members.routes'
import { type PensaRoutesDeps, pensaRoutes } from './routes/pensa.routes'
import { type WebhooksRoutesDeps, webhooksRoutes } from './routes/webhooks.routes'

export interface HttpDeps {
  liveMaterials?: LiveMaterialsService
  livePublication?: LivePublicationService
  liveBenefits?: LiveBenefitsPort
  liveWorkspace?: LiveWorkspaceService
  liveMedia?: CloudflareSfuMediaProvider
  liveRecording?: OwnRecordingProvider
  live?: LiveRoutesDeps
  /** Cursos ao vivo (14/10/2026): anotações da professora (fora da sala). */
  liveCourse?: LiveCourseRoutesDeps
  learning: LearningRoutesDeps
  env: Env
  logger: Logger
  accountDeletionFence: AccountDeletionFence
  /** Probe de readiness (`/readyz`): banco alcançável. */
  readiness: ReadinessProbe
  members: MembersRoutesDeps
  pensa: PensaRoutesDeps
  creations: CreationsRoutesDeps
  webhooks: WebhooksRoutesDeps
  admin: AdminRoutesDeps
  content: ContentRoutesDeps
  internal: InternalRoutesDeps
  /** "Como fazer": a biblioteca de ajuda do Kids (leitura da criança + autoria do admin). */
  help: HelpRoutesDeps
}

// Rotas que carregam o projeto do Estúdio (entrega do aluno + autoria do bloco):
// corpo muito maior que os JSONs normais. Recebem o teto `MAX_STUDIO_BODY_BYTES`;
// o resto fica no teto pequeno (anti-DoS por rota, espelha o `maxBodyBytes` da borda).
const STUDIO_SUBMISSION_PATH = /\/(studio-submission|project-check|gallery-commit)$/
const ADMIN_BLOCK_CREATE_PATH = /\/members\/admin\/lessons\/[^/]+\/blocks$/
const ADMIN_BLOCK_UPDATE_PATH = /\/members\/admin\/blocks\/[^/]+$/

/**
 * A entrega do PINTA carrega o desenho inteiro, como a do Estúdio, e usa o MESMO teto — que é o
 * do gateway (2 MB): a borda não deixa passar mais, então aceitar mais aqui só trocaria um 413
 * na frente por um 413 atrás. O teto de NEGÓCIO (`MAX_PINTA_ASSET_CHARS`) mora no service e é
 * mais apertado de propósito, para a recusa vir com mensagem em vez de código de transporte.
 */
const PINTA_SUBMISSION_PATH = /\/pinta-submission$/

// Rotas do Pensa com corpo GRANDE (conversa de turno, artefato jsonb, replace de
// tasks): o teto padrão de 64 KB barraria payloads legítimos. Teto FIXO de 1 MB
// (o gateway já capa em 512 KB na borda — este é o backstop interno, mesmo
// racional do MAX_STUDIO_BODY_BYTES).
const PENSA_CONVERSATION_PATH = /\/members\/pensa\/cycles\/[^/]+\/stages\/[^/]+\/conversation$/
const PENSA_ARTIFACT_CREATE_PATH = /\/members\/pensa\/cycles\/[^/]+\/artifacts$/
const PENSA_TASKS_REPLACE_PATH = /\/members\/pensa\/cycles\/[^/]+\/tasks$/
const MAX_PENSA_BODY_BYTES = 1024 * 1024

function bodyLimitForPath(pathname: string, env: Env): number {
  if (
    PINTA_SUBMISSION_PATH.test(pathname) ||
    STUDIO_SUBMISSION_PATH.test(pathname) ||
    ADMIN_BLOCK_CREATE_PATH.test(pathname) ||
    ADMIN_BLOCK_UPDATE_PATH.test(pathname) ||
    /^\/members\/admin\/lessons\/[^/]+\/draft$/.test(pathname) ||
    /^\/members\/admin\/lessons\/[^/]+\/import-(preview|learning)$/.test(pathname) ||
    /^\/members\/admin\/live\/programs(?:\/[^/]+)?$/.test(pathname) ||
    /^\/members\/(?:admin\/)?live\/(?:workspaces\/[^/]+\/(?:commits|accept|return)|templates)$/.test(
      pathname,
    ) ||
    // "Como fazer": rascunho com passos em markdown e o import em lote passam de 64 KB.
    /^\/members\/admin\/help\/tutorials(?:\/[^/]+|\/import)?$/.test(pathname)
  ) {
    return Math.max(env.MAX_STUDIO_BODY_BYTES, env.MAX_REQUEST_BODY_BYTES)
  }
  if (
    PENSA_CONVERSATION_PATH.test(pathname) ||
    PENSA_ARTIFACT_CREATE_PATH.test(pathname) ||
    PENSA_TASKS_REPLACE_PATH.test(pathname)
  ) {
    return Math.max(MAX_PENSA_BODY_BYTES, env.MAX_REQUEST_BODY_BYTES)
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
  const serveCeiling = Math.max(
    deps.env.MAX_REQUEST_BODY_BYTES,
    deps.env.MAX_STUDIO_BODY_BYTES,
    MAX_PENSA_BODY_BYTES,
  )
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
    .onBeforeHandle({ as: 'global' }, ({ request, headers }) =>
      assertAccountMutationAllowed({
        method: request.method,
        headers,
        fence: deps.accountDeletionFence,
      }),
    )

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
    .use(learningRoutes(deps.learning))
    .use(pensaRoutes(deps.pensa))
    .use(creationsRoutes(deps.creations))
    .use(
      creationCleanupRoutes({
        cleanup: deps.admin.creationCleanup,
        internalToken: deps.creations.internalToken,
      }),
    )
    .use(webhooksRoutes(deps.webhooks))
    .use(adminRoutes(deps.admin))
    .use(contentRoutes(deps.content))
    .use(internalRoutes(deps.internal))
    .use(helpRoutes(deps.help))
    .use(deps.live ? liveRoutes(deps.live) : new Elysia())
    .use(deps.liveCourse ? liveCourseRoutes(deps.liveCourse) : new Elysia())
    .use(
      deps.liveWorkspace
        ? liveWorkspaceRoutes({
            workspace: deps.liveWorkspace,
            internalToken: deps.env.INTERNAL_API_TOKEN,
            requireAdminEnabled: deps.env.REQUIRE_ADMIN,
          })
        : new Elysia(),
    )
    .use(
      deps.livePublication
        ? livePublicationRoutes({
            publication: deps.livePublication,
            benefits: deps.liveBenefits,
            internalToken: deps.env.INTERNAL_API_TOKEN,
          })
        : new Elysia(),
    )
    .use(
      deps.liveMaterials
        ? liveMaterialsRoutes({
            materials: deps.liveMaterials,
            internalToken: deps.env.INTERNAL_API_TOKEN,
          })
        : new Elysia(),
    )
    .use(
      deps.liveMedia
        ? liveMediaRoutes({ media: deps.liveMedia, internalToken: deps.env.INTERNAL_API_TOKEN })
        : new Elysia(),
    )
    .use(
      deps.liveRecording && deps.env.LIVE_RECORDER_TOKEN
        ? liveRecordingRoutes({
            recording: deps.liveRecording,
            token: deps.env.LIVE_RECORDER_TOKEN,
            internalToken: deps.env.INTERNAL_API_TOKEN,
          })
        : new Elysia(),
    )
}

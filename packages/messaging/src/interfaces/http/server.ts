import { swagger } from '@elysiajs/swagger'
import { PayloadTooLargeError } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { ApplyDeliveryStatusService } from '../../application/apply-delivery-status/apply-delivery-status.service'
import type { GetMessageService } from '../../application/get-message/get-message.service'
import type {
  CreateInstanceService,
  ListInstancesService,
  SetInstanceConnectionService,
  UpdateInstanceService,
} from '../../application/instances/instance-admin.service'
import type { ListMessagesService } from '../../application/list-messages/list-messages.service'
import type { SendMessageService } from '../../application/send-message/send-message.service'
import type {
  CreateSenderService,
  ListSendersService,
  UpdateSenderService,
} from '../../application/senders/sender-admin.service'
import type {
  CreateTemplateService,
  GetTemplateService,
  ListTemplatesService,
  UpdateTemplateService,
} from '../../application/templates/template-admin.service'
import type { Clock } from '../../domain/ports/clock.port'
import type { Env } from '../../infrastructure/config/env'
import type { Logger } from '../../infrastructure/logging/logger'
import type { MetricsSnapshot } from '../../infrastructure/persistence/drizzle/metrics.repository'
import { buildErrorResponse } from './error-handler'
import { isOversizeBody, markOversizeBody, storeRawBody } from './raw-body'
import { adminRoutes } from './routes/admin.routes'
import { healthRoutes, type ReadinessProbe } from './routes/health.routes'
import { metricsRoutes } from './routes/metrics.routes'
import { sendRoutes } from './routes/send.routes'
import { webhooksRoutes } from './routes/webhooks.routes'

export interface HttpDeps {
  env: Env
  logger: Logger
  clock: Clock
  readiness: ReadinessProbe
  metrics: () => Promise<MetricsSnapshot>
  sendMessage: SendMessageService
  getMessage: GetMessageService
  listMessages: ListMessagesService
  createTemplate: CreateTemplateService
  updateTemplate: UpdateTemplateService
  getTemplate: GetTemplateService
  listTemplates: ListTemplatesService
  createSender: CreateSenderService
  updateSender: UpdateSenderService
  listSenders: ListSendersService
  createInstance: CreateInstanceService
  updateInstance: UpdateInstanceService
  listInstances: ListInstancesService
  applyStatus: ApplyDeliveryStatusService
  setConnection: SetInstanceConnectionService
}

/** Rotas fora do access log (probes/scrape — só ruído). */
const ACCESS_LOG_SKIP = new Set(['/health', '/readyz', '/metrics'])
const requestStart = new WeakMap<Request, number>()

/**
 * Monta a aplicação Elysia: teto de corpo (anti-DoS; MAIOR nas rotas de webhook —
 * a SendGrid posta lotes de até 768KB) + captura do corpo bruto (para verificar
 * assinatura de webhooks), access log com X-Request-Id, tratamento central de
 * erros, Swagger (fora de produção) e as rotas (envio S2S + admin + métricas).
 */
export function createServer(deps: HttpDeps) {
  /** Teto de corpo POR ROTA: webhooks de status recebem lotes grandes do provedor. */
  const maxBytesFor = (request: Request): number =>
    new URL(request.url).pathname.startsWith('/messaging/webhooks/')
      ? deps.env.WEBHOOK_MAX_BODY_BYTES
      : deps.env.MAX_REQUEST_BODY_BYTES

  const app = new Elysia({
    // Teto no nível do Bun = o MAIOR dos dois (o fino é por rota, no onParse).
    serve: { maxRequestBodySize: deps.env.WEBHOOK_MAX_BODY_BYTES },
  })
    .onRequest(({ request }) => {
      requestStart.set(request, performance.now())
    })
    // Access log: UMA linha por request com o X-Request-Id do gateway — junta o
    // `gateway.access` com os logs deste serviço num incidente (espelha o payments).
    .onAfterResponse({ as: 'global' }, ({ request, set }) => {
      const path = new URL(request.url).pathname
      if (ACCESS_LOG_SKIP.has(path)) return
      const start = requestStart.get(request)
      deps.logger.info('http.access', {
        requestId: request.headers.get('x-request-id') ?? undefined,
        method: request.method,
        path,
        status: typeof set.status === 'number' ? set.status : (set.status ?? 200),
        durationMs: start === undefined ? undefined : Math.round(performance.now() - start),
      })
    })
    .onParse({ as: 'global' }, async ({ request, contentType }) => {
      const maxBytes = maxBytesFor(request)
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
        storeRawBody(request, text)
        return text.length > 0 ? JSON.parse(text) : {}
      }
      return undefined
    })
    // onTransform roda ANTES da validação de schema — senão o corpo gigante
    // viraria 400 (body inválido) em vez do 413 correto.
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
            title: 'Sistema Zero — Messaging API',
            version: '0.1.0',
            description:
              'Mensageria transacional (e-mail via SendGrid, WhatsApp via Evolution) com templates.',
          },
        },
      }),
    )
  }

  return app
    .use(healthRoutes(deps.readiness))
    .use(metricsRoutes(deps.metrics, deps.env.METRICS_TOKEN))
    .use(
      sendRoutes({
        sendMessage: deps.sendMessage,
        getMessage: deps.getMessage,
        internalToken: deps.env.MESSAGING_INTERNAL_TOKEN,
      }),
    )
    .use(
      adminRoutes({
        requireAdminEnabled: deps.env.REQUIRE_ADMIN,
        internalToken: deps.env.MESSAGING_INTERNAL_TOKEN,
        listMessages: deps.listMessages,
        createTemplate: deps.createTemplate,
        updateTemplate: deps.updateTemplate,
        getTemplate: deps.getTemplate,
        listTemplates: deps.listTemplates,
        createSender: deps.createSender,
        updateSender: deps.updateSender,
        listSenders: deps.listSenders,
        createInstance: deps.createInstance,
        updateInstance: deps.updateInstance,
        listInstances: deps.listInstances,
      }),
    )
    .use(
      webhooksRoutes({
        applyStatus: deps.applyStatus,
        setConnection: deps.setConnection,
        logger: deps.logger,
        clock: deps.clock,
        sendgridPublicKey: deps.env.SENDGRID_WEBHOOK_PUBLIC_KEY,
        webhookToken: deps.env.MESSAGING_WEBHOOK_TOKEN,
        timestampToleranceSeconds: deps.env.WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS,
      }),
    )
}

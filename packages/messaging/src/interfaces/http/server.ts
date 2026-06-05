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
import { buildErrorResponse } from './error-handler'
import { isOversizeBody, markOversizeBody, storeRawBody } from './raw-body'
import { adminRoutes } from './routes/admin.routes'
import { healthRoutes, type ReadinessProbe } from './routes/health.routes'
import { sendRoutes } from './routes/send.routes'
import { webhooksRoutes } from './routes/webhooks.routes'

export interface HttpDeps {
  env: Env
  logger: Logger
  clock: Clock
  readiness: ReadinessProbe
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

/**
 * Monta a aplicação Elysia: teto de corpo (anti-DoS) + captura do corpo bruto
 * (para verificar assinatura de webhooks), tratamento central de erros, Swagger
 * (fora de produção) e as rotas (envio S2S + admin).
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
        storeRawBody(request, text)
        return text.length > 0 ? JSON.parse(text) : {}
      }
      return undefined
    })
    .onBeforeHandle({ as: 'global' }, ({ request }) => {
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

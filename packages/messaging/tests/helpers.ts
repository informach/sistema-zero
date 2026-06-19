import { ApplyDeliveryStatusService } from '../src/application/apply-delivery-status/apply-delivery-status.service'
import { GetMessageService } from '../src/application/get-message/get-message.service'
import {
  CreateInstanceService,
  ListInstancesService,
  SetInstanceConnectionService,
  UpdateInstanceService,
} from '../src/application/instances/instance-admin.service'
import { ListMessagesService } from '../src/application/list-messages/list-messages.service'
import { SendMessageService } from '../src/application/send-message/send-message.service'
import {
  CreateSenderService,
  ListSendersService,
  UpdateSenderService,
} from '../src/application/senders/sender-admin.service'
import {
  CreateTemplateService,
  GetTemplateService,
  ListTemplatesService,
  UpdateTemplateService,
} from '../src/application/templates/template-admin.service'
import type { Clock } from '../src/domain/ports/clock.port'
import type { Env } from '../src/infrastructure/config/env'
import { createServer } from '../src/interfaces/http/server'
import {
  InMemoryMessageRepository,
  InMemorySenderRepository,
  InMemorySuppressionRepository,
  InMemoryTemplateRepository,
  InMemoryWebhookInbox,
  InMemoryWhatsAppInstanceRepository,
  silentLogger,
} from './fakes/in-memory'

export interface BuildAppOptions {
  requireAdmin?: boolean
  internalToken?: string
  sendgridPublicKey?: string
  webhookToken?: string
  metricsToken?: string
  maxRequestBodyBytes?: number
  webhookMaxBodyBytes?: number
  now?: Date
}

export function buildApp(opts: BuildAppOptions = {}) {
  const templates = new InMemoryTemplateRepository()
  const messages = new InMemoryMessageRepository()
  const senders = new InMemorySenderRepository()
  const instances = new InMemoryWhatsAppInstanceRepository()
  const suppressions = new InMemorySuppressionRepository()
  const webhookInbox = new InMemoryWebhookInbox()

  const clock: Clock = { now: () => opts.now ?? new Date('2026-06-03T12:00:00Z') }
  // uuid de verdade: as rotas validam `:id` com format uuid (espelha a produção).
  const idGen = () => crypto.randomUUID()

  const env = {
    NODE_ENV: 'test',
    MAX_REQUEST_BODY_BYTES: opts.maxRequestBodyBytes ?? 64 * 1024,
    WEBHOOK_MAX_BODY_BYTES: opts.webhookMaxBodyBytes ?? 2 * 1024 * 1024,
    REQUIRE_ADMIN: opts.requireAdmin ?? false,
    MESSAGING_INTERNAL_TOKEN: opts.internalToken,
    SENDGRID_WEBHOOK_PUBLIC_KEY: opts.sendgridPublicKey,
    MESSAGING_WEBHOOK_TOKEN: opts.webhookToken,
    METRICS_TOKEN: opts.metricsToken,
    WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS: 600,
  } as unknown as Env

  const app = createServer({
    env,
    logger: silentLogger,
    clock,
    readiness: async () => ({ ready: true, checks: { db: 'ok' } }),
    metrics: async () => ({
      outboxPending: 0,
      outboxDead: 0,
      outboxOldestPendingAgeSeconds: null,
      emailDue: 0,
      emailSending: 0,
      emailOldestDueAgeSeconds: null,
      whatsappDue: 0,
      whatsappSending: 0,
      whatsappOldestDueAgeSeconds: null,
    }),
    sendMessage: new SendMessageService(
      templates,
      messages,
      senders,
      suppressions,
      clock,
      idGen,
      5,
    ),
    getMessage: new GetMessageService(messages),
    listMessages: new ListMessagesService(messages),
    createTemplate: new CreateTemplateService(templates, clock, idGen),
    updateTemplate: new UpdateTemplateService(templates, clock),
    getTemplate: new GetTemplateService(templates),
    listTemplates: new ListTemplatesService(templates),
    createSender: new CreateSenderService(senders, clock, idGen),
    updateSender: new UpdateSenderService(senders, clock),
    listSenders: new ListSendersService(senders),
    createInstance: new CreateInstanceService(instances, clock, idGen),
    updateInstance: new UpdateInstanceService(instances, clock),
    listInstances: new ListInstancesService(instances),
    applyStatus: new ApplyDeliveryStatusService(messages, suppressions, webhookInbox, silentLogger),
    setConnection: new SetInstanceConnectionService(instances, clock),
  })

  return { app, templates, messages, senders, instances, suppressions, webhookInbox }
}

const ADMIN_HEADERS = { 'x-auth-user-role': 'admin', 'x-auth-user-status': 'active' }

export function postJson(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

export function patchJson(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request(`http://localhost${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

export function get(path: string, headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost${path}`, { method: 'GET', headers })
}

export const adminHeaders = ADMIN_HEADERS

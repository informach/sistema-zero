import { Elysia } from 'elysia'
import type {
  CreateInstanceService,
  ListInstancesService,
  UpdateInstanceService,
} from '../../../application/instances/instance-admin.service'
import type { ListMessagesService } from '../../../application/list-messages/list-messages.service'
import type {
  CreateSenderService,
  ListSendersService,
  UpdateSenderService,
} from '../../../application/senders/sender-admin.service'
import type {
  CreateTemplateService,
  GetTemplateService,
  ListTemplatesService,
  UpdateTemplateService,
} from '../../../application/templates/template-admin.service'
import { requireAdmin } from '../auth'
import {
  CreateInstanceBody,
  CreateSenderBody,
  CreateTemplateBody,
  ListMessagesQueryDto,
  ListQuery,
  ListTemplatesQuery,
  UpdateInstanceBody,
  UpdateSenderBody,
  UpdateTemplateBody,
} from '../dtos'

export interface AdminRoutesDeps {
  requireAdminEnabled: boolean
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
  listMessages: ListMessagesService
}

/**
 * Rotas de administração (painel). RBAC real no gateway (JWT); aqui `requireAdmin`
 * confere os `X-Auth-User-*` como defesa em profundidade. Caminho `/messaging/admin/*`.
 */
export function adminRoutes(deps: AdminRoutesDeps) {
  const guard = (headers: Record<string, string | undefined>) =>
    requireAdmin(headers, deps.requireAdminEnabled)

  return (
    new Elysia()
      // ── Templates ──────────────────────────────────────────────────────────
      .post(
        '/messaging/admin/templates',
        ({ body, headers }) => {
          guard(headers)
          return deps.createTemplate.execute(body)
        },
        { body: CreateTemplateBody },
      )
      .patch(
        '/messaging/admin/templates/:id',
        ({ params, body, headers }) => {
          guard(headers)
          return deps.updateTemplate.execute(params.id, body)
        },
        { body: UpdateTemplateBody },
      )
      .get('/messaging/admin/templates/:id', ({ params, headers }) => {
        guard(headers)
        return deps.getTemplate.execute(params.id)
      })
      .get(
        '/messaging/admin/templates',
        ({ query, headers }) => {
          guard(headers)
          return deps.listTemplates.execute({
            channel: query.channel,
            q: query.q,
            limit: query.limit ?? 20,
            offset: query.offset ?? 0,
          })
        },
        { query: ListTemplatesQuery },
      )
      // ── Remetentes de e-mail ─────────────────────────────────────────────────
      .post(
        '/messaging/admin/senders',
        ({ body, headers }) => {
          guard(headers)
          return deps.createSender.execute(body)
        },
        { body: CreateSenderBody },
      )
      .patch(
        '/messaging/admin/senders/:id',
        ({ params, body, headers }) => {
          guard(headers)
          return deps.updateSender.execute(params.id, body)
        },
        { body: UpdateSenderBody },
      )
      .get(
        '/messaging/admin/senders',
        ({ query, headers }) => {
          guard(headers)
          return deps.listSenders.execute({ limit: query.limit ?? 20, offset: query.offset ?? 0 })
        },
        { query: ListQuery },
      )
      // ── Instâncias de WhatsApp (pool de números) ─────────────────────────────
      .post(
        '/messaging/admin/whatsapp-instances',
        ({ body, headers }) => {
          guard(headers)
          return deps.createInstance.execute(body)
        },
        { body: CreateInstanceBody },
      )
      .patch(
        '/messaging/admin/whatsapp-instances/:id',
        ({ params, body, headers }) => {
          guard(headers)
          return deps.updateInstance.execute(params.id, body)
        },
        { body: UpdateInstanceBody },
      )
      .get(
        '/messaging/admin/whatsapp-instances',
        ({ query, headers }) => {
          guard(headers)
          return deps.listInstances.execute({ limit: query.limit ?? 20, offset: query.offset ?? 0 })
        },
        { query: ListQuery },
      )
      // ── Log de mensagens ─────────────────────────────────────────────────────
      .get(
        '/messaging/admin/messages',
        ({ query, headers }) => {
          guard(headers)
          return deps.listMessages.execute({
            channel: query.channel,
            status: query.status,
            limit: query.limit ?? 20,
            offset: query.offset ?? 0,
          })
        },
        { query: ListMessagesQueryDto },
      )
  )
}

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
  IdParams,
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
 * confere os `X-Auth-User-*` como defesa em profundidade, com a MESMA distinção
 * leitura (staff+) / escrita (admin+) do gateway. Caminho `/messaging/admin/*`.
 */
export function adminRoutes(deps: AdminRoutesDeps) {
  const read = (headers: Record<string, string | undefined>) =>
    requireAdmin(headers, deps.requireAdminEnabled)
  const write = (headers: Record<string, string | undefined>) =>
    requireAdmin(headers, deps.requireAdminEnabled, { write: true })

  return (
    new Elysia()
      // ── Templates ──────────────────────────────────────────────────────────
      .post(
        '/messaging/admin/templates',
        ({ body, headers }) => {
          write(headers)
          return deps.createTemplate.execute(body)
        },
        { body: CreateTemplateBody },
      )
      .patch(
        '/messaging/admin/templates/:id',
        ({ params, body, headers }) => {
          write(headers)
          return deps.updateTemplate.execute(params.id, body)
        },
        { params: IdParams, body: UpdateTemplateBody },
      )
      .get(
        '/messaging/admin/templates/:id',
        ({ params, headers }) => {
          read(headers)
          return deps.getTemplate.execute(params.id)
        },
        { params: IdParams },
      )
      .get(
        '/messaging/admin/templates',
        ({ query, headers }) => {
          read(headers)
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
          write(headers)
          return deps.createSender.execute(body)
        },
        { body: CreateSenderBody },
      )
      .patch(
        '/messaging/admin/senders/:id',
        ({ params, body, headers }) => {
          write(headers)
          return deps.updateSender.execute(params.id, body)
        },
        { params: IdParams, body: UpdateSenderBody },
      )
      .get(
        '/messaging/admin/senders',
        ({ query, headers }) => {
          read(headers)
          return deps.listSenders.execute({ limit: query.limit ?? 20, offset: query.offset ?? 0 })
        },
        { query: ListQuery },
      )
      // ── Instâncias de WhatsApp (pool de números) ─────────────────────────────
      .post(
        '/messaging/admin/whatsapp-instances',
        ({ body, headers }) => {
          write(headers)
          return deps.createInstance.execute(body)
        },
        { body: CreateInstanceBody },
      )
      .patch(
        '/messaging/admin/whatsapp-instances/:id',
        ({ params, body, headers }) => {
          write(headers)
          return deps.updateInstance.execute(params.id, body)
        },
        { params: IdParams, body: UpdateInstanceBody },
      )
      .get(
        '/messaging/admin/whatsapp-instances',
        ({ query, headers }) => {
          read(headers)
          return deps.listInstances.execute({ limit: query.limit ?? 20, offset: query.offset ?? 0 })
        },
        { query: ListQuery },
      )
      // ── Log de mensagens ─────────────────────────────────────────────────────
      .get(
        '/messaging/admin/messages',
        ({ query, headers }) => {
          read(headers)
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

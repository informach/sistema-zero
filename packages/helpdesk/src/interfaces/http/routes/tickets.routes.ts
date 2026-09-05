import { Elysia } from 'elysia'
import type { TicketAiService } from '../../../application/ai/ticket-ai.service'
import type { ReplyService } from '../../../application/tickets/reply.service'
import type { TicketService } from '../../../application/tickets/ticket.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
import {
  DeliveryDiscardBody,
  DeliveryParams,
  IdParams,
  NoteBody,
  ReplyBody,
  TicketPatchBody,
  TicketsQuery,
} from '../dtos'

export interface TicketsRoutesDeps {
  tickets: TicketService
  reply: ReplyService
  ai: TicketAiService
  internalToken?: string
  requireStaffEnabled: boolean
}

/** Caixa de entrada: listagem, detalhe (thread), edição, resposta e notas. */
export function ticketsRoutes(deps: TicketsRoutesDeps) {
  return (
    new Elysia()
      .onBeforeHandle(({ headers }) => {
        assertInternalCaller(headers['x-internal-token'], deps.internalToken)
        requireStaff(headers, deps.requireStaffEnabled)
      })
      .get(
        '/helpdesk/tickets',
        ({ query }) =>
          deps.tickets.list({
            status: query.status,
            category: query.category,
            sla: query.sla,
            assignment: query.assignment,
            queue: query.queue,
            q: query.q,
            limit: query.limit ?? 50,
            cursor: query.cursor,
          }),
        { query: TicketsQuery },
      )
      // ANTES de `/:id` (rota estática vence a paramétrica; o `stats` nunca casa o UUID).
      .get('/helpdesk/tickets/stats', () => deps.tickets.stats())
      .get('/helpdesk/tickets/:id', ({ params }) => deps.tickets.byId(params.id), {
        params: IdParams,
      })
      .patch(
        '/helpdesk/tickets/:id',
        ({ headers, params, body }) => deps.tickets.patch(resolveActor(headers), params.id, body),
        { params: IdParams, body: TicketPatchBody },
      )
      .post(
        '/helpdesk/tickets/:id/reply',
        ({ headers, params, body }) => deps.reply.reply(resolveActor(headers), params.id, body),
        { params: IdParams, body: ReplyBody },
      )
      .post(
        '/helpdesk/tickets/:id/deliveries/:messageId/reconcile',
        ({ params }) => deps.reply.reconcileDelivery(params.id, params.messageId),
        { params: DeliveryParams },
      )
      .post(
        '/helpdesk/tickets/:id/deliveries/:messageId/mark-failed',
        ({ params }) => deps.reply.markDeliveryFailed(params.id, params.messageId),
        { params: DeliveryParams, body: DeliveryDiscardBody },
      )
      .post(
        '/helpdesk/tickets/:id/notes',
        async ({ headers, params, body, set }) => {
          set.status = 201
          return {
            message: await deps.tickets.addNote(resolveActor(headers), params.id, body.body),
          }
        },
        { params: IdParams, body: NoteBody },
      )
      // IA on-demand: re-classifica/resume (síncrono, sem depender do worker).
      .post('/helpdesk/tickets/:id/summarize', ({ params }) => deps.ai.summarize(params.id), {
        params: IdParams,
      })
      .post(
        '/helpdesk/tickets/:id/draft/regenerate',
        ({ params }) => deps.ai.regenerateDraft(params.id),
        { params: IdParams },
      )
  )
}

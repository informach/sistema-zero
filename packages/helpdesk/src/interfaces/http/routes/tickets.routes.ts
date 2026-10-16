import { Elysia, t } from 'elysia'
import type { AutomationService } from '../../../application/ai/automation.service'
import type { KnowledgeAnswerService } from '../../../application/ai/knowledge-answer.service'
import type { TicketAiService } from '../../../application/ai/ticket-ai.service'
import type { ReplyService } from '../../../application/tickets/reply.service'
import type { TicketService } from '../../../application/tickets/ticket.service'
import { TicketNotFoundError } from '../../../domain/helpdesk-errors'
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
  answers: KnowledgeAnswerService
  automation: AutomationService
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
            handlingMode: query.handlingMode,
            status: query.status,
            category: query.category,
            triage: query.triage,
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
      .get('/helpdesk/tickets/:id/runs', ({ params }) => deps.answers.runs.byTicket(params.id), {
        params: IdParams,
      })
      .post(
        '/helpdesk/tickets/:id/takeover',
        ({ headers, params, body }) =>
          deps.automation.takeover(
            resolveActor(headers),
            params.id,
            body.version,
            body.idempotencyKey,
          ),
        {
          params: IdParams,
          body: t.Object(
            { version: t.Integer({ minimum: 0 }), idempotencyKey: t.String({ format: 'uuid' }) },
            { additionalProperties: false },
          ),
        },
      )
      .get(
        '/helpdesk/tickets/:id/messages',
        ({ params, query }) =>
          deps.tickets.page(params.id, {
            limit: query.limit ?? 50,
            before: query.before,
            after: query.after,
          }),
        {
          params: IdParams,
          query: t.Object({
            limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50 })),
            before: t.Optional(t.String({ maxLength: 256 })),
            after: t.Optional(t.String({ maxLength: 256 })),
          }),
        },
      )
      .get('/helpdesk/tickets/:id', ({ params }) => deps.tickets.byId(params.id), {
        params: IdParams,
      })
      .get(
        '/helpdesk/tickets/:id/runs/:runId',
        async ({ params }) => {
          const run = await deps.answers.runs.byId(params.runId)
          if (!run || run.ticketId !== params.id) throw new TicketNotFoundError()
          return run
        },
        {
          params: t.Object({
            id: t.String({ format: 'uuid' }),
            runId: t.String({ format: 'uuid' }),
          }),
        },
      )
      .post(
        '/helpdesk/tickets/:id/feedback',
        async ({ params, headers, body }) => {
          const recorded = await deps.answers.runs.feedback({
            ...body,
            ticketId: params.id,
            actorId: resolveActor(headers).userId,
            reason: body.reason ?? null,
            at: new Date(),
          })
          if (!recorded) throw new TicketNotFoundError()
          return { recorded }
        },
        {
          params: IdParams,
          body: t.Object(
            {
              runId: t.String({ format: 'uuid' }),
              kind: t.Union([t.Literal('inserted'), t.Literal('rejected')]),
              reason: t.Optional(t.String({ maxLength: 500 })),
            },
            { additionalProperties: false },
          ),
        },
      )
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

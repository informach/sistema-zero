import { Elysia } from 'elysia'
import type { ReplyService } from '../../../application/tickets/reply.service'
import type { TicketService } from '../../../application/tickets/ticket.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
import { IdParams, NoteBody, ReplyBody, TicketPatchBody, TicketsQuery } from '../dtos'

export interface TicketsRoutesDeps {
  tickets: TicketService
  reply: ReplyService
  internalToken?: string
  requireStaffEnabled: boolean
}

/** Caixa de entrada: listagem, detalhe (thread), edição, resposta e notas. */
export function ticketsRoutes(deps: TicketsRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, deps.requireStaffEnabled)
    })
    .get(
      '/helpdesk/tickets',
      async ({ query }) => {
        const offset = query.offset ?? 0
        const page = await deps.tickets.list({
          status: query.status,
          category: query.category,
          q: query.q,
          limit: query.limit ?? 50,
          offset,
        })
        return { ...page, hasMore: offset + page.items.length < page.total }
      },
      { query: TicketsQuery },
    )
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
      '/helpdesk/tickets/:id/notes',
      async ({ headers, params, body, set }) => {
        set.status = 201
        return { message: await deps.tickets.addNote(resolveActor(headers), params.id, body.body) }
      },
      { params: IdParams, body: NoteBody },
    )
}

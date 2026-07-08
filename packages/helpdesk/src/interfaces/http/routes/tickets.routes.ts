import { Elysia } from 'elysia'
import type { TicketService } from '../../../application/tickets/ticket.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
import { IdParams, TicketPatchBody, TicketsQuery } from '../dtos'

export interface TicketsRoutesDeps {
  tickets: TicketService
  internalToken?: string
  requireStaffEnabled: boolean
}

/** Caixa de entrada: listagem, detalhe (thread completa) e edição do ticket. */
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
}

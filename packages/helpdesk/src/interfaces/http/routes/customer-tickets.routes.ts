import { Elysia } from 'elysia'
import type { CustomerTicketService } from '../../../application/tickets/customer-ticket.service'
import { assertInternalCaller, resolveCustomer } from '../auth'
import {
  CustomerTicketCreateBody,
  CustomerTicketMessageBody,
  CustomerTicketsQuery,
  IdParams,
} from '../dtos'

export interface CustomerTicketsRoutesDeps {
  tickets: CustomerTicketService
  internalToken?: string
}

/** Portal do responsável: tickets próprios e mensagens visíveis ao cliente. */
export function customerTicketsRoutes(deps: CustomerTicketsRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      resolveCustomer(headers)
    })
    .get(
      '/helpdesk/portal/tickets',
      async ({ headers, query }) => {
        const requester = resolveCustomer(headers)
        return deps.tickets.list(requester, {
          status: query.status,
          limit: query.limit ?? 20,
          cursor: query.cursor,
        })
      },
      { query: CustomerTicketsQuery },
    )
    .post(
      '/helpdesk/portal/tickets',
      async ({ headers, body, set }) => {
        set.status = 201
        return deps.tickets.create(resolveCustomer(headers), body)
      },
      { body: CustomerTicketCreateBody },
    )
    .get(
      '/helpdesk/portal/tickets/:id',
      ({ headers, params }) => deps.tickets.byId(resolveCustomer(headers), params.id),
      { params: IdParams },
    )
    .post(
      '/helpdesk/portal/tickets/:id/messages',
      ({ headers, params, body }) =>
        deps.tickets.addMessage(resolveCustomer(headers), params.id, body.body),
      { params: IdParams, body: CustomerTicketMessageBody },
    )
}

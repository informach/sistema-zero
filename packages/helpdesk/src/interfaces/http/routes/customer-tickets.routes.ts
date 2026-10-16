import { Elysia, t } from 'elysia'
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
    .get(
      '/helpdesk/portal/tickets/:id/messages',
      ({ headers, params, query }) =>
        deps.tickets.page(resolveCustomer(headers), params.id, {
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
    .post(
      '/helpdesk/portal/tickets/:id/handoff',
      ({ headers, params, body }) =>
        deps.tickets.command(resolveCustomer(headers), params.id, 'handoff', body.idempotencyKey),
      {
        params: IdParams,
        body: t.Object(
          { idempotencyKey: t.String({ format: 'uuid' }) },
          { additionalProperties: false },
        ),
      },
    )
    .post(
      '/helpdesk/portal/tickets/:id/resolve',
      ({ headers, params, body }) =>
        deps.tickets.command(resolveCustomer(headers), params.id, 'resolve', body.idempotencyKey),
      {
        params: IdParams,
        body: t.Object(
          { idempotencyKey: t.String({ format: 'uuid' }) },
          { additionalProperties: false },
        ),
      },
    )
    .get(
      '/helpdesk/portal/tickets/:id/sources/:citationId',
      ({ headers, params }) =>
        deps.tickets.source(resolveCustomer(headers), params.id, params.citationId),
      {
        params: t.Object({
          id: t.String({ format: 'uuid' }),
          citationId: t.String({ format: 'uuid' }),
        }),
      },
    )
    .post(
      '/helpdesk/portal/tickets/:id/messages',
      ({ headers, params, body }) =>
        deps.tickets.addMessage(
          resolveCustomer(headers),
          params.id,
          body.body,
          body.idempotencyKey,
        ),
      { params: IdParams, body: CustomerTicketMessageBody },
    )
}

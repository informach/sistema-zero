import { Elysia } from 'elysia'
import type { ConnectionService } from '../../../application/connection/connection.service'
import { assertInternalCaller, requireStaff } from '../auth'

export interface ConnectionRoutesDeps {
  connection: ConnectionService
  internalToken?: string
  requireStaffEnabled: boolean
}

/** Estado da conexão Gmail (a view NUNCA expõe tokens). */
export function connectionRoutes(deps: ConnectionRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, deps.requireStaffEnabled)
    })
    .get('/helpdesk/connection', () => deps.connection.status())
}

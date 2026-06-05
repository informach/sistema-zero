import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { BatchGetUsersService } from '../../../application/admin/batch-get-users/batch-get-users.service'
import type { CreateUserService } from '../../../application/admin/create-user/create-user.service'
import type { GetUserService } from '../../../application/admin/get-user/get-user.service'
import type { ListUsersService } from '../../../application/admin/list-users/list-users.service'
import type { UpdateUserService } from '../../../application/admin/update-user/update-user.service'
import { UserNotFoundError } from '../../../domain/user/user.errors'
import type { UserRole } from '../../../domain/user/user.role'
import { type GatewayActor, resolveGatewayActor } from '../auth'
import {
  BatchGetUsersBody,
  CreateUserBody,
  ListUsersQuery,
  UpdateUserBody,
  UserIdParams,
} from '../dtos'
import { PayloadTooLargeError } from '../errors'
import { requireInternalToken } from '../internal-auth'
import { isOversizeBody } from '../raw-body'

export interface AdminRoutesDeps {
  listUsers: ListUsersService
  getUser: GetUserService
  createUser: CreateUserService
  updateUser: UpdateUserService
  batchGetUsers: BatchGetUsersService
  /**
   * `AUTH_INTERNAL_TOKEN` — o gateway o injeta TAMBÉM nas rotas admin (igual ao
   * members/catalog): é o que prova que os `X-Auth-User-*` vieram do gateway.
   * Sem essa checagem, quem alcançasse o serviço direto na rede interna forjaria
   * a identidade de superadmin só com headers.
   */
  internalToken: string | undefined
}

// Papéis aceitos por operação (re-checagem na borda; o gateway já barra antes).
// LEITURA aceita staff; ESCRITA (edição) afina para superadmin/admin (o caso de uso
// ainda aplica os guards hierárquicos sobre isso).
const READ_ROLES: readonly UserRole[] = ['superadmin', 'admin', 'staff']
const WRITE_ROLES: readonly UserRole[] = ['superadmin', 'admin']

/**
 * Rotas admin de usuários (painel `@sistemazero/admin`). O gateway já verificou o
 * JWT + RBAC e injetou `X-Auth-User-*`; aqui RE-CHECAMOS papel/status (defesa em
 * profundidade) e usamos a identidade do ator nos guards de edição.
 */
export function adminRoutes(deps: AdminRoutesDeps) {
  // Ator = token interno do gateway (anti-spoof dos X-Auth-User-*) + papel/status.
  const requireActor = (
    headers: Record<string, string | undefined>,
    allowed: readonly UserRole[],
  ): GatewayActor => {
    requireInternalToken(headers, deps.internalToken)
    const actor = resolveGatewayActor(headers)
    if (!actor) throw new UnauthorizedError('Identidade do gateway ausente')
    if (!allowed.includes(actor.role)) {
      throw new ForbiddenError('Sem permissão para esta operação')
    }
    if (actor.status !== 'active') throw new ForbiddenError('Conta sem acesso (status)')
    return actor
  }

  return new Elysia({ prefix: '/auth/admin' })
    .get(
      '/users',
      async ({ headers, query }) => {
        requireActor(headers, READ_ROLES)
        return deps.listUsers.execute({
          q: query.q,
          role: query.role,
          status: query.status,
          limit: query.limit ?? 20,
          offset: query.offset ?? 0,
        })
      },
      { query: ListUsersQuery },
    )
    .post(
      '/users',
      async ({ headers, body, request, set }) => {
        if (isOversizeBody(request)) throw new PayloadTooLargeError()
        const actor = requireActor(headers, WRITE_ROLES)
        const result = await deps.createUser.execute({
          actor: { id: actor.id, role: actor.role },
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
          role: body.role,
        })
        set.status = 201
        return result
      },
      { body: CreateUserBody },
    )
    .post(
      '/users/batch',
      async ({ headers, body, request }) => {
        if (isOversizeBody(request)) throw new PayloadTooLargeError()
        requireActor(headers, READ_ROLES)
        return deps.batchGetUsers.execute(body.ids)
      },
      { body: BatchGetUsersBody },
    )
    .get(
      '/users/:id',
      async ({ headers, params }) => {
        requireActor(headers, READ_ROLES)
        const user = await deps.getUser.execute(params.id)
        if (!user) throw new UserNotFoundError()
        return { user }
      },
      { params: UserIdParams },
    )
    .patch(
      '/users/:id',
      async ({ headers, params, body, request }) => {
        if (isOversizeBody(request)) throw new PayloadTooLargeError()
        const actor = requireActor(headers, WRITE_ROLES)
        const user = await deps.updateUser.execute({
          targetId: params.id,
          actor: { id: actor.id, role: actor.role },
          changes: {
            role: body.role,
            status: body.status,
            firstName: body.firstName,
            lastName: body.lastName,
            phone: body.phone,
          },
          expectedVersion: body.version,
        })
        return { user }
      },
      { body: UpdateUserBody, params: UserIdParams },
    )
}

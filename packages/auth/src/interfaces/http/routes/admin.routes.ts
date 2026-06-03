import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { GetUserService } from '../../../application/admin/get-user/get-user.service'
import type { ListUsersService } from '../../../application/admin/list-users/list-users.service'
import type { UpdateUserService } from '../../../application/admin/update-user/update-user.service'
import { UserNotFoundError } from '../../../domain/user/user.errors'
import type { UserRole } from '../../../domain/user/user.role'
import { type GatewayActor, resolveGatewayActor } from '../auth'
import { ListUsersQuery, UpdateUserBody } from '../dtos'

export interface AdminRoutesDeps {
  listUsers: ListUsersService
  getUser: GetUserService
  updateUser: UpdateUserService
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
    .get('/users/:id', async ({ headers, params }) => {
      requireActor(headers, READ_ROLES)
      const user = await deps.getUser.execute(params.id)
      if (!user) throw new UserNotFoundError()
      return { user }
    })
    .patch(
      '/users/:id',
      async ({ headers, params, body }) => {
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
      { body: UpdateUserBody },
    )
}

/**
 * Exige um ator ativo (resolvido dos headers do gateway) cujo papel esteja em
 * `allowed`. Lança 401 (sem identidade) ou 403 (papel/status insuficiente) — o
 * gateway já barra, mas re-checamos na borda do serviço.
 */
function requireActor(
  headers: Record<string, string | undefined>,
  allowed: readonly UserRole[],
): GatewayActor {
  const actor = resolveGatewayActor(headers)
  if (!actor) throw new UnauthorizedError('Identidade do gateway ausente')
  if (!allowed.includes(actor.role)) {
    throw new ForbiddenError('Sem permissão para esta operação')
  }
  if (actor.status !== 'active') throw new ForbiddenError('Conta sem acesso (status)')
  return actor
}

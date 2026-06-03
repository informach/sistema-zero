import 'server-only'
import type { Paginated, UserView } from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from './gateway'

export interface ListUsersParams {
  q?: string
  role?: string
  status?: string
  limit?: number
  offset?: number
}

/** Lista usuários (admin) via gateway: `GET /auth/admin/users` (JWT + RBAC). */
export function listUsers(p: ListUsersParams): Promise<GatewayResponse<Paginated<UserView>>> {
  return gatewayFetch('/auth/admin/users', {
    query: { q: p.q, role: p.role, status: p.status, limit: p.limit, offset: p.offset },
  })
}

/** Edita status/papel/perfil de um usuário (admin): `PATCH /auth/admin/users/:id`. */
export function updateUser(
  id: string,
  body: unknown,
): Promise<GatewayResponse<{ user: UserView }>> {
  return gatewayFetch(`/auth/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body })
}

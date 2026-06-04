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

/**
 * Cria um usuário pelo painel (fluxo CONVITE — sem senha; o auth gera uma aleatória
 * e envia o e-mail de definição): `POST /auth/admin/users`. `inviteSent: false`
 * sinaliza que a conta foi criada mas o e-mail falhou (reenvie via "esqueci a senha").
 */
export function createUser(
  body: unknown,
): Promise<GatewayResponse<{ user: UserView; inviteSent: boolean }>> {
  return gatewayFetch('/auth/admin/users', { method: 'POST', body })
}

/** Edita status/papel/perfil de um usuário (admin): `PATCH /auth/admin/users/:id`. */
export function updateUser(
  id: string,
  body: unknown,
): Promise<GatewayResponse<{ user: UserView }>> {
  return gatewayFetch(`/auth/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body })
}

/** Detalhe de um usuário (admin): `GET /auth/admin/users/:id`. */
export function getUser(id: string): Promise<GatewayResponse<{ user: UserView }>> {
  return gatewayFetch(`/auth/admin/users/${encodeURIComponent(id)}`)
}

/**
 * Hidratação de identidade em LOTE: `POST /auth/admin/users/batch` (≤100 ids).
 * Usada pela área de membros (lista userIds, precisa de nome/email) — evita N+1.
 */
export function batchGetUsers(ids: string[]): Promise<GatewayResponse<{ users: UserView[] }>> {
  return gatewayFetch('/auth/admin/users/batch', { method: 'POST', body: { ids } })
}

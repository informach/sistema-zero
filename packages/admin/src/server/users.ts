import 'server-only'
import type { AuditLogPage, Paginated, UserView } from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from './gateway'

export interface ListUsersParams {
  q?: string
  role?: string
  status?: string
  source?: string
  createdFrom?: string
  createdTo?: string
  limit?: number
  offset?: number
}

/** Lista usuários (admin) via gateway: `GET /auth/admin/users` (JWT + RBAC). */
export function listUsers(p: ListUsersParams): Promise<GatewayResponse<Paginated<UserView>>> {
  return gatewayFetch('/auth/admin/users', {
    query: {
      q: p.q,
      role: p.role,
      status: p.status,
      source: p.source,
      createdFrom: p.createdFrom,
      createdTo: p.createdTo,
      limit: p.limit,
      offset: p.offset,
    },
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

/** Perfil (estilo Netflix) de uma conta — só o que o painel exibe. */
export interface AdminProfile {
  id: string
  name: string
  avatarUrl: string | null
  whatsapp: string | null
  sortOrder: number
}

/** Perfis (estilo Netflix) de uma conta (admin): `GET /auth/admin/users/:id/profiles`. */
export function getUserProfiles(
  id: string,
): Promise<GatewayResponse<{ profiles: AdminProfile[] }>> {
  return gatewayFetch(`/auth/admin/users/${encodeURIComponent(id)}/profiles`)
}

/**
 * Hidratação de identidade em LOTE: `POST /auth/admin/users/batch` (≤100 ids).
 * Usada pela área de membros (lista userIds, precisa de nome/email) — evita N+1.
 */
export function batchGetUsers(ids: string[]): Promise<GatewayResponse<{ users: UserView[] }>> {
  return gatewayFetch('/auth/admin/users/batch', { method: 'POST', body: { ids } })
}

export interface ListAuditParams {
  actorId?: string
  action?: string
  targetId?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

/** Trilha de auditoria (admin): `GET /auth/admin/audit` (JWT + RBAC, admin+). */
export function listAudit(p: ListAuditParams): Promise<GatewayResponse<AuditLogPage>> {
  return gatewayFetch('/auth/admin/audit', {
    query: {
      actorId: p.actorId,
      action: p.action,
      targetId: p.targetId,
      from: p.from,
      to: p.to,
      limit: p.limit,
      offset: p.offset,
    },
  })
}

/**
 * "Entrar como" (impersonação p/ suporte): `POST /auth/admin/users/:id/impersonate`.
 * O auth re-checa a matriz (admin só customer/staff) e devolve o token de HANDOFF
 * single-use (~60s) + a URL base da plataforma — o client abre
 * `<communityUrl>/impersonar?token=...` em nova aba. `platform: 'kids'` →
 * a URL devolvida é a do app kids (mesmo token/exchange; muda só o destino).
 */
export function impersonateUser(
  id: string,
  platform?: 'main' | 'kids',
): Promise<GatewayResponse<{ token: string; expiresAt: string; communityUrl: string }>> {
  const query = platform === 'kids' ? '?platform=kids' : ''
  return gatewayFetch(`/auth/admin/users/${encodeURIComponent(id)}/impersonate${query}`, {
    method: 'POST',
  })
}

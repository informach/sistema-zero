import 'server-only'
import type { AuditLogPage, Paginated, UserView } from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from './gateway'
import { r2DeleteUgcPrefixes } from './r2'
import { executeUserDeletion } from './user-deletion'

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

export interface AdminBatchProfile {
  id: string
  accountUserId: string
  name: string
  publicProfileEnabled: boolean
}

/** Identidade mínima de perfis kids, inclusive arquivados, em lote (≤100 ids por chamada). */
export function batchGetProfiles(
  ids: string[],
): Promise<GatewayResponse<{ profiles: AdminBatchProfile[] }>> {
  return gatewayFetch('/auth/admin/profiles/batch', { method: 'POST', body: { ids } })
}

/**
 * Exclui um usuário EM CASCATA (limpeza de contas de teste/lixo). Orquestra, via
 * gateway, a purga dos dados do aprendiz ANTES de apagar a identidade — a ordem
 * minimiza o estado órfão e mantém o retry seguro (todos os passos são idempotentes):
 *  1) bloqueia a conta no Auth e captura todos os perfis, inclusive arquivados;
 *  2) tenta apagar no R2 os blobs `creations/<conta|perfil>/…` (best-effort);
 *  3) purga em members e instala, na mesma transação, a cerca + o job R2 pós-TTL;
 *  4) purga em hub (reações/leitura/mutes-bans);
 *  5) tenta de novo a limpeza R2 para reduzir o resíduo imediato;
 *  6) apaga a identidade no auth (tokens + perfis + usuário) — POR ÚLTIMO.
 * Financeiro (payments) e fiscal (NFS-e) são RETIDOS (decisão). Só superadmin (o
 * gateway e o auth re-checam). Falha de upstream aborta; a conta já bloqueada
 * continua segura para nova tentativa idempotente. Falha R2 fica no job durável.
 */
export async function deleteUser(id: string): Promise<GatewayResponse> {
  return executeUserDeletion(id, {
    gatewayFetch,
    purgeCreationBlobs: (userIds) =>
      r2DeleteUgcPrefixes(userIds.map((userId) => `creations/${userId}/`)),
  })
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

/**
 * Reenvia o CONVITE (link de 1º acesso): `POST /auth/admin/users/:id/resend-invite`.
 * Regenera o token de definição de senha (TTL longo — 14 dias) e reenvia o e-mail
 * `welcome`. Para cliente cujo link expirou / ainda não definiu a senha. `platform`
 * escolhe a base do link (`kids` → app kids). `sent: false` = e-mail não saiu
 * (conta inativa ou falha do messaging).
 */
export function resendInvite(
  id: string,
  platform?: 'main' | 'kids',
): Promise<GatewayResponse<{ sent: boolean }>> {
  const query = platform === 'kids' ? '?platform=kids' : ''
  return gatewayFetch(`/auth/admin/users/${encodeURIComponent(id)}/resend-invite${query}`, {
    method: 'POST',
  })
}

/**
 * Define a senha MANUALMENTE (suporte): `POST /auth/admin/users/:id/set-password`.
 * O auth troca o hash (carimba `passwordSetAt` → destrava login por código + área
 * dos pais) e revoga as sessões do alvo. O operador informa a senha ao cliente por
 * fora. Guards de papel (não-self, alvo não-admin/superadmin) são re-checados no auth.
 */
export function setUserPassword(
  id: string,
  password: string,
): Promise<GatewayResponse<{ ok: true }>> {
  return gatewayFetch(`/auth/admin/users/${encodeURIComponent(id)}/set-password`, {
    method: 'POST',
    body: { password },
  })
}

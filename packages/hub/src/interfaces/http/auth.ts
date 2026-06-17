import { timingSafeEqual } from 'node:crypto'
import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import type { Actor } from '../../application/access/access-resolution.service'

/**
 * Papéis com acesso ao painel admin. O RBAC REAL é do gateway (JWT + `authorize.roles`);
 * aqui conferimos os headers `X-Auth-User-*` confiáveis injetados pelo gateway — defesa
 * em profundidade (o serviço nunca deve ser exposto direto, só atrás do gateway).
 */
const ADMIN_ROLES = new Set(['superadmin', 'admin', 'staff'])

/**
 * Garante que a requisição vem de um admin/staff ativo. Desligada (`requireAdminEnabled=false`,
 * dev fora do gateway) → passa direto. Espelha o `requireAdmin` do members/catalog.
 */
export function requireAdmin(
  headers: Record<string, string | undefined>,
  requireAdminEnabled: boolean,
): void {
  if (!requireAdminEnabled) return
  const role = headers['x-auth-user-role']
  if (!role) throw new UnauthorizedError('Autenticação necessária')
  // O gateway SEMPRE injeta `x-auth-user-status=active`; a AUSÊNCIA indica chamada
  // que não passou pela borda → trata como inativo (espelha o members).
  if (headers['x-auth-user-status'] !== 'active') throw new ForbiddenError('Conta inativa')
  if (!ADMIN_ROLES.has(role)) throw new ForbiddenError('Permissão insuficiente')
}

/**
 * Equipe interna (superadmin/admin/staff): bypass de acesso E de pré-moderação na
 * comunidade. O header `x-auth-user-role` é confiável pelo mesmo motivo do
 * `x-auth-user-id`: o gateway o injeta após verificar o JWT (e o `x-internal-token`
 * prova a origem). Espelha o `isPrivilegedActor` do members.
 */
const PRIVILEGED_ROLES = new Set(['superadmin', 'admin', 'staff'])

/**
 * Requisição vem de equipe interna ATIVA? Exige `x-auth-user-status=active` (o gateway
 * sempre o injeta; ausência = não passou pela borda → sem bypass de privilégio).
 */
export function isPrivilegedActor(headers: Record<string, string | undefined>): boolean {
  const role = headers['x-auth-user-role']
  return (
    headers['x-auth-user-status'] === 'active' && role !== undefined && PRIVILEGED_ROLES.has(role)
  )
}

/** Papel do ator (de `x-auth-user-role`), ou `undefined`. */
export function actorRole(headers: Record<string, string | undefined>): string | undefined {
  return headers['x-auth-user-role']
}

/**
 * Identidade confiável do usuário. O gateway VERIFICA o JWT e injeta `x-auth-user-id`
 * (removendo qualquer um de entrada — anti-spoof), então o serviço só lê o header.
 * Em dev/local sem gateway, passe o header manualmente. Ausente → 401.
 */
export function resolveUserId(headers: Record<string, string | undefined>): string {
  const id = headers['x-auth-user-id']
  if (!id || id.trim().length === 0) {
    throw new UnauthorizedError('Identidade ausente (x-auth-user-id)')
  }
  return id
}

/**
 * Conta do responsável para resolver o ACESSO (matrícula). Em sessão de PERFIL o
 * gateway injeta `x-auth-account-id` (a conta) além do `x-auth-user-id` (o perfil,
 * usado p/ AUTORIA). Ausente → cai no `x-auth-user-id` (a conta É o id), compat.
 */
export function resolveAccountId(headers: Record<string, string | undefined>): string {
  const account = headers['x-auth-account-id']
  if (account && account.trim().length > 0) return account.trim()
  return resolveUserId(headers)
}

/** Monta o ator confiável a partir dos headers `X-Auth-User-*` (gateway). */
export function resolveActor(headers: Record<string, string | undefined>): Actor {
  return {
    userId: resolveUserId(headers),
    accountId: resolveAccountId(headers),
    role: headers['x-auth-user-role'],
    status: headers['x-auth-user-status'],
    privileged: isPrivilegedActor(headers),
  }
}

/** Comparação em tempo constante (evita timing attack no token interno). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/**
 * Defesa em profundidade: confirma que a chamada veio do gateway. O gateway injeta
 * `x-internal-token` (header-inject, sobrescrevendo qualquer valor do cliente); o
 * hub o exige nas rotas do aluno e admin. Sem `expected` (dev/local sem gateway) → no-op.
 */
export function assertInternalCaller(
  provided: string | undefined,
  expected: string | undefined,
): void {
  if (!expected) return
  if (!provided || !safeEqual(provided, expected)) {
    throw new UnauthorizedError('Chamada não autorizada (token interno ausente/inválido)')
  }
}

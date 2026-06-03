import { timingSafeEqual } from 'node:crypto'
import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'

const ADMIN_ROLES = new Set(['superadmin', 'admin', 'staff'])

type Headers = Record<string, string | undefined>

/**
 * Defesa em profundidade do admin: o RBAC real é do gateway (JWT), que injeta
 * `X-Auth-User-*` confiável. Aqui conferimos o papel/estado desses headers. Em
 * dev (fora do gateway) a checagem pode ser desligada (`requireAdminEnabled=false`).
 */
export function requireAdmin(headers: Headers, requireAdminEnabled: boolean): void {
  if (!requireAdminEnabled) return
  const role = headers['x-auth-user-role']
  if (!role) throw new UnauthorizedError('Autenticação necessária')
  const status = headers['x-auth-user-status']
  if (status && status !== 'active') throw new ForbiddenError('Conta inativa')
  if (!ADMIN_ROLES.has(role)) throw new ForbiddenError('Permissão insuficiente')
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/**
 * Rotas de ENVIO (S2S): o gateway injeta `x-internal-token` (espelha o members).
 * Quando o token não está configurado (dev), a checagem é desligada.
 */
export function requireInternalToken(headers: Headers, expected: string | undefined): void {
  if (!expected) return
  const provided = headers['x-internal-token']
  if (!provided || !safeEqual(provided, expected)) {
    throw new UnauthorizedError('Token interno inválido')
  }
}

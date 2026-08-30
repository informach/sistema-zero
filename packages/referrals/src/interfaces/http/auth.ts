import { timingSafeEqual } from 'node:crypto'
import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'

const ADMIN_ROLES = new Set(['superadmin', 'admin', 'staff'])
const ADMIN_WRITE_ROLES = new Set(['superadmin', 'admin'])

/**
 * Defesa em profundidade das rotas admin. O RBAC real é do gateway (JWT +
 * authorize.roles); aqui conferimos os headers `X-Auth-User-*` injetados.
 * FAIL-CLOSED como o payments/fiscal: role E status precisam estar PRESENTES (o
 * gateway sempre injeta os dois; header ausente = não passou pelo gateway).
 */
export function requireAdmin(
  headers: Record<string, string | undefined>,
  requireAdminEnabled: boolean,
  opts: { write?: boolean } = {},
): void {
  if (!requireAdminEnabled) return
  const role = headers['x-auth-user-role']
  const status = headers['x-auth-user-status']
  if (!role || !status) throw new UnauthorizedError('Autenticação necessária')
  if (status !== 'active') throw new ForbiddenError('Conta inativa')
  const allowed = opts.write ? ADMIN_WRITE_ROLES : ADMIN_ROLES
  if (!allowed.has(role)) throw new ForbiddenError('Permissão insuficiente')
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/**
 * Prova de origem do gateway (`x-internal-token`, header-inject) — sem ela,
 * qualquer processo na rede interna forjaria um admin. Sem `expected`
 * (dev/local) → no-op. Espelha payments/catalog/members/fiscal.
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

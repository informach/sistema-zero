import { timingSafeEqual } from 'node:crypto'
import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'

/**
 * Papéis que podem escrever no catálogo. O RBAC REAL é aplicado no gateway (JWT +
 * `authorize.roles`); aqui conferimos os headers `X-Auth-User-*` confiáveis que o
 * gateway injeta — defesa em profundidade (o serviço nunca deve ser exposto
 * diretamente, só atrás do gateway).
 */
const ADMIN_ROLES = new Set(['superadmin', 'admin', 'staff'])

/**
 * Garante que a requisição vem de um usuário admin/staff ativo. Se a checagem
 * estiver desligada (`requireAdmin=false`, dev fora do gateway), passa direto.
 */
export function requireAdmin(
  headers: Record<string, string | undefined>,
  requireAdminEnabled: boolean,
): void {
  if (!requireAdminEnabled) return
  const role = headers['x-auth-user-role']
  if (!role) throw new UnauthorizedError('Autenticação necessária')
  const status = headers['x-auth-user-status']
  if (status && status !== 'active') throw new ForbiddenError('Conta inativa')
  if (!ADMIN_ROLES.has(role)) throw new ForbiddenError('Permissão insuficiente')
}

/** Comparação em tempo constante (evita timing attack no token interno). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/**
 * Defesa em profundidade: prova que a chamada veio de um chamador interno
 * autorizado — o gateway injeta `x-internal-token` (header-inject, sobrescrevendo
 * qualquer valor do cliente) nas rotas admin/escrita e no redeem; o members envia
 * o mesmo token na chamada S2S de entitlements. Os `X-Auth-User-*` só são
 * confiáveis porque passaram pelo gateway — este token prova isso. Sem `expected`
 * (dev/local sem gateway) → no-op. Espelha o members.
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

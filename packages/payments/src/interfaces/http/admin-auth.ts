import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'

/**
 * Papéis que podem operar o painel admin. O RBAC REAL é aplicado no gateway (JWT +
 * `authorize.roles`); aqui conferimos os headers `X-Auth-User-*` confiáveis que o
 * gateway injeta — defesa em profundidade (o serviço nunca deve ser exposto
 * diretamente, só atrás do gateway). Espelha `packages/catalog/.../http/auth.ts`.
 */
const ADMIN_ROLES = new Set(['superadmin', 'admin', 'staff'])

/**
 * Garante que a requisição vem de um usuário admin/staff ATIVO. Se a checagem
 * estiver desligada (`requireAdminEnabled=false`, dev fora do gateway), passa direto.
 */
export function requireAdmin(
  headers: Record<string, string | undefined>,
  requireAdminEnabled: boolean,
): void {
  if (!requireAdminEnabled) return
  const role = headers['x-auth-user-role']
  if (!role) throw new UnauthorizedError('Autenticação necessária')
  // O gateway SEMPRE injeta o status junto com o role (a partir das claims).
  // Header ausente = requisição que não passou pelo gateway → rejeita
  // (fail-closed; "ausente" não pode equivaler a "ativo").
  const status = headers['x-auth-user-status']
  if (!status) throw new UnauthorizedError('Autenticação necessária')
  if (status !== 'active') throw new ForbiddenError('Conta inativa')
  if (!ADMIN_ROLES.has(role)) throw new ForbiddenError('Permissão insuficiente')
}

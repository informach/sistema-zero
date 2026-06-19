import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import { assertInternalCaller } from './internal-auth'

/**
 * Papéis que podem operar o painel admin. O RBAC REAL é aplicado no gateway (JWT +
 * `authorize.roles`); aqui conferimos os headers `X-Auth-User-*` confiáveis que o
 * gateway injeta — defesa em profundidade (o serviço nunca deve ser exposto
 * diretamente, só atrás do gateway). Espelha `packages/catalog/.../http/auth.ts`.
 */
const ADMIN_READ_ROLES = new Set(['superadmin', 'admin', 'staff'])
const ADMIN_WRITE_ROLES = new Set(['superadmin', 'admin'])

/**
 * Garante que a requisição vem de um usuário admin/staff ATIVO **via gateway**:
 * exige o `x-internal-token` injetado (quando configurado — é o que torna os
 * `X-Auth-User-*` confiáveis) e então confere role/status. Se a checagem estiver
 * desligada (`requireAdminEnabled=false`, dev fora do gateway), passa direto.
 */
export function requireAdmin(
  headers: Record<string, string | undefined>,
  requireAdminEnabled: boolean,
  internalToken?: string,
): void {
  requireAdminRole(headers, requireAdminEnabled, ADMIN_READ_ROLES, internalToken)
}

/** Escrita financeira no painel: staff pode acompanhar, mas não mutar pagamentos. */
export function requireAdminWrite(
  headers: Record<string, string | undefined>,
  requireAdminEnabled: boolean,
  internalToken?: string,
): void {
  requireAdminRole(headers, requireAdminEnabled, ADMIN_WRITE_ROLES, internalToken)
}

function requireAdminRole(
  headers: Record<string, string | undefined>,
  requireAdminEnabled: boolean,
  allowedRoles: ReadonlySet<string>,
  internalToken?: string,
): void {
  if (!requireAdminEnabled) return
  // 1º a prova de origem: sem ela, os X-Auth-User-* abaixo seriam forjáveis por
  // quem alcançasse o serviço direto na rede interna.
  assertInternalCaller(headers['x-internal-token'], internalToken)
  const role = headers['x-auth-user-role']
  if (!role) throw new UnauthorizedError('Autenticação necessária')
  // O gateway SEMPRE injeta o status junto com o role (a partir das claims).
  // Header ausente = requisição que não passou pelo gateway → rejeita
  // (fail-closed; "ausente" não pode equivaler a "ativo").
  const status = headers['x-auth-user-status']
  if (!status) throw new UnauthorizedError('Autenticação necessária')
  if (status !== 'active') throw new ForbiddenError('Conta inativa')
  if (!allowedRoles.has(role)) throw new ForbiddenError('Permissão insuficiente')
}

import { timingSafeEqual } from 'node:crypto'
import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'

/**
 * Papéis com acesso ao painel admin. O RBAC REAL é do gateway (JWT + `authorize.roles`);
 * aqui conferimos os headers `X-Auth-User-*` confiáveis injetados pelo gateway — defesa
 * em profundidade (o serviço nunca deve ser exposto direto, só atrás do gateway).
 */
const ADMIN_ROLES = new Set(['superadmin', 'admin', 'staff'])

/**
 * Garante que a requisição vem de um admin/staff ativo. Desligada (`requireAdminEnabled=false`,
 * dev fora do gateway) → passa direto. Espelha o `requireAdmin` do catálogo.
 */
export function requireAdmin(
  headers: Record<string, string | undefined>,
  requireAdminEnabled: boolean,
): void {
  if (!requireAdminEnabled) return
  const role = headers['x-auth-user-role']
  if (!role) throw new UnauthorizedError('Autenticação necessária')
  // Status AUSENTE = não-confiável → trata como inativo (o gateway SEMPRE injeta
  // `x-auth-user-status`; a falta dele indica chamada que não passou pela borda).
  const status = headers['x-auth-user-status']
  if (status !== 'active') throw new ForbiddenError('Conta inativa')
  if (!ADMIN_ROLES.has(role)) throw new ForbiddenError('Permissão insuficiente')
}

/**
 * Equipe interna com acesso IRRESTRITO aos cursos (decisão 06/2026): superadmin/
 * admin/staff na área do aluno enxergam TODO curso publicado como se tivessem uma
 * chave-mestra `all_courses` virtual (rascunho continua 404 — mesma régua do aluno).
 * O header `x-auth-user-role` é confiável pelo mesmo motivo do `x-auth-user-id`:
 * o gateway o injeta após verificar o JWT (e o `x-internal-token` prova a origem).
 */
const PRIVILEGED_ROLES = new Set(['superadmin', 'admin', 'staff'])

/** Requisição vem de equipe interna (superadmin/admin/staff)? Status já é `active` (gateway). */
export function isPrivilegedActor(headers: Record<string, string | undefined>): boolean {
  const role = headers['x-auth-user-role']
  return role !== undefined && PRIVILEGED_ROLES.has(role)
}

/**
 * Identidade confiável do aluno. O gateway VERIFICA o JWT e injeta `x-auth-user-id`
 * (removendo qualquer um de entrada — anti-spoof), então o serviço só lê o header.
 * Em dev/local sem gateway, passe o header manualmente. Ausente → 401.
 */
export function resolveUserId(headers: Record<string, string | undefined>): string {
  const id = headers['x-auth-user-id']
  if (!id || id.trim().length === 0) {
    throw new UnauthorizedError('Identidade ausente (x-auth-user-id)')
  }
  // Trim (como `resolveAccountId`): o id vira chave de DADOS (progresso/XP/conclusões).
  return id.trim()
}

/**
 * Conta do responsável para resolver o ACESSO (matrícula/entitlement). Em sessão de
 * PERFIL (estilo Netflix) o gateway injeta `x-auth-account-id` (a conta) ALÉM do
 * `x-auth-user-id` (o perfil de criança, usado para atribuir DADOS — progresso/XP).
 * Ausente (sessão normal da conta / community adulto) → cai no `x-auth-user-id`
 * (a conta É o próprio id), preservando o comportamento atual.
 */
export function resolveAccountId(headers: Record<string, string | undefined>): string {
  const account = headers['x-auth-account-id']
  if (account && account.trim().length > 0) return account.trim()
  return resolveUserId(headers)
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
 * members o exige nas rotas do aluno. Sem `expected` (dev/local sem gateway) → no-op.
 * O `x-auth-user-id` só é confiável porque passou pelo gateway — este token prova isso.
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

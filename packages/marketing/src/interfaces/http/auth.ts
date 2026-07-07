import { timingSafeEqual } from 'node:crypto'
import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import type { Actor } from '../../application/actor'

/**
 * Papéis da EQUIPE com acesso à ferramenta de marketing. O RBAC REAL é do
 * gateway (JWT + `authorize.roles`); aqui conferimos os headers `X-Auth-User-*`
 * confiáveis injetados pelo gateway — defesa em profundidade (o serviço nunca
 * deve ser exposto direto, só atrás do gateway). FAIL-CLOSED: header ausente =
 * chamada que não passou pela borda.
 */
const STAFF_ROLES = new Set(['superadmin', 'admin', 'staff'])

/** Garante que a requisição vem de equipe ATIVA (staff+). */
export function requireStaff(
  headers: Record<string, string | undefined>,
  requireStaffEnabled: boolean,
): void {
  if (!requireStaffEnabled) return
  const role = headers['x-auth-user-role']
  if (!role) throw new UnauthorizedError('Autenticação necessária')
  if (headers['x-auth-user-status'] !== 'active') throw new ForbiddenError('Conta inativa')
  if (!STAFF_ROLES.has(role)) throw new ForbiddenError('Permissão insuficiente')
}

/** Header de identidade pode chegar URI-encoded (acento → `headers.set` lança cru). */
function decodeIdentity(value: string | undefined): string | undefined {
  if (!value) return undefined
  if (!value.includes('%')) return value
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Identidade confiável do usuário. O gateway VERIFICA o JWT e injeta
 * `x-auth-user-id` (removendo qualquer um de entrada — anti-spoof). Ausente → 401.
 */
export function resolveUserId(headers: Record<string, string | undefined>): string {
  const id = headers['x-auth-user-id']
  if (!id || id.trim().length === 0) {
    throw new UnauthorizedError('Identidade ausente (x-auth-user-id)')
  }
  return id
}

/** Primeiro nome do membro da equipe (snapshot em autoria/atividade). */
export function resolveDisplayName(headers: Record<string, string | undefined>): string {
  const full = (decodeIdentity(headers['x-auth-user-name']) ?? '').trim()
  const first = full.split(/\s+/)[0] ?? ''
  return first || 'Equipe'
}

/** Monta o ator confiável a partir dos headers `X-Auth-User-*` (gateway). */
export function resolveActor(headers: Record<string, string | undefined>): Actor {
  return {
    userId: resolveUserId(headers),
    displayName: resolveDisplayName(headers),
    role: headers['x-auth-user-role'],
    status: headers['x-auth-user-status'],
  }
}

/** Comparação em tempo constante (evita timing attack no token interno). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/**
 * Defesa em profundidade: confirma que a chamada veio do gateway. O gateway
 * injeta `x-internal-token` (header-inject, sobrescrevendo qualquer valor do
 * cliente); o marketing o exige em TODAS as rotas de negócio.
 */
export function assertInternalCaller(
  provided: string | undefined,
  expected: string | undefined,
): void {
  if (!expected) {
    throw new UnauthorizedError('Chamada não autorizada (token interno ausente/inválido)')
  }
  if (!provided || !safeEqual(provided, expected)) {
    throw new UnauthorizedError('Chamada não autorizada (token interno ausente/inválido)')
  }
}

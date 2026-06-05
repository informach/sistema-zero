import { timingSafeEqual } from 'node:crypto'
import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'

/** Leitura: staff também enxerga; ESCRITA: só admin+ (espelha o RBAC do gateway). */
const READ_ROLES = new Set(['superadmin', 'admin', 'staff'])
const WRITE_ROLES = new Set(['superadmin', 'admin'])

type Headers = Record<string, string | undefined>

/**
 * Defesa em profundidade do admin: o RBAC real é do gateway (JWT), que injeta
 * `X-Auth-User-*` confiável. Aqui conferimos o papel/estado desses headers — com
 * a MESMA distinção leitura/escrita do gateway (staff só lê; se o gateway falhar,
 * o serviço não vira escalada de privilégio). **Fail-closed** (espelha o payments):
 * role E status precisam estar PRESENTES — o gateway sempre injeta os dois;
 * header ausente = a chamada não passou pelo gateway → 401. "Ausente" nunca
 * equivale a "ativo". Em dev (fora do gateway) a checagem pode ser desligada
 * (`requireAdminEnabled=false`).
 */
export function requireAdmin(
  headers: Headers,
  requireAdminEnabled: boolean,
  opts: { write?: boolean } = {},
): void {
  if (!requireAdminEnabled) return
  const role = headers['x-auth-user-role']
  const status = headers['x-auth-user-status']
  if (!role || !status) throw new UnauthorizedError('Autenticação necessária')
  if (status !== 'active') throw new ForbiddenError('Conta inativa')
  const allowed = opts.write ? WRITE_ROLES : READ_ROLES
  if (!allowed.has(role)) throw new ForbiddenError('Permissão insuficiente')
}

/** Comparação em tempo constante (anti-timing-attack) p/ tokens/segredos. */
export function safeEqual(a: string, b: string): boolean {
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

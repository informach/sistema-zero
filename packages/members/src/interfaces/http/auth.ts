import { timingSafeEqual } from 'node:crypto'
import { UnauthorizedError } from '@sistemazero/core/http'

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
  return id
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

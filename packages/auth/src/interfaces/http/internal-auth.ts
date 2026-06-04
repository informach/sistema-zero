import { timingSafeEqual } from 'node:crypto'
import { UnauthorizedError } from '@sistemazero/core/http'

type Headers = Record<string, string | undefined>

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/**
 * Rotas internas S2S (`/auth/internal/*`): o gateway injeta `x-internal-token`
 * após autenticar o consumer por HMAC (espelha o members/messaging — defesa em
 * profundidade). Quando o token não está configurado (dev), a checagem é desligada.
 */
export function requireInternalToken(headers: Headers, expected: string | undefined): void {
  if (!expected) return
  const provided = headers['x-internal-token']
  if (!provided || !safeEqual(provided, expected)) {
    throw new UnauthorizedError('Token interno inválido')
  }
}

import { UnauthorizedError } from '@sistemazero/core/http'
import { assertInternalCaller } from './internal-auth'

/**
 * Identidade do COMPRADOR nas rotas self-service (`/payments/my*`). A auth real
 * é do gateway (JWT + `authorize.statuses:['active']`), que injeta os headers
 * `X-Auth-User-*` confiáveis (e remove os de entrada — anti-spoof). Aqui exigimos
 * o `x-internal-token` injetado (prova de que a chamada veio do gateway — sem ela
 * o e-mail seria forjável da rede interna) e lemos o e-mail das claims — defesa
 * em profundidade (espelha o `requireAdmin`).
 */
export function requireBuyer(
  headers: Record<string, string | undefined>,
  internalToken?: string,
): { email: string } {
  assertInternalCaller(headers['x-internal-token'], internalToken)
  const email = headers['x-auth-user-email']?.trim()
  if (!email) throw new UnauthorizedError('Autenticação necessária')
  return { email }
}

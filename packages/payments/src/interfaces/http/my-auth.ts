import { UnauthorizedError } from '@sistemazero/core/http'

/**
 * Identidade do COMPRADOR nas rotas self-service (`/payments/my*`). A auth real
 * é do gateway (JWT + `authorize.statuses:['active']`), que injeta os headers
 * `X-Auth-User-*` confiáveis (e remove os de entrada — anti-spoof). Aqui lemos o
 * e-mail das claims — defesa em profundidade (espelha o `requireAdmin`).
 */
export function requireBuyer(headers: Record<string, string | undefined>): { email: string } {
  const email = headers['x-auth-user-email']?.trim()
  if (!email) throw new UnauthorizedError('Autenticação necessária')
  return { email }
}

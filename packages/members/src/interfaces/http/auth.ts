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

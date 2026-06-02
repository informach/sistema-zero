import type { AuthenticatedUser, UserResolver } from './authenticated-user'

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/**
 * Resolver de usuário **baseado em claims** (stateless): lê a identidade direto
 * do token JWT já verificado. Retorna `null` para principals HMAC (sistema-a-
 * sistema, sem usuário) ou quando faltam claims obrigatórias. Mantém o gateway
 * sem estado e sem consultar o serviço de identidade no caminho quente.
 */
export function createClaimsUserResolver(): UserResolver {
  return {
    async resolve(principal) {
      // HMAC = chamada sistema-a-sistema; não há um usuário por trás.
      if (principal.kind === 'hmac') return null

      const claims = principal.claims ?? {}
      const id = principal.subject
      const email = str(claims.email)
      const firstName = str(claims.firstName)
      const lastName = str(claims.lastName)
      const role = str(claims.role)
      const status = str(claims.status)
      if (!id || !email || !firstName || !lastName || !role || !status) return null

      const user: AuthenticatedUser = {
        id,
        email,
        firstName,
        lastName,
        role,
        status,
        ...(str(claims.phone) ? { phone: str(claims.phone) } : {}),
        ...(str(claims.signupSource) ? { signupSource: str(claims.signupSource) } : {}),
      }
      return user
    },
  }
}

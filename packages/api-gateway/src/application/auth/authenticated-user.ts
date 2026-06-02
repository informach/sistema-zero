import type { Principal } from './auth-strategy.port'

/**
 * Usuário autenticado resolvido a partir do principal — o CONTRATO que atravessa
 * a borda: `{ id, email, firstName, lastName, role, status }` (+ opcionais
 * `phone`/`signupSource`). É a forma confiável repassada ao upstream.
 */
export interface AuthenticatedUser {
  readonly id: string
  readonly email: string
  readonly firstName: string
  readonly lastName: string
  readonly role: string
  readonly status: string
  readonly phone?: string
  readonly signupSource?: string
}

/**
 * Resolve o principal autenticado em um usuário. Retorna `null` quando não há
 * usuário (ex.: principal HMAC sistema-a-sistema) ou quando o token não carrega
 * uma identidade de usuário válida. Porta plugável: o adapter padrão lê das
 * claims (stateless); um adapter remoto poderia consultar o serviço de identidade.
 */
export interface UserResolver {
  resolve(principal: Principal): Promise<AuthenticatedUser | null>
}

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
  /**
   * Sessão de PERFIL (estilo Netflix): conta do responsável (claim `pfl.accountId`).
   * Presente só quando `id` (= `sub`) é um perfil de criança — o upstream resolve o
   * ACESSO/entitlement por esta conta enquanto atribui dados ao perfil (`id`).
   */
  readonly accountId?: string
  /**
   * Sessão de IMPERSONAÇÃO: admin navegando como o usuário (claim `act.sub`).
   * Presente só em sessão de suporte — o upstream o usa p/ PRESERVAR a impersonação
   * ao derivar uma nova sessão (ex.: selecionar um perfil de criança), evitando que
   * o vínculo (TTL curto + ator) seja perdido numa sessão normal de longa duração.
   */
  readonly impersonatorId?: string
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

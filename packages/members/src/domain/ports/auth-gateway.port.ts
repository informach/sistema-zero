/** Identidade MÍNIMA do responsável (report dos pais). Nunca role/hash/telefone. */
export interface AccountIdentity {
  id: string
  email: string
  firstName: string
}

/**
 * Porta S2S para o AUTH (report dos pais): e-mail/nome do responsável por lote de
 * contas + nomes das CRIANÇAS por lote de perfis. Chamada DIRETA na rede interna
 * (`AUTH_BASE_URL` + `x-internal-token`); erro → lança (o job pula a conta e
 * re-tenta no próximo ciclo — nada é marcado como enviado).
 */
export interface AuthGateway {
  getAccountIdentities(ids: string[]): Promise<AccountIdentity[]>
  /** id do perfil → primeiro nome (só perfis ATIVOS; ausentes são omitidos). */
  getProfileNames(ids: string[]): Promise<Map<string, string>>
}

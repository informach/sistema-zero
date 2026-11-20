/** Identidade MÍNIMA do responsável (report dos pais). Nunca role/hash/telefone. */
export interface AccountIdentity {
  id: string
  email: string
  firstName: string
  /** O responsável já definiu a própria senha; `null` durante skew com Auth antigo. */
  activated: boolean | null
}

/** Identidade PÚBLICA mínima de um perfil de criança (rosto/nome da liga kids). */
export interface ProfileIdentity {
  /** Apelido público completo; nome do campo preservado por compatibilidade. */
  firstName: string
  /** Opt-in dos pais (`public_profile_enabled`) — habilita o link p/ o perfil público. */
  public: boolean
}

/**
 * Porta S2S para o AUTH (report dos pais + liga kids): e-mail/nome do responsável por
 * lote de contas + nomes/flag-público das CRIANÇAS por lote de perfis. Chamada DIRETA
 * na rede interna (`AUTH_BASE_URL` + `x-internal-token`); erro → lança (o chamador
 * decide o fallback — o report pula a conta, a liga degrada p/ "Colega").
 */
export interface AuthGateway {
  /** Active staff accounts only; never infer staff from a missing child profile. */
  getPublicStaffNames?(ids: string[]): Promise<Map<string, string>>
  /** Identidade privada da própria família, exclusivamente para emissão. */
  getCertificateIdentity?(
    accountId: string,
    profileId: string,
  ): Promise<{ fullName: string; confirmed: boolean } | null>
  getAccountIdentities(ids: string[]): Promise<AccountIdentity[]>
  /** id do perfil → apelido público (só perfis ATIVOS; ausentes são omitidos). */
  getProfileNames(ids: string[]): Promise<Map<string, string>>
  /**
   * id do perfil → {apelido público, flag público} (só perfis ATIVOS; ausentes omitidos).
   * Superset de `getProfileNames` — a liga usa o flag p/ linkar SÓ perfis públicos.
   */
  getProfileIdentities(ids: string[]): Promise<Map<string, ProfileIdentity>>
}

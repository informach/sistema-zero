export interface ProfileAllowance {
  /** Teto de perfis que a conta pode ter (resolvido pelas matrículas kids ativas). */
  maxProfiles: number
}

/**
 * Resolve o teto de perfis da conta na ÁREA DE MEMBROS (S2S). A fonte da verdade do
 * "quantos perfis o plano libera" é a matrícula (catalog → snapshot), não o auth.
 */
export interface ProfileAllowanceGateway {
  getAllowance(accountUserId: string): Promise<ProfileAllowance>
}

export interface OAuthState {
  state: string
  provider: string
  codeVerifier: string | null
  createdBy: string
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}

export interface OAuthStateRepository {
  create(state: OAuthState): Promise<void>
  /**
   * Consumo single-use ATÔMICO: marca `used_at` condicionado a ainda não usado
   * e não expirado; null = state inválido/reusado/vencido.
   */
  consume(state: string, at: Date): Promise<OAuthState | null>
  deleteExpired(before: Date): Promise<number>
}

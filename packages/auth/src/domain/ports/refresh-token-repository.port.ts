/** Linha persistida de refresh token (somente o HASH do token é guardado). */
export interface RefreshTokenRecord {
  id: string
  userId: string
  /** Família de rotação: detectar reuso revoga a família inteira (token roubado). */
  familyId: string
  tokenHash: string
  expiresAt: Date
  rotatedAt: Date | null
  revokedAt: Date | null
}

export interface CreateRefreshTokenInput {
  id: string
  userId: string
  familyId: string
  tokenHash: string
  expiresAt: Date
  userAgent?: string | null
  ip?: string | null
}

/**
 * Persistência de refresh tokens (rotação + revogação). O valor opaco do token
 * NUNCA é guardado — só o `tokenHash` (sha256), comparado em tempo constante.
 */
export interface RefreshTokenRepository {
  create(input: CreateRefreshTokenInput): Promise<void>
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>
  /** Marca como rotacionado (consumido por um /refresh bem-sucedido). */
  markRotated(id: string, rotatedAt: Date): Promise<void>
  /** Revoga um token específico (logout). */
  revoke(id: string): Promise<void>
  /** Revoga TODA a família (reuse-detection / logout global). */
  revokeFamily(familyId: string): Promise<void>
}

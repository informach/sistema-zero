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
  /** Sessão de impersonação: admin navegando como `userId` (`null` = sessão normal). */
  impersonatorUserId: string | null
  /** Sessão de perfil: perfil de criança ativo (`userId` = conta; `null` = sessão da conta). */
  activeProfileId: string | null
}

export interface CreateRefreshTokenInput {
  id: string
  userId: string
  familyId: string
  tokenHash: string
  expiresAt: Date
  userAgent?: string | null
  ip?: string | null
  impersonatorUserId?: string | null
  activeProfileId?: string | null
}

/**
 * Persistência de refresh tokens (rotação + revogação). O valor opaco do token
 * NUNCA é guardado — só o `tokenHash` (sha256), comparado em tempo constante.
 */
export interface RefreshTokenRepository {
  create(input: CreateRefreshTokenInput): Promise<void>
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>
  /**
   * Reivindica o token para rotação de forma ATÔMICA: só consome (marca
   * `rotatedAt`+`revokedAt`) se ele ainda estiver vigente. Retorna `false` quando
   * outra requisição já o consumiu/revogou — dois `/refresh` concorrentes com o
   * MESMO token disputam aqui e só um vence (o perdedor é tratado como REUSO).
   * Um check-then-act não-atômico deixaria ambos passarem, contornando a
   * reuse-detection para sempre.
   */
  claimForRotation(id: string, rotatedAt: Date): Promise<boolean>
  /** Revoga um token específico (logout). */
  revoke(id: string): Promise<void>
  /** Revoga TODA a família (reuse-detection / logout global). */
  revokeFamily(familyId: string): Promise<void>
  /**
   * Revoga TODAS as sessões ativas de um usuário (moderação: suspender/bloquear
   * → derruba os refresh tokens vigentes para que não renovem). Idempotente.
   */
  revokeAllForUser(userId: string): Promise<void>
  /**
   * Apaga tokens cuja expiração passou antes de `before` (purga periódica —
   * a tabela cresce a cada login/rotação). Retorna o nº de linhas removidas.
   * O cutoff deve incluir uma FOLGA além do `expiresAt` (manter tokens
   * recém-expirados preserva a detecção tardia de reuso enquanto importa).
   */
  deleteExpired(before: Date): Promise<number>
}

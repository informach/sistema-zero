/** Linha persistida de token de handoff de impersonação (somente o HASH é guardado). */
export interface ImpersonationTokenRecord {
  id: string
  tokenHash: string
  /** Admin/superadmin que pediu a impersonação (vira a claim `act.sub` no exchange). */
  actorId: string
  /** Usuário cuja sessão será emitida no exchange. */
  targetUserId: string
  expiresAt: Date
  consumedAt: Date | null
}

export interface CreateImpersonationTokenInput {
  id: string
  tokenHash: string
  actorId: string
  targetUserId: string
  expiresAt: Date
}

/**
 * Persistência dos tokens de HANDOFF de impersonação (admin → community, via URL).
 * O valor opaco NUNCA é guardado — só o `tokenHash` (sha256). Single-use com
 * consumo ATÔMICO (`consume` espelha o `claimForRotation` do refresh: dois
 * exchanges concorrentes com o mesmo token disputam e só um vence).
 */
export interface ImpersonationTokenRepository {
  create(input: CreateImpersonationTokenInput): Promise<void>
  findByHash(tokenHash: string): Promise<ImpersonationTokenRecord | null>
  /**
   * Consome o token de forma ATÔMICA: `UPDATE ... WHERE consumed_at IS NULL
   * RETURNING`. Retorna `false` quando outro exchange já o consumiu — um
   * check-then-act deixaria os dois emitirem sessão com o MESMO token.
   */
  consume(id: string, at: Date): Promise<boolean>
  /** Apaga tokens expirados antes de `before` (purga periódica). Retorna o nº removido. */
  deleteExpired(before: Date): Promise<number>
}

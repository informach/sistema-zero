/** Linha persistida de token de redefinição de senha (somente o HASH é guardado). */
export interface PasswordResetTokenRecord {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  consumedAt: Date | null
}

export interface CreatePasswordResetTokenInput {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
}

/**
 * Persistência de tokens de redefinição/definição de senha. O valor opaco NUNCA
 * é guardado — só o `tokenHash` (sha256). Single-use: `consume` marca o uso;
 * `consumeAllForUser` invalida pendentes ao emitir um novo (1 token vivo por usuário).
 */
export interface PasswordResetTokenRepository {
  create(input: CreatePasswordResetTokenInput): Promise<void>
  findByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>
  /** Marca o token como consumido (após a troca de senha). Idempotente. */
  consume(id: string, at: Date): Promise<void>
  /** Consome TODOS os tokens vigentes do usuário (emissão de um novo). Idempotente. */
  consumeAllForUser(userId: string, at: Date): Promise<void>
  /**
   * Quando foi a ÚLTIMA emissão (consumida ou não) do usuário — base do cooldown
   * anti-spam do forgot-password (`null` = nunca emitiu). Olha TODAS as linhas:
   * cada emissão consome os pendentes, então só o ativo não serviria de âncora.
   */
  lastIssuedAt(userId: string): Promise<Date | null>
  /** Apaga tokens expirados antes de `before` (purga periódica). Retorna o nº removido. */
  deleteExpired(before: Date): Promise<number>
}

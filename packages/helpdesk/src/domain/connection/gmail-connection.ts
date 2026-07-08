export type ConnectionStatus = 'connected' | 'needs_reauth' | 'revoked' | 'disabled'

/**
 * A conexão OAuth com a caixa do Gmail (na prática 1 linha — contato@).
 * Tokens SEMPRE cifrados (secret-box `v1.<iv>.<tag>.<ct>`); views nunca expõem `_enc`.
 */
export interface GmailConnection {
  id: string
  version: number
  emailAddress: string
  /** `sub` do id_token do Google (identidade estável da conta). */
  externalId: string
  accessTokenEnc: string | null
  refreshTokenEnc: string | null
  tokenExpiresAt: Date | null
  scopes: string[]
  status: ConnectionStatus
  /**
   * Marca d'água do sync incremental (`users.history.list`). uint64 do Gmail —
   * SEMPRE text, nunca int. Null = próximo tick faz o backfill completo.
   */
  lastHistoryId: string | null
  lastSyncAt: Date | null
  /** Claim/lease do gmail-sync-worker (próximo tick elegível). */
  syncNextAt: Date
  syncAttempts: number
  lastSyncError: string | null
  connectedBy: string
  connectedByName: string | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

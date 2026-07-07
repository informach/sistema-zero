import type { Network } from '../publication/publication'

export interface OAuthStateRecord {
  state: string
  network: Network
  codeVerifier: string | null
  createdBy: string
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}

export interface OAuthStateRepository {
  create(record: OAuthStateRecord): Promise<void>
  /**
   * Consumo SINGLE-USE atômico: `UPDATE … SET used_at = now WHERE state = ? AND
   * used_at IS NULL AND expires_at > now RETURNING`. Reuso ou vencido → null
   * (nunca há corrida em que dois callbacks consumam o mesmo state).
   */
  consume(state: string, now: Date): Promise<OAuthStateRecord | null>
}

/** Snapshots de métricas (séries temporais APPEND-ONLY — nunca sobrescrever). */
export interface AccountSnapshot {
  id: string
  socialAccountId: string
  capturedAt: Date
  followers: number
  raw: Record<string, unknown>
}

export interface PublicationSnapshot {
  id: string
  publicationId: string
  capturedAt: Date
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number | null
  watchTimeSeconds: number | null
  avgWatchRatio: number | null
  raw: Record<string, unknown>
}

export interface MetricsRepository {
  insertAccountSnapshot(row: AccountSnapshot): Promise<void>
  insertPublicationSnapshots(rows: PublicationSnapshot[]): Promise<void>
  latestAccountSnapshot(socialAccountId: string): Promise<AccountSnapshot | null>
  /** Último snapshot POR conta (cards do dashboard) — chave = socialAccountId. */
  latestAccountSnapshots(socialAccountIds: string[]): Promise<Map<string, AccountSnapshot>>
  /** Snapshots das contas desde `since` (série de seguidores), capturedAt ASC. */
  listAccountSnapshotsSince(socialAccountIds: string[], since: Date): Promise<AccountSnapshot[]>
  /** Último snapshot POR publicação (cards/tabela de métricas). */
  latestPublicationStats(publicationIds: string[]): Promise<Map<string, PublicationSnapshot>>
  /** Série (mais recentes primeiro) de uma publicação. */
  listPublicationSnapshots(publicationId: string, limit: number): Promise<PublicationSnapshot[]>
}

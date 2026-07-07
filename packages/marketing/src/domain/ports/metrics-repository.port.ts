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
  raw: Record<string, unknown>
}

export interface MetricsRepository {
  insertAccountSnapshot(row: AccountSnapshot): Promise<void>
  insertPublicationSnapshots(rows: PublicationSnapshot[]): Promise<void>
  latestAccountSnapshot(socialAccountId: string): Promise<AccountSnapshot | null>
  /** Último snapshot POR publicação (cards/tabela de métricas). */
  latestPublicationStats(publicationIds: string[]): Promise<Map<string, PublicationSnapshot>>
  /** Série (mais recentes primeiro) de uma publicação. */
  listPublicationSnapshots(publicationId: string, limit: number): Promise<PublicationSnapshot[]>
}

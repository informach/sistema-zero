import type { MediaAsset } from '../media/media-asset'

export interface ListAssetsFilter {
  contentId?: string
  limit: number
  offset: number
}

export interface MediaAssetRepository {
  create(asset: MediaAsset): Promise<void>
  byId(id: string): Promise<MediaAsset | null>
  /** Update com concorrência otimista: 0 linhas (versão defasada) → false. */
  update(asset: MediaAsset, expectedVersion: number): Promise<boolean>
  list(filter: ListAssetsFilter): Promise<{ items: MediaAsset[]; total: number }>
  byIds(ids: string[]): Promise<Map<string, MediaAsset>>
  /**
   * Claim do media-transfer-worker (import Drive→R2): assets `importing` com
   * `transfer_next_at` vencido (ou nulo — recém-criado). `FOR UPDATE SKIP
   * LOCKED`; a linha claimada ganha `transfer_attempts+1` e lease em
   * `transfer_next_at` — crash devolve à fila no vencimento do lease.
   */
  claimDueTransfers(now: Date, limit: number, leaseMs: number): Promise<MediaAsset[]>
  /**
   * Claim do ARQUIVADOR (F4, R2→Drive): assets `ready` com r2_key cujo CONTEÚDO
   * está `published` há mais de `afterDays` (contents.updated_at — a etapa é
   * materializada quando a última publicação sai) + reaper de `archiving` com
   * lease vencido. Mesmo padrão do claimDueTransfers (SKIP LOCKED + lease em
   * transfer_next_at; a linha claimada vira `archiving` com attempts+1).
   */
  claimDueArchives(input: {
    now: Date
    limit: number
    leaseMs: number
    afterDays: number
  }): Promise<MediaAsset[]>
}

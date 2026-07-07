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
}

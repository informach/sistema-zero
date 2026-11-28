import type { PintaWorkshopAsset } from '../core/assetMemory'
import type { PintaProjectRef } from '../core/project'

/** No cell/layer payload. Only complete assets may enter a writer or portable encoder. */
export interface RegionalGalleryCard {
  readonly regionalCard: true
  readonly kind: 'tilemap'
  readonly id: string
  readonly name: string
  readonly updatedAt: number
  readonly projectRef?: PintaProjectRef
  readonly revision: string
  readonly namespace: string
  readonly cols: number
  readonly rows: number
  readonly preview: { col: number; row: number }
  readonly dependencies: readonly string[]
}

export type PintaGalleryEntry = PintaWorkshopAsset | RegionalGalleryCard
export type RegionGalleryIndex = {
  assets: PintaWorkshopAsset[]
  cards: RegionalGalleryCard[]
}
export function isRegionalGalleryCard(asset: PintaGalleryEntry): asset is RegionalGalleryCard {
  return 'regionalCard' in asset && asset.regionalCard === true
}

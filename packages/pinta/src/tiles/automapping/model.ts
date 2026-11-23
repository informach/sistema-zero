import { isWorkshopProjectedMap, type PintaWorkshopAsset } from '../../core/assetMemory'
import type { PintaAsset, RegionTilemapAsset, TilemapAsset } from '../../core/project'
import type { AutomapBook } from './book'

/** Only a native-9 host can open this authoring model. The public gallery does not create it. */
export interface AutomapEditorMap extends TilemapAsset {
  schema: 9
  automapping: AutomapBook
}
export function isAutomapEditorMap(asset: PintaAsset): asset is AutomapEditorMap {
  return asset.kind === 'tilemap' && asset.schema === 9 && 'automapping' in asset
}

/** The regional canvas consumes its own chunk model. The editor retains that model and its
 * rulebook as one explicitly versioned snapshot, without changing the schema-8 map itself. */
export interface AutomapRegionEditorDocument {
  kind: 'automap-document'
  schema: 9
  id: string
  updatedAt: number
  map: RegionTilemapAsset
  book: AutomapBook
}

export type PintaAuthoredMap = AutomapEditorMap | Extract<RegionTilemapAsset, { schema: 9 }>
/** The rulebook variant only: a projected map may carry a book too, but it is not this model. */
export function isPintaAuthoredMap(asset: PintaWorkshopAsset): asset is PintaAuthoredMap {
  return (
    asset.kind === 'tilemap' &&
    asset.schema === 9 &&
    'automapping' in asset &&
    !isWorkshopProjectedMap(asset)
  )
}

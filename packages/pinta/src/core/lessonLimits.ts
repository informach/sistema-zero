import type { PintaAsset } from './project'
import { PINTA_LESSON_MAP_LIMITS as limits } from './projectConfig'

/** Recusa a operação inteira antes de mudar o desenho ou o histórico da aula. */
export function withinLessonMapLimits(asset: PintaAsset): boolean {
  if (asset.kind === 'map-set') return withinLessonMapLimits(asset.map)
  if (asset.kind === 'tilemap')
    return (
      asset.cols <= limits.maxCols &&
      asset.rows <= limits.maxRows &&
      asset.layers.length <= limits.maxLayers
    )
  if (asset.kind === 'tileset' || asset.kind === 'vector-tileset')
    return asset.tiles.length <= limits.maxTiles
  return true
}

import { isPintaAuthoredMap, type PintaAuthoredMap } from '../tiles/automapping/model'
import type { AuthorMap } from '../tiles/mapCellEdits'
import type { PintaMemoryAsset } from './assetMemory'
import { PINTA_MAX_SCHEMA, type PintaAsset, withPintaSchemaStamp } from './project'
export function isWorkshopRegion(asset: PintaMemoryAsset): boolean {
  return (
    (asset.kind === 'tilemap' && 'origin' in asset) ||
    (asset.kind === 'map-set' && 'origin' in asset.map)
  )
}
export function isLegacyWorkshopAsset(asset: PintaMemoryAsset): asset is PintaAsset {
  return (
    !isWorkshopRegion(asset) && (!('schema' in asset) || (asset.schema ?? 0) <= PINTA_MAX_SCHEMA)
  )
}
export function pintaWorkshopBody(asset: PintaAuthoredMap): AuthorMap
export function pintaWorkshopBody(asset: PintaMemoryAsset): PintaMemoryAsset
export function pintaWorkshopBody(asset: PintaMemoryAsset): PintaMemoryAsset {
  if (!isPintaAuthoredMap(asset)) return asset
  if ('origin' in asset) {
    const { automapping: _book, schema: _schema, ...body } = asset
    return { ...body, schema: 8 }
  }
  const { automapping: _book, schema: _schema, ...body } = asset
  return withPintaSchemaStamp(body)
}

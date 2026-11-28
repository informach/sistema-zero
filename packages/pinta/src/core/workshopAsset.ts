import { isPintaAuthoredMap, type PintaAuthoredMap } from '../tiles/automapping/model'
import type { AuthorMap } from '../tiles/mapCellEdits'
import {
  isWorkshopProjectedMap,
  type PintaMemoryAsset,
  type PintaWorkshopAsset,
} from './assetMemory'
import { PINTA_MAX_SCHEMA, type PintaAsset, withPintaSchemaStamp } from './project'
import type { ProjectedTilemapAsset, WorkshopProjectedMap } from './projectedDocument'

export { isWorkshopProjectedMap } from './assetMemory'
export function isWorkshopRegion(asset: PintaWorkshopAsset): boolean {
  return (
    (asset.kind === 'tilemap' && 'origin' in asset) ||
    (asset.kind === 'map-set' && 'origin' in asset.map)
  )
}
export function isLegacyWorkshopAsset(asset: PintaWorkshopAsset): asset is PintaAsset {
  return (
    !isWorkshopProjectedMap(asset) &&
    !isWorkshopRegion(asset) &&
    (!('schema' in asset) || (asset.schema ?? 0) <= PINTA_MAX_SCHEMA)
  )
}
export function pintaWorkshopBody(asset: PintaAuthoredMap): AuthorMap
export function pintaWorkshopBody(asset: WorkshopProjectedMap): ProjectedTilemapAsset
export function pintaWorkshopBody(asset: PintaMemoryAsset): PintaMemoryAsset
export function pintaWorkshopBody(asset: PintaWorkshopAsset): PintaWorkshopAsset
export function pintaWorkshopBody(asset: PintaWorkshopAsset): PintaWorkshopAsset {
  if (isWorkshopProjectedMap(asset)) {
    const { automapping: _book, ...body } = asset
    return body
  }
  if (!isPintaAuthoredMap(asset)) return asset
  if ('origin' in asset) {
    const { automapping: _book, schema: _schema, ...body } = asset
    return { ...body, schema: 8 }
  }
  const { automapping: _book, schema: _schema, ...body } = asset
  return withPintaSchemaStamp(body)
}

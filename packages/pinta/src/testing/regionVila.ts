import { vilaEFloresta } from '../../scripts/homologacao/fixture'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { isTileLayer } from '../core/project'
import { expandRegionMap, prepareMapRegions } from '../tiles/regionMap'
import { setCell } from '../tiles/tilemapOps'

/** The actual acceptance world, converted without changing IDs, objects or resource links. */
export function regionVila() {
  const original = vilaEFloresta()
  const assets: PintaMemoryAsset[] = original.assets.map((asset) => {
    if (asset.kind !== 'tilemap' && asset.kind !== 'map-set') return asset
    const prepared = prepareMapRegions(asset.kind === 'tilemap' ? asset : asset.map)
    if (!prepared.ok) throw Error(prepared.reason)
    const expanded = expandRegionMap(prepared.map, { col: -64, row: -64, cols: 10000, rows: 10000 })
    if (!expanded.ok) throw Error(expanded.reason)
    const layer = expanded.map.layers.find(isTileLayer)
    if (!layer) throw Error('Camada de peças ausente')
    const map = setCell(expanded.map, layer.id, -64, -64, 3)
    return asset.kind === 'tilemap' ? map : { ...asset, schema: 8 as const, map }
  })
  const map = assets.find((asset) => asset.id === original.map.id),
    cabana = assets.find((asset) => asset.id === original.cabana.id)
  if (
    map?.kind !== 'tilemap' ||
    !('origin' in map) ||
    cabana?.kind !== 'tilemap' ||
    !('origin' in cabana)
  )
    throw Error('Mundo regional ausente')
  return { map, cabana, assets }
}

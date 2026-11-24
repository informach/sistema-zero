/** QA fixtures shared by native tests and the Chromium history lab. */
import {
  createTilemapAsset,
  type RegionTilemapAsset,
  type TilemapAsset,
} from '../../src/core/project'
import { editRegionMapCells, expandRegionMap, prepareMapRegions } from '../../src/tiles/regionMap'

export function sparseMemoryMap(): RegionTilemapAsset {
  const prepared = prepareMapRegions(
    createTilemapAsset({ name: 'Mundo', tilesetId: 'ground', cols: 2, rows: 2 }),
  )
  if (!prepared.ok) throw Error(prepared.reason)
  const grown = expandRegionMap(prepared.map, { col: -100, row: -100, cols: 10000, rows: 10000 })
  if (!grown.ok) throw Error(grown.reason)
  const edited = editRegionMapCells(grown.map, grown.map.layers[0]!.id, [
    { col: -100, row: -100, cell: 0 },
    { col: 9899, row: 9899, cell: 1 },
  ])
  if (!edited.ok) throw Error(edited.reason)
  return edited.map
}

export function fullMemoryMap(): RegionTilemapAsset {
  const dense = createTilemapAsset({ name: 'Cheio', tilesetId: 'ground', cols: 256, rows: 256 })
  const document: TilemapAsset = {
    ...dense,
    layers: Array.from({ length: 32 }, (_, index) => ({
      id: `layer-${index}`,
      name: `Camada ${index}`,
      visible: true,
      cells: new Int16Array(256 * 256).fill(0),
    })),
  }
  const prepared = prepareMapRegions(document)
  if (!prepared.ok) throw Error(prepared.reason)
  return prepared.map
}

export function editFirstMemoryCell(map: RegionTilemapAsset, cell: number): RegionTilemapAsset {
  const result = editRegionMapCells(map, map.layers[0]!.id, [
    { col: map.origin.col, row: map.origin.row, cell },
  ])
  if (!result.ok) throw Error(result.reason)
  return result.map
}

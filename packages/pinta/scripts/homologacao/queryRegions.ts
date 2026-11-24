import { createTilemapAsset, isTileLayer, type RegionTilemapAsset } from '../../src/core/project'
import { CELL_FLIP_H, makeCell } from '../../src/tiles/cell'
import { editRegionMapCells, prepareMapRegions } from '../../src/tiles/regionMap'
import { addLayer } from '../../src/tiles/tilemapOps'

export function smallQueryMap() {
  const prepared = prepareMapRegions(
    createTilemapAsset({ name: 'Vila', tilesetId: 'ground', cols: 2, rows: 1 }),
  )
  if (!prepared.ok) throw Error(prepared.reason)
  const shifted: RegionTilemapAsset = { ...prepared.map, origin: { col: -2, row: -1 } }
  const result = editRegionMapCells(shifted, shifted.layers[0]!.id, [
    { col: -2, row: -1, cell: makeCell(1, CELL_FLIP_H) },
  ])
  if (!result.ok) throw Error(result.reason)
  const map = addLayer(result.map, 'Frente', 'trees'),
    layer = map.layers.at(-1)!
  const painted = editRegionMapCells(map, layer.id, [{ col: -1, row: -1, cell: 2 }])
  if (!painted.ok) throw Error(painted.reason)
  return {
    ...painted.map,
    layers: painted.map.layers.map((l) =>
      isTileLayer(l) && l.id === layer.id ? { ...l, front: true as const } : l,
    ),
  }
}

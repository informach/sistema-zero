import { createTilemapAsset } from '../../src/core/project'
import { CELL_FLIP_H, makeCell } from '../../src/tiles/cell'
import { addMapObject, createRegionMapObject } from '../../src/tiles/mapObjects'
import { editRegionMapCells, expandRegionMap, prepareMapRegions } from '../../src/tiles/regionMap'
import { addObjectLayer } from '../../src/tiles/tilemapOps'

export function resizeRegionWorld() {
  const prepared = prepareMapRegions(
    createTilemapAsset({ name: 'Mundo', tilesetId: 'ground', cols: 2, rows: 2 }),
  )
  if (!prepared.ok) throw Error(prepared.reason)
  const expanded = expandRegionMap(prepared.map, { col: -32, row: -32, cols: 64, rows: 64 })
  if (!expanded.ok) throw Error(expanded.reason)
  const edit = editRegionMapCells(expanded.map, expanded.map.layers[0]!.id, [
    { col: -1, row: -1, cell: makeCell(4, CELL_FLIP_H) },
    { col: 0, row: 0, cell: 2 },
    { col: 31, row: 31, cell: 7 },
  ])
  if (!edit.ok) throw Error(edit.reason)
  let map = addObjectLayer(edit.map, 'Portas e caminhos')
  const object = createRegionMapObject({
    id: 'door',
    x: -12.5,
    y: 128.25,
    width: 16,
    height: 16,
    role: 'door',
    properties: { destino: 'floresta' },
  })
  if (!object) throw Error('Porta inválida')
  map = addMapObject(map, map.layers.at(-1)!.id, object)
  return map
}

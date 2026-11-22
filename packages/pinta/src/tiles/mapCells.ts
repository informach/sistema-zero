import { isTileLayer, type TilemapAsset, type TilemapCells } from '../core/project'

export {
  createTileCellReader,
  mapCellBounds,
  readDenseTileCell,
  type TileCellReader,
} from './mapCellReader'

/** Storage capacity, not the logical extent (which can contain large unallocated gaps). */
export function mapAllocatedCellCount(map: TilemapAsset<TilemapCells>): number {
  let count = 0
  for (const layer of map.layers)
    if (isTileLayer(layer)) {
      const grid = layer.cells
      count +=
        grid instanceof Int16Array
          ? grid.length
          : grid.chunks.reduce((sum, chunk) => sum + chunk.cells.length, 0)
    }
  return count
}

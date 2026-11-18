import type { TilemapAsset } from '../core/project'
import { makeCell } from './cell'
import type { CellPos } from './cellGeometry'
import { seededChoice } from './terrain'
import { withTileLayer } from './tilemapOps'
/** O resultado depende só da semente e da célula; a prévia é exatamente o que será gravado. */
export function scatterTiles(
  map: TilemapAsset,
  layerId: string,
  positions: readonly CellPos[],
  tiles: readonly number[],
  density: number,
  seed: number,
  flags = 0,
): TilemapAsset {
  if (!tiles.length) return map
  return withTileLayer(map, layerId, (layer) => {
    let cells: Int16Array | null = null
    for (const { col, row } of positions) {
      if (
        col < 0 ||
        row < 0 ||
        col >= map.cols ||
        row >= map.rows ||
        seededChoice(seed, col, row) >= density
      )
        continue
      const value = makeCell(
          tiles[Math.floor(seededChoice(seed + 1009, col, row) * tiles.length)]!,
          flags,
        ),
        at = row * map.cols + col
      if ((cells ?? layer.cells)[at] === value) continue
      cells ??= new Int16Array(layer.cells)
      cells[at] = value
    }
    return cells ? { ...layer, cells } : layer
  })
}

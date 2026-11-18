import {
  type AnyTilesetAsset,
  effectiveLayer,
  type TilemapAsset,
  type TileTerrain,
} from '../core/project'
import { cellTile, makeCell } from './cell'
import type { CellPos } from './cellGeometry'
import { tileLayerById, withTileLayer } from './tilemapOps'
export function seededChoice(seed: number, x: number, y: number): number {
  let n = (seed ^ Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263)) | 0
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}
const slots = (mode: TileTerrain['mode']): number[] =>
  mode === 'edge' ? [0, 2, 4, 6] : mode === 'corner' ? [1, 3, 5, 7] : [0, 1, 2, 3, 4, 5, 6, 7]
function key(c: number, r: number, s: number): string {
  return [
    `h:${c}:${r}`,
    `v:${c + 1}:${r}`,
    `e:${c + 1}:${r}`,
    `v:${c + 1}:${r + 1}`,
    `h:${c}:${r + 1}`,
    `v:${c}:${r + 1}`,
    `e:${c}:${r}`,
    `v:${c}:${r}`,
  ][s]!
}
/** Pinta pontos e bordas compartilhados; resolve também os oito vizinhos com a mesma semente. */
export function paintTerrain(
  map: TilemapAsset,
  layerId: string,
  terrain: TileTerrain,
  color: number,
  positions: readonly CellPos[],
  seed = 1,
): { map: TilemapAsset; unmatched: number } {
  const layer = tileLayerById(map, layerId)
  if (!layer || effectiveLayer(map, layer).locked) return { map, unmatched: 0 }
  const active = slots(terrain.mode),
    constraints = new Map<string, number>(),
    neighbors = new Map<number, CellPos>()
  for (const p of positions) {
    if (p.col < 0 || p.row < 0 || p.col >= map.cols || p.row >= map.rows) continue
    for (const s of active)
      constraints.set(key(p.col, p.row, s), Math.max(0, Math.min(terrain.colors.length, color)))
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const col = p.col + dx,
          row = p.row + dy
        if (col >= 0 && row >= 0 && col < map.cols && row < map.rows)
          neighbors.set(row * map.cols + col, { col, row })
      }
  }
  const candidates = Object.entries(terrain.tiles).map(([tile, pattern]) => ({
    tile: Number(tile),
    pattern,
  }))
  let unmatched = 0
  const cells = new Int16Array(layer.cells)
  for (const [at, p] of neighbors) {
    const old = terrain.tiles[String(cellTile(cells[at] ?? -1))] ?? Array(8).fill(0)
    const desired = old.map((v, s) => constraints.get(key(p.col, p.row, s)) ?? v)
    if (active.every((s) => desired[s] === 0)) {
      cells[at] = -1
      continue
    }
    const matches = candidates.filter((c) => active.every((s) => c.pattern[s] === desired[s]))
    if (!matches.length) {
      unmatched++
      continue
    }
    cells[at] = makeCell(
      matches[Math.floor(seededChoice(seed, p.col, p.row) * matches.length)]!.tile,
    )
  }
  if (unmatched) return { map, unmatched }
  return {
    map: withTileLayer(map, layerId, (l) =>
      l.cells.every((v, i) => v === cells[i]) ? l : { ...l, cells },
    ),
    unmatched: 0,
  }
}
export function terrainRegion(
  map: TilemapAsset,
  layerId: string,
  start: CellPos,
  terrain?: TileTerrain,
): CellPos[] {
  const layer = tileLayerById(map, layerId)
  if (!layer || start.col < 0 || start.row < 0 || start.col >= map.cols || start.row >= map.rows)
    return []
  const signature = (at: number): string => {
    const tile = cellTile(layer.cells[at] ?? -1)
    return terrain ? JSON.stringify(terrain.tiles[String(tile)] ?? []) : String(tile)
  }
  const target = signature(start.row * map.cols + start.col),
    seen = new Set<number>(),
    pending = [start],
    out: CellPos[] = []
  while (pending.length) {
    const p = pending.pop()!
    if (p.col < 0 || p.row < 0 || p.col >= map.cols || p.row >= map.rows) continue
    const at = p.row * map.cols + p.col
    if (seen.has(at) || signature(at) !== target) continue
    seen.add(at)
    out.push(p)
    pending.push(
      { col: p.col - 1, row: p.row },
      { col: p.col + 1, row: p.row },
      { col: p.col, row: p.row - 1 },
      { col: p.col, row: p.row + 1 },
    )
  }
  return out
}
export function setTilesetTerrain(ts: AnyTilesetAsset, terrain: TileTerrain): AnyTilesetAsset {
  return {
    ...ts,
    schema: 3,
    terrains: [...(ts.terrains ?? []).filter((t) => t.id !== terrain.id), terrain],
  }
}

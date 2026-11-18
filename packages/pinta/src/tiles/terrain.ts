import {
  type AnyTilesetAsset,
  effectiveLayer,
  type TilemapAsset,
  type TileTerrain,
  withPintaSchemaStamp,
} from '../core/project'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, cellFlags, cellTile, makeCell } from './cell'
import type { CellPos } from './cellGeometry'
import { tileLayerById, withTileLayer } from './tilemapOps'
export function seededChoice(seed: number, x: number, y: number): number {
  let n = (seed ^ Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263)) | 0
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}
const slots = (mode: TileTerrain['mode']): number[] =>
  mode === 'edge' ? [0, 2, 4, 6] : mode === 'corner' ? [1, 3, 5, 7] : [0, 1, 2, 3, 4, 5, 6, 7]
/** Encaixes no espaço VISUAL: diagonal primeiro, depois os espelhos, como a célula desenhada. */
function visualPattern(terrain: TileTerrain, cell: number): number[] | undefined {
  const pattern = terrain.tiles[String(cellTile(cell))]
  if (!pattern || !cellFlags(cell)) return pattern
  const points = [
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
  ]
  const transformed = Array<number>(8).fill(0),
    flags = cellFlags(cell)
  for (const [slot, point] of points.entries()) {
    let [x, y] = point as [number, number]
    if (flags & CELL_FLIP_D) [x, y] = [y, x]
    if (flags & CELL_FLIP_H) x = -x
    if (flags & CELL_FLIP_V) y = -y
    const target = points.findIndex(([px, py]) => px === x && py === y)
    transformed[target] = pattern[slot] ?? 0
  }
  return transformed
}
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
    neighbors = new Map<number, CellPos>(),
    painted = new Set<number>()
  for (const p of positions) {
    if (p.col < 0 || p.row < 0 || p.col >= map.cols || p.row >= map.rows) continue
    painted.add(p.row * map.cols + p.col)
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
    const tile = cellTile(cells[at] ?? -1),
      known = visualPattern(terrain, cells[at] ?? -1)
    // A vizinha com uma peça de FORA do terreno (uma árvore, uma casa) não é mexida: só a casa
    // que a criança pintou pode trocar uma peça que não é deste terreno.
    if (!painted.has(at) && tile >= 0 && !known) continue
    const old = known ?? Array(8).fill(0)
    const desired = old.map((v, s) => constraints.get(key(p.col, p.row, s)) ?? v)
    // Vizinha que não ganhou nenhum encaixe novo fica como está (não sorteia outra variação).
    if (!painted.has(at) && active.every((s) => desired[s] === old[s])) continue
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
    if (!terrain) return String(tile)
    if (tile < 0) return 'empty'
    const pattern = visualPattern(terrain, layer.cells[at] ?? -1)
    return pattern ? `terrain:${JSON.stringify(pattern)}` : `outside:${layer.cells[at]}`
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
  // O carimbo do formato é calculado pelo que o conjunto usa, nunca escrito à mão.
  return withPintaSchemaStamp({
    ...ts,
    terrains: [...(ts.terrains ?? []).filter((t) => t.id !== terrain.id), terrain],
  })
}

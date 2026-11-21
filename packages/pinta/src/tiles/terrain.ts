import {
  type AnyTilesetAsset,
  effectiveLayer,
  PINTA_MAP_FORMAT_LIMITS,
  type TilemapCells,
  type TileTerrain,
  withPintaSchemaStamp,
} from '../core/project'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, cellFlags, cellTile, makeCell } from './cell'
import type { CellPos } from './cellGeometry'
import { type AuthorMap, editMapCellBatch, isCellPosition } from './mapCellEdits'
import { REGION_EDIT_LIMIT, type RegionCellEdit } from './regionCells'
import { createMapLayerCellReader, tileLayerById } from './tilemapOps'
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
export function paintTerrain<Map extends AuthorMap>(
  map: Map,
  layerId: string,
  terrain: TileTerrain,
  color: number,
  positions: readonly CellPos[],
  seed = 1,
): { map: Map; unmatched: number; failure?: 'invalid-edit' | 'work-budget' | 'storage-budget' } {
  const layer = tileLayerById<TilemapCells>(map, layerId)
  if (!layer || effectiveLayer(map, layer).locked) return { map, unmatched: 0 }
  if (positions.length > REGION_EDIT_LIMIT) return { map, unmatched: 0, failure: 'work-budget' }
  if (positions.some((p) => !p || !isCellPosition(p)))
    return { map, unmatched: 0, failure: 'invalid-edit' }
  const reader = createMapLayerCellReader(map, layerId)!
  const origin = 'origin' in map ? map.origin : { col: 0, row: 0 }
  const inside = (col: number, row: number) =>
    col >= origin.col &&
    row >= origin.row &&
    col < origin.col + map.cols &&
    row < origin.row + map.rows
  const index = (col: number, row: number) => (row - origin.row) * map.cols + col - origin.col
  const active = slots(terrain.mode),
    constraints = new Map<string, number>(),
    neighbors = new Map<number, CellPos>(),
    painted = new Set<number>()
  for (const p of positions) {
    if (!inside(p.col, p.row)) continue
    painted.add(index(p.col, p.row))
    for (const s of active)
      constraints.set(key(p.col, p.row, s), Math.max(0, Math.min(terrain.colors.length, color)))
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const col = p.col + dx,
          row = p.row + dy
        if (inside(col, row)) {
          const at = index(col, row)
          if (!neighbors.has(at) && neighbors.size >= REGION_EDIT_LIMIT)
            return { map, unmatched: 0, failure: 'work-budget' }
          neighbors.set(at, { col, row })
        }
      }
  }
  const candidates = Object.entries(terrain.tiles).map(([tile, pattern]) => ({
    tile: Number(tile),
    pattern,
  }))
  if (
    candidates.length > PINTA_MAP_FORMAT_LIMITS.maxTiles ||
    candidates.some(
      (c) =>
        !Number.isInteger(c.tile) ||
        c.tile < 0 ||
        c.tile >= PINTA_MAP_FORMAT_LIMITS.maxTiles ||
        c.pattern.length !== 8 ||
        c.pattern.some((v) => !Number.isInteger(v) || v < 0 || v > terrain.colors.length),
    )
  )
    return { map, unmatched: 0, failure: 'invalid-edit' }
  // Index once; keep candidate order so the same seed retains the existing art.
  const patternKey = (pattern: readonly number[]) => active.map((s) => pattern[s]).join(',')
  const matching = new Map<string, number[]>()
  for (const candidate of candidates) {
    const key = patternKey(candidate.pattern),
      group = matching.get(key)
    if (group) group.push(candidate.tile)
    else matching.set(key, [candidate.tile])
  }
  let unmatched = 0
  const edits: RegionCellEdit[] = []
  for (const [at, p] of neighbors) {
    const current = reader.at(p.col, p.row),
      tile = cellTile(current),
      known = visualPattern(terrain, current)
    // A vizinha com uma peça de FORA do terreno (uma árvore, uma casa) não é mexida: só a casa
    // que a criança pintou pode trocar uma peça que não é deste terreno.
    if (!painted.has(at) && tile >= 0 && !known) continue
    const old = known ?? Array(8).fill(0)
    const desired = old.map((v, s) => constraints.get(key(p.col, p.row, s)) ?? v)
    // Vizinha que não ganhou nenhum encaixe novo fica como está (não sorteia outra variação).
    if (!painted.has(at) && active.every((s) => desired[s] === old[s])) continue
    if (active.every((s) => desired[s] === 0)) {
      if (current !== -1) edits.push({ ...p, cell: -1 })
      continue
    }
    const matches = matching.get(patternKey(desired))
    if (!matches?.length) {
      unmatched++
      continue
    }
    const cell = makeCell(matches[Math.floor(seededChoice(seed, p.col, p.row) * matches.length)]!)
    if (cell !== current) edits.push({ ...p, cell })
  }
  if (unmatched) return { map, unmatched }
  const next = editMapCellBatch(map, layerId, edits)
  return next === map && edits.length > 0
    ? { map, unmatched: 0, failure: 'storage-budget' }
    : { map: next, unmatched: 0 }
}
export type TerrainRegionResult =
  | { ok: true; positions: CellPos[] }
  | { ok: false; reason: 'invalid-layer' | 'invalid-edit' | 'outside-map' | 'work-budget' }

/** Admit the complete bucket before painting; callers can explain a work refusal. */
export function collectTerrainRegion(
  map: AuthorMap,
  layerId: string,
  start: CellPos,
  terrain?: TileTerrain,
): TerrainRegionResult {
  const reader = createMapLayerCellReader(map, layerId)
  const origin = 'origin' in map ? map.origin : { col: 0, row: 0 }
  const inside = (col: number, row: number) =>
    col >= origin.col &&
    row >= origin.row &&
    col < origin.col + map.cols &&
    row < origin.row + map.rows
  const index = (col: number, row: number) => (row - origin.row) * map.cols + col - origin.col
  if (!reader) return { ok: false, reason: 'invalid-layer' }
  if (!isCellPosition(start)) return { ok: false, reason: 'invalid-edit' }
  if (!inside(start.col, start.row)) return { ok: false, reason: 'outside-map' }
  const signatures = new Map<number, string>()
  const signature = (col: number, row: number): string => {
    const cell = reader.at(col, row),
      cached = signatures.get(cell)
    if (cached !== undefined) return cached
    const tile = cellTile(cell)
    if (!terrain) return String(tile)
    if (tile < 0) return 'empty'
    const pattern = visualPattern(terrain, cell),
      value = pattern ? `terrain:${JSON.stringify(pattern)}` : `outside:${cell}`
    signatures.set(cell, value)
    return value
  }
  const target = signature(start.col, start.row),
    seen = new Set<number>(),
    pending = [start],
    out: CellPos[] = []
  while (pending.length) {
    const p = pending.pop()!
    if (!inside(p.col, p.row)) continue
    const at = index(p.col, p.row)
    if (seen.has(at)) continue
    if (seen.size >= REGION_EDIT_LIMIT) return { ok: false, reason: 'work-budget' }
    seen.add(at)
    if (signature(p.col, p.row) !== target) continue
    out.push(p)
    pending.push(
      { col: p.col - 1, row: p.row },
      { col: p.col + 1, row: p.row },
      { col: p.col, row: p.row - 1 },
      { col: p.col, row: p.row + 1 },
    )
  }
  return { ok: true, positions: out }
}

/** Existing array API, backed by the same bounded collector. */
export function terrainRegion(
  map: AuthorMap,
  layerId: string,
  start: CellPos,
  terrain?: TileTerrain,
): CellPos[] {
  const result = collectTerrainRegion(map, layerId, start, terrain)
  return result.ok ? result.positions : []
}
export function setTilesetTerrain(ts: AnyTilesetAsset, terrain: TileTerrain): AnyTilesetAsset {
  // O carimbo do formato é calculado pelo que o conjunto usa, nunca escrito à mão.
  return withPintaSchemaStamp({
    ...ts,
    terrains: [...(ts.terrains ?? []).filter((t) => t.id !== terrain.id), terrain],
  })
}

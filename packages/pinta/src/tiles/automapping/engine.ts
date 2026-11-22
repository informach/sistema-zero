import { effectiveLayer, isTileLayer, tileLayerTilesetId } from '../../core/project'
import { isValidCellForTiles } from '../cell'
import type { CellRect } from '../cellGeometry'
import { type AuthorMap, isBoundedCellRect, tryEditMapCellBatch } from '../mapCellEdits'
import { mapCellBounds, type TileCellReader } from '../mapCells'
import type { RegionCellEdit } from '../regionCells'
import { seededChoice } from '../terrain'
import { createMapLayerCellReader } from '../tilemapOps'
import { AUTOMAP_LIMITS, type AutomapBook, type PatternLayer, type SheetIndex } from './book'

export type AutomapFailure =
  | 'invalid-area'
  | 'missing-layer'
  | 'changed-sheet'
  | 'locked'
  | 'work-budget'
  | 'map-limit'
export type AutomapPreview<Map extends AuthorMap> =
  | { ok: false; reason: AutomapFailure }
  | { ok: true; base: Map; map: Map; changes: number; matches: number; comparisons: number }
type PlaneState = { reader: TileCellReader; locked: boolean }

export function checkAutomapBindings(
  map: AuthorMap,
  book: AutomapBook,
  sheets: SheetIndex,
): AutomapFailure | undefined {
  for (const rule of book.rules)
    for (const planes of [rule.input, ...rule.outputs])
      for (const plane of planes) {
        const layer = map.layers.find((item) => item.id === plane.layer)
        if (!layer || !isTileLayer(layer)) return 'missing-layer'
        const sheet = sheets.get(plane.sheet)
        if (
          tileLayerTilesetId(map, layer) !== plane.sheet ||
          !sheet ||
          sheet.sha256 !== plane.sha256 ||
          plane.cells.some((v) => v !== null && !isValidCellForTiles(v, sheet.count))
        )
          return 'changed-sheet'
      }
}

/** All matching observes one immutable snapshot. Earlier rules and row-major anchors win entire output patterns. */
export function previewAutomapping<M extends AuthorMap>(
  map: M,
  book: AutomapBook,
  sheets: SheetIndex,
  area: CellRect,
  changedLayers?: ReadonlySet<string>,
  changedCells?: ReadonlySet<number>,
): AutomapPreview<M> {
  if (!isBoundedCellRect(area)) return { ok: false, reason: 'invalid-area' }
  const reason = checkAutomapBindings(map, book, sheets)
  if (reason) return { ok: false, reason }
  const bounds = mapCellBounds(map)
  const left = Math.max(bounds.col, area.col),
    top = Math.max(bounds.row, area.row),
    right = Math.min(bounds.col + bounds.cols, area.col + area.cols),
    bottom = Math.min(bounds.row + bounds.rows, area.row + area.rows)
  if (left >= right || top >= bottom)
    return { ok: true, base: map, map, changes: 0, matches: 0, comparisons: 0 }
  const layers = new Map<string, PlaneState>()
  for (const layer of map.layers)
    if (isTileLayer(layer))
      layers.set(layer.id, {
        reader: createMapLayerCellReader(map, layer.id)!,
        locked: effectiveLayer(map, layer).locked,
      })
  const pending = new Map<string, Map<number, RegionCellEdit>>()
  let matches = 0,
    comparisons = 0,
    changedWrites = 0
  const index = (col: number, row: number) => (row - bounds.row) * bounds.cols + (col - bounds.col)
  for (const rule of book.rules) {
    const inputs = rule.input.filter((p) => !changedLayers || changedLayers.has(p.layer))
    if (!inputs.length) continue
    // Null ignores a cell when comparing or writing. A touched cell must participate in an input.
    const participating = Array.from({ length: rule.width * rule.height }, (_, i) =>
      inputs.some((p) => p.cells[i] !== null),
    )
    const loX = Math.max(bounds.col, left - rule.width + 1),
      loY = Math.max(bounds.row, top - rule.height + 1),
      hiX = Math.min(right - 1, bounds.col + bounds.cols - rule.width),
      hiY = Math.min(bottom - 1, bounds.row + bounds.rows - rule.height)
    for (let y = loY; y <= hiY; y++)
      for (let x = loX; x <= hiX; x++) {
        let hit = false,
          valid = true
        for (let dy = Math.max(0, top - y); dy < Math.min(rule.height, bottom - y) && !hit; dy++)
          for (let dx = Math.max(0, left - x); dx < Math.min(rule.width, right - x); dx++) {
            if (++comparisons > AUTOMAP_LIMITS.comparisons)
              return { ok: false, reason: 'work-budget' }
            if (
              participating[dy * rule.width + dx] &&
              (!changedCells || changedCells.has(index(x + dx, y + dy)))
            ) {
              hit = true
              break
            }
          }
        if (!hit) continue
        for (const plane of rule.input) {
          const reader = layers.get(plane.layer)!.reader
          for (let i = 0; i < plane.cells.length; i++) {
            if (++comparisons > AUTOMAP_LIMITS.comparisons)
              return { ok: false, reason: 'work-budget' }
            const cell = plane.cells[i]
            if (
              cell !== null &&
              reader.at(x + (i % rule.width), y + Math.floor(i / rule.width)) !== cell
            ) {
              valid = false
              break
            }
          }
          if (!valid) break
        }
        if (!valid) continue
        const chosen =
          rule.outputs[Math.floor(seededChoice(book.seed, x, y) * rule.outputs.length)]!
        const writes: { plane: PatternLayer; edit: RegionCellEdit; at: number }[] = []
        let overlap = false
        for (const plane of chosen) {
          for (let i = 0; i < plane.cells.length; i++) {
            if (++comparisons > AUTOMAP_LIMITS.comparisons)
              return { ok: false, reason: 'work-budget' }
            const cell = plane.cells[i]!
            if (cell === null) continue
            const col = x + (i % rule.width),
              row = y + Math.floor(i / rule.width),
              at = index(col, row)
            if (pending.get(plane.layer)?.has(at)) {
              overlap = true
              break
            }
            writes.push({ plane, edit: { col, row, cell }, at })
          }
          if (overlap) break
        }
        if (overlap) continue
        for (const { plane, edit, at } of writes) {
          const state = layers.get(plane.layer)!
          if (state.reader.at(edit.col, edit.row) !== edit.cell) {
            if (state.locked) return { ok: false, reason: 'locked' }
            if (++changedWrites > AUTOMAP_LIMITS.writes) return { ok: false, reason: 'work-budget' }
          }
          let edits = pending.get(plane.layer)
          if (!edits) {
            edits = new Map()
            pending.set(plane.layer, edits)
          }
          edits.set(at, edit)
        }
        matches++
      }
  }
  let next = map,
    changes = 0
  for (const [id, pendingCells] of pending) {
    const edits = [...pendingCells.values()].filter(
      (e) => layers.get(id)!.reader.at(e.col, e.row) !== e.cell,
    )
    if (!edits.length) continue
    const result = tryEditMapCellBatch(next, id, edits)
    if (result.failure) return { ok: false, reason: 'map-limit' }
    next = result.map
    changes += edits.length
  }
  return { ok: true, base: map, map: next, changes, matches, comparisons }
}

export function captureAutomapExample(
  map: AuthorMap,
  area: CellRect,
  ids: readonly string[],
  sheets: SheetIndex,
  ignoreEmpty = false,
): PatternLayer[] | null {
  if (
    !isBoundedCellRect(area) ||
    area.cols > AUTOMAP_LIMITS.side ||
    area.rows > AUTOMAP_LIMITS.side ||
    !ids.length ||
    ids.length > AUTOMAP_LIMITS.layers ||
    new Set(ids).size !== ids.length
  )
    return null
  const bounds = mapCellBounds(map)
  if (
    area.col < bounds.col ||
    area.row < bounds.row ||
    area.col + area.cols > bounds.col + bounds.cols ||
    area.row + area.rows > bounds.row + bounds.rows
  )
    return null
  const planes: PatternLayer[] = []
  for (const id of ids) {
    const layer = map.layers.find((item) => item.id === id)
    if (!layer || !isTileLayer(layer)) return null
    const sheet = tileLayerTilesetId(map, layer),
      identity = sheets.get(sheet),
      reader = createMapLayerCellReader(map, id)!
    if (!identity) return null
    const cells: (number | null)[] = []
    for (let row = area.row; row < area.row + area.rows; row++)
      for (let col = area.col; col < area.col + area.cols; col++) {
        const cell = reader.at(col, row)
        cells.push(ignoreEmpty && cell === -1 ? null : cell)
      }
    if (cells.some((cell) => cell !== null))
      planes.push({ layer: id, sheet, sha256: identity.sha256, cells })
  }
  return planes.length ? planes : null
}

/** Exact cells changed by a dense editing gesture, including the shift when its left/top edge grew. */
export function previewAutomapStroke<M extends import('../../core/project').TilemapAsset>(
  before: M,
  painted: M,
  layer: string,
  book: AutomapBook,
  sheets: SheetIndex,
  shift = { col: 0, row: 0 },
): AutomapPreview<M> {
  if (before.id !== painted.id || painted.cols * painted.rows > AUTOMAP_LIMITS.writes)
    return { ok: false, reason: 'work-budget' }
  const old = createMapLayerCellReader(before, layer),
    current = createMapLayerCellReader(painted, layer)
  if (!old || !current) return { ok: false, reason: 'missing-layer' }
  const changed = new Set<number>()
  let minX = painted.cols,
    minY = painted.rows,
    maxX = -1,
    maxY = -1
  for (let row = 0; row < painted.rows; row++)
    for (let col = 0; col < painted.cols; col++) {
      if (old.at(col - shift.col, row - shift.row) === current.at(col, row)) continue
      changed.add(row * painted.cols + col)
      minX = Math.min(minX, col)
      minY = Math.min(minY, row)
      maxX = Math.max(maxX, col)
      maxY = Math.max(maxY, row)
    }
  if (!changed.size)
    return { ok: true, base: before, map: painted, matches: 0, changes: 0, comparisons: 0 }
  const result = previewAutomapping(
    painted,
    book,
    sheets,
    { col: minX, row: minY, cols: maxX - minX + 1, rows: maxY - minY + 1 },
    new Set([layer]),
    changed,
  )
  if (!result.ok) return result
  // Count each final changed address once, including the original stroke. Rules can
  // overwrite the brush layer or restore its previous value.
  if (changed.size + result.changes > AUTOMAP_LIMITS.writes) {
    let total = result.changes
    const final = createMapLayerCellReader(result.map, layer)!
    for (const at of changed) {
      const col = at % painted.cols,
        row = Math.floor(at / painted.cols),
        cell = final.at(col, row)
      if (cell !== current.at(col, row)) total--
      if (cell !== old.at(col - shift.col, row - shift.row)) total++
    }
    if (total > AUTOMAP_LIMITS.writes) return { ok: false, reason: 'work-budget' }
  }
  return { ...result, base: before }
}

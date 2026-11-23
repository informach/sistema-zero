import {
  createHexRegionCellReader,
  createRegionCellReader,
  PINTA_HEX_EMPTY_CELL,
  PINTA_HEX_TILE_MASK,
  pintaHexCellTile,
} from '@sistemazero/core/creations'
import { pintaValuesEqual } from '../core/assetEquality'
import type { TilemapObject } from '../core/project'
import { isProjectedTileLayer, type ProjectedTileCells } from '../core/projectedDocument'
import { cellTile, withCellTile } from '../tiles/cell'
import type { WorkshopProjectedMap } from './workshopProjection'

type Changes = ReadonlyMap<string, readonly number[]>
function remapArt(object: TilemapObject, changes: Changes): TilemapObject | null {
  const art = object.art,
    mapping = art && changes.get(art.assetId)
  if (!art || !mapping) return object
  const previous = art.tile ?? 0,
    next = mapping[previous]
  if (next === undefined) return null
  if (next === previous) return object
  if (next < 0) {
    const { art: _old, ...rest } = object
    return { ...rest, shape: 'rect' }
  }
  return { ...object, art: { ...art, tile: next } }
}
function comparableArt(object: TilemapObject, changes: Changes) {
  const art = object.art
  if (!art || art.tile !== 0 || !changes.has(art.assetId)) return object
  const { tile: _zero, ...rest } = art
  return { ...object, art: rest }
}

function sameMappedGrid(
  before: ProjectedTileCells,
  after: ProjectedTileCells,
  mapping: readonly number[],
  bounds: { col: number; row: number; cols: number; rows: number },
): boolean {
  if (before.kind !== after.kind) return false
  const hex = before.kind === 'hex-regions'
  const source =
    before.kind === 'hex-regions'
      ? createHexRegionCellReader(before)
      : createRegionCellReader(before)
  const target =
    after.kind === 'hex-regions' ? createHexRegionCellReader(after) : createRegionCellReader(after)
  let valid = true,
    survivors = 0,
    occupied = 0
  source.visitOccupied(bounds, (cell, col, row) => {
    const next = mapping[hex ? pintaHexCellTile(cell) : cellTile(cell)]
    if (next === undefined) {
      valid = false
      return
    }
    const value = hex
      ? next < 0
        ? PINTA_HEX_EMPTY_CELL
        : ((cell & ~PINTA_HEX_TILE_MASK) | next) >>> 0
      : withCellTile(cell, next)
    if (next >= 0) survivors++
    if (target.at(col, row) !== value) valid = false
  })
  target.visitOccupied(bounds, () => {
    occupied++
  })
  return valid && occupied === survivors
}

/** A projected map never passes through a square-map sanitizer. Both sides were admitted before replay. */
export function proveProjectedRemap(
  before: WorkshopProjectedMap,
  after: WorkshopProjectedMap,
  changes: Changes,
): boolean {
  const { updatedAt: _fromTime, automapping: _fromBook, layers: fromLayers, ...from } = before
  const { updatedAt: _toTime, automapping: _toBook, layers: to, ...rest } = after
  if (!pintaValuesEqual(from, rest) || fromLayers.length !== to.length) return false
  const bounds = { ...before.origin, cols: before.cols, rows: before.rows }
  return fromLayers.every((layer, index) => {
    const candidate = to[index]!
    if (isProjectedTileLayer(layer) && isProjectedTileLayer(candidate)) {
      const { cells, ...header } = layer,
        { cells: next, ...nextHeader } = candidate
      if (!pintaValuesEqual(header, nextHeader)) return false
      const mapping = changes.get(layer.tilesetId ?? before.tilesetId)
      return mapping ? sameMappedGrid(cells, next, mapping, bounds) : pintaValuesEqual(cells, next)
    }
    if (layer.kind === 'objects' && candidate.kind === 'objects') {
      const { objects, ...header } = layer,
        { objects: next, ...target } = candidate
      return (
        pintaValuesEqual(header, target) &&
        objects.length === next.length &&
        objects.every((object, i) => {
          const expected = remapArt(object, changes)
          return (
            expected &&
            pintaValuesEqual(comparableArt(expected, changes), comparableArt(next[i]!, changes))
          )
        })
      )
    }
    return pintaValuesEqual(layer, candidate)
  })
}

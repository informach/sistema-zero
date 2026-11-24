import {
  effectiveLayer,
  isObjectLayer,
  isTileLayer,
  type TilemapCells,
  type TilemapLayer,
  type TilemapObject,
  tileLayerTilesetId,
} from '../core/project'
import { cellTile } from '../tiles/cell'
import type { AuthorMap } from '../tiles/mapCellEdits'
import { createTileCellReader, mapCellBounds } from '../tiles/mapCells'
import { removeMapObject } from '../tiles/mapObjects'
import { removeLayer } from '../tiles/tilemapOps'

type SlotChanges = ReadonlyMap<string, readonly number[]>

function changesSlot(mapping: readonly number[], index: number): boolean {
  const next = mapping[index]
  return next !== undefined && next !== index
}

function affectedArtwork(object: TilemapObject, changes: SlotChanges): string | undefined {
  const art = object.art
  const mapping = art && changes.get(art.assetId)
  return art && mapping && changesSlot(mapping, art.tile ?? 0) ? art.assetId : undefined
}

function addAffectedSheets(
  map: AuthorMap,
  layer: TilemapLayer<TilemapCells>,
  changes: SlotChanges,
  affected: Set<string>,
): void {
  if (isTileLayer<TilemapCells>(layer)) {
    const sheetId = tileLayerTilesetId(map, layer)
    const mapping = changes.get(sheetId)
    if (!mapping || affected.has(sheetId)) return
    const bounds = mapCellBounds(map)
    createTileCellReader(layer.cells, bounds).visitOccupied(bounds, (cell) => {
      if (changesSlot(mapping, cellTile(cell))) affected.add(sheetId)
    })
  } else if (isObjectLayer(layer)) {
    for (const object of layer.objects) {
      const sheetId = affectedArtwork(object, changes)
      if (sheetId !== undefined) affected.add(sheetId)
    }
  }
}

/** Replays the editor's remove-layer and remove-object gestures for identified consumers. */
export function provePintaCausalRemovals(
  before: AuthorMap,
  proposed: AuthorMap,
  changes: SlotChanges,
): { map: AuthorMap; detached: ReadonlySet<string> } | null {
  const proposedById = new Map(proposed.layers.map((layer) => [layer.id, layer]))
  const removed = new Set<string>()
  let map = before

  for (const layer of before.layers) {
    const candidate = proposedById.get(layer.id)
    if (!candidate) {
      const affected = new Set<string>()
      addAffectedSheets(before, layer, changes, affected)
      if (!affected.size) return null
      const next = removeLayer(map, layer.id)
      if (next === map) return null
      map = next
      for (const sheetId of affected) removed.add(sheetId)
      continue
    }
    if (
      !isObjectLayer(layer) ||
      !isObjectLayer(candidate) ||
      candidate.objects.length >= layer.objects.length
    )
      continue
    const retained = new Set(candidate.objects.map(({ id }) => id))
    for (const object of layer.objects) {
      if (retained.has(object.id)) continue
      const sheetId = affectedArtwork(object, changes)
      if (sheetId === undefined || effectiveLayer(map, layer).locked) return null
      const next = removeMapObject(map, layer.id, object.id)
      if (next === map) return null
      map = next
      removed.add(sheetId)
    }
  }

  if (removed.size) {
    const remainingChanges = new Map<string, readonly number[]>()
    for (const id of removed) {
      const mapping = changes.get(id)
      if (mapping) remainingChanges.set(id, mapping)
    }
    const remaining = new Set<string>()
    for (const layer of map.layers) addAffectedSheets(map, layer, remainingChanges, remaining)
    for (const id of remaining) removed.delete(id)
  }
  return { map, detached: removed }
}

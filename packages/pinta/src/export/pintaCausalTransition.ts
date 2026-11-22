import type {
  PintaCausalManifest,
  PintaCausalOperation,
} from '@sistemazero/core/creations/pinta-causal'
import { pintaValuesEqual } from '../core/assetEquality'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { type AnyTilesetAsset, isTilesetKind, tilemapOfAsset } from '../core/project'
import {
  addTile,
  duplicateTile,
  removeTile,
  type TileIndexChange,
  tryRemapTilemapCells,
} from '../tiles/tilesetOps'

type RemapOperation = Extract<PintaCausalOperation, { type: 'remap' }>

/** Translate only recipes implemented by the authoring reducer. */
export function pintaCausalRemapChange(operation: RemapOperation): TileIndexChange | null {
  const { count, oldToNew } = operation
  if (count === oldToNew.length - 1) {
    const removedAt = oldToNew.indexOf(-1)
    if (
      removedAt >= 0 &&
      oldToNew.every(
        (slot, index) => slot === (index === removedAt ? -1 : index - Number(index > removedAt)),
      )
    )
      return { removedAt }
  } else if (count === oldToNew.length + 1) {
    const moved = oldToNew.findIndex((slot, index) => slot !== index)
    const insertedAt = moved < 0 ? oldToNew.length : moved
    if (oldToNew.every((slot, index) => slot === index + Number(index >= insertedAt)))
      return { insertedAt }
  }
  return null
}

function sameDocument(expected: PintaMemoryAsset, proposed: PintaMemoryAsset): boolean {
  const {
    updatedAt: _beforeTime,
    schema: _beforeSchema,
    ...before
  } = { schema: undefined, ...expected }
  const {
    updatedAt: _afterTime,
    schema: _afterSchema,
    ...after
  } = { schema: undefined, ...proposed }
  return pintaValuesEqual(before, after)
}

/** Palette and terrain definitions also affect the interpretation of existing slots. */
function sheetDefinition(sheet: AnyTilesetAsset) {
  const {
    tiles: _tiles,
    solid: _solid,
    platform: _platform,
    animations: _animations,
    tileProperties: _tileProperties,
    terrains,
    updatedAt: _time,
    schema: _schema,
    name: _name,
    projectRef: _project,
    sourceRef: _source,
    ...definition
  } = sheet
  return {
    ...definition,
    terrains: terrains?.map(({ tiles: _tiles, ...terrain }) => terrain),
  }
}

function bitAt(mask: string | undefined, index: number): boolean {
  if (mask === undefined) return false
  const byte = (index >> 3) * 2
  return (Number.parseInt(mask.slice(byte, byte + 2), 16) & (1 << (index & 7))) !== 0
}

function sameSlot(before: AnyTilesetAsset, after: AnyTilesetAsset, index: number): boolean {
  return (
    pintaValuesEqual(before.tiles[index], after.tiles[index]) &&
    before.solid[index] === after.solid[index] &&
    before.platform[index] === after.platform[index] &&
    pintaValuesEqual(before.animations?.[index], after.animations?.[index]) &&
    pintaValuesEqual(before.tileProperties?.[index], after.tileProperties?.[index]) &&
    (before.terrains?.every((terrain, i) =>
      pintaValuesEqual(terrain.tiles[index], after.terrains?.[i]?.tiles[index]),
    ) ??
      true)
  )
}

/** IDs generated for a vector duplicate may differ, with every other field tied to the recipe. */
function matchesDuplicate(
  before: AnyTilesetAsset,
  after: AnyTilesetAsset,
  sourceIndex: number,
): boolean {
  const duplicate = duplicateTile(before, sourceIndex)
  if (duplicate === before) return false
  if (before.kind === 'tileset') return sameDocument(duplicate, after)
  if (duplicate.kind !== 'vector-tileset' || after.kind !== 'vector-tileset') return false
  const insertedAt = sourceIndex + 1
  const created = after.tiles[insertedAt]
  const original = before.tiles[sourceIndex]
  if (!created || !original || created.length !== original.length) return false
  const existing = new Set<string>()
  for (const shapes of before.tiles)
    for (const shape of shapes) {
      existing.add(shape.id)
      if (shape.motionId) existing.add(shape.motionId)
    }
  for (const [index, shape] of created.entries()) {
    const { id, motionId, ...art } = shape
    if (!motionId || id === motionId || existing.has(id) || existing.has(motionId)) return false
    existing.add(id)
    existing.add(motionId)
    const { id: _id, motionId: _motionId, ...sourceArt } = original[index]!
    if (!pintaValuesEqual(art, sourceArt)) return false
  }
  const tiles = duplicate.tiles.map((tile, index) => (index === insertedAt ? created : tile))
  return sameDocument({ ...duplicate, tiles }, after)
}

/** Proves the operation from exact, separately decoded before and proposed revisions. */
export function provePintaCausalMutation(
  before: PintaMemoryAsset | null,
  after: PintaMemoryAsset,
  operation: PintaCausalOperation,
): boolean {
  if (operation.type === 'create') return before === null
  if (!before || before.id !== after.id || before.kind !== after.kind) return false
  if (!isTilesetKind(before) || !isTilesetKind(after)) return operation.type === 'update'
  if (before.tileSize !== after.tileSize) return false
  if (operation.type === 'remap') {
    if (before.tiles.length !== operation.oldToNew.length || after.tiles.length !== operation.count)
      return false
    const change = pintaCausalRemapChange(operation)
    if (!change) return false
    if ('removedAt' in change) return sameDocument(removeTile(before, change.removedAt), after)
    const sourceIndex = change.insertedAt - 1
    return (
      sameDocument(addTile(before, sourceIndex), after) ||
      (sourceIndex >= 0 && matchesDuplicate(before, after, sourceIndex))
    )
  }

  if (!pintaValuesEqual(sheetDefinition(before), sheetDefinition(after))) return false
  const oldCount = before.tiles.length
  if (operation.type === 'append') {
    if (operation.count !== after.tiles.length || after.tiles.length <= oldCount) return false
  } else if (oldCount !== after.tiles.length) return false
  const painted = operation.type === 'paint' ? operation.slots : undefined
  if (painted) {
    for (let slot = oldCount; slot < painted.length * 4; slot++)
      if (bitAt(painted, slot)) return false
  }
  return before.tiles.every((_, index) => bitAt(painted, index) || sameSlot(before, after, index))
}

interface SheetRemap {
  sheetId: string
  operation: RemapOperation
}

/** The manifest finds likely consumers. The full comparison proves positions, flags and object art. */
export function provePintaCausalConsumerRemaps(
  before: { asset: PintaMemoryAsset; manifest: PintaCausalManifest },
  after: PintaMemoryAsset,
  remaps: readonly SheetRemap[],
): { sheetId: string; mode: 'mapped' }[] | null {
  let expected = tilemapOfAsset(before.asset)
  const verified: { sheetId: string; mode: 'mapped' }[] = []
  for (const { sheetId, operation } of remaps) {
    const edge = before.manifest.refs.find((ref) => ref.id === sheetId)
    if (
      !edge ||
      !operation.oldToNew.some(
        (next, slot) =>
          next !== slot && (bitAt(edge.indices, slot) || (slot === 0 && edge.implicitArtSlotZero)),
      )
    )
      continue
    if (!expected) return null
    const change = pintaCausalRemapChange(operation)
    if (!change) return null
    const result: ReturnType<typeof tryRemapTilemapCells> = tryRemapTilemapCells(
      expected,
      change,
      sheetId,
    )
    if (!result.ok) return null
    expected = result.map
    verified.push({ sheetId, mode: 'mapped' })
  }
  if (!verified.length) return verified
  if (!expected) return null
  // The definition keeps its own creation identity while the outer item carries updatedAt.
  const expectedAsset =
    before.asset.kind === 'map-set' ? { ...before.asset, map: expected } : expected
  return sameDocument(expectedAsset as PintaMemoryAsset, after) ? verified : null
}

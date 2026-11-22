import {
  type PintaCausalManifest,
  type PintaCausalOperation,
  pintaCausalMaskFits,
  pintaCausalMaskHasSlot,
} from '@sistemazero/core/creations/pinta-causal'
import { pintaValuesEqual } from '../core/assetEquality'
import type { PintaMemoryAsset } from '../core/assetMemory'
import {
  type AnyTilesetAsset,
  isObjectLayer,
  isTilesetKind,
  remapTilemapTilesetIds,
  type TilemapResourceVersion,
  tilemapOfAsset,
} from '../core/project'
import type { AuthorMap } from '../tiles/mapCellEdits'
import { mapResourceSnapshotAsset } from '../tiles/resourceVersions'
import { remapTileMetadata, tryRemapTilemapIndices } from '../tiles/tilesetOps'

type RemapOperation = Extract<PintaCausalOperation, { type: 'remap' }>
type Art = { assetId: string; tile?: number; animationId?: string }

function comparableDocument(asset: PintaMemoryAsset) {
  const { updatedAt: _updatedAt, schema: _schema, ...document } = { schema: undefined, ...asset }
  if (document.kind !== 'map-set') return document
  const { schema: _mapSchema, ...map } = document.map
  return { ...document, map }
}

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
  return { ...definition, terrains: terrains?.map(({ tiles: _tiles, ...terrain }) => terrain) }
}

function sameSlot(
  before: AnyTilesetAsset,
  after: AnyTilesetAsset,
  source: number,
  target = source,
  metadata = before,
): boolean {
  return (
    pintaValuesEqual(before.tiles[source], after.tiles[target]) &&
    before.solid[source] === after.solid[target] &&
    before.platform[source] === after.platform[target] &&
    pintaValuesEqual(metadata.animations?.[target], after.animations?.[target]) &&
    pintaValuesEqual(metadata.tileProperties?.[target], after.tileProperties?.[target]) &&
    (metadata.terrains?.every((terrain, i) =>
      pintaValuesEqual(terrain.tiles[target], after.terrains?.[i]?.tiles[target]),
    ) ??
      true)
  )
}

/** Final surviving indices whose content differs after applying the canonical metadata remap. */
export function pintaCausalChangedSurvivingSlots(
  before: AnyTilesetAsset,
  after: AnyTilesetAsset,
  oldToNew: readonly number[],
): number[] | null {
  if (
    before.id !== after.id ||
    before.kind !== after.kind ||
    before.tileSize !== after.tileSize ||
    before.createdAt !== after.createdAt ||
    oldToNew.length !== before.tiles.length
  )
    return null

  const survivors = new Set<number>()
  for (const target of oldToNew) {
    if (
      !Number.isSafeInteger(target) ||
      target < -1 ||
      target >= after.tiles.length ||
      survivors.has(target)
    )
      return null
    if (target !== -1) survivors.add(target)
  }
  if (!pintaValuesEqual(sheetDefinition(before), sheetDefinition(after))) return [...survivors]

  const metadata = remapTileMetadata(before, (index) => oldToNew[index] ?? -1)
  const changed: number[] = []
  for (const [source, target] of oldToNew.entries())
    if (target >= 0 && !sameSlot(before, after, source, target, metadata)) changed.push(target)
  return changed
}

/** A new vector slot may carry new art, with identities independent of existing shapes. */
function newVectorShapeIdsAreIndependent(
  before: AnyTilesetAsset,
  after: AnyTilesetAsset,
  survivingTargets: ReadonlySet<number>,
): boolean {
  if (before.kind !== 'vector-tileset' || after.kind !== 'vector-tileset') return true
  const known = new Set<string>()
  for (const shapes of before.tiles)
    for (const shape of shapes) {
      known.add(shape.id)
      if (shape.motionId) known.add(shape.motionId)
    }
  for (const [index, shapes] of after.tiles.entries()) {
    if (survivingTargets.has(index)) continue
    for (const { id, motionId } of shapes) {
      if (known.has(id) || (motionId && (id === motionId || known.has(motionId)))) return false
      known.add(id)
      if (motionId) known.add(motionId)
    }
  }
  return true
}

export function provePintaCausalMutation(
  before: PintaMemoryAsset | null,
  after: PintaMemoryAsset,
  operation: PintaCausalOperation,
): boolean {
  if (operation.type === 'create') return before === null
  if (!before || before.id !== after.id || before.kind !== after.kind) return false
  if (!isTilesetKind(before) || !isTilesetKind(after)) return operation.type === 'update'
  if (before.tileSize !== after.tileSize || before.createdAt !== after.createdAt) return false

  if (operation.type === 'remap') {
    if (
      after.tiles.length !== operation.count ||
      (operation.paintedSlots && !pintaCausalMaskFits(operation.paintedSlots, operation.count))
    )
      return false
    const changed = pintaCausalChangedSurvivingSlots(before, after, operation.oldToNew)
    if (!changed?.every((slot) => maskHasSlot(operation.paintedSlots, slot))) return false
    return newVectorShapeIdsAreIndependent(before, after, new Set(operation.oldToNew))
  }

  const oldCount = before.tiles.length
  if (operation.type === 'append') {
    if (operation.count !== after.tiles.length || after.tiles.length <= oldCount) return false
  } else if (oldCount !== after.tiles.length) return false
  const painted = operation.type === 'paint' ? operation.slots : undefined
  if (painted && !pintaCausalMaskFits(painted, oldCount)) return false
  const sharedDefinition = pintaValuesEqual(sheetDefinition(before), sheetDefinition(after))
  return before.tiles.every(
    (_, index) =>
      maskHasSlot(painted, index) || (sharedDefinition && sameSlot(before, after, index)),
  )
}

function maskHasSlot(mask: string | undefined, slot: number): boolean {
  return mask !== undefined && pintaCausalMaskHasSlot(mask, slot)
}

interface SheetRemap {
  sheetId: string
  operation: RemapOperation
}
type BeforeDocument = { asset: PintaMemoryAsset; manifest: PintaCausalManifest }

function affectedRemaps(before: BeforeDocument, remaps: readonly SheetRemap[]): SheetRemap[] {
  const refs = new Map(before.manifest.refs.map((ref) => [ref.id, ref]))
  return remaps.filter(({ sheetId, operation }) => {
    const edge = refs.get(sheetId)
    return (
      edge &&
      operation.oldToNew.some(
        (next, slot) =>
          next !== slot &&
          (maskHasSlot(edge.indices, slot) || (slot === 0 && edge.implicitArtSlotZero)),
      )
    )
  })
}

function newSnapshotVersions(
  before: PintaMemoryAsset,
  after: PintaMemoryAsset,
): TilemapResourceVersion[] {
  const known = new Set(tilemapOfAsset(before)?.resources?.map((version) => version.asset.id))
  return (tilemapOfAsset(after)?.resources ?? []).filter((version) => !known.has(version.asset.id))
}

/** Only look up bases when a failed mapped proof has a candidate private snapshot to verify. */
export function pintaCausalPinSourceIds(
  before: BeforeDocument,
  after: PintaMemoryAsset,
  remaps: readonly SheetRemap[],
): string[] {
  const snapshots = new Set(
    newSnapshotVersions(before.asset, after).map(({ sourceId }) => sourceId),
  )
  return affectedRemaps(before, remaps)
    .map(({ sheetId }) => sheetId)
    .filter((id) => snapshots.has(id))
}

function compareAssetWithMap(asset: PintaMemoryAsset, map: AuthorMap) {
  return (asset.kind === 'map-set' ? { ...asset, map } : map) as PintaMemoryAsset
}

/** Update only authored artwork references; other typed properties remain untouched. */
function mapArtwork<Map extends AuthorMap>(map: Map, change: (art: Art) => Art): Map {
  return {
    ...map,
    layers: map.layers.map((layer) =>
      isObjectLayer(layer)
        ? {
            ...layer,
            objects: layer.objects.map((object) =>
              object.art ? { ...object, art: change(object.art) } : object,
            ),
          }
        : layer,
    ),
  } as Map
}

function zeroAsDefault(art: Art, sheets: ReadonlySet<string>): Art {
  if (art.tile !== 0 || !sheets.has(art.assetId)) return art
  const { tile: _tile, ...implicit } = art
  return implicit
}

/** Compare every authored layer, placement and flag after a composed index change. */
export function provePintaCausalConsumerRemaps(
  before: BeforeDocument,
  after: PintaMemoryAsset,
  remaps: readonly SheetRemap[],
  pinBases: ReadonlyMap<string, AnyTilesetAsset> = new Map(),
): { sheetId: string; mode: 'mapped' | 'pinned' }[] | null {
  const affected = affectedRemaps(before, remaps)
  if (!affected.length) return []
  let expected = tilemapOfAsset(before.asset)
  const proposed = tilemapOfAsset(after)
  if (!expected || !proposed) return null

  const snapshots = newSnapshotVersions(before.asset, after)
  const reserved = new Set([
    before.asset.id,
    expected.id,
    ...before.manifest.refs.map(({ id }) => id),
  ])
  const recognized = new Set<string>()
  const added = new Set<TilemapResourceVersion>()
  const verified: { sheetId: string; mode: 'mapped' | 'pinned' }[] = []
  for (const { sheetId, operation } of affected) {
    const source = pinBases.get(sheetId)
    recognized.add(sheetId)
    if (!source) {
      const result: ReturnType<typeof tryRemapTilemapIndices> = tryRemapTilemapIndices(
        expected,
        operation.oldToNew,
        sheetId,
      )
      if (!result.ok) return null
      expected = result.map
      verified.push({ sheetId, mode: 'mapped' })
      continue
    }
    const candidates = snapshots.filter((snapshot) => snapshot.sourceId === sheetId)
    const pinned = candidates[0]
    if (
      source.id !== sheetId ||
      candidates.length !== 1 ||
      !pinned ||
      reserved.has(pinned.asset.id) ||
      !pintaValuesEqual(mapResourceSnapshotAsset(source, pinned.asset.id), pinned.asset)
    )
      return null

    const pinnedId = pinned.asset.id
    reserved.add(pinnedId)
    recognized.add(pinnedId)
    added.add(pinned)
    expected = remapTilemapTilesetIds(expected, (id) => (id === sheetId ? pinnedId : id))
    expected = mapArtwork(expected, (art) =>
      art.assetId === sheetId ? { ...art, assetId: pinnedId } : art,
    )
    verified.push({ sheetId, mode: 'pinned' })
  }
  if (added.size > 0)
    expected = {
      ...expected,
      resources: [...(expected.resources ?? []), ...snapshots.filter((entry) => added.has(entry))],
    }

  const compare = (asset: PintaMemoryAsset, map: AuthorMap) =>
    comparableDocument(
      compareAssetWithMap(
        asset,
        mapArtwork(map, (art) => zeroAsDefault(art, recognized)),
      ),
    )
  return pintaValuesEqual(compare(before.asset, expected), compare(after, proposed))
    ? verified
    : null
}

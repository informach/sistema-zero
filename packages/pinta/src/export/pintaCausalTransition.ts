import {
  type PintaCausalAttestation,
  type PintaCausalManifest,
  type PintaCausalOperation,
  pintaCausalMaskFits,
  pintaCausalMaskHasSlot,
} from '@sistemazero/core/creations/pinta-causal'
import { pintaValuesEqual } from '../core/assetEquality'
import { type PintaMemoryAsset, retainedAssetBytes } from '../core/assetMemory'
import {
  type AnyTilesetAsset,
  effectiveLayer,
  isCompatibleMapTileset,
  isObjectLayer,
  isTileLayer,
  isTilesetKind,
  pintaAssetDependencyIds,
  remapTilemapTilesetIds,
  type TilemapCells,
  type TilemapResourceVersion,
  tilemapOfAsset,
  tilemapTilesetIds,
} from '../core/project'
import { PINTA_RESOURCE_LIMITS } from '../core/projectConfig'
import type { AuthorMap } from '../tiles/mapCellEdits'
import { objectLayerById, updateMapObject } from '../tiles/mapObjects'
import { mapResourceSnapshotAsset } from '../tiles/resourceVersions'
import { remapTileMetadata, tryRemapTilemapIndices } from '../tiles/tilesetOps'
import { provePintaCausalRemovals } from './pintaCausalDetach'

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
  return remaps.map(({ sheetId }) => sheetId).filter((id) => snapshots.has(id))
}

type PintaCausalPin = {
  snapshot: TilemapResourceVersion
  dependencyIds: readonly string[]
  sourceBytes: number
}

/** Check one sealed source and retain only evidence and the snapshot already in the proposal. */
export function provePintaCausalPin(
  before: PintaMemoryAsset,
  after: PintaMemoryAsset,
  source: AnyTilesetAsset,
  checkedBytes = 0,
): PintaCausalPin | null {
  const candidates = newSnapshotVersions(before, after).filter(
    ({ sourceId }) => sourceId === source.id,
  )
  const snapshot = candidates[0]
  if (candidates.length !== 1 || !snapshot) return null
  const sourceBytes = retainedAssetBytes(source)
  if (
    checkedBytes + sourceBytes > PINTA_RESOURCE_LIMITS.maxSnapshotBytes ||
    !pintaValuesEqual(mapResourceSnapshotAsset(source, snapshot.asset.id), snapshot.asset)
  )
    return null
  return { snapshot, dependencyIds: pintaAssetDependencyIds(source), sourceBytes }
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

function replayGridPin(expected: AuthorMap, grid: ReadonlyMap<string, TilemapResourceVersion>) {
  const current = tilemapTilesetIds(expected)
  const base = grid.get(expected.tilesetId)?.asset
  if (
    grid.size !== current.length ||
    !base ||
    !isTilesetKind(base) ||
    expected.layers.some(
      (layer) => isTileLayer<TilemapCells>(layer) && effectiveLayer(expected, layer).locked,
    )
  )
    return null
  for (const id of current) {
    const sheet = grid.get(id)?.asset
    if (!sheet || !isTilesetKind(sheet) || !isCompatibleMapTileset(base, sheet)) return null
  }
  return remapTilemapTilesetIds(expected, (id) => grid.get(id)?.asset.id ?? id)
}

function replayObjectPin(
  expected: AuthorMap,
  proposed: AuthorMap,
  snapshot: TilemapResourceVersion,
) {
  const targets = proposed.layers.flatMap((layer) =>
    isObjectLayer(layer)
      ? layer.objects
          .filter((object) => object.art?.assetId === snapshot.asset.id)
          .map((object) => ({ layerId: layer.id, objectId: object.id }))
      : [],
  )
  const target = targets[0]
  if (targets.length !== 1 || !target) return null
  const art = objectLayerById(expected, target.layerId)?.objects.find(
    (object) => object.id === target.objectId,
  )?.art
  if (art?.assetId !== snapshot.sourceId || art.animationId !== undefined) return null
  const next = updateMapObject(expected, target.layerId, target.objectId, {
    art: { ...art, assetId: snapshot.asset.id },
  })
  return next === expected ? null : next
}

function replayVerifiedPins(
  expected: AuthorMap,
  proposed: AuthorMap,
  pins: ReadonlyMap<string, PintaCausalPin>,
  snapshots: readonly TilemapResourceVersion[],
  externalIds: ReadonlySet<string>,
): AuthorMap | null {
  if (!pins.size) return expected
  const reserved = new Set(externalIds)
  for (const pin of pins.values()) for (const id of pin.dependencyIds) reserved.add(id)
  const grid = new Map<string, TilemapResourceVersion>()
  const objectPins: TilemapResourceVersion[] = []
  const gridTargets = new Set(tilemapTilesetIds(proposed))
  for (const [sheetId, { snapshot }] of pins) {
    const privateId = snapshot.asset.id
    if (snapshot.sourceId !== sheetId || !snapshots.includes(snapshot) || reserved.has(privateId))
      return null
    reserved.add(privateId)
    if (gridTargets.has(privateId)) grid.set(sheetId, snapshot)
    else objectPins.push(snapshot)
  }

  // The editor either freezes all grid bindings in one gesture or captures one art at a time.
  if (grid.size && objectPins.length) return null
  const additions = grid.size ? tilemapTilesetIds(expected).map((id) => grid.get(id)) : objectPins
  const proven = snapshots.filter((snapshot) => additions.includes(snapshot))
  if (proven.length !== additions.length || proven.some((item, index) => item !== additions[index]))
    return null
  let result = grid.size ? replayGridPin(expected, grid) : expected
  for (const snapshot of objectPins) {
    if (!result) return null
    result = replayObjectPin(result, proposed, snapshot)
  }
  if (!result) return null
  return { ...result, resources: [...(result.resources ?? []), ...proven] }
}

/** Compare every authored layer, placement and flag after a composed index change. */
export function provePintaCausalConsumerRemaps(
  before: BeforeDocument,
  after: PintaMemoryAsset,
  remaps: readonly SheetRemap[],
  pins: ReadonlyMap<string, PintaCausalPin> = new Map(),
): PintaCausalAttestation['transitions'] | null {
  const affected = affectedRemaps(before, remaps)
  if (!affected.length) return []
  let expected = tilemapOfAsset(before.asset)
  const proposed = tilemapOfAsset(after)
  if (!expected || !proposed) return null

  const changes = new Map(affected.map(({ sheetId, operation }) => [sheetId, operation.oldToNew]))
  const removals = provePintaCausalRemovals(expected, proposed, changes)
  if (!removals) return null
  const recognized = new Set(affected.map(({ sheetId }) => sheetId))
  for (const { snapshot } of pins.values()) recognized.add(snapshot.asset.id)
  expected = replayVerifiedPins(
    removals.map,
    proposed,
    pins,
    newSnapshotVersions(before.asset, after),
    new Set([before.asset.id, expected.id, ...before.manifest.refs.map(({ id }) => id)]),
  )
  if (!expected) return null

  const verified: PintaCausalAttestation['transitions'] = []
  for (const { sheetId, operation } of affected) {
    if (removals.detached.has(sheetId)) {
      verified.push({ sheetId, mode: 'detached' })
      continue
    }
    // After freezing, any art or grid layer still linked to the live sheet needs its ordinary remap.
    const result: ReturnType<typeof tryRemapTilemapIndices> = tryRemapTilemapIndices(
      expected,
      operation.oldToNew,
      sheetId,
    )
    if (!result.ok) return null
    expected = result.map
    verified.push({ sheetId, mode: pins.has(sheetId) ? 'pinned' : 'mapped' })
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

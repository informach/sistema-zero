import { pintaValuesEqual } from '../core/assetEquality'
import type { PintaMemoryAsset } from '../core/assetMemory'
import {
  type PintaResourceObservation,
  pintaLocalOriginOf,
  recordPintaLocalOrigin,
} from '../core/localAssetOrigin'
import { PintaLocalStorageError, PintaStorageBudgetError } from '../core/localStorageErrors'
import {
  isTileLayer,
  type PintaAsset,
  pintaAssetDependencyIds,
  type RegionTilemapAsset,
} from '../core/project'
import { pintaDoorBindings } from '../core/sceneMapClosure'
import { PINTA_CAUSAL_OUTBOX_KEY } from './assetAuthorityKeys'
import { authorityKey, LOCAL_ASSET_PREFIX, mirrorKey } from './localAssetAuthority'
import { localPreparedKey, PINTA_CAUSAL_BLOBS_KEY } from './localCausalOutbox'
import { PINTA_CAUSAL_PIN_BLOBS_KEY } from './localCausalPins'
import {
  createLocalRegionAssetAuthority,
  isLocalRegionAsset,
  matchesLocalRegionMirror,
} from './localRegionAssetAuthority'
import { localRegionGalleryBackupBytes } from './localRegionBudget'
import {
  decodeLocalRegionChunks,
  localRegionChunkKey,
  type PreparedRegionDocument,
  patchLocalRegionDocument,
  prepareLocalRegionDocument,
} from './localRegionChunkStorage'
import {
  dbNameFor,
  getPintaStorageNamespace,
  readLocalPintaRecords,
  updateLocalPintaRecords,
} from './persistence'

type RegionAsset = PreparedRegionDocument['empty']
const mapOf = (asset: RegionAsset) => (asset.kind === 'map-set' ? asset.map : asset)
const assetWithMap = (asset: RegionAsset, map: RegionTilemapAsset): RegionAsset =>
  asset.kind === 'map-set' ? { ...asset, map } : map

export interface LocalRegionEditBase {
  id: string
  namespace: string
  revision: string
  /** Confirmed revisions of the live references used during the gesture. */
  resources: readonly PintaResourceObservation[]
  inlineResources?: ReadonlyMap<string, PintaAsset>
}

class PintaRegionalEditUnavailable extends PintaLocalStorageError {
  constructor() {
    super('Esta edição precisa abrir o cenário completo. Seus dados foram mantidos.')
    this.name = 'PintaRegionalEditUnavailable'
  }
}

class PintaRegionalEditConflict extends PintaLocalStorageError {
  constructor() {
    super('O cenário ou suas peças mudaram. Reabra o cenário antes de guardar o gesto.')
    this.name = 'PintaRegionalEditConflict'
  }
}

function inspectInventory(
  records: ReadonlyMap<string, unknown>,
  keys: readonly string[],
  physicalKeys: ReadonlySet<IDBValidKey>,
) {
  const directories = new Map<string, PreparedRegionDocument>()
  const legacy = new Map<string, unknown>()
  for (const key of keys) {
    if (!key.startsWith(LOCAL_ASSET_PREFIX) && !key.startsWith('pinta:asset:')) continue
    const raw = records.get(key)
    const directory = prepareLocalRegionDocument(key, raw)
    if (!directory) {
      legacy.set(key, raw)
      continue
    }
    const { id } = directory.empty
    if (
      directory.doc.isolation !== undefined ||
      !matchesLocalRegionMirror(records.get(mirrorKey(id)), id, directory.revision) ||
      directory.keys.some((chunk) => !physicalKeys.has(chunk))
    )
      throw new PintaRegionalEditUnavailable()
    directories.set(id, directory)
  }
  for (const id of directories.keys()) legacy.delete(mirrorKey(id))
  const unchanged = new Map(legacy)
  const snapshot = createLocalRegionAssetAuthority().resolveLocalRecords(legacy, false)
  if (
    snapshot.issues.length ||
    legacy.size !== unchanged.size ||
    [...legacy].some(([key, raw]) => unchanged.get(key) !== raw)
  )
    throw new PintaRegionalEditUnavailable()
  const assets = new Map<string, PintaAsset>()
  for (const [id, asset] of snapshot.assets) {
    if (isLocalRegionAsset(asset)) throw new PintaRegionalEditUnavailable()
    assets.set(id, asset)
  }
  return { directories, assets, documents: snapshot.documents }
}

/**
 * The regional CAS writes chunks outside the causal unit, so it only runs on a purely local
 * profile. Any V4 record (outbox, sealed blobs, observed-resource pins or a prepared shadow)
 * means the account's canonical writer owns the candidates.
 */
function assertRegionalLocalState(
  records: ReadonlyMap<string, unknown>,
  physicalKeys: ReadonlySet<IDBValidKey>,
): void {
  if (
    records.get(PINTA_CAUSAL_OUTBOX_KEY) !== undefined ||
    physicalKeys.has(PINTA_CAUSAL_BLOBS_KEY) ||
    physicalKeys.has(PINTA_CAUSAL_PIN_BLOBS_KEY) ||
    [...physicalKeys].some((key) => typeof key === 'string' && key.startsWith(localPreparedKey('')))
  )
    throw new PintaLocalStorageError('Abra o cenário pela sua conta para guardar as mudanças.')
}

/** Directory and dependencies only. The incomplete domain values stay in the authority module. */
export async function readLocalRegionEditBase(namespace: string, id: string, signal?: AbortSignal) {
  let headers: readonly string[] = []
  let physicalKeys: ReadonlySet<IDBValidKey> = new Set()
  return readLocalPintaRecords(
    namespace,
    () => {
      signal?.throwIfAborted()
      return [...new Set([...headers, PINTA_CAUSAL_OUTBOX_KEY])]
    },
    (records) => {
      signal?.throwIfAborted()
      if (namespace !== getPintaStorageNamespace()) throw new PintaRegionalEditConflict()
      if (
        prepareLocalRegionDocument(authorityKey(id), records.get(authorityKey(id)))?.empty.kind !==
        'tilemap'
      )
        return null
      assertRegionalLocalState(records, physicalKeys)
      const { directories, assets, documents } = inspectInventory(records, headers, physicalKeys)
      const directory = directories.get(id)
      if (directory?.empty.kind !== 'tilemap') return null
      const catalog = new Map<string, PintaMemoryAsset>(assets)
      for (const [id, entry] of directories) catalog.set(id, entry.empty)
      const required = new Set(pintaAssetDependencyIds(directory.empty))
      for (const { binding } of pintaDoorBindings(directory.empty, catalog))
        if (binding.type === 'target' && binding.id !== id) required.add(binding.id)
      const resources: PintaResourceObservation[] = []
      const inlineResources = new Map<string, PintaAsset>()
      for (const id of required) {
        const revision = directories.get(id)?.revision ?? documents.get(id)?.revision
        if (revision && catalog.has(id)) resources.push({ id, localRevision: revision })
        else {
          const asset = assets.get(id)
          if (!asset) return null
          inlineResources.set(id, asset)
        }
      }
      return {
        base: { id, namespace, revision: directory.revision, resources, inlineResources },
        directory,
        assets: [...assets.values()].filter((asset) => required.has(asset.id)),
      }
    },
    (keys, allKeys) => {
      headers = keys
      physicalKeys = new Set(allKeys)
    },
  ).catch((error) => {
    if (error instanceof PintaRegionalEditUnavailable) return null
    throw error
  })
}

export function commitLocalRegionChange<T>(
  base: LocalRegionEditBase,
  selectChunks: (directory: PreparedRegionDocument) => ReadonlySet<string>,
  mutate: (asset: RegionAsset) => { asset: RegionAsset; value: T },
  signal?: AbortSignal,
): Promise<{ revision: string; value: T; changed: boolean }> {
  const key = authorityKey(base.id)
  let headers: readonly string[] = []
  let physicalKeys: ReadonlySet<IDBValidKey> = new Set()
  let inventory: ReturnType<typeof inspectInventory> | undefined
  let directory: PreparedRegionDocument | undefined
  let selection: ReadonlySet<string> = new Set()
  const checkScope = () => {
    signal?.throwIfAborted()
    if (base.namespace !== getPintaStorageNamespace()) throw new PintaRegionalEditConflict()
  }
  return updateLocalPintaRecords(
    base.namespace,
    base.id,
    (records) => {
      checkScope()
      if (!inventory) {
        if (!records.has(PINTA_CAUSAL_OUTBOX_KEY) || headers.some((key) => !records.has(key)))
          return [...new Set([...headers, PINTA_CAUSAL_OUTBOX_KEY])]
        assertRegionalLocalState(records, physicalKeys)
        const current = prepareLocalRegionDocument(key, records.get(key))
        if (!current || current.revision !== base.revision) throw new PintaRegionalEditUnavailable()
        inventory = inspectInventory(records, headers, physicalKeys)
        if (
          base.resources.some(
            ({ id, localRevision }) =>
              localRevision === null ||
              (inventory!.directories.get(id)?.revision ??
                (inventory!.assets.has(id) ? inventory!.documents.get(id)?.revision : null)) !==
                localRevision,
          ) ||
          [...(base.inlineResources ?? [])].some(
            ([id, resource]) => !pintaValuesEqual(resource, inventory!.assets.get(id)),
          )
        )
          throw new PintaRegionalEditConflict()
        directory = inventory.directories.get(base.id)
        if (!directory) throw new PintaRegionalEditConflict()
        selection = selectChunks(directory)
      }
      return directory!.keys.filter((chunk) => selection.has(chunk))
    },
    (records) => {
      checkScope()
      const source = decodeLocalRegionChunks(directory!, records, selection)
      const { asset, value } = mutate(source)
      if (pintaValuesEqual(source, asset)) {
        const result = { revision: base.revision, changed: false, value }
        return { value: result, changed: false }
      }
      const revision = crypto.randomUUID()
      const patch = patchLocalRegionDocument(directory!, asset, revision, selection, records)
      const projected = localRegionGalleryBackupBytes(
        [...inventory!.directories.values()].map((item) =>
          item === directory ? patch.document : item,
        ),
        [...inventory!.assets.values()],
      )
      if (!Number.isFinite(projected)) throw new PintaStorageBudgetError(projected)
      checkScope()
      records.set(key, patch.document.doc)
      records.set(mirrorKey(base.id), {
        kind: 'pinta-local-mirror',
        version: 1,
        capability: 8,
        id: base.id,
        revision,
      })
      for (const chunk of directory!.keys)
        if (selection.has(chunk) && !patch.chunks.has(chunk)) records.delete(chunk)
      for (const [chunk, cells] of patch.chunks) records.set(chunk, cells)
      const result = { revision, value, changed: true }
      return { value: result, changed: true }
    },
    (keys, allKeys) => {
      headers = keys
      physicalKeys = new Set(allKeys)
    },
    signal,
  )
}

function assetChunkLayout(asset: RegionAsset, selection?: ReadonlySet<string>): RegionAsset {
  const map = mapOf(asset)
  return assetWithMap(asset, {
    ...map,
    layers: map.layers.map((layer) =>
      isTileLayer(layer)
        ? {
            ...layer,
            cells: {
              ...layer.cells,
              chunks: selection
                ? layer.cells.chunks.filter(({ col, row }) =>
                    selection.has(localRegionChunkKey(asset.id, layer.id, col, row)),
                  )
                : [],
            },
          }
        : layer,
    ),
  })
}

function chunksByKey(asset: RegionAsset) {
  const chunks = new Map<string, Int16Array>()
  for (const layer of mapOf(asset).layers)
    if (isTileLayer(layer))
      for (const { col, row, cells } of layer.cells.chunks)
        chunks.set(localRegionChunkKey(asset.id, layer.id, col, row), cells)
  return chunks
}

/** Normal editor autosave. The confirmed immutable base pins the untouched chunk references. */
export async function persistLocalRegionRevision(
  namespace: string,
  previous: RegionAsset,
  next: RegionAsset,
  resources: readonly PintaResourceObservation[],
): Promise<boolean> {
  const database = dbNameFor(namespace)
  const revision = pintaLocalOriginOf(previous, database)?.revision
  if (!revision || previous.id !== next.id || previous.kind !== next.kind) return false
  if (namespace !== getPintaStorageNamespace()) throw new PintaRegionalEditConflict()
  const before = mapOf(previous),
    after = mapOf(next)
  if (
    before.cols !== after.cols ||
    before.rows !== after.rows ||
    !pintaValuesEqual(before.origin, after.origin) ||
    !pintaValuesEqual(
      before.layers
        .filter(isTileLayer)
        .map((layer) => layer.id)
        .sort(),
      after.layers
        .filter(isTileLayer)
        .map((layer) => layer.id)
        .sort(),
    )
  )
    return false
  const observed = new Map(resources.map((resource) => [resource.id, resource]))
  const dependencies = [
    ...new Set([
      ...observed.keys(),
      ...pintaAssetDependencyIds(previous),
      ...pintaAssetDependencyIds(next),
    ]),
  ]
  if (dependencies.some((id) => !observed.get(id)?.localRevision)) return false
  const oldChunks = chunksByKey(previous)
  const newChunks = chunksByKey(next)
  const selection = new Set(
    [...new Set([...oldChunks.keys(), ...newChunks.keys()])].filter(
      (key) => !pintaValuesEqual(oldChunks.get(key), newChunks.get(key)),
    ),
  )
  const oldHeader = assetChunkLayout(previous)
  const oldScope = assetChunkLayout(previous, selection)
  const newScope = assetChunkLayout(next, selection)
  try {
    const committed = await commitLocalRegionChange(
      {
        id: previous.id,
        namespace,
        revision,
        resources: dependencies.map((id) => observed.get(id)!),
      },
      (directory) => {
        if (
          !pintaValuesEqual(directory.empty, oldHeader) ||
          directory.keys.length !== oldChunks.size ||
          directory.keys.some((key) => !oldChunks.has(key))
        )
          throw new PintaRegionalEditUnavailable()
        return selection
      },
      (source) => {
        if (!pintaValuesEqual(source, oldScope)) throw new PintaRegionalEditUnavailable()
        return { asset: newScope, value: undefined }
      },
    )
    recordPintaLocalOrigin(next, database, committed.revision)
    return true
  } catch (error) {
    if (namespace !== getPintaStorageNamespace()) throw error
    if (error instanceof PintaRegionalEditUnavailable) return false
    throw error
  }
}

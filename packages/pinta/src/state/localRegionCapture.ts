import { PINTA_REGION_CHUNK_BYTES } from '@sistemazero/core/creations'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { PintaStorageBudgetError } from '../core/localStorageErrors'
import { SceneMapClosureError, sceneMapClosure } from '../core/sceneMapClosure'
import { MAX_REGION_BACKUP_DECODED_BYTES } from '../export/regionBackup'
import { authorityKey, LOCAL_ASSET_PREFIX, mirrorKey } from './localAssetAuthority'
import {
  createLocalRegionAssetAuthority,
  matchesLocalRegionMirror,
} from './localRegionAssetAuthority'
import { decodeLocalRegionChunks, prepareLocalRegionDocument } from './localRegionChunkStorage'
import { type PintaCaptureOptions, readLocalPintaRecords } from './persistence'

type RegionDirectory = NonNullable<ReturnType<typeof prepareLocalRegionDocument>>

/** Full capture of one reachable world, selected using the directory before any cell buffers. */
export function readRegionCaptureSnapshot(id: string, options: PintaCaptureOptions) {
  if (!options.includeSceneMaps) return Promise.resolve(null)
  const authority = createLocalRegionAssetAuthority()
  const { namespace, signal } = options
  const directories = new Map<string, RegionDirectory>()
  let inventory: readonly string[] = []
  let members: readonly string[] | null | undefined
  let chunks: readonly string[] = []

  function select(records: ReadonlyMap<string, unknown>): readonly string[] {
    signal?.throwIfAborted()
    if (members !== undefined) return chunks
    if (!records.has(authorityKey(id))) return [authorityKey(id)]
    const root = prepareLocalRegionDocument(authorityKey(id), records.get(authorityKey(id)))
    if (!root) {
      members = null
      return []
    }
    if (inventory.some((key) => !records.has(key))) return inventory
    const catalog = new Map<string, PintaMemoryAsset>()
    const inlined = new Map<string, unknown>()
    for (const key of inventory) {
      if (!key.startsWith(LOCAL_ASSET_PREFIX)) {
        inlined.set(key, records.get(key))
        continue
      }
      const assetId = key.slice(LOCAL_ASSET_PREFIX.length)
      const region =
        key === authorityKey(root.empty.id)
          ? root
          : prepareLocalRegionDocument(key, records.get(key))
      if (!region) {
        inlined.set(key, records.get(key))
        continue
      }
      const mirror = mirrorKey(assetId)
      if (!matchesLocalRegionMirror(records.get(mirror), assetId, region.revision)) {
        members = null
        return []
      }
      directories.set(assetId, region)
      catalog.set(assetId, region.empty)
    }
    for (const id of directories.keys()) inlined.delete(mirrorKey(id))
    const untouched = new Map(inlined)
    const decoded = authority.resolveLocalRecords(inlined, false)
    // These cases need the established write transaction so legacy recovery stays atomic.
    if (
      decoded.issues.length ||
      untouched.size !== inlined.size ||
      [...untouched].some(([key, before]) => inlined.get(key) !== before)
    ) {
      members = null
      return []
    }
    for (const [id, asset] of decoded.assets) catalog.set(id, asset)
    try {
      const closure = sceneMapClosure<PintaMemoryAsset>(root.empty, [...catalog.values()])
      members = closure.assets.map(({ id }) => id)
      chunks = members.flatMap((id) => directories.get(id)?.keys ?? [])
      const bytes = chunks.length * PINTA_REGION_CHUNK_BYTES
      if (bytes > MAX_REGION_BACKUP_DECODED_BYTES) throw new PintaStorageBudgetError(bytes)
      return chunks
    } catch (error) {
      if (!(error instanceof SceneMapClosureError)) throw error
      // Reuse the complete capture's established error and diagnosis for a broken closure.
      members = null
      return []
    }
  }
  return readLocalPintaRecords(
    namespace,
    select,
    (records) => {
      signal?.throwIfAborted()
      if (!members) return null
      const complete = new Map<string, unknown>()
      for (const id of members) {
        const key = authorityKey(id)
        const region = directories.get(id)
        if (region) {
          const { storage: _storage, ...document } = region.doc
          complete.set(key, {
            ...document,
            version: 1,
            asset: decodeLocalRegionChunks(region, records),
          })
        } else complete.set(key, records.get(key))
        complete.set(mirrorKey(id), records.get(mirrorKey(id)))
      }
      return authority.resolveLocalRecords(complete)
    },
    (keys) => {
      inventory = keys.filter(
        (key) => key.startsWith(LOCAL_ASSET_PREFIX) || key.startsWith('pinta:asset:'),
      )
    },
  )
}

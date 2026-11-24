import type { PintaMemoryAsset } from '../src/core/assetMemory'
import { isTileLayer } from '../src/core/project'
import { observePintaReferences } from '../src/core/sceneMapClosure'
import { createEditorStore } from '../src/state/editorStore'
import { createRegionPintaPersistence } from '../src/state/localRegionPersistence'
import { setPintaStorageNamespace } from '../src/state/persistence'
import { cellAt, setCell } from '../src/tiles/tilemapOps'
import { measureRegionalIo, type seedRegionalIoProfile } from './region-io-proof'

type Seed = Awaited<ReturnType<typeof seedRegionalIoProfile>>

/** Existing complete-document editor and save path used as the authoring control. */
export async function profileRegionalGesture(seed: Seed, path: 'complete' | 'incremental') {
  const local = createRegionPintaPersistence({ namespace: seed.namespace })
  setPintaStorageNamespace(seed.namespace)
  const map = await local.loadAssetById(seed.id)
  if (map?.kind !== 'tilemap' || !('origin' in map)) throw Error('Mapa de controle ausente')
  const layer = map.layers.find(isTileLayer)
  if (!layer) throw Error('Camada de controle ausente')
  const tileset = await local.loadAssetById(map.tilesetId)
  if (!tileset) throw Error('Conjunto ausente')
  const editor = createEditorStore<PintaMemoryAsset>({
    asset: map,
    persist: async (asset, linked) => local.persistAssets([asset, ...linked]),
    observeResources: (asset) => observePintaReferences(asset, [tileset]),
    ...(path === 'incremental' ? { persistRevision: local.persistRevision! } : {}),
  })
  const { col, row } = map.origin
  const cell = cellAt(map, layer.id, col, row) === -1 ? 0 : -1
  const put = IDBObjectStore.prototype.put
  let chunkPuts = 0
  IDBObjectStore.prototype.put = function (value, key) {
    if (typeof key === 'string' && key.startsWith('pinta:local:chunk:')) chunkPuts++
    return put.call(this, value, key)
  }
  try {
    const { value, ...record } = await measureRegionalIo(async () => {
      const next = setCell(map, layer.id, col, row, cell)
      if (!editor.getState().commit(next)) throw Error('Gesto de controle recusado')
      return editor.getState().flush()
    })
    if (!value.ok) throw Error(value.error)
    return { ...record, chunkPuts }
  } finally {
    IDBObjectStore.prototype.put = put
  }
}

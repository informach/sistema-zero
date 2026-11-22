import { createTilemapAsset, createTilesetAsset, isTileLayer } from '../src/core/project'
import {
  captureRegionPintaAssetForImage,
  createRegionPintaPersistence,
} from '../src/state/localRegionPersistence'
import { expandRegionMap, prepareMapRegions } from '../src/tiles/regionMap'

export async function seedRegionalIoProfile() {
  const namespace = crypto.randomUUID()
  const persistence = createRegionPintaPersistence({ namespace })
  const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  const source = prepareMapRegions(
    createTilemapAsset({
      name: 'vila-grande',
      tilesetId: tileset.id,
      cols: 2,
      rows: 2,
    }),
  )
  if (!source.ok) throw Error(source.reason)
  const expanded = expandRegionMap(source.map, { col: -64, row: -64, cols: 10000, rows: 10000 })
  if (!expanded.ok) throw Error(expanded.reason)
  const map = expanded.map
  const layer = map.layers.find(isTileLayer)
  if (!layer) throw Error('Camada de peças ausente')
  layer.cells.chunks = Array.from({ length: 2048 }, (_, index) => ({
    col: (index % 64) - 2,
    row: Math.floor(index / 64) - 2,
    cells: new Int16Array(1024).fill(0),
  }))
  await persistence.persistAssets([
    tileset,
    map,
    { ...map, id: crypto.randomUUID(), name: 'mapa-fora-da-vila' },
  ])
  return { namespace, id: map.id }
}

export async function measureRegionalIo<T>(run: () => Promise<T>) {
  let chunks = 0
  let bytes = 0
  let records = 0
  let inventories = 0
  const originalGet = IDBObjectStore.prototype.get
  const originalKeys = IDBObjectStore.prototype.getAllKeys
  const start = performance.now()
  IDBObjectStore.prototype.get = function (key) {
    const request = originalGet.call(this, key)
    records++
    if (typeof key === 'string' && key.startsWith('pinta:local:chunk:')) {
      chunks++
      request.addEventListener('success', () => {
        if (request.result instanceof Int16Array) bytes += request.result.byteLength
      })
    }
    return request
  }
  IDBObjectStore.prototype.getAllKeys = function (...args) {
    inventories++
    return originalKeys.apply(this, args)
  }
  try {
    const value = await run()
    return { value, chunks, bytes, records, inventories, ms: performance.now() - start }
  } finally {
    IDBObjectStore.prototype.get = originalGet
    IDBObjectStore.prototype.getAllKeys = originalKeys
  }
}

export async function profileFullRegionalIo(
  seed: Awaited<ReturnType<typeof seedRegionalIoProfile>>,
  kind: 'open' | 'capture',
) {
  const sample = await measureRegionalIo(async () => {
    const local = createRegionPintaPersistence({ namespace: seed.namespace })
    return kind === 'open'
      ? local.loadAssetById(seed.id)
      : captureRegionPintaAssetForImage(seed.id, { namespace: seed.namespace })
  })
  const { value, ...counters } = sample
  if (!value || ('ok' in value && !value.ok)) throw Error('Cenário ausente')
  return counters
}

import { paintMapCanvas } from '../src/components/editor/mapTools/mapCanvas'
import { readStoredRegionMapViewport } from '../src/components/editor/mapTools/storedRegionMapCanvas'
import {
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  isTilesetKind,
  tilemapTilesetIds,
} from '../src/core/project'
import {
  captureRegionPintaAssetForImage,
  createRegionPintaPersistence,
} from '../src/state/localRegionPersistence'
import { regionVila } from '../src/testing/regionVila'
import { TileChunkCache } from '../src/tiles/chunks'
import { resolveMapTilesets } from '../src/tiles/mapTilesets'
import { expandRegionMap, prepareMapRegions } from '../src/tiles/regionMap'
import { pixelSheetCanvas } from '../src/tiles/sheetCanvas'
import { setCell } from '../src/tiles/tilemapOps'

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

export async function profileRegionalViewport(
  seed: Awaited<ReturnType<typeof seedRegionalIoProfile>>,
) {
  const { value, ...counters } = await measureRegionalIo(() =>
    readStoredRegionMapViewport(seed.id, {
      namespace: seed.namespace,
      stage: { clientWidth: 1024, clientHeight: 768, scrollLeft: 0, scrollTop: 0 },
      cellPx: 16,
      pad: 1,
      showCollision: false,
    }),
  )
  if (!value) throw Error('Janela regional ausente')
  return { ...counters, retainedBytes: value.bytes }
}

export async function compareStoredVilaViewports() {
  const namespace = crypto.randomUUID()
  const { map, cabana, assets } = regionVila()
  const local = createRegionPintaPersistence({ namespace })
  await local.persistAssets(assets)
  const source = await local.loadAssetById(map.id)
  if (source?.kind !== 'tilemap' || !('origin' in source)) throw Error('Vila ausente')
  const ids = tilemapTilesetIds(source)
  const resolved = resolveMapTilesets(source, assets.filter(isTilesetKind))
  const tilesets = new Map(
    ids.flatMap((id, index) => {
      const asset = resolved[index]
      return asset ? [[id, asset] as const] : []
    }),
  )
  const stage = { clientWidth: 1024, clientHeight: 768, scrollLeft: 1024, scrollTop: 1024 }
  const view = { stage, cellPx: 16, pad: 1, showCollision: true }
  const canvas = document.createElement('canvas')
  const cache = new TileChunkCache()
  const hash = async () => {
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
    const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', pixels))
    return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  }
  const sheetOf = (id: string) => {
    const asset = tilesets.get(id)
    return asset?.kind === 'tileset' ? pixelSheetCanvas(asset) : null
  }
  const draw = { canvas, cache, time: 0 }
  const renderFull = () =>
    paintMapCanvas({
      ...draw,
      ...view,
      map: source,
      tileSize: resolved[0]!.tileSize,
      tilesetById: tilesets,
      sheetOf,
    })
  const renderWindow = (
    window: NonNullable<Awaited<ReturnType<typeof readStoredRegionMapViewport>>>,
  ) =>
    window.paint({
      ...draw,
      sheetOf: (asset) => (asset.kind === 'tileset' ? pixelSheetCanvas(asset) : null),
    })

  const first = await readStoredRegionMapViewport(map.id, { namespace, ...view })
  if (!first || !renderWindow(first)) throw Error('Vila não abriu pela janela')
  const firstHash = await hash()
  renderFull()
  const firstExpected = await hash()
  stage.scrollLeft += 300
  stage.scrollTop += 100
  const previousRefused = renderWindow(first) === null
  const navigated = await readStoredRegionMapViewport(map.id, {
    namespace,
    ...view,
    revision: first.revision,
  })
  if (!navigated || !renderWindow(navigated)) throw Error('Janela seguinte da Vila ausente')
  const nextHash = await hash()
  renderFull()
  const nextExpected = await hash()
  const capture = await captureRegionPintaAssetForImage(map.id, { namespace })
  const floor = source.layers.find(isTileLayer)
  if (!floor) throw Error('Chão da Vila ausente')
  const put = IDBObjectStore.prototype.put
  let chunkPuts = 0
  IDBObjectStore.prototype.put = function (value, key) {
    if (typeof key === 'string' && key.startsWith('pinta:local:chunk:')) chunkPuts++
    return put.call(this, value, key)
  }
  try {
    await local.persistAsset(setCell(source, floor.id, -64, -64, 4))
  } finally {
    IDBObjectStore.prototype.put = put
  }
  const outdated = await readStoredRegionMapViewport(map.id, {
    namespace,
    ...view,
    revision: navigated.revision,
  })
  return {
    firstHash,
    firstExpected,
    nextHash,
    nextExpected,
    previousRefused,
    linked: capture.ok && capture.assets?.some((asset) => asset.id === cabana.id),
    firstBytes: first.bytes,
    nextBytes: navigated.bytes,
    chunkPuts,
    outdatedRefused: outdated === null,
  }
}

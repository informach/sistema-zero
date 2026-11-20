import { pintaAssetToWire } from '../src/assets/wire'
import {
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  PINTA_MAP_FORMAT_LIMITS,
  type TilemapAsset,
} from '../src/core/project'
import { createPintaPersistence } from '../src/state/persistence'
import { chunkBytes, paintTilemapLayers, TileChunkCache } from '../src/tiles/chunks'
import { setCell } from '../src/tiles/tilemapOps'

/** Observe real IndexedDB puts; buffers are counted separately from header JSON. */
async function observeMapWrites(id: string, save: () => Promise<void>) {
  const writes = {
    chunkPuts: 0,
    chunkIndexBytes: 0,
    headerPuts: 0,
    headerJsonBytes: 0,
    mirrorPuts: 0,
    mirrorIndexBytes: 0,
  }
  const original = IDBObjectStore.prototype.put
  IDBObjectStore.prototype.put = function (value, key) {
    const text = String(key)
    if (text.startsWith(`pinta:local:chunk:${encodeURIComponent(id)}:`)) {
      if (!(value instanceof Int16Array)) throw new Error('Chunk não é Int16Array')
      writes.chunkPuts++
      writes.chunkIndexBytes += value.byteLength
    } else if (text === `pinta:local:document:${id}`) {
      writes.headerPuts++
      writes.headerJsonBytes += new TextEncoder().encode(JSON.stringify(value)).length
    } else if (text === `pinta:asset:${id}`) {
      writes.mirrorPuts++
      const map = value as TilemapAsset
      writes.mirrorIndexBytes += map.layers.reduce(
        (sum, layer) => sum + (isTileLayer(layer) ? layer.cells.byteLength : 0),
        0,
      )
    }
    return original.call(this, value, key)
  }
  try {
    await save()
  } finally {
    IDBObjectStore.prototype.put = original
  }
  return writes
}

/** Prova no navegador: dados sem corridas repetidas, cache real e transação IndexedDB real. */
export async function runMapBudgetProbe() {
  const store = createPintaPersistence({ namespace: `budget-${crypto.randomUUID()}` })
  const tileset = createTilesetAsset({ name: 'pecas-orcamento', tileSize: 48 })
  tileset.tiles = Array.from({ length: 256 }, () => ({
    width: 48,
    height: 48,
    data: Uint8Array.from({ length: 48 * 48 }, (_, i) => 1 + (i % 15)),
  }))
  tileset.solid = Array.from({ length: 256 }, () => false)
  tileset.platform = Array.from({ length: 256 }, () => false)
  const base = createTilemapAsset({
    name: 'orcamento-ruidoso',
    tilesetId: tileset.id,
    cols: 16,
    rows: 16,
  })
  const map: TilemapAsset = {
    ...base,
    cols: 256,
    rows: 256,
    layers: Array.from({ length: 32 }, (_, layer) => ({
      id: crypto.randomUUID(),
      name: `Camada ${layer + 1}`,
      visible: true,
      cells: Int16Array.from({ length: 256 * 256 }, (_, i) => (i * 73 + layer * 19) % 256),
    })),
  }
  const wireStart = performance.now()
  const wireChars = JSON.stringify(pintaAssetToWire(map)).length
  const wireMs = performance.now() - wireStart
  const sheet = document.createElement('canvas')
  sheet.width = 256 * 48
  sheet.height = 48
  const sheetContext = sheet.getContext('2d')
  const target = document.createElement('canvas')
  target.width = 1024
  target.height = 768
  const context = target.getContext('2d')
  if (!sheetContext || !context) throw new Error('Canvas 2D indisponível')
  sheetContext.fillStyle = '#437b48'
  sheetContext.fillRect(0, 0, sheet.width, sheet.height)
  let allocations = 0
  const cache = new TileChunkCache(32 * 1024 * 1024, () => {
    allocations += 1
    return document.createElement('canvas')
  })
  const frames: number[] = []
  for (let frame = 0; frame < 3; frame++) {
    const start = performance.now()
    paintTilemapLayers(
      context,
      map,
      new Map([[tileset.id, tileset]]),
      () => sheet,
      cache,
      { x: 0, y: 0, width: 2048, height: 1536 },
      0.5,
    )
    // Leitura força a conclusão do desenho, sem medir só o enfileiramento na GPU.
    if (context.getImageData(512, 384, 1, 1).data[3] !== 255) throw new Error('Bloco não desenhado')
    frames.push(performance.now() - start)
  }
  await store.persistAsset(tileset)
  const saveStart = performance.now()
  const initialWrites = await observeMapWrites(map.id, () => store.persistAsset(map))
  const saveMs = performance.now() - saveStart
  const readStart = performance.now()
  const loaded = await store.loadAssetById(map.id)
  const readMs = performance.now() - readStart
  if (loaded?.kind !== 'tilemap') throw new Error('Mapa não reabriu')
  for (let i = 0; i < map.layers.length; i++) {
    const before = map.layers[i],
      after = loaded.layers[i]
    if (
      !before ||
      !after ||
      !isTileLayer(before) ||
      !isTileLayer(after) ||
      !before.cells.every((value, cell) => after.cells[cell] === value)
    )
      throw new Error(`Perda na camada ${i}`)
  }
  const first = loaded.layers[0]
  if (!first) throw new Error('Sem camada inicial')
  const editStart = performance.now()
  const edited = setCell(loaded, first.id, 255, 255, 7)
  const editWrites = await observeMapWrites(map.id, () => store.persistAsset(edited))
  const editSaveMs = performance.now() - editStart
  const reopened = await store.loadAssetById(map.id)
  const last = reopened?.kind === 'tilemap' ? reopened.layers[0] : null
  if (!last || !isTileLayer(last) || last.cells[256 * 256 - 1] !== 7)
    throw new Error('A edição não foi gravada')
  const report = {
    userAgent: navigator.userAgent,
    cells: map.cols * map.rows * map.layers.length,
    maxCells: PINTA_MAP_FORMAT_LIMITS.maxCells,
    wireChars,
    wireMs,
    saveMs,
    readMs,
    editSaveMs,
    frames,
    cacheBytes: cache.usedBytes,
    workingSetBytes: cache.workingSetBytes,
    chunkBytes: chunkBytes(48),
    allocations,
    reopenedLayers: loaded.layers.length,
    initialWrites,
    editWrites,
  }
  cache.clear()
  sheet.width = sheet.height = target.width = target.height = 0
  return report
}

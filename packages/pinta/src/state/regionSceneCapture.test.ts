import { beforeEach, expect, test } from 'bun:test'
import { pintaLocalRevisionOf } from '../core/localAssetOrigin'
import { createTilemapAsset, createTilesetAsset, isTileLayer } from '../core/project'
import { clearIdbMock, idbMockDb, setIdbReadGuard } from '../testing/idbMock'
import { regionVila } from '../testing/regionVila'
import { createMapObject } from '../tiles/mapObjects'
import { expandRegionMap, prepareMapRegions } from '../tiles/regionMap'
import { cellAt } from '../tiles/tilemapOps'
import {
  captureRegionPintaAssetForImage,
  createRegionPintaPersistence,
} from './localRegionPersistence'
import { capturePintaAssetForImage, setPintaStorageNamespace } from './persistence'

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

test('regional capture conserves the real Vila, connected Cabana, sets and every sheet in one authoritative snapshot', async () => {
  const { map, cabana, assets } = regionVila(),
    namespace = 'region-world-capture'
  await createRegionPintaPersistence({ namespace }).persistAssets(assets)
  const captured = await captureRegionPintaAssetForImage(map.id, { namespace })
  if (!captured.ok || captured.source.kind !== 'tilemap' || !('origin' in captured.source))
    throw Error('Captura ausente')
  expect(new Set([captured.source, ...(captured.assets ?? [])].map((asset) => asset.id))).toEqual(
    new Set(assets.map((asset) => asset.id)),
  )
  expect(captured.assets?.some((asset) => asset.id === cabana.id)).toBe(true)
  expect(captured.assets?.some((asset) => asset.kind === 'map-set' && 'origin' in asset.map)).toBe(
    true,
  )
  expect(captured.tilesets).toHaveLength(2)
  expect(captured.source.layers).toHaveLength(map.layers.length)
  expect(
    captured.source.layers.filter((layer) => layer.kind === undefined || layer.kind === 'tiles'),
  ).toHaveLength(16)
  expect(captured.source.origin).toEqual({ col: -64, row: -64 })
  const floor = captured.source.layers.find(isTileLayer)
  if (!floor) throw Error('Chão ausente')
  expect(cellAt(captured.source, floor.id, -64, -64)).toBe(3)
  expect(pintaLocalRevisionOf(captured.source)).toBeString()
  expect(await capturePintaAssetForImage(map.id, { namespace })).toEqual({
    ok: false,
    reason: 'not-found',
  })
})

test('the regional structured reader refuses a missing optional layer sheet even if connected places were explicitly disabled', async () => {
  const { map, assets } = regionVila(),
    namespace = 'region-missing-sheet'
  const extra = assets.find(
    (asset) =>
      (asset.kind === 'tileset' || asset.kind === 'vector-tileset') && asset.id !== map.tilesetId,
  )
  if (!extra) throw Error('Segunda folha ausente')
  await createRegionPintaPersistence({ namespace }).persistAssets(
    assets.filter((asset) => asset.id !== extra.id),
  )
  const captured = await captureRegionPintaAssetForImage(map.id, {
    namespace,
    includeSceneMaps: false,
  })
  expect(captured.ok).toBe(false)
  expect(captured.ok ? null : captured.reason).toBe('needs-tileset')
})

test('a future opaque place prevents an incomplete regional capture, without rewriting its bytes', async () => {
  const { map, assets } = regionVila(),
    namespace = 'region-opaque-world'
  await createRegionPintaPersistence({ namespace }).persistAssets(assets)
  const db = idbMockDb(`sistema-zero-pinta-${namespace}`),
    opaque = {
      version: 1,
      capability: 9,
      revision: 'future-place',
      asset: { kind: 'tilemap', id: 'future', schema: 9 },
    }
  db.set('pinta:local:document:future', opaque)
  await expect(captureRegionPintaAssetForImage(map.id, { namespace })).rejects.toThrow(
    'Atualize a página',
  )
  expect(db.get('pinta:local:document:future')).toEqual(opaque)
})

test('capture binds its profile before reading, and cancellation cannot produce a partial world', async () => {
  const { map, assets } = regionVila()
  setPintaStorageNamespace('region-capture-a')
  await createRegionPintaPersistence().persistAssets(assets)
  let resume = () => {},
    entered = () => {}
  const blocked = new Promise<void>((resolve) => {
      resume = resolve
    }),
    started = new Promise<void>((resolve) => {
      entered = resolve
    })
  let held = false
  setIdbReadGuard(async () => {
    if (!held) {
      held = true
      entered()
      await blocked
    }
  })
  const capture = captureRegionPintaAssetForImage(map.id)
  await started
  setPintaStorageNamespace('region-capture-b')
  resume()
  const result = await capture
  setIdbReadGuard(null)
  expect(result.ok).toBe(true)
  expect(await createRegionPintaPersistence().listAllAssets()).toEqual([])
  const aborted = new AbortController()
  aborted.abort()
  await expect(
    captureRegionPintaAssetForImage(map.id, {
      namespace: 'region-capture-a',
      signal: aborted.signal,
    }),
  ).rejects.toThrow()
  expect(
    await captureRegionPintaAssetForImage('missing-map', { namespace: 'region-capture-a' }),
  ).toEqual({ ok: false, reason: 'not-found' })
})

test('a hidden door in a regional set captures its connected places even when the set is the root', async () => {
  const { cabana, assets } = regionVila(),
    namespace = 'region-set-world'
  const source = assets.find((asset) => asset.kind === 'map-set')
  if (source?.kind !== 'map-set' || !('origin' in source.map)) throw Error('Conjunto ausente')
  source.map.layers.push({
    id: 'hidden-doors',
    kind: 'objects',
    name: 'Portas',
    visible: false,
    objects: [
      createMapObject({ name: 'Porta', role: 'door', properties: { destino: cabana.name } }),
    ],
  })
  await createRegionPintaPersistence({ namespace }).persistAssets(assets)
  const captured = await captureRegionPintaAssetForImage(source.id, { namespace })
  if (!captured.ok) throw Error(captured.reason)
  expect(captured.source.id).toBe(source.id)
  expect(new Set([captured.source, ...(captured.assets ?? [])].map((asset) => asset.id))).toEqual(
    new Set(assets.map((asset) => asset.id)),
  )
})

test('the complete regional capture refuses an oversized reachable world before reading chunks', async () => {
  const namespace = 'region-capture-header-budget'
  const tileset = createTilesetAsset({ name: 'folha', tileSize: 16 })
  const dense = createTilemapAsset({ name: 'mapa', tilesetId: tileset.id, cols: 2, rows: 2 })
  const converted = prepareMapRegions(dense)
  if (!converted.ok) throw Error(converted.reason)
  const expanded = expandRegionMap(converted.map, { col: -64, row: -64, cols: 10000, rows: 10000 })
  if (!expanded.ok) throw Error(expanded.reason)
  const local = createRegionPintaPersistence({ namespace })
  await local.persistAsset(tileset)
  const db = idbMockDb(`sistema-zero-pinta-${namespace}`)
  const map = expanded.map
  const tileLayer = map.layers.find(isTileLayer)!
  for (let i = 0; i < 9; i++) {
    const id = `lugar-${i}`
    const revision = `revision-${i}`
    const chunks = Array.from({ length: 2048 }, (_, index) => {
      const col = (index % 64) - 2
      const row = Math.floor(index / 64) - 2
      return {
        col,
        row,
        key: `pinta:local:chunk:${id}:${encodeURIComponent(tileLayer.id)}:${col}:${row}`,
      }
    })
    db.set(`pinta:local:document:${id}`, {
      version: 3,
      capability: 8,
      revision,
      storage: 'pinta-regions-32-v1',
      asset: {
        ...map,
        id,
        name: id,
        layers: [
          { ...tileLayer, cells: { ...tileLayer.cells, chunks } },
          {
            kind: 'objects',
            id: 'portas',
            name: 'Portas',
            visible: true,
            objects:
              i === 8
                ? []
                : [
                    createMapObject({
                      name: 'Porta',
                      role: 'door',
                      properties: { destino: `lugar-${i + 1}` },
                    }),
                  ],
          },
        ],
      },
    })
    db.set(`pinta:asset:${id}`, {
      kind: 'pinta-local-mirror',
      version: 1,
      capability: 8,
      id,
      revision,
    })
  }
  setIdbReadGuard((key) => {
    if (typeof key === 'string' && key.startsWith('pinta:local:chunk:'))
      throw Error('Uma leitura excedeu o orçamento de região')
  })
  try {
    await expect(captureRegionPintaAssetForImage('lugar-0', { namespace })).rejects.toThrow(
      '32 MiB',
    )
    expect(db.size).toBeGreaterThanOrEqual(19)
  } finally {
    setIdbReadGuard(null)
  }
})

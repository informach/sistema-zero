import { beforeEach, expect, test } from 'bun:test'
import { pintaLocalRevisionOf } from '../core/localAssetOrigin'
import { PintaLocalConflictError } from '../core/localStorageErrors'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  type RegionTilemapAsset,
} from '../core/project'
import { clearIdbMock, idbMockDb, setIdbWriteGuard } from '../testing/idbMock'
import { expandRegionMap, prepareMapRegions } from '../tiles/regionMap'
import { cellAt, setCell } from '../tiles/tilemapOps'
import { LOCAL_ASSET_PREFIX } from './localAssetAuthority'
import { createRegionPintaPersistence } from './localRegionPersistence'
import { createPintaPersistence, setPintaStorageNamespace } from './persistence'

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

function map(): RegionTilemapAsset {
  const dense = createTilemapAsset({ name: 'vila', tilesetId: 'ground', cols: 3, rows: 2 })
  dense.layers[0]!.cells![0] = 3
  const converted = prepareMapRegions(dense)
  if (!converted.ok) throw Error(converted.reason)
  const expanded = expandRegionMap(converted.map, {
    col: -64,
    row: -64,
    cols: 10000,
    rows: 10000,
  })
  if (!expanded.ok) throw Error(expanded.reason)
  return setCell(expanded.map, expanded.map.layers[0]!.id, -64, -64, 4)
}

test('the existing persistence factory reopens native 8 with its compact mirror and mixed legacy arts', async () => {
  const local = createRegionPintaPersistence({ namespace: 'regions' }),
    source = map(),
    sprite = createPixelSpriteAsset({ name: 'personagem', frameSize: 8 }),
    tiles = createTilesetAsset({ name: 'ground', tileSize: 16 })
  const linked = { ...source, tilesetId: tiles.id }
  await local.persistAssets([linked, tiles, sprite])
  expect(pintaLocalRevisionOf(linked)).toBeString()
  expect(idbMockDb('sistema-zero-pinta-regions').get(`pinta:asset:${source.id}`)).toEqual({
    kind: 'pinta-local-mirror',
    version: 1,
    capability: 8,
    id: source.id,
    revision: pintaLocalRevisionOf(linked),
  })
  const reopened = createRegionPintaPersistence({ namespace: 'regions' })
  expect(structuredClone(await reopened.loadAssetById(linked.id))).toEqual(structuredClone(linked))
  expect((await reopened.listAllAssets()).map((asset) => asset.id).sort()).toEqual(
    [linked.id, tiles.id, sprite.id].sort(),
  )
  expect(reopened.getReadIssues?.()).toEqual([])
})

test('a listing cannot authorize stale RAM; the committed fork emits recovery and can continue editing', async () => {
  const first = createRegionPintaPersistence({ namespace: 'region-cas' }),
    second = createRegionPintaPersistence({ namespace: 'region-cas' }),
    source = map()
  await first.persistAsset(source)
  const stale = await first.loadAssetById(source.id),
    current = await second.loadAssetById(source.id)
  if (stale?.kind !== 'tilemap' || !('origin' in stale) || current?.kind !== 'tilemap')
    throw Error('Mapa ausente')
  await second.persistAsset({ ...current, name: 'outra-aba' })
  await first.listAllAssets()
  const events: string[] = []
  const unsubscribe = first.subscribe?.((event) => events.push(event.type))
  const edited = setCell(stale, stale.layers[0]!.id, -64, -64, 9)
  let copy: RegionTilemapAsset | undefined
  try {
    await first.persistAsset(edited)
    throw Error('Conflito esperado')
  } catch (error) {
    if (!(error instanceof PintaLocalConflictError)) throw error
    const fork = error.forks.get(source.id)
    if (fork?.kind !== 'tilemap' || !('origin' in fork)) throw Error('Cópia ausente')
    copy = fork
  } finally {
    unsubscribe?.()
  }
  if (!copy) throw Error('Cópia ausente')
  expect(events).toEqual(['changed', 'recovered'])
  expect(copy.id).not.toBe(source.id)
  expect(cellAt(copy, copy.layers[0]!.id, -64, -64)).toBe(9)
  const continued = setCell(copy, copy.layers[0]!.id, -64, -64, 10)
  await first.persistAsset(continued)
  expect((await second.loadAssetById(source.id))?.name).toBe('outra-aba')
  const loaded = await second.loadAssetById(copy.id)
  if (loaded?.kind !== 'tilemap') throw Error('Cópia não reabriu')
  expect(cellAt(loaded, loaded.layers[0]!.id, -64, -64)).toBe(10)
  expect(await first.listAllAssets()).toHaveLength(2)
})

test('namespace capture and the shared FIFO survive a global profile switch during a regional batch', async () => {
  setPintaStorageNamespace('region-profile-a')
  const local = createRegionPintaPersistence(),
    source = map()
  let release = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let puts = 0
  setIdbWriteGuard(async () => {
    if (++puts === 1) await held
  })
  const first = local.persistAsset(source),
    second = local.persistAsset({ ...source, name: 'segunda-edicao' })
  setPintaStorageNamespace('region-profile-b')
  release()
  try {
    await Promise.all([first, second])
  } finally {
    setIdbWriteGuard(null)
  }
  expect((await local.loadAssetById(source.id))?.name).toBe('segunda-edicao')
  expect(await createRegionPintaPersistence().listAllAssets()).toEqual([])
})

test('failed puts do not announce recovery or advance the RAM base; retry forks the complete linked batch', async () => {
  const a = createRegionPintaPersistence({ namespace: 'region-failed-fork' }),
    b = createRegionPintaPersistence({ namespace: 'region-failed-fork' }),
    tiles = createTilesetAsset({ name: 'ground', tileSize: 16 }),
    source = { ...map(), tilesetId: tiles.id }
  await a.persistAssets([tiles, source])
  const latest = await b.loadAssetById(source.id)
  if (!latest) throw Error('Mapa ausente')
  await b.persistAsset({ ...latest, name: 'nova-revisao' })
  const revision = pintaLocalRevisionOf(source),
    events: string[] = []
  const unsubscribe = a.subscribe?.((event) => events.push(event.type))
  let puts = 0
  setIdbWriteGuard(() => {
    if (++puts === 2) throw Error('falha-regional-fabrica')
  })
  try {
    await expect(a.persistAssets([{ ...tiles, name: 'minhas-pecas' }, source])).rejects.toThrow(
      'falha-regional-fabrica',
    )
  } finally {
    setIdbWriteGuard(null)
  }
  expect(events).toEqual([])
  expect(pintaLocalRevisionOf(source)).toBe(revision)
  expect(await b.listAllAssets()).toHaveLength(2)
  try {
    await a.persistAssets([{ ...tiles, name: 'minhas-pecas' }, source])
    throw Error('Conflito esperado')
  } catch (error) {
    if (!(error instanceof PintaLocalConflictError)) throw error
    const recoveredMap = error.forks.get(source.id),
      recoveredTiles = error.forks.get(tiles.id)
    if (recoveredMap?.kind !== 'tilemap' || !recoveredTiles) throw Error('Lote incompleto')
    expect(recoveredMap.tilesetId).toBe(recoveredTiles.id)
    expect(error.forks.size).toBe(2)
  } finally {
    unsubscribe?.()
  }
  expect(events).toEqual(['changed', 'recovered'])
})

test('regional deletion uses the displayed base, persists a tombstone and recovers a later stale save', async () => {
  const a = createRegionPintaPersistence({ namespace: 'region-delete' }),
    b = createRegionPintaPersistence({ namespace: 'region-delete' }),
    source = map()
  await a.persistAsset(source)
  const displayed = await a.loadAssetById(source.id),
    latest = await b.loadAssetById(source.id)
  if (!displayed || !latest) throw Error('Mapa ausente')
  await b.persistAsset({ ...latest, name: 'revisao-nova' })
  await a.listAllAssets()
  await expect(a.deleteAsset(source.id, displayed)).rejects.toThrow('mudou em outra janela')
  const current = await b.loadAssetById(source.id)
  if (!current) throw Error('Mapa ausente')
  await b.deleteAsset(source.id, current)
  expect(await a.loadAssetById(source.id)).toBeNull()
  expect(
    idbMockDb('sistema-zero-pinta-region-delete').get(LOCAL_ASSET_PREFIX + source.id),
  ).toMatchObject({ asset: null })
  await expect(a.persistAsset({ ...displayed, name: 'recuperar' })).rejects.toBeInstanceOf(
    PintaLocalConflictError,
  )
  expect(await a.loadAssetById(source.id)).toBeNull()
  expect(await a.listAllAssets()).toHaveLength(1)
})

test('the public factory still refuses native 8 and conserves its old RAM as an independent copy', async () => {
  const legacy = createPintaPersistence({ namespace: 'region-public' }),
    regional = createRegionPintaPersistence({ namespace: 'region-public' }),
    source = map(),
    dense = createTilemapAsset({ name: 'antes', tilesetId: 'ground', cols: 3, rows: 2 })
  const old = { ...dense, id: source.id }
  await legacy.persistAsset(old)
  const base = await regional.loadAssetById(source.id)
  if (base?.kind !== 'tilemap' || 'origin' in base) throw Error('Base densa ausente')
  // Conversion keeps the causal baseline of the existing document.
  const prepared = prepareMapRegions(base)
  if (!prepared.ok) throw Error(prepared.reason)
  await regional.persistAsset(prepared.map)
  expect(await legacy.loadAssetById(source.id)).toBeNull()
  expect(legacy.getReadIssues?.()).toEqual([
    { id: source.id, name: source.id, status: 'unsupported', version: 8 },
  ])
  await expect(legacy.persistAsset({ ...old, name: 'edicao-antiga' })).rejects.toBeInstanceOf(
    PintaLocalConflictError,
  )
  const preserved = await regional.loadAssetById(source.id)
  expect(preserved?.kind === 'tilemap' && 'origin' in preserved).toBe(true)
  expect(await regional.listAllAssets()).toHaveLength(2)
})

test('the regional factory preserves an opaque future consumer and exposes the issue without allowing deletion', async () => {
  const local = createRegionPintaPersistence({ namespace: 'region-future' }),
    source = map()
  await local.persistAsset(source)
  const opaque = {
    version: 1,
    capability: 9,
    revision: 'future-revision',
    asset: { id: 'future', kind: 'tilemap', schema: 9 },
  }
  const db = idbMockDb('sistema-zero-pinta-region-future')
  db.set(`${LOCAL_ASSET_PREFIX}future`, opaque)
  expect(await local.listAllAssets()).toHaveLength(1)
  expect(local.getReadIssues?.()).toEqual([
    { id: 'future', name: 'future', status: 'unsupported', version: 9 },
  ])
  await expect(local.deleteAsset(source.id, source)).rejects.toThrow('onde este desenho é usado')
  await expect(local.persistAsset({ ...source, name: 'edicao-protegida' })).rejects.toBeInstanceOf(
    PintaLocalConflictError,
  )
  expect(db.get(`${LOCAL_ASSET_PREFIX}future`)).toEqual(opaque)
  expect((await local.loadAssetById(source.id))?.name).toBe('vila')
  expect(await local.listAllAssets()).toHaveLength(2)
})

test('the factory budgets the entire regional gallery and leaves all documents unchanged on quota refusal', async () => {
  const source = map(),
    layer = source.layers[0]!
  if (!('cells' in layer) || !layer.cells) throw Error('Camada ausente')
  layer.cells.chunks = Array.from({ length: 2048 }, (_, index) => ({
    col: (index % 64) - 2,
    row: Math.floor(index / 64) - 2,
    cells: new Int16Array(1024).fill(0),
  }))
  const maps = Array.from({ length: 6 }, (_, index) => ({
    ...source,
    id: `quota-${index}`,
    name: `quota-${index}`,
  }))
  const local = createRegionPintaPersistence({ namespace: 'region-quota' })
  await local.persistAssets(maps.slice(0, 5))
  const db = idbMockDb('sistema-zero-pinta-region-quota'),
    before = structuredClone(db),
    events: string[] = []
  const unsubscribe = local.subscribe?.((event) => events.push(event.type))
  try {
    await expect(local.persistAsset(maps[5]!)).rejects.toThrow('32 MiB')
  } finally {
    unsubscribe?.()
  }
  expect(db).toEqual(before)
  expect(events).toEqual([])
  expect(await local.loadAssetById(maps[5]!.id)).toBeNull()
  expect(await local.listAllAssets()).toHaveLength(5)
  await local.deleteAsset(maps[0]!.id, maps[0]!)
  await expect(local.persistAsset(maps[5]!)).resolves.toBeUndefined()
  expect(await local.listAllAssets()).toHaveLength(5)
}, 10000)

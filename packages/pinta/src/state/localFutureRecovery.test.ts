import { beforeEach, expect, test } from 'bun:test'
import {
  createBitmap,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
} from '../core/project'
import { clearIdbMock, idbMockDb, setIdbWriteGuard } from '../testing/idbMock'
import { setCell } from '../tiles/tilemapOps'
import { decodeLocalChunkDocument, encodeLocalChunkDocument } from './localChunkStorage'

const { createPintaPersistence, PintaLocalConflictError } = await import('./persistence')
const { LOCAL_ASSET_PREFIX } = await import('./localAssetAuthority')
beforeEach(clearIdbMock)
const namespace = 'future-recovery',
  db = () => idbMockDb(`sistema-zero-pinta-${namespace}`)
const client = () => createPintaPersistence({ namespace })

for (const transport of ['document', 'mirror'] as const)
  test(`a new opaque ${transport} consumer between the keys check and a sprite save cannot bypass recovery`, async () => {
    const local = client(),
      source = createPixelSpriteAsset({ name: 'tree', frameSize: 16 })
    await local.persistAsset(source)
    const next = {
      ...source,
      animations: source.animations.map((animation) => ({ ...animation, id: 'another-animation' })),
    }
    // persistAsset has captured the old keys and yielded before its eventual write.
    const pending = local.persistAsset(next)
    const opaque =
      transport === 'document'
        ? {
            version: 3,
            capability: 8,
            revision: 'future',
            asset: {
              id: 'future-map',
              art: { assetId: source.id, animationId: source.animations[0]!.id },
            },
          }
        : {
            id: 'future-map',
            kind: 'tilemap',
            schema: 8,
            art: { assetId: source.id, animationId: source.animations[0]!.id },
          }
    const opaqueKey =
      transport === 'document' ? `${LOCAL_ASSET_PREFIX}future-map` : 'pinta:asset:future-map'
    db().set(opaqueKey, opaque)
    await expect(pending).rejects.toBeInstanceOf(PintaLocalConflictError)
    expect(structuredClone(await client().loadAssetById(source.id))).toEqual(
      structuredClone(source),
    )
    expect(db().get(opaqueKey)).toEqual(opaque)
  })

test('a revision that became unreadable preserves stale RAM in an offline fork', async () => {
  const local = client(),
    source = createTilemapAsset({ name: 'vila', tilesetId: 'ground', cols: 2, rows: 2 })
  await local.persistAsset(source)
  const stale = await local.loadAssetById(source.id)
  if (stale?.kind !== 'tilemap') throw Error('Mapa ausente')
  const key = LOCAL_ASSET_PREFIX + source.id
  const opaque = {
    version: 3,
    storage: 'future',
    capability: 8,
    revision: 'future-8',
    asset: { id: source.id, kind: 'tilemap', schema: 8, name: 'vila', newData: ['não perder'] },
  }
  db().set(key, opaque)
  let error: unknown
  try {
    await local.persistAsset(
      setCell({ ...stale, name: 'minha-edicao' }, stale.layers[0]!.id, 0, 0, 3),
    )
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(PintaLocalConflictError)
  if (!(error instanceof PintaLocalConflictError)) throw Error('Cópia ausente')
  const fork = error.forks.get(source.id)
  expect(fork).toBeDefined()
  if (!fork) throw Error('Cópia ausente')
  expect(fork!.id).not.toBe(source.id)
  expect(db().get(key)).toEqual(opaque)
  const reopened = await client().loadAssetById(fork!.id)
  expect(reopened).toEqual(fork)
  if (reopened?.kind !== 'tilemap' || !isTileLayer(reopened.layers[0]!))
    throw Error('Mapa recuperado ausente')
  expect(reopened.layers[0]!.cells[0]).toBe(3)
  const resumed = client(),
    loaded = await resumed.loadAssetById(fork!.id)
  if (!loaded) throw Error('Cópia ausente')
  await resumed.persistAsset({ ...loaded, name: 'continuada' })
  expect((await client().loadAssetById(fork!.id))?.name).toBe('continuada')
  expect(await client().listAllAssets()).toHaveLength(1)
  db().set(key, {
    ...opaque,
    revision: 'future-next',
    asset: { ...opaque.asset, newReference: fork!.id },
  })
  await expect(resumed.persistAsset({ ...loaded, name: 'outra' })).rejects.toBeInstanceOf(
    PintaLocalConflictError,
  )
  expect((await client().loadAssetById(fork!.id))?.name).toBe('continuada')
  expect(await client().listAllAssets()).toHaveLength(2)
})

test('unknown map consumers cannot lose their live sheet indices: the complete old edit is forked', async () => {
  const local = client(),
    sheet = createTilesetAsset({ name: 'ground', tileSize: 16 })
  sheet.tiles = [createBitmap(16, 16), createBitmap(16, 16)]
  sheet.tiles[0]!.data.fill(1)
  sheet.tiles[1]!.data.fill(2)
  sheet.solid = [false, true]
  sheet.platform = [false, false]
  const base = createTilemapAsset({ name: 'vila', tilesetId: sheet.id, cols: 2, rows: 2 })
  const source = setCell(base, base.layers[0]!.id, 0, 0, 1)
  await local.persistAssets([sheet, source])
  const opaque = {
    version: 3,
    storage: 'future',
    capability: 8,
    revision: 'future-8',
    asset: { id: 'future-map', kind: 'tilemap', schema: 8, tilesetId: sheet.id, futureCells: [1] },
  }
  db().set(`${LOCAL_ASSET_PREFIX}future-map`, opaque)
  const nextSheet = { ...sheet, tiles: sheet.tiles.slice(1), solid: [true], platform: [false] }
  const nextMap = setCell(source, source.layers[0]!.id, 0, 0, 0)
  let error: unknown
  try {
    await local.persistAssets([nextSheet, nextMap])
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(PintaLocalConflictError)
  if (!(error instanceof PintaLocalConflictError)) throw Error('Cópias ausentes')
  expect(error.forks.size).toBe(2)
  const forkSheet = error.forks.get(sheet.id),
    forkMap = error.forks.get(source.id)
  if (forkSheet?.kind !== 'tileset' || forkMap?.kind !== 'tilemap')
    throw Error('Grafo recuperado ausente')
  expect(forkSheet.tiles).toHaveLength(1)
  expect(forkSheet.tiles[0]!.data[0]).toBe(2)
  expect(forkMap.tilesetId).toBe(forkSheet.id)
  expect(await client().loadAssetById(sheet.id)).toEqual(sheet)
  expect(await client().loadAssetById(source.id)).toEqual(source)
  expect(db().get(`${LOCAL_ASSET_PREFIX}future-map`)).toEqual(opaque)
})

test('failed opaque-version recovery rolls back every fork and its isolation ledger; retry succeeds', async () => {
  const local = client(),
    source = createTilemapAsset({ name: 'vila', tilesetId: 'ground', cols: 2, rows: 2 })
  await local.persistAsset(source)
  const opaque = {
    version: 3,
    capability: 8,
    revision: 'future',
    asset: { id: source.id, future: true },
  }
  db().set(LOCAL_ASSET_PREFIX + source.id, opaque)
  const before = structuredClone(db())
  let writes = 0
  setIdbWriteGuard(() => {
    if (++writes === 2) throw Error('falha de QA')
  })
  try {
    await expect(local.persistAsset({ ...source, name: 'minha-edicao' })).rejects.toThrow(
      'falha de QA',
    )
  } finally {
    setIdbWriteGuard(null)
  }
  expect(db()).toEqual(before)
  await expect(local.persistAsset({ ...source, name: 'minha-edicao' })).rejects.toBeInstanceOf(
    PintaLocalConflictError,
  )
  expect(db().get(LOCAL_ASSET_PREFIX + source.id)).toEqual(opaque)
  expect(await client().listAllAssets()).toHaveLength(1)
})

test('unchanged writes and new hydration keep their IDs; namespaces do not inherit opaque consumers', async () => {
  const local = client(),
    source = createTilesetAsset({ name: 'ground', tileSize: 16 })
  await local.persistAsset(source)
  const opaque = { version: 3, capability: 8, revision: 'future', asset: { id: 'future-map' } }
  db().set(`${LOCAL_ASSET_PREFIX}future-map`, opaque)
  const original = structuredClone(db().get(LOCAL_ASSET_PREFIX + source.id))
  await local.persistAsset(source)
  expect(db().get(LOCAL_ASSET_PREFIX + source.id)).toEqual(original)
  const hydrated = createTilesetAsset({ name: 'new-sheet', tileSize: 16 })
  await local.persistAsset(hydrated)
  expect(await client().loadAssetById(hydrated.id)).toEqual(hydrated)
  const other = createPintaPersistence({ namespace: `${namespace}-other` })
  await other.persistAsset(structuredClone(source))
  await other.persistAsset({ ...structuredClone(source), name: 'other-profile' })
  expect((await other.loadAssetById(source.id))?.name).toBe('other-profile')
  expect((await client().loadAssetById(source.id))?.name).toBe('ground')
  expect(db().get(`${LOCAL_ASSET_PREFIX}future-map`)).toEqual(opaque)
})

test('an opaque mirror without an authoritative revision cannot exempt a fork from future checks', async () => {
  const local = client(),
    source = createTilesetAsset({ name: 'ground', tileSize: 16 })
  await local.persistAsset(source)
  db().set('pinta:asset:future-map', { id: 'future-map', kind: 'tilemap', schema: 8 })
  let error: unknown
  try {
    await local.persistAsset({ ...source, name: 'edit' })
  } catch (caught) {
    error = caught
  }
  if (!(error instanceof PintaLocalConflictError)) throw Error('Cópia ausente')
  const fork = error.forks.get(source.id)!
  expect(db().has('pinta:local:compatibility:7')).toBe(false)
  const reopened = client(),
    copy = await reopened.loadAssetById(fork.id)
  if (!copy) throw Error('Cópia ausente')
  await expect(reopened.persistAsset({ ...copy, name: 'another-edit' })).rejects.toBeInstanceOf(
    PintaLocalConflictError,
  )
  expect((await client().loadAssetById(fork.id))?.name).toBe('edit-copia')
})

test('the isolation seal survives physical chunks and normal saves after reloading', async () => {
  const local = client(),
    source = createTilemapAsset({ name: 'vila', tilesetId: 'ground', cols: 256, rows: 256 })
  await local.persistAsset(source)
  db().set(`${LOCAL_ASSET_PREFIX}future-map`, {
    version: 3,
    capability: 8,
    revision: 'future',
    asset: { id: 'future-map', future: true },
  })
  let error: unknown
  try {
    await local.persistAsset({ ...source, name: 'minha-edicao' })
  } catch (caught) {
    error = caught
  }
  if (!(error instanceof PintaLocalConflictError)) throw Error('Cópia ausente')
  const fork = error.forks.get(source.id)!
  // This suite mocks the IO boundary; exercise the real physical codec explicitly.
  const key = LOCAL_ASSET_PREFIX + fork.id
  const logical = db().get(key)
  const encoded = encodeLocalChunkDocument(key, logical, new Map())
  expect(encoded.document).toMatchObject({ version: 2, isolation: { version: 1, readerSchema: 7 } })
  const decoded = decodeLocalChunkDocument(key, encoded.document, encoded.chunks)
  expect(decoded).toEqual(logical)
  db().set(key, decoded)
  const reopened = client(),
    loaded = await reopened.loadAssetById(fork.id)
  if (!loaded) throw Error('Cópia ausente')
  await reopened.persistAsset({ ...loaded, name: 'continuada' })
  expect(await client().listAllAssets()).toHaveLength(2)
  expect((await client().loadAssetById(fork.id))?.name).toBe('continuada')
})

test('deletion cannot break an unreadable consumer; an isolated branch can be deleted and restored', async () => {
  const local = client(),
    source = createTilesetAsset({ name: 'ground', tileSize: 16 })
  await local.persistAsset(source)
  const opaque = {
    version: 3,
    capability: 8,
    revision: 'future',
    asset: { id: 'future-map', tilesetId: source.id },
  }
  db().set(`${LOCAL_ASSET_PREFIX}future-map`, opaque)
  const before = structuredClone(db())
  await expect(local.deleteAsset(source.id)).rejects.toThrow('conferir onde')
  expect(db()).toEqual(before)
  let error: unknown
  try {
    await local.persistAsset({ ...source, name: 'minha-edicao' })
  } catch (caught) {
    error = caught
  }
  if (!(error instanceof PintaLocalConflictError)) throw Error('Cópia ausente')
  const fork = error.forks.get(source.id)!
  await local.deleteAsset(fork.id)
  expect(await client().loadAssetById(fork.id)).toBeNull()
  // Deliberate import on the client that observed its own tombstone, not stale RAM.
  await local.persistAsset({ ...structuredClone(fork), name: 'restaurada' })
  expect((await client().loadAssetById(fork.id))?.name).toBe('restaurada')
  db().set(`${LOCAL_ASSET_PREFIX}future-map`, {
    ...opaque,
    revision: 'next',
    asset: { ...opaque.asset, another: fork.id },
  })
  await expect(local.deleteAsset(fork.id)).rejects.toThrow('conferir onde')
  expect((await client().loadAssetById(fork.id))?.name).toBe('restaurada')
})

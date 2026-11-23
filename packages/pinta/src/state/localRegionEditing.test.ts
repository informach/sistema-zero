import { beforeEach, expect, test } from 'bun:test'
import { pintaLocalRevisionOf, pintaResourceObservation } from '../core/localAssetOrigin'
import {
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  type RegionTilemapAsset,
} from '../core/project'
import {
  clearIdbMock,
  idbMockDb,
  idbMockStats,
  resetIdbMockStats,
  setIdbWriteGuard,
} from '../testing/idbMock'
import { expandRegionMap, prepareMapRegions } from '../tiles/regionMap'
import { cellAt, setCell } from '../tiles/tilemapOps'
import { PINTA_CAUSAL_OUTBOX_KEY } from './assetAuthorityKeys'
import { authorityKey, LOCAL_ASSET_PREFIX, mirrorKey } from './localAssetAuthority'
import { localPreparedKey, PINTA_CAUSAL_BLOBS_KEY } from './localCausalOutbox'
import { PINTA_CAUSAL_PIN_BLOBS_KEY } from './localCausalPins'
import { localRegionChunkKey } from './localRegionChunkStorage'
import { readLocalRegionEditBase } from './localRegionEditing'
import { createRegionPintaPersistence } from './localRegionPersistence'
import { dbNameFor, setPintaStorageNamespace } from './persistence'
import { createWorkshopPintaPersistence, sanitizeWorkshopAsset } from './workshopPersistence'
import { createWorkshopStorageCodec } from './workshopStorageCodec'

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

/** A purely local physical-3 map with one stored chunk and its sheet. */
async function seedLocalRegion(namespace: string) {
  setPintaStorageNamespace(namespace)
  const tileset = createTilesetAsset({ name: 'folha', tileSize: 16 })
  await createRegionPintaPersistence({ namespace }).persistAsset(tileset)
  const converted = prepareMapRegions(
    createTilemapAsset({ name: 'vila', tilesetId: tileset.id, cols: 2, rows: 2 }),
  )
  if (!converted.ok) throw Error(converted.reason)
  const map = converted.map
  const layer = map.layers.find(isTileLayer)
  if (!layer) throw Error('Camada de peças ausente')
  const chunk = `pinta:local:chunk:${map.id}:${encodeURIComponent(layer.id)}:0:0`
  const db = idbMockDb(`sistema-zero-pinta-${namespace}`)
  db.set(`pinta:local:document:${map.id}`, {
    version: 3,
    capability: 8,
    revision: 'revisao-1',
    storage: 'pinta-regions-32-v1',
    asset: {
      ...map,
      layers: map.layers.map((item) =>
        item === layer
          ? { ...layer, cells: { ...layer.cells, chunks: [{ col: 0, row: 0, key: chunk }] } }
          : item,
      ),
    },
  })
  db.set(chunk, new Int16Array(1024).fill(0))
  db.set(`pinta:asset:${map.id}`, {
    kind: 'pinta-local-mirror',
    version: 1,
    capability: 8,
    id: map.id,
    revision: 'revisao-1',
  })
  return { db, id: map.id, tilesetId: tileset.id }
}

test('a purely local profile opens the regional edit base from the directory', async () => {
  const namespace = 'region-edit-local'
  const { db, id, tilesetId } = await seedLocalRegion(namespace)
  expect([...db.keys()].filter((key) => String(key).startsWith('pinta:sync:'))).toEqual([])
  const opened = await readLocalRegionEditBase(namespace, id)
  expect(opened?.base.revision).toBe('revisao-1')
  expect(opened?.base.resources.map((resource) => resource.id)).toEqual([tilesetId])
})

test('any V4 causal record keeps the regional CAS closed until the account writer owns the edit', async () => {
  const namespace = 'region-edit-causal'
  const { db, id } = await seedLocalRegion(namespace)
  const causalRecords: [string, unknown][] = [
    [PINTA_CAUSAL_OUTBOX_KEY, { version: 4 }],
    [PINTA_CAUSAL_BLOBS_KEY, new Map()],
    [PINTA_CAUSAL_PIN_BLOBS_KEY, new Map()],
    [localPreparedKey('op-anterior'), new Map()],
  ]
  for (const [key, value] of causalRecords) {
    db.set(key, value)
    await expect(readLocalRegionEditBase(namespace, id)).rejects.toThrow(
      'Abra o cenário pela sua conta',
    )
    db.delete(key)
  }
  expect((await readLocalRegionEditBase(namespace, id))?.base.revision).toBe('revisao-1')
})

const workshopCodec = createWorkshopStorageCodec(sanitizeWorkshopAsset)

/**
 * O mock do IndexedDB não passa pelo codec da fronteira (`withAssetTransaction` ignora a política
 * de armazenamento). Para o disco ter os bytes que o IndexedDB real guarda, cada documento lógico
 * passa pelo mesmo codec da oficina, como `planLocalStorageWrites` faz na primeira gravação.
 */
function storePhysically(db: Map<IDBValidKey, unknown>) {
  for (const [key, value] of [...db]) {
    if (typeof key !== 'string' || !key.startsWith(LOCAL_ASSET_PREFIX)) continue
    const encoded = workshopCodec.encode(key, value, new Map())
    db.set(key, encoded.document)
    for (const [chunk, cells] of encoded.chunks) db.set(chunk, cells)
  }
}

function readPhysicalMap(db: Map<IDBValidKey, unknown>, id: string) {
  const records = new Map<string, unknown>()
  for (const [key, value] of db) if (typeof key === 'string') records.set(key, value)
  const decoded = workshopCodec.decode(authorityKey(id), records.get(authorityKey(id)), records)
  if (!decoded || typeof decoded !== 'object' || !('asset' in decoded)) throw Error('Mapa ausente')
  const asset = sanitizeWorkshopAsset(decoded.asset)
  if (asset?.kind !== 'tilemap' || !('origin' in asset)) throw Error('Mapa regional ausente')
  return asset
}

/**
 * Uma folha e um cenário nativo 8 com três chunks no físico 3, reabertos pela oficina como o
 * editor os recebe: a origem local da RAM aponta a revisão guardada.
 */
async function seedPhysicalRegion(namespace: string) {
  setPintaStorageNamespace(namespace)
  const persistence = createWorkshopPintaPersistence({ namespace })
  const sheet = createTilesetAsset({ name: 'folha', tileSize: 16 })
  const dense = createTilemapAsset({ name: 'vila', tilesetId: sheet.id, cols: 2, rows: 2 })
  const converted = prepareMapRegions(dense)
  if (!converted.ok) throw Error(converted.reason)
  const expanded = expandRegionMap(converted.map, { col: -64, row: -64, cols: 160, rows: 96 })
  if (!expanded.ok) throw Error(expanded.reason)
  const layer = expanded.map.layers.find(isTileLayer)
  if (!layer) throw Error('Camada de peças ausente')
  let map: RegionTilemapAsset = expanded.map
  for (const [col, row, tile] of [
    [-64, -64, 1],
    [0, 0, 2],
    [40, 10, 3],
  ] as const)
    map = setCell(map, layer.id, col, row, tile)
  await persistence.persistAssets([sheet, map])
  const previous = await persistence.loadAssetById(map.id)
  const readSheet = await persistence.loadAssetById(sheet.id)
  if (previous?.kind !== 'tilemap' || !('origin' in previous)) throw Error('Cenário não reabriu')
  const observed = readSheet && pintaResourceObservation(readSheet)
  if (!observed) throw Error('Folha sem revisão local')
  const db = idbMockDb(dbNameFor(namespace))
  storePhysically(db)
  const chunk = (col: number, row: number) => localRegionChunkKey(map.id, layer.id, col, row)
  expect(db.get(authorityKey(map.id))).toMatchObject({
    version: 3,
    storage: 'pinta-regions-32-v1',
    revision: pintaLocalRevisionOf(previous),
  })
  expect(
    [...db.keys()].filter((key) => String(key).startsWith('pinta:local:chunk:')).sort(),
  ).toEqual([chunk(-2, -2), chunk(0, 0), chunk(1, 0)].sort())
  return { db, persistence, previous, resources: [observed], layerId: layer.id, chunk, id: map.id }
}

test('editar uma casa grava só o cabeçalho, o espelho e o chunk tocado; os outros chunks ficam intactos', async () => {
  const { db, persistence, previous, resources, layerId, chunk, id } =
    await seedPhysicalRegion('regiao-incremental')
  const untouched = [chunk(-2, -2), chunk(1, 0)]
  const keysBefore = [...db.keys()].map(String).sort()
  const buffersBefore = new Map(untouched.map((key) => [key, db.get(key)]))
  const oldRevision = pintaLocalRevisionOf(previous)
  const written: string[] = []
  setIdbWriteGuard((key) => {
    written.push(String(key))
  })
  resetIdbMockStats()
  const next = setCell(previous, layerId, 5, 5, 7)
  await persistence.persistRevision(previous, next, resources)
  // Uma transação só: cair na gravação inteira abriria outra e regravaria o documento lógico.
  expect(idbMockStats().atomic).toBe(1)
  expect(written.sort()).toEqual([authorityKey(id), mirrorKey(id), chunk(0, 0)].sort())
  expect([...db.keys()].map(String).sort()).toEqual(keysBefore)
  for (const key of untouched) expect(db.get(key)).toBe(buffersBefore.get(key))
  const revision = pintaLocalRevisionOf(next)
  expect(revision).toBeString()
  expect(revision).not.toBe(oldRevision)
  expect(db.get(authorityKey(id))).toMatchObject({
    version: 3,
    storage: 'pinta-regions-32-v1',
    revision,
  })
  expect(db.get(mirrorKey(id))).toEqual({
    kind: 'pinta-local-mirror',
    version: 1,
    capability: 8,
    id,
    revision,
  })
  const reopened = readPhysicalMap(db, id)
  expect(structuredClone(reopened)).toEqual(structuredClone(next))
  expect(
    [
      [-64, -64],
      [0, 0],
      [40, 10],
      [5, 5],
    ].map(([col, row]) => cellAt(reopened, layerId, col!, row!)),
  ).toEqual([1, 2, 3, 7])

  // O autosave seguinte da mesma linhagem continua incremental a partir da revisão confirmada.
  written.length = 0
  resetIdbMockStats()
  const again = setCell(next, layerId, 41, 11, 8)
  await persistence.persistRevision(next, again, resources)
  expect(idbMockStats().atomic).toBe(1)
  expect(written.sort()).toEqual([authorityKey(id), mirrorKey(id), chunk(1, 0)].sort())
  expect(db.get(chunk(-2, -2))).toBe(buffersBefore.get(chunk(-2, -2)))
  expect(cellAt(readPhysicalMap(db, id), layerId, 41, 11)).toBe(8)
})

test('uma falha real na gravação incremental chega ao editor, sem gravação inteira nem disco alterado', async () => {
  const { db, persistence, previous, resources, layerId, chunk, id } = await seedPhysicalRegion(
    'regiao-incremental-falha',
  )
  const before = new Map(db)
  const oldRevision = pintaLocalRevisionOf(previous)
  const quota = new Error('Sem espaço no aparelho')
  setIdbWriteGuard((key) => {
    if (key === chunk(0, 0)) throw quota
  })
  resetIdbMockStats()
  const next = setCell(previous, layerId, 5, 5, 7)
  await expect(persistence.persistRevision(previous, next, resources)).rejects.toBe(quota)
  // O erro não é engolido pela queda na gravação inteira: nenhuma outra transação foi aberta.
  expect(idbMockStats().atomic).toBe(1)
  expect([...db.keys()].map(String).sort()).toEqual([...before.keys()].map(String).sort())
  for (const [key, value] of before) expect(db.get(key)).toBe(value)
  expect(pintaLocalRevisionOf(next)).toBe(oldRevision)

  // O editor repete o mesmo autosave sobre a mesma base, ainda pelo caminho incremental.
  setIdbWriteGuard(null)
  resetIdbMockStats()
  await persistence.persistRevision(previous, next, resources)
  expect(idbMockStats().atomic).toBe(1)
  expect(db.get(chunk(1, 0))).toBe(before.get(chunk(1, 0)))
  expect(cellAt(readPhysicalMap(db, id), layerId, 5, 5)).toBe(7)
})

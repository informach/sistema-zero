import { beforeEach, expect, test } from 'bun:test'
import { createTilemapAsset, createTilesetAsset, isTileLayer } from '../core/project'
import { clearIdbMock, idbMockDb } from '../testing/idbMock'
import { prepareMapRegions } from '../tiles/regionMap'
import { PINTA_CAUSAL_OUTBOX_KEY } from './assetAuthorityKeys'
import { localPreparedKey, PINTA_CAUSAL_BLOBS_KEY } from './localCausalOutbox'
import { PINTA_CAUSAL_PIN_BLOBS_KEY } from './localCausalPins'
import { readLocalRegionEditBase } from './localRegionEditing'
import { createRegionPintaPersistence } from './localRegionPersistence'
import { setPintaStorageNamespace } from './persistence'

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

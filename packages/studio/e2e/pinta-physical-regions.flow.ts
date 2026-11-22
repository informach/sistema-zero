import { expect, type Page, test } from '@playwright/test'
import { openPintaAuthorityProof as proof } from './helpers/pintaAuthorityRealm'

declare global {
  interface Window {
    pintaPhysicalRegions: typeof import('../../pinta/scripts/physical-region-proof')
  }
}

async function initialize(page: Page, namespace: string) {
  return page.evaluate(async (namespace) => {
    const p = window.pintaPhysicalRegions
    const dense = p.createTilemapAsset({ name: 'vila', tilesetId: 'ground', cols: 3, rows: 2 })
    dense.layers[0]!.cells![0] = 3
    const converted = p.prepareMapRegions(dense)
    if (!converted.ok) throw Error(converted.reason)
    const expanded = p.expandRegionMap(converted.map, {
      col: -64,
      row: -64,
      cols: 10000,
      rows: 10000,
    })
    if (!expanded.ok) throw Error(expanded.reason)
    const map = p.setCell(expanded.map, expanded.map.layers[0]!.id, -64, -64, 4)
    const key = `pinta:local:document:${map.id}`
    const store = p.createStore(`sistema-zero-pinta-${namespace}`, 'kv')
    await p.withAssetTransaction(
      store,
      (records) => {
        records.set(key, { version: 1, capability: 8, revision: 'r1', asset: map })
      },
      undefined,
      p.localRegionStorageCodec,
    )
    return map.id
  }, namespace)
}

test.beforeEach(async ({ page, context }, info) => {
  if (info.project.name === 'cpu-4x') {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  }
  await proof(page)
})

test('physical 3 reopens signed regions in an independent realm and writes only the edited chunk', async ({
  page,
  context,
}, info) => {
  const namespace = `physical-regions-${Date.now()}`,
    id = await initialize(page, namespace)
  await page.close()
  const reopened = await context.newPage()
  if (info.project.name === 'cpu-4x') {
    const cdp = await context.newCDPSession(reopened)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  }
  await proof(reopened)
  expect(
    await reopened.evaluate(
      async ({ namespace, id }) => {
        const p = window.pintaPhysicalRegions,
          key = `pinta:local:document:${id}`
        const store = p.createStore(`sistema-zero-pinta-${namespace}`, 'kv')
        const puts: string[] = [],
          original = IDBObjectStore.prototype.put
        IDBObjectStore.prototype.put = function (value, key) {
          puts.push(String(key))
          return original.call(this, value, key)
        }
        let cells: number[] = [],
          chunks = 0
        try {
          await p.withAssetTransaction(
            store,
            (records) => {
              const doc = records.get(key)
              if (!doc || typeof doc !== 'object' || !('asset' in doc))
                throw Error('Documento ausente')
              const map = p.sanitizeRegionTilemapAsset(doc.asset)
              if (!map) throw Error('Mapa ausente')
              cells = [
                p.cellAt(map, map.layers[0]!.id, -64, -64),
                p.cellAt(map, map.layers[0]!.id, 0, 0),
                p.cellAt(map, map.layers[0]!.id, 9000, 9000),
              ]
              chunks = map.layers.reduce(
                (count, layer) =>
                  count + ('cells' in layer && layer.cells ? layer.cells.chunks.length : 0),
                0,
              )
              records.set(key, {
                ...doc,
                revision: 'r2',
                asset: p.setCell(map, map.layers[0]!.id, -64, -64, 8),
              })
            },
            undefined,
            p.localRegionStorageCodec,
          )
        } finally {
          IDBObjectStore.prototype.put = original
        }
        return {
          cells,
          chunks,
          writes: puts.length,
          chunkWrites: puts.filter((key) => key.startsWith('pinta:local:chunk:')).length,
        }
      },
      { namespace, id },
    ),
  ).toEqual({ cells: [4, 3, -1], chunks: 2, writes: 2, chunkWrites: 1 })
})

test('a queued chunk failure aborts the region header and buffers, and retry preserves the native document', async ({
  page,
}) => {
  const namespace = `physical-regions-abort-${Date.now()}`,
    id = await initialize(page, namespace)
  expect(
    await page.evaluate(
      async ({ namespace, id }) => {
        const p = window.pintaPhysicalRegions,
          key = `pinta:local:document:${id}`
        const store = p.createStore(`sistema-zero-pinta-${namespace}`, 'kv')
        const read = () =>
          p.withAssetTransaction(
            store,
            (records) => records.get(key),
            undefined,
            p.localRegionStorageCodec,
          )
        const before = await read()
        const mutate = () =>
          p.withAssetTransaction(
            store,
            (records) => {
              const raw = records.get(key)
              if (!raw || typeof raw !== 'object' || !('asset' in raw))
                throw Error('Documento ausente')
              const map = p.sanitizeRegionTilemapAsset(raw.asset)
              if (!map) throw Error('Mapa ausente')
              records.set(key, {
                ...raw,
                revision: 'r2',
                asset: p.setCell(map, map.layers[0]!.id, -64, -64, 8),
              })
            },
            undefined,
            p.localRegionStorageCodec,
          )
        let writes = 0,
          message = ''
        const original = IDBObjectStore.prototype.put
        IDBObjectStore.prototype.put = function (...args) {
          if (++writes === 2) throw Error('quota-regional-qa')
          return original.apply(this, args)
        }
        try {
          await mutate()
        } catch (error) {
          message = String(error)
        } finally {
          IDBObjectStore.prototype.put = original
        }
        const after = await read()
        const unchanged = JSON.stringify(before) === JSON.stringify(after)
        await mutate()
        const retried = await read()
        return {
          failed: message.includes('quota-regional-qa'),
          writes,
          unchanged,
          revision:
            retried && typeof retried === 'object' && 'revision' in retried
              ? retried.revision
              : null,
        }
      },
      { namespace, id },
    ),
  ).toEqual({ failed: true, writes: 2, unchanged: true, revision: 'r2' })
})

test('the public reader 7 refuses physical 3 and keeps its old editing RAM in a persistent offline fork', async ({
  page,
}) => {
  const namespace = `physical-reader7-${Date.now()}`
  const id = await page.evaluate(async (namespace) => {
    const p = window.pinta026
    window.client026 = p.createPintaPersistence({ namespace })
    const map = p.createTilemapAsset({ name: 'vila', tilesetId: 'ground', cols: 2, rows: 2 })
    await window.client026.persistAsset(map)
    window.ram026 = (await window.client026.loadAssetById(map.id))!
    return map.id
  }, namespace)
  expect(
    await page.evaluate(
      async ({ namespace, id }) => {
        const p = window.pintaPhysicalRegions,
          key = `pinta:local:document:${id}`
        if (window.ram026.kind !== 'tilemap') throw Error('Mapa ausente')
        const converted = p.prepareMapRegions(window.ram026)
        if (!converted.ok) throw Error(converted.reason)
        const store = p.createStore(`sistema-zero-pinta-${namespace}`, 'kv')
        await p.withAssetTransaction(
          store,
          (records) => {
            records.set(key, {
              version: 1,
              capability: 8,
              revision: 'region8',
              asset: converted.map,
            })
          },
          undefined,
          p.localRegionStorageCodec,
        )
        const reader = window.client026
        const refused = (await reader.loadAssetById(id)) === null
        let copy = ''
        try {
          await reader.persistAsset({ ...window.ram026, name: 'edicao7' })
        } catch (error) {
          if (!(error instanceof window.pinta026.PintaLocalConflictError)) throw error
          copy = error.forks.get(id)!.id
        }
        const authority = await p.withAssetTransaction(
          store,
          (records) => records.get(key),
          undefined,
          p.localRegionStorageCodec,
        )
        const independent = window.pinta026.createPintaPersistence({ namespace })
        return {
          refused,
          copySaved: (await independent.loadAssetById(copy))?.name,
          authority:
            authority && typeof authority === 'object' && 'revision' in authority
              ? authority.revision
              : null,
        }
      },
      { namespace, id },
    ),
  ).toEqual({ refused: true, copySaved: 'edicao7-copia', authority: 'region8' })
})

test('IndexedDB keeps the full 32-layer 4-MiB native budget and writes one chunk for one edit', async ({
  page,
}) => {
  const namespace = `physical-full-${Date.now()}`
  expect(
    await page.evaluate(async (namespace) => {
      const p = window.pintaPhysicalRegions
      const dense = p.createTilemapAsset({
        name: 'full',
        tilesetId: 'ground',
        cols: 256,
        rows: 256,
      })
      const layer = dense.layers[0]
      if (!layer || !window.pinta026.isTileLayer(layer)) throw Error('Camada de peças ausente')
      dense.layers = Array.from({ length: 32 }, (_, index) => ({
        ...layer,
        id: `layer-${index}`,
        cells: new Int16Array(65536).fill(0),
      }))
      const converted = p.prepareMapRegions(dense)
      if (!converted.ok) throw Error(converted.reason)
      const key = `pinta:local:document:${dense.id}`,
        store = p.createStore(`sistema-zero-pinta-${namespace}`, 'kv')
      await p.withAssetTransaction(
        store,
        (records) => {
          records.set(key, { version: 1, capability: 8, revision: 'r1', asset: converted.map })
        },
        undefined,
        p.localRegionStorageCodec,
      )
      let count = 0,
        bytes = 0
      const puts: string[] = [],
        original = IDBObjectStore.prototype.put
      IDBObjectStore.prototype.put = function (value, key) {
        puts.push(String(key))
        return original.call(this, value, key)
      }
      try {
        await p.withAssetTransaction(
          store,
          (records) => {
            for (const [key, value] of records)
              if (key.startsWith('pinta:local:chunk:') && value instanceof Int16Array) {
                count++
                bytes += value.byteLength
              }
            const doc = records.get(key)
            if (!doc || typeof doc !== 'object' || !('asset' in doc))
              throw Error('Documento ausente')
            const map = p.sanitizeRegionTilemapAsset(doc.asset)
            if (!map) throw Error('Mapa ausente')
            records.set(key, { ...doc, revision: 'r2', asset: p.setCell(map, 'layer-0', 0, 0, 1) })
          },
          undefined,
          p.localRegionStorageCodec,
        )
      } finally {
        IDBObjectStore.prototype.put = original
      }
      return {
        count,
        bytes,
        puts: puts.length,
        chunkPuts: puts.filter((key) => key.startsWith('pinta:local:chunk:')).length,
      }
    }, namespace),
  ).toEqual({ count: 2048, bytes: 4194304, puts: 2, chunkPuts: 1 })
})

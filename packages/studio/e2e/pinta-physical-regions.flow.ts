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
    map.layers[0]!.cells![0] = 0
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
        let futureChunkReads = 0
        const originalGet = IDBObjectStore.prototype.get
        IDBObjectStore.prototype.get = function (...args) {
          if (String(args[0]).startsWith('pinta:local:chunk:')) futureChunkReads++
          return originalGet.apply(this, args)
        }
        const refused = (await reader.loadAssetById(id)) === null
        await reader.listAllAssets()
        let copy = ''
        try {
          await reader.persistAsset({ ...window.ram026, name: 'edicao7' })
        } catch (error) {
          if (!(error instanceof window.pinta026.PintaLocalConflictError)) throw error
          copy = error.forks.get(id)!.id
        }
        IDBObjectStore.prototype.get = originalGet
        const authority = await p.withAssetTransaction(
          store,
          (records) => records.get(key),
          undefined,
          p.localRegionStorageCodec,
        )
        const independent = window.pinta026.createPintaPersistence({ namespace })
        return {
          refused,
          futureChunkReads,
          copySaved: (await independent.loadAssetById(copy))?.name,
          authority:
            authority && typeof authority === 'object' && 'revision' in authority
              ? authority.revision
              : null,
        }
      },
      { namespace, id },
    ),
  ).toEqual({
    refused: true,
    futureChunkReads: 0,
    copySaved: 'edicao7-copia',
    authority: 'region8',
  })
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

test('the common regional authority persists compact mirrors and forks stale RAM after an unrelated listing', async ({
  page,
}) => {
  const namespace = `regional-authority-${Date.now()}`,
    id = await initialize(page, namespace)
  expect(
    await page.evaluate(
      async ({ namespace, id }) => {
        const p = window.pintaPhysicalRegions,
          mirror = `pinta:asset:${id}`
        const store = p.createStore(`sistema-zero-pinta-${namespace}`, 'kv'),
          authority = p.createLocalRegionAssetAuthority()
        const initial = await p.withAssetTransaction(
          store,
          (records) => authority.resolveLocalRecords(records),
          undefined,
          p.localRegionStorageCodec,
        )
        const source = initial.assets.get(id)
        if (source?.kind !== 'tilemap' || !('origin' in source))
          throw Error('Mapa regional ausente')
        const revision = initial.documents.get(id)!.revision
        p.recordPintaLocalOrigin(source, 'regional-browser', revision)
        const observed = new Map([[id, revision]])
        const puts: string[] = [],
          original = IDBObjectStore.prototype.put
        IDBObjectStore.prototype.put = function (value, key) {
          puts.push(String(key))
          return original.call(this, value, key)
        }
        let changed: ReturnType<typeof authority.writeLocalRecords>
        try {
          changed = await p.withAssetTransaction(
            store,
            (records) =>
              authority.writeLocalRecords(
                records,
                [p.setCell(structuredClone(source), source.layers[0]!.id, 0, 0, 8)],
                observed,
                'regional-browser',
              ),
            undefined,
            p.localRegionStorageCodec,
          )
        } finally {
          IDBObjectStore.prototype.put = original
        }
        const compact = await p.withAssetTransaction(
          store,
          (records) => records.get(mirror),
          undefined,
          p.localRegionStorageCodec,
        )
        // A later read can update observation bookkeeping, but cannot rewrite the old RAM origin.
        observed.set(id, changed.documents.get(id)!.revision)
        const stale = await p.withAssetTransaction(
          store,
          (records) =>
            authority.writeLocalRecords(
              records,
              [p.setCell(source, source.layers[0]!.id, -64, -64, 9)],
              observed,
              'regional-browser',
            ),
          undefined,
          p.localRegionStorageCodec,
        )
        const copy = stale.forks.get(id)
        const independent = p.createLocalRegionAssetAuthority()
        const reopened = await p.withAssetTransaction(
          store,
          (records) => independent.resolveLocalRecords(records),
          undefined,
          p.localRegionStorageCodec,
        )
        const originalMap = reopened.assets.get(id),
          copied = copy && reopened.assets.get(copy.id)
        if (originalMap?.kind !== 'tilemap' || copied?.kind !== 'tilemap' || !('origin' in copied))
          throw Error('Recuperação ausente')
        return {
          writes: puts.length,
          chunkWrites: puts.filter((key) => key.startsWith('pinta:local:chunk:')).length,
          compact: compact && typeof compact === 'object' ? Object.keys(compact).sort() : [],
          forks: stale.forks.size,
          original: p.cellAt(originalMap, originalMap.layers[0]!.id, 0, 0),
          recovered: p.cellAt(copied, copied.layers[0]!.id, -64, -64),
        }
      },
      { namespace, id },
    ),
  ).toEqual({
    writes: 3,
    chunkWrites: 1,
    compact: ['capability', 'id', 'kind', 'revision', 'version'],
    forks: 1,
    original: 8,
    recovered: 9,
  })
})

test('regional business recovery, mirror and chunks roll back together when a queued put fails', async ({
  page,
}) => {
  const namespace = `regional-business-abort-${Date.now()}`,
    id = await initialize(page, namespace)
  expect(
    await page.evaluate(
      async ({ namespace, id }) => {
        const p = window.pintaPhysicalRegions,
          store = p.createStore(`sistema-zero-pinta-${namespace}`, 'kv'),
          authority = p.createLocalRegionAssetAuthority()
        const read = () =>
          p.withAssetTransaction(
            store,
            (records) => authority.resolveLocalRecords(records),
            undefined,
            p.localRegionStorageCodec,
          )
        const initial = await read(),
          source = initial.assets.get(id)
        if (source?.kind !== 'tilemap' || !('origin' in source)) throw Error('Mapa ausente')
        const observed = new Map([[id, initial.documents.get(id)!.revision]])
        await p.withAssetTransaction(
          store,
          (records) =>
            authority.writeLocalRecords(
              records,
              [{ ...source, name: 'outra-aba' }],
              observed,
              'regional-browser',
            ),
          undefined,
          p.localRegionStorageCodec,
        )
        const before = await read()
        let writes = 0,
          error = ''
        const original = IDBObjectStore.prototype.put
        IDBObjectStore.prototype.put = function (...args) {
          if (++writes === 2) throw Error('falha-copia-regional-qa')
          return original.apply(this, args)
        }
        const recover = () =>
          p.withAssetTransaction(
            store,
            (records) =>
              authority.writeLocalRecords(records, [source], observed, 'regional-browser'),
            undefined,
            p.localRegionStorageCodec,
          )
        try {
          await recover()
        } catch (caught) {
          error = String(caught)
        } finally {
          IDBObjectStore.prototype.put = original
        }
        const after = await read()
        const retried = await recover()
        return {
          failed: error.includes('falha-copia-regional-qa'),
          unchanged: JSON.stringify([...before.documents]) === JSON.stringify([...after.documents]),
          before: before.assets.size,
          after: after.assets.size,
          copies: retried.forks.size,
        }
      },
      { namespace, id },
    ),
  ).toEqual({ failed: true, unchanged: true, before: 1, after: 1, copies: 1 })
})

test('the existing persistence factory reopens sparse regions in another page and writes a compact revision', async ({
  page,
  context,
}, info) => {
  const namespace = `region-factory-reopen-${Date.now()}`,
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
          local = p.createRegionPintaPersistence({ namespace }),
          source = await local.loadAssetById(id)
        if (source?.kind !== 'tilemap' || !('origin' in source)) throw Error('Mapa ausente')
        const puts: string[] = [],
          original = IDBObjectStore.prototype.put
        IDBObjectStore.prototype.put = function (value, key) {
          puts.push(String(key))
          return original.call(this, value, key)
        }
        try {
          await local.persistAsset(p.setCell(source, source.layers[0]!.id, -64, -64, 8))
        } finally {
          IDBObjectStore.prototype.put = original
        }
        const after = await p.createRegionPintaPersistence({ namespace }).loadAssetById(id)
        if (after?.kind !== 'tilemap' || !('origin' in after)) throw Error('Mapa não reabriu')
        const store = p.createStore(`sistema-zero-pinta-${namespace}`, 'kv')
        const raw = await store(
          'readonly',
          (kv) =>
            new Promise<unknown>((resolve, reject) => {
              const request = kv.get(`pinta:asset:${id}`)
              request.onsuccess = () => resolve(request.result)
              request.onerror = () => reject(request.error)
            }),
        )
        return {
          cell: p.cellAt(after, after.layers[0]!.id, -64, -64),
          untouched: p.cellAt(after, after.layers[0]!.id, 0, 0),
          origin: after.origin,
          chunks: after.layers.reduce((sum, layer) => sum + (layer.cells?.chunks.length ?? 0), 0),
          puts: puts.length,
          chunkPuts: puts.filter((key) => key.startsWith('pinta:local:chunk:')).length,
          mirror: raw && typeof raw === 'object' ? Object.keys(raw).sort() : [],
          issues: local.getReadIssues?.(),
        }
      },
      { namespace, id },
    ),
  ).toEqual({
    cell: 8,
    untouched: 3,
    origin: { col: -64, row: -64 },
    chunks: 2,
    puts: 3,
    chunkPuts: 1,
    mirror: ['capability', 'id', 'kind', 'revision', 'version'],
    issues: [],
  })
})

test('two factory clients preserve stale regional RAM through abort, durable recovery and continued editing', async ({
  page,
  context,
}, info) => {
  const namespace = `region-factory-conflict-${Date.now()}`,
    id = await initialize(page, namespace)
  await page.evaluate(
    async ({ namespace, id }) => {
      const p = window.pintaPhysicalRegions,
        local = p.createRegionPintaPersistence({ namespace }),
        source = await local.loadAssetById(id)
      if (source?.kind !== 'tilemap' || !('origin' in source)) throw Error('Mapa ausente')
      Object.assign(window, { factoryRecovery: { local, source } })
    },
    { namespace, id },
  )
  const peer = await context.newPage()
  if (info.project.name === 'cpu-4x') {
    const cdp = await context.newCDPSession(peer)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  }
  await proof(peer)
  await peer.evaluate(
    async ({ namespace, id }) => {
      const p = window.pintaPhysicalRegions,
        local = p.createRegionPintaPersistence({ namespace }),
        source = await local.loadAssetById(id)
      if (!source) throw Error('Mapa ausente')
      await local.persistAsset({ ...source, name: 'revisao-da-outra-aba' })
    },
    { namespace, id },
  )
  const result = await page.evaluate(async () => {
    const p = window.pintaPhysicalRegions
    const { local, source } = (
      window as unknown as {
        factoryRecovery: {
          local: ReturnType<typeof p.createRegionPintaPersistence>
          source: NonNullable<ReturnType<typeof p.sanitizeRegionTilemapAsset>>
        }
      }
    ).factoryRecovery
    // Refreshing inventory must not grant a later baseline to the stale source.
    await local.listAllAssets()
    const events: string[] = [],
      unsubscribe = local.subscribe?.((event) => {
        if (event.type === 'recovered') events.push(event.type)
      })
    const edited = p.setCell(source, source.layers[0]!.id, -64, -64, 9)
    let puts = 0,
      failed = false,
      copyId = ''
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args) {
      if (++puts === 2) throw Error('falha-fabrica-regional-qa')
      return original.apply(this, args)
    }
    try {
      await local.persistAsset(edited)
    } catch (error) {
      failed = String(error).includes('falha-fabrica-regional-qa')
    } finally {
      IDBObjectStore.prototype.put = original
    }
    const afterFailure = (await local.listAllAssets()).length,
      eventsAfterFailure = events.length
    try {
      await local.persistAsset(edited)
      throw Error('Conflito esperado')
    } catch (error) {
      if (!(error instanceof Error) || !('forks' in error) || !(error.forks instanceof Map))
        throw error
      const copy = p.sanitizeRegionTilemapAsset(error.forks.get(source.id))
      if (!copy) throw Error('Cópia ausente')
      copyId = copy.id
      // Sanitization is deliberately not used to transfer the causal RAM baseline.
      const committed = await local.loadAssetById(copy.id)
      if (committed?.kind !== 'tilemap' || !('origin' in committed))
        throw Error('Cópia não confirmada')
      await local.persistAsset(p.setCell(committed, committed.layers[0]!.id, -64, -64, 10))
    } finally {
      unsubscribe?.()
    }
    return { failed, afterFailure, eventsAfterFailure, recoveredEvents: events.length, copyId }
  })
  expect(result).toMatchObject({
    failed: true,
    afterFailure: 1,
    eventsAfterFailure: 0,
    recoveredEvents: 1,
  })
  expect(result.copyId).not.toBe(id)
  await page.close()
  expect(
    await peer.evaluate(
      async ({ namespace, id, copyId }) => {
        const p = window.pintaPhysicalRegions,
          local = p.createRegionPintaPersistence({ namespace }),
          original = await local.loadAssetById(id),
          copy = await local.loadAssetById(copyId)
        if (original?.kind !== 'tilemap' || copy?.kind !== 'tilemap') throw Error('Dados ausentes')
        return {
          count: (await local.listAllAssets()).length,
          name: original.name,
          original: p.cellAt(original, original.layers[0]!.id, -64, -64),
          copy: p.cellAt(copy, copy.layers[0]!.id, -64, -64),
        }
      },
      { namespace, id, copyId: result.copyId },
    ),
  ).toEqual({
    count: 2,
    name: 'revisao-da-outra-aba',
    original: 4,
    copy: 10,
  })
})

test('native 8 captures and transports the real Vila, Cabana and sets through an independent browser realm', async ({
  page,
  context,
}, info) => {
  const namespace = `region-world-transport-${Date.now()}`
  const exported = await page.evaluate(async (namespace) => {
    const p = window.pintaPhysicalRegions,
      world = p.regionVila()
    await p.createRegionPintaPersistence({ namespace }).persistAssets(world.assets)
    const capture = await p.captureRegionPintaAssetForImage(world.map.id, { namespace })
    if (!capture.ok) throw Error(capture.reason)
    const text = p.regionAssetBundleToJson(capture.source, capture.assets ?? [])
    if (!text) throw Error('Transporte ausente')
    return { text, id: world.map.id, ids: world.assets.map((asset) => asset.id).sort() }
  }, namespace)
  await test.info().attach('vila-regional.pinta.json', {
    body: Buffer.from(exported.text),
    contentType: 'application/json',
  })
  await page.close()
  const reopened = await context.newPage()
  if (info.project.name === 'cpu-4x') {
    const cdp = await context.newCDPSession(reopened)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  }
  await proof(reopened)
  expect(
    await reopened.evaluate(
      async ({ namespace, text, id }) => {
        const p = window.pintaPhysicalRegions,
          restored = p.decodeRegionGalleryBackup(text)
        if (restored.warnings.length) throw Error(restored.warnings.join('; '))
        const local = p.createRegionPintaPersistence({ namespace: `${namespace}-imported` })
        await local.persistAssets(restored.assets)
        const capture = await p.captureRegionPintaAssetForImage(id, {
          namespace: `${namespace}-imported`,
        })
        if (!capture.ok || capture.source.kind !== 'tilemap' || !('origin' in capture.source))
          throw Error('Mapa não reabriu')
        const tiles = capture.source.layers.filter(
            (layer) => layer.kind === undefined || layer.kind === 'tiles',
          ),
          floor = tiles[0]
        if (!floor) throw Error('Chão ausente')
        const textAgain = p.regionAssetBundleToJson(capture.source, capture.assets ?? [])
        return {
          ids: [capture.source, ...(capture.assets ?? [])].map((asset) => asset.id).sort(),
          tileLayers: tiles.length,
          allLayers: capture.source.layers.length,
          origin: capture.source.origin,
          cell: p.cellAt(capture.source, floor.id, -64, -64),
          tilesets: capture.tilesets.length,
          set: capture.assets?.some((asset) => asset.kind === 'map-set' && 'origin' in asset.map),
          identical: textAgain === text,
        }
      },
      { namespace, text: exported.text, id: exported.id },
    ),
  ).toEqual({
    ids: exported.ids,
    tileLayers: 16,
    allLayers: 18,
    origin: { col: -64, row: -64 },
    cell: 3,
    tilesets: 2,
    set: true,
    identical: true,
  })
})

test('regional capture refuses an opaque future place before reading any future chunks or producing a package', async ({
  page,
}) => {
  const namespace = `region-world-opaque-${Date.now()}`
  expect(
    await page.evaluate(async (namespace) => {
      const p = window.pintaPhysicalRegions,
        world = p.regionVila(),
        local = p.createRegionPintaPersistence({ namespace }),
        store = p.createStore(`sistema-zero-pinta-${namespace}`, 'kv'),
        futureKey = 'pinta:local:document:future',
        futureChunk = 'pinta:local:chunk:future:ground:0:0'
      await local.persistAssets(world.assets)
      const opaque = {
        version: 4,
        capability: 9,
        revision: 'future-place',
        storage: 'future-regions',
        asset: { kind: 'tilemap', schema: 9, id: 'future', chunks: [futureChunk] },
      }
      await store(
        'readwrite',
        (kv) =>
          new Promise<void>((resolve, reject) => {
            kv.put(opaque, futureKey)
            kv.put(new Int16Array(1024), futureChunk)
            kv.transaction.oncomplete = () => resolve()
            kv.transaction.onabort = () => reject(kv.transaction.error)
          }),
      )
      const original = IDBObjectStore.prototype.get,
        transactions = new Set<IDBTransaction>()
      let chunkReads = 0,
        error = ''
      IDBObjectStore.prototype.get = function (key) {
        transactions.add(this.transaction)
        if (String(key) === futureChunk) chunkReads++
        return original.call(this, key)
      }
      try {
        await p.captureRegionPintaAssetForImage(world.map.id, { namespace })
      } catch (caught) {
        error = String(caught)
      } finally {
        IDBObjectStore.prototype.get = original
      }
      const after = await store(
        'readonly',
        (kv) =>
          new Promise<unknown>((resolve, reject) => {
            const request = kv.get(futureKey)
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          }),
      )
      return {
        refused: error.includes('Atualize a página'),
        chunkReads,
        transactions: transactions.size,
        unchanged: JSON.stringify(after) === JSON.stringify(opaque),
      }
    }, namespace),
  ).toEqual({ refused: true, chunkReads: 0, transactions: 1, unchanged: true })
})

test('the scene-4 reader decodes the full 4-MiB budget in the browser while the public reader refuses it', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const p = window.pintaPhysicalRegions,
      source = p.scene4BudgetFixture(),
      text = JSON.stringify(source)
    const started = performance.now(),
      scene = p.readPintaRegionScene(text),
      elapsedMs = performance.now() - started
    if (!scene) throw Error('Leitor recusou o teto')
    let chunks = 0,
      bytes = 0
    for (const layer of scene.layers)
      if (layer.kind === 'tiles')
        for (const chunk of layer.cells.chunks) {
          chunks++
          bytes += chunk.cells.byteLength
        }
    return {
      version: scene.version,
      layers: scene.layers.length,
      chunks,
      bytes,
      logicalCells: scene.cols * scene.rows,
      publicRefused: p.readPintaScene(source) === null,
      elapsedMs,
    }
  })
  expect(result).toMatchObject({
    version: 4,
    layers: 32,
    chunks: 2048,
    bytes: 4194304,
    logicalCells: 100000000,
    publicRefused: true,
  })
  expect(Number.isFinite(result.elapsedMs)).toBe(true)
  await test.info().attach('scene4-decode.json', {
    body: Buffer.from(JSON.stringify(result)),
    contentType: 'application/json',
  })
})

test('scene-4 browser admission rejects a late malformed definition without decoding earlier chunks', async ({
  page,
}) => {
  expect(
    await page.evaluate(() => {
      const p = window.pintaPhysicalRegions,
        source = p.scene4Fixture()
      const malformed = {
        id: 'future-set',
        cols: 10000,
        rows: 10000,
        origin: { col: -64, row: -64 },
        layers: [
          {
            kind: 'tiles',
            id: 'future-layer',
            name: 'Chão',
            visible: true,
            tilesetId: 'ground',
            cells: { kind: 'regions', version: 2, side: 32, encoding: 'future', chunks: [] },
          },
        ],
      }
      const original = globalThis.atob
      let decodes = 0,
        refused = false
      globalThis.atob = (text) => {
        decodes++
        return original(text)
      }
      try {
        refused = p.readPintaRegionScene(JSON.stringify({ ...source, sets: [malformed] })) === null
      } finally {
        globalThis.atob = original
      }
      return { refused, decodes }
    }),
  ).toEqual({ refused: true, decodes: 0 })
})

test('the real Pinta producer exports Vila scene 4 with real art images and reopens its JSON in another realm', async ({
  page,
  context,
}, info) => {
  const exported = await page.evaluate(async () => {
    const p = window.pintaPhysicalRegions,
      { map, assets } = p.regionVila(),
      result = await p.exportPintaRegionScene(
        map,
        (id) => assets.find((asset) => asset.id === id) ?? null,
      )
    const sizes = await Promise.all(
      [...result.scene.tilesets, ...(result.scene.art ?? [])].map(async (art) => {
        const image = new Image()
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve()
          image.onerror = () => reject(Error('PNG inválido'))
          image.src = art.image
        })
        return { width: image.naturalWidth, height: image.naturalHeight }
      }),
    )
    return { json: result.json, bytes: result.bytes, sizes, id: map.id }
  })
  expect(exported.sizes.length).toBeGreaterThanOrEqual(3)
  expect(exported.sizes.every((size) => size.width > 0 && size.height > 0)).toBe(true)
  await test.info().attach('vila-scene4.json', {
    body: Buffer.from(exported.json),
    contentType: 'application/json',
  })
  await page.close()
  const reopened = await context.newPage()
  if (info.project.name === 'cpu-4x') {
    const cdp = await context.newCDPSession(reopened)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  }
  await proof(reopened)
  expect(
    await reopened.evaluate(({ json, bytes, id }) => {
      const p = window.pintaPhysicalRegions,
        scene = p.readPintaRegionScene(json)
      if (!scene) throw Error('Cena não reabriu')
      let chunks = 0,
        indexBytes = 0
      for (const layer of scene.layers)
        if (layer.kind === 'tiles')
          for (const chunk of layer.cells.chunks) {
            chunks++
            indexBytes += chunk.cells.byteLength
          }
      return {
        id: scene.id,
        expectedId: id,
        version: scene.version,
        physics: scene.physics,
        layers: scene.layers.length,
        sheets: scene.tilesets.length,
        sets: scene.sets?.length,
        origin: scene.origin,
        exactBytes: new TextEncoder().encode(json).byteLength === bytes,
        bounded: chunks < 2048 && indexBytes < 4194304,
        publicRefused: p.readPintaScene(JSON.parse(json)) === null,
      }
    }, exported),
  ).toEqual({
    id: exported.id,
    expectedId: exported.id,
    version: 4,
    physics: 'legacy',
    layers: 18,
    sheets: 2,
    sets: 1,
    origin: { col: -64, row: -64 },
    exactBytes: true,
    bounded: true,
    publicRefused: true,
  })
})

test('scene 4 renders the real Vila with identical pixels and a bounded sparse-world thumbnail', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const p = window.pintaPhysicalRegions,
      { map, assets } = p.vilaEFloresta(),
      find = (id: string) => assets.find((asset) => asset.id === id) ?? null,
      converted = p.prepareMapRegions(map)
    if (!converted.ok) throw Error(converted.reason)
    const dense = await p.exportPintaScene(map, find),
      regional = await p.exportPintaRegionScene(converted.map, find),
      images = await p.loadSceneImages(dense)
    let comparisons = 0
    for (const time of [0, 125, 450])
      for (const pass of ['back', 'front'] as const) {
        const frames = [dense, regional.scene].map((scene) => {
          const canvas = document.createElement('canvas')
          canvas.width = 128
          canvas.height = 96
          const ctx = canvas.getContext('2d')!
          ctx.imageSmoothingEnabled = false
          ctx.scale(0.25, 0.25)
          p.drawScene(ctx, scene, images, pass, time, { x: 7.25, y: -2.5 })
          return ctx.getImageData(0, 0, 128, 96).data
        })
        if (!frames[0]!.every((value, index) => value === frames[1]![index]))
          throw Error('Pixels diferentes')
        comparisons++
      }
    const png = await p.scenePng(regional.scene, 1, 512),
      legacyPng = await p.scenePng(dense, 1, 512)
    if (!png || png.dataUrl !== legacyPng?.dataUrl) throw Error('Miniatura diferente')
    comparisons++
    const world = p.regionVila(),
      exportedWorld = await p.exportPintaRegionScene(
        world.map,
        (id) => world.assets.find((asset) => asset.id === id) ?? null,
      )
    let refused = false
    try {
      await p.scenePng(exportedWorld.scene)
    } catch (error) {
      refused = String(error).includes('imagem ficou grande')
    }
    const thumbnail = await p.scenePng(exportedWorld.scene, 1, 512)
    return {
      comparisons,
      png,
      refused,
      thumbnail: thumbnail && { width: thumbnail.width, height: thumbnail.height },
    }
  })
  expect(result.comparisons).toBe(7)
  expect(result.refused).toBe(true)
  expect(result.thumbnail).toEqual({ width: 512, height: 512 })
  expect(result.png).toMatchObject({ width: 512, height: 384 })
  await test.info().attach('vila-scene4-render.png', {
    body: Buffer.from(result.png.dataUrl.split(',')[1]!, 'base64'),
    contentType: 'image/png',
  })
})

test('a real PNG 5 keeps Vila artwork and structured scene 4 when reopened in an independent realm', async ({
  page,
  context,
}, info) => {
  const exported = await page.evaluate(async () => {
    const p = window.pintaPhysicalRegions,
      { map, assets } = p.vilaEFloresta(),
      converted = p.prepareMapRegions(map)
    if (!converted.ok) throw Error(converted.reason)
    const scene = await p.exportPintaRegionScene(
        converted.map,
        (id) => assets.find((asset) => asset.id === id) ?? null,
      ),
      cover = await p.scenePng(scene.scene, 1, 512)
    if (!cover) throw Error('Imagem ausente')
    const original = Uint8Array.from(atob(cover.dataUrl.split(',')[1]!), (char) =>
        char.charCodeAt(0),
      ),
      image = await p.embedPintaRegionImage(original, scene.json)
    const view = new DataView(image.png.buffer, image.png.byteOffset, image.png.byteLength),
      length = view.getUint32(33),
      json = new TextDecoder().decode(p.unzlibSync(image.png.subarray(51, 41 + length)))
    let binary = ''
    for (const byte of image.png) binary += String.fromCharCode(byte)
    return {
      id: map.id,
      png: btoa(binary),
      json,
      bytes: image.metadata.bytes,
      original: cover.dataUrl,
    }
  })
  await test.info().attach('vila-dados5.png', {
    body: Buffer.from(exported.png, 'base64'),
    contentType: 'image/png',
  })
  await page.close()
  const reopened = await context.newPage()
  if (info.project.name === 'cpu-4x')
    await (await context.newCDPSession(reopened)).send('Emulation.setCPUThrottlingRate', {
      rate: 4,
    })
  await proof(reopened)
  expect(
    await reopened.evaluate(async ({ png, json, bytes, id, original }) => {
      const p = window.pintaPhysicalRegions,
        data = p.readPintaRegionImageData(json)
      if (!data) throw Error('Dados não reabriram')
      const frames = await Promise.all(
        [original, `data:image/png;base64,${png}`].map(async (source) => {
          const image = new Image()
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve()
            image.onerror = () => reject(Error('PNG inválido'))
            image.src = source
          })
          const canvas = document.createElement('canvas')
          canvas.width = image.naturalWidth
          canvas.height = image.naturalHeight
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(image, 0, 0)
          return {
            width: canvas.width,
            height: canvas.height,
            pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
          }
        }),
      )
      return {
        version: data.version,
        sceneVersion: data.scene.version,
        id: data.scene.id,
        expectedId: id,
        layers: data.scene.layers.length,
        sheets: data.scene.tilesets.length,
        sets: data.scene.sets?.length,
        physics: data.scene.physics,
        exactBytes: new TextEncoder().encode(json).byteLength === bytes,
        width: frames[1]!.width,
        height: frames[1]!.height,
        pixelsEqual: frames[0]!.pixels.every((value, index) => value === frames[1]!.pixels[index]),
      }
    }, exported),
  ).toEqual({
    version: 5,
    sceneVersion: 4,
    id: exported.id,
    expectedId: exported.id,
    layers: 18,
    sheets: 2,
    sets: 1,
    physics: 'legacy',
    exactBytes: true,
    width: 512,
    height: 384,
    pixelsEqual: true,
  })
})

test('regional geometry queries reopen a signed Vila PNG without a world-sized collision grid', async ({
  page,
  context,
}, info) => {
  const exported = await page.evaluate(async () => {
    const p = window.pintaPhysicalRegions,
      { map, assets } = p.vilaEFloresta()
    const dense = await p.exportPintaScene(
      map,
      (id) => assets.find((asset) => asset.id === id) ?? null,
    )
    const converted = p.prepareMapRegions(map)
    if (!converted.ok) throw Error(converted.reason)
    const expanded = p.expandRegionMap(converted.map, {
      col: -64,
      row: -64,
      cols: 10000,
      rows: 10000,
    })
    if (!expanded.ok) throw Error(expanded.reason)
    const floor = expanded.map.layers.find((layer) => 'cells' in layer)
    if (!floor) throw Error('Camada de peças ausente')
    const edited = p.setCell(expanded.map, floor.id, -32, -32, 17)
    if (edited === expanded.map) throw Error('A preparação não pintou a peça de teste')
    const regional = await p.exportPintaRegionScene(
      edited,
      (id) => assets.find((asset) => asset.id === id) ?? null,
    )
    const cover = await p.scenePng(regional.scene, 1, 512)
    if (!cover) throw Error('Capa ausente')
    const image = await p.embedPintaRegionImage(
      Uint8Array.from(atob(cover.dataUrl.split(',')[1]!), (char) => char.charCodeAt(0)),
      regional.json,
    )
    let binary = ''
    for (const byte of image.png) binary += String.fromCharCode(byte)
    return { png: btoa(binary), dense }
  })
  await page.close()
  const reopened = await context.newPage()
  if (info.project.name === 'cpu-4x')
    await (await context.newCDPSession(reopened)).send('Emulation.setCPUThrottlingRate', {
      rate: 4,
    })
  await proof(reopened)
  const result = await reopened.evaluate(({ png, dense }) => {
    const p = window.pintaPhysicalRegions,
      bytes = Uint8Array.from(atob(png), (char) => char.charCodeAt(0))
    const view = new DataView(bytes.buffer),
      length = view.getUint32(33)
    const data = p.readPintaRegionImageData(
      new TextDecoder().decode(p.unzlibSync(bytes.subarray(51, 41 + length))),
    )
    if (!data) throw Error('Dados não reabriram')
    const query = p.createRegionSceneQueries(data.scene)
    const portable = new Function(
      `${p.sceneObjectTransformSource};return {query:sceneIntersectsBox,move:sceneMoveBox};`,
    )() as {
      query: typeof p.sceneIntersectsBox
      move: typeof p.sceneMoveBox
    }
    let comparisons = 0,
      mismatches = 0
    for (let y = 0; y < dense.rows * 16 - 8; y += 11)
      for (let x = 0; x < dense.cols * 16 - 8; x += 13) {
        const box = { x, y, width: 8, height: 8 }
        if (query.solidAt(x, y) !== p.sceneSolidAt(dense, x, y)) mismatches++
        if (query.intersectsBox(box) !== p.sceneIntersectsBox(dense, box)) mismatches++
        if (portable.query(query.context, box) !== query.intersectsBox(box)) mismatches++
        comparisons += 3
      }
    const body = { x: -508, y: -540, width: 8, height: 8 },
      moved = query.moveBox(body, 0, 100)
    return {
      comparisons,
      mismatches,
      origin: data.scene.origin,
      extent: [data.scene.cols, data.scene.rows],
      physics: data.scene.physics,
      occupied: query.solidAt(-504, -504),
      empty: query.solidAt(-8, -8),
      body: query.intersectsBox({ x: -508, y: -508, width: 4, height: 4 }),
      landingY: Math.round(moved.y * 1e6) / 1e6,
      portableMoveEqual:
        JSON.stringify(moved) === JSON.stringify(portable.move(query.context, body, 0, 100)),
      objectsEqual: JSON.stringify(query.objects()) === JSON.stringify(p.sceneObjects(dense)),
      spawnEqual: JSON.stringify(query.spawn()) === JSON.stringify(p.sceneSpawn(dense)),
      publicReaderRefused: p.readPintaScene(data.scene) === null,
    }
  }, exported)
  expect(result.comparisons).toBeGreaterThan(3000)
  expect(result).toMatchObject({
    mismatches: 0,
    origin: { col: -64, row: -64 },
    extent: [10000, 10000],
    physics: 'legacy',
    occupied: true,
    empty: false,
    body: true,
    landingY: -520,
    portableMoveEqual: true,
    objectsEqual: true,
    spawnEqual: true,
    publicReaderRefused: true,
  })
  await test.info().attach('consultas-vila-regional.json', {
    body: Buffer.from(JSON.stringify(result, null, 2)),
    contentType: 'application/json',
  })
})

async function encodedVilaWorld(page: Page) {
  return page.evaluate(async () => {
    const p = window.pintaPhysicalRegions,
      { map, cabana, assets } = p.vilaEFloresta()
    const url = (bytes: Uint8Array) => {
      let binary = ''
      for (const byte of bytes) binary += String.fromCharCode(byte)
      return `data:image/png;base64,${btoa(binary)}`
    }
    const make = async (
      native: typeof map,
      world?: { version: 1; rootId: string; maps: { id: string; name: string; png: string }[] },
    ) => {
      const converted = p.prepareMapRegions(native)
      if (!converted.ok) throw Error(converted.reason)
      const scene = await p.exportPintaRegionScene(
        converted.map,
        (id) => assets.find((asset) => asset.id === id) ?? null,
      )
      const cover = await p.scenePng(scene.scene, 1, 512)
      if (!cover) throw Error('Capa ausente')
      const png = await p.embedPintaRegionImage(
        Uint8Array.from(atob(cover.dataUrl.split(',')[1]!), (char) => char.charCodeAt(0)),
        scene.json,
        { world },
      )
      return url(png.png)
    }
    const child = await make(cabana)
    return make(map, {
      version: 1,
      rootId: map.id,
      maps: [{ id: cabana.id, name: cabana.name, png: child }],
    })
  })
}

test('the encoded PNG-5 world reader captures Vila images and renders identical pixels after an independent reopen', async ({
  page,
  context,
}, info) => {
  const encoded = await encodedVilaWorld(page)
  await page.close()
  const reopened = await context.newPage()
  if (info.project.name === 'cpu-4x')
    await (await context.newCDPSession(reopened)).send('Emulation.setCPUThrottlingRate', {
      rate: 4,
    })
  await proof(reopened)
  const result = await reopened.evaluate(async (encoded) => {
    const p = window.pintaPhysicalRegions,
      source = Uint8Array.from(atob(encoded.split(',')[1]!), (char) => char.charCodeAt(0))
    const world = p.readPintaRegionImageWorld(source),
      root = world.maps.get(world.rootId)!
    const load = async (bytes: Uint8Array<ArrayBuffer>) => {
      const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' })),
        image = new Image()
      try {
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve()
          image.onerror = () => reject(Error('PNG não abriu'))
          image.src = url
        })
        return image
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    const loaded = new Map<string, HTMLImageElement>()
    for (const [url, image] of world.images) {
      const png = await load(image.png)
      if (png.naturalWidth !== image.width || png.naturalHeight !== image.height)
        throw Error('Dimensões mudaram')
      loaded.set(url, png)
    }
    const cover = await load(root.png),
      canvas = document.createElement('canvas'),
      expected = document.createElement('canvas')
    canvas.width = expected.width = root.width
    canvas.height = expected.height = root.height
    const ctx = canvas.getContext('2d')!,
      reference = expected.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    const images = new Map(
      [...root.data.scene.tilesets, ...(root.data.scene.art ?? [])].map((resource) => [
        resource.id,
        loaded.get(resource.image)!,
      ]),
    )
    p.drawScene(ctx, root.data.scene, images, 'back', 0)
    p.drawScene(ctx, root.data.scene, images, 'front', 0)
    reference.drawImage(cover, 0, 0)
    const pixels = ctx.getImageData(0, 0, root.width, root.height).data,
      original = reference.getImageData(0, 0, root.width, root.height).data
    source.fill(0)
    const corrupt = root.png.slice()
    corrupt[corrupt.length - 1]! ^= 1
    let refused = false
    try {
      p.readPintaRegionImageWorld(corrupt)
    } catch {
      refused = true
    }
    return {
      rootId: world.rootId,
      ids: [...world.maps.keys()],
      images: world.images.size,
      width: root.width,
      height: root.height,
      pixelsEqual: pixels.every((value, index) => value === original[index]),
      sourceCopied: root.png[0] === 137,
      corruptRefused: refused,
      mapsAfterRefusal: world.maps.size,
      childStart: p.createRegionSceneQueries(world.maps.get('cabana')!.data.scene).spawn(),
      imagePixels: world.imagePixels,
      publicReaderRefused: p.readPintaScene(root.data.scene) === null,
    }
  }, encoded)
  expect(result).toMatchObject({
    rootId: 'vila-e-floresta',
    ids: ['vila-e-floresta', 'cabana'],
    width: 512,
    height: 384,
    pixelsEqual: true,
    sourceCopied: true,
    corruptRefused: true,
    mapsAfterRefusal: 2,
    childStart: { x: 32, y: 32 },
    publicReaderRefused: true,
  })
  expect(result.images).toBeGreaterThanOrEqual(3)
  expect(result.imagePixels).toBeLessThanOrEqual(16777216)
  await test.info().attach('leitor-png-mundo-regional.json', {
    body: Buffer.from(JSON.stringify(result, null, 2)),
    contentType: 'application/json',
  })
})

test('linked PNG-5 metadata admits Vila and Cabana together before decoding their regional cells', async ({
  page,
  context,
}, info) => {
  const encoded = await encodedVilaWorld(page)
  await page.close()
  const reopened = await context.newPage()
  if (info.project.name === 'cpu-4x')
    await (await context.newCDPSession(reopened)).send('Emulation.setCPUThrottlingRate', {
      rate: 4,
    })
  await proof(reopened)
  const result = await reopened.evaluate((encoded) => {
    const p = window.pintaPhysicalRegions,
      original = globalThis.atob
    const text = (url: string, remaining?: number) => {
      const bytes = Uint8Array.from(original(url.split(',')[1]!), (char) => char.charCodeAt(0))
      return p.readPintaPngText(bytes, remaining).text
    }
    const rootText = text(encoded),
      seen: string[] = []
    let decodes = 0,
      headersBeforeCells = true,
      remainingBudgetRespected = true
    globalThis.atob = (source) => {
      decodes++
      return original(source)
    }
    try {
      const maps = p.readPintaRegionImageWorldMetadata(rootText, (descriptor, remaining) => {
        headersBeforeCells &&= decodes === 0
        seen.push(descriptor.id)
        const decoded = text(descriptor.png, remaining)
        remainingBudgetRespected &&= new TextEncoder().encode(decoded).byteLength <= remaining
        return decoded
      })
      if (!maps) throw Error('O mundo não reabriu')
      const validDecodes = decodes
      const root = JSON.parse(rootText)
      root.world.maps[0].name = 'Nome trocado'
      decodes = 0
      const refused =
        p.readPintaRegionImageWorldMetadata(JSON.stringify(root), (descriptor) =>
          text(descriptor.png),
        ) === null
      return {
        ids: [...maps.keys()],
        seen,
        headersBeforeCells,
        remainingBudgetRespected,
        validDecodes,
        rootObjects: p.createRegionSceneQueries(maps.get('vila-e-floresta')!.scene).objects()
          .length,
        rootObjectIds: p
          .createRegionSceneQueries(maps.get('vila-e-floresta')!.scene)
          .objects()
          .map((object) => object.id),
        childStart: p.createRegionSceneQueries(maps.get('cabana')!.scene).spawn(),
        childHasNoNestedWorld: maps.get('cabana')!.world === undefined,
        refusedWrongName: refused,
        decodesBeforeRefusal: decodes,
        publicReaderRefused: p.readPintaScene(maps.get('vila-e-floresta')!.scene) === null,
      }
    } finally {
      globalThis.atob = original
    }
  }, encoded)
  expect(result.ids).toEqual(['vila-e-floresta', 'cabana'])
  expect(result.rootObjects).toBe(6)
  expect(result.rootObjectIds).toEqual([
    'start',
    'door',
    'danger',
    'path',
    'morador-obj',
    'instance',
  ])
  expect(result.validDecodes).toBeGreaterThan(1)
  expect(result).toMatchObject({
    seen: ['cabana'],
    headersBeforeCells: true,
    remainingBudgetRespected: true,
    childStart: { x: 32, y: 32 },
    childHasNoNestedWorld: true,
    refusedWrongName: true,
    decodesBeforeRefusal: 0,
    publicReaderRefused: true,
  })
  await test.info().attach('metadados-mundo-regional.json', {
    body: Buffer.from(JSON.stringify(result, null, 2)),
    contentType: 'application/json',
  })
})

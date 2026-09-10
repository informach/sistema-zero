import { expect, test } from 'bun:test'
import type { UseStore } from 'idb-keyval'
import { structuredBytes } from '../core/structuredBytes'
import { sceneToJson } from '../scene/documentJson'
import { bindSceneSkin } from '../scene/skinBinding'
import { deferred } from '../testing/deferred'
import { nativeDatabase } from '../testing/nativeDatabase'
import { makeSceneAtlasDocument } from '../testing/sceneAtlasFixture'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { MoldaStorageBudgetError } from './guardedWrite'
import { type SceneTombstone, sceneBlobSummary, sceneSummary } from './sceneMetadata'
import { createScenePersistence } from './scenePersistence'
import { inspectInlineSceneRecords } from './sceneRecordInspection'
import { type PreparedSceneStorage, prepareSceneStorage } from './sceneStorageDocument'
import {
  SCENE_BLOB_KEY_PREFIX as BLOB,
  SCENE_DELETED_KEY_PREFIX as DELETED,
  SCENE_DOCUMENT_KEY_PREFIX as DOCUMENT,
  SCENE_RECOVERY_KEY_PREFIX as ORIGINALS,
  SCENE_SUMMARY_KEY_PREFIX as SUMMARY,
} from './storageKeys'

/** Test-only atomic fixture writer. No production layout writer is activated by these tests. */
function update(store: UseStore, changes: ReadonlyMap<string, unknown>, removals: string[] = []) {
  return store(
    'readwrite',
    (native) =>
      new Promise<void>((resolve, reject) => {
        native.transaction.oncomplete = () => resolve()
        native.transaction.onabort = native.transaction.onerror = () =>
          reject(native.transaction.error)
        for (const key of removals) native.delete(key)
        for (const [key, raw] of changes) native.put(raw, key)
      }),
  )
}

function stored(prepared: PreparedSceneStorage, revision = 1, receipt?: unknown) {
  const id = prepared.manifest.id
  const records = new Map<string, unknown>([
    [`${DOCUMENT}${id}`, prepared.manifest],
    [
      `${SUMMARY}${id}`,
      sceneBlobSummary(prepared, revision, receipt === undefined ? 0 : structuredBytes(receipt)),
    ],
    ...[...prepared.blobs].map(([hash, bytes]): [string, unknown] => [`${BLOB}${hash}`, bytes]),
  ])
  if (receipt !== undefined) records.set(`${ORIGINALS}${id}`, receipt)
  return records
}

/** Observes native requests/transactions; all data and scheduling still come from IndexedDB. */
function observed(
  store: UseStore,
  reads: string[],
  onCursor?: (key: string, tx: IDBTransaction) => void,
): UseStore {
  return (mode, callback) =>
    store(mode, (native) =>
      callback(
        new Proxy(native, {
          get(target, property) {
            if (property === 'openCursor')
              return (...args: Parameters<IDBObjectStore['openCursor']>) => {
                const key = typeof args[0] === 'string' ? args[0] : '*cursor*'
                reads.push(key)
                const request = target.openCursor(...args)
                request.addEventListener('success', () => onCursor?.(key, target.transaction), {
                  once: true,
                })
                return request
              }
            if (property === 'getAll')
              return (...args: Parameters<IDBObjectStore['getAll']>) => {
                reads.push('*getAll*')
                return target.getAll(...args)
              }
            const value = Reflect.get(target, property, target)
            return typeof value === 'function' ? value.bind(target) : value
          },
        }),
      ),
    )
}

test('persistent blob read preserves native pixels, layers, flipbook, clips and skin with owned buffers', async () => {
  const db = await nativeDatabase()
  try {
    const painted = makeSceneGlbFixture(2, 2, 3, 4, 2)
    painted.images[0]!.flipbook = {
      frameWidth: 2,
      frameHeight: 2,
      frames: [3, 1, 0],
      fps: 12,
      loop: true,
    }
    painted.images[0]!.layers[1]!.visible = false
    painted.images[0]!.layers[1]!.opacity = 0.25
    painted.images[0]!.layers[1]!.pixels.set([200, 100, 77, 0])
    const rig = makeSceneSkinFixture()
    for (const source of [
      makeSceneAtlasDocument(),
      painted,
      { ...rig.document, skins: [bindSceneSkin(rig.document, rig.input)] },
      makeSceneGlbFixture(1, 1, 2, 0),
    ]) {
      const prepared = await prepareSceneStorage(source)
      await update(db.store, stored(prepared, 7))
      const before = await db.dump()
      const persistence = createScenePersistence(db.store)
      const first = await persistence.read(source.id)
      if (first.status !== 'active') throw new Error(`Expected active: ${first.status}`)
      expect(first.summary).toEqual(sceneBlobSummary(prepared, 7, 0))
      expect(first.document).toEqual(source)
      expect(sceneToJson(first.document)).toEqual(sceneToJson(source))
      first.document.nodes[0]!.name = 'Somente esta leitura'
      first.document.images[0]?.layers[0]?.pixels.fill(19)
      expect(await persistence.read(source.id)).toMatchObject({
        status: 'active',
        document: source,
      })
      expect(await db.dump()).toEqual(before)
    }
  } finally {
    db.close()
  }
})

test('list and revision observation read metadata only, including broken blob references', async () => {
  const db = await nativeDatabase()
  try {
    const prepared = await prepareSceneStorage(makeSceneAtlasDocument())
    const id = prepared.manifest.id
    await update(db.store, stored(prepared, 4))
    await update(
      db.store,
      new Map(),
      [...prepared.blobs.keys()].map((hash) => `${BLOB}${hash}`),
    )
    const reads: string[] = []
    const persistence = createScenePersistence(observed(db.store, reads))
    expect(await persistence.listSummaries()).toEqual({
      summaries: [sceneBlobSummary(prepared, 4, 0)],
      issues: [],
    })
    expect(await persistence.readIndexRevision(id)).toEqual({ status: 'indexed', revision: 4 })
    expect(reads.length).toBeGreaterThan(0)
    expect(reads.every((key) => key.startsWith(SUMMARY) || key.startsWith(DELETED))).toBe(true)
    // The index is intentionally not proof of integrity or permission to overwrite.
    expect((await persistence.read(id)).status).toBe('invalid')
  } finally {
    db.close()
  }
})

test('a queued replacement cannot mix an old manifest/revision with new or removed pixels', async () => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneAtlasDocument()
    const original = await prepareSceneStorage(source)
    const replacement = structuredClone(source)
    replacement.name = 'Outra aba'
    for (const image of replacement.images) for (const layer of image.layers) layer.pixels.fill(2)
    const next = await prepareSceneStorage(replacement)
    expect([...original.blobs.keys()].every((hash) => !next.blobs.has(hash))).toBe(true)
    await update(db.store, stored(original))
    const writes: Promise<void>[] = []
    const reads: string[] = []
    const persistence = createScenePersistence(
      observed(db.store, reads, (key) => {
        if (key === `${DOCUMENT}${source.id}` && writes.length === 0)
          writes.push(
            update(
              db.store,
              stored(next, 2),
              [...original.blobs.keys()].map((hash) => `${BLOB}${hash}`),
            ),
          )
      }),
    )
    expect(await persistence.read(source.id)).toMatchObject({
      status: 'active',
      document: source,
      summary: { revision: 1 },
    })
    expect(writes).toHaveLength(1)
    await Promise.all(writes)
    expect(reads.filter((key) => key.startsWith(BLOB))).toEqual(
      [...original.blobs.keys()].map((hash) => `${BLOB}${hash}`),
    )
    expect(await persistence.read(source.id)).toMatchObject({
      status: 'active',
      document: replacement,
      summary: { revision: 2 },
    })
  } finally {
    db.close()
  }
})

test('cancellation before and during the transaction never publishes a scene or changes the database', async () => {
  const db = await nativeDatabase()
  try {
    const prepared = await prepareSceneStorage(makeSceneAtlasDocument())
    await update(db.store, stored(prepared))
    const before = await db.dump()
    const pre = new AbortController()
    pre.abort()
    let calls = 0
    const store: UseStore = (mode, callback) => {
      calls += 1
      return db.store(mode, callback)
    }
    await expect(
      createScenePersistence(store).read(prepared.manifest.id, pre.signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(calls).toBe(0)
    const during = new AbortController()
    const persistence = createScenePersistence(
      observed(db.store, [], (key) => {
        if (key === `${DOCUMENT}${prepared.manifest.id}`) during.abort()
      }),
    )
    await expect(persistence.read(prepared.manifest.id, during.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(await db.dump()).toEqual(before)
    expect((await persistence.read(prepared.manifest.id)).status).toBe('active')
  } finally {
    db.close()
  }
})

test('a closed database is an IO failure, never a missing or invalid creation', async () => {
  const db = await nativeDatabase()
  const persistence = createScenePersistence(db.store)
  db.close()
  await expect(persistence.read('valid-id')).rejects.toMatchObject({ name: 'InvalidStateError' })
})

test('a read cancelled while the store is still opening rejects after release rather than reporting success', async () => {
  const db = await nativeDatabase()
  const entered = deferred(),
    release = deferred()
  try {
    const prepared = await prepareSceneStorage(makeSceneAtlasDocument())
    await update(db.store, stored(prepared))
    const before = await db.dump()
    const store: UseStore = async (mode, callback) => {
      entered.resolve()
      await release.promise
      return db.store(mode, callback)
    }
    const controller = new AbortController()
    const pending = createScenePersistence(store).read(prepared.manifest.id, controller.signal)
    await entered.promise
    controller.abort()
    release.resolve()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(await db.dump()).toEqual(before)
  } finally {
    release.resolve()
    db.close()
  }
})

test('cancellation at transaction completion discards the snapshot before publishing it', async () => {
  const db = await nativeDatabase()
  try {
    const prepared = await prepareSceneStorage(makeSceneAtlasDocument())
    await update(db.store, stored(prepared))
    const before = await db.dump()
    const controller = new AbortController()
    const persistence = createScenePersistence(
      observed(db.store, [], (key, tx) => {
        if (key === `${DOCUMENT}${prepared.manifest.id}`)
          tx.addEventListener('complete', () => controller.abort(), { once: true })
      }),
    )
    await expect(persistence.read(prepared.manifest.id, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(await db.dump()).toEqual(before)
  } finally {
    db.close()
  }
})

test.each([
  'missing',
  'corrupt',
  'short',
  'hidden-backing',
])('a %s blob is preserved as invalid without blank-pixel recovery or legacy fallback', async (kind) => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneAtlasDocument()
    const prepared = await prepareSceneStorage(source)
    const receipt = { original: { opaque: new Uint8Array([9, 8, 7]) } }
    const records = stored(prepared, 1, receipt)
    records.set(`molda:record:${source.id}`, { stale: 'not a fallback' })
    const [hash, pixels] = [...prepared.blobs][0]!
    const key = `${BLOB}${hash}`
    if (kind === 'missing') records.delete(key)
    else if (kind === 'short') records.set(key, pixels.subarray(0, pixels.length - 1))
    else if (kind === 'corrupt') records.set(key, new Uint8Array(pixels.length).fill(3))
    else {
      const backing = new Uint8Array(pixels.length + 20).fill(255)
      const view = backing.subarray(7, 7 + pixels.length)
      view.set(pixels)
      records.set(key, view)
    }
    await update(db.store, records)
    const before = await db.dump()
    const persistence = createScenePersistence(db.store)
    const read = await persistence.read(source.id)
    expect(read.status).toBe('invalid')
    if (read.status !== 'invalid') throw new Error('Expected invalid')
    expect(read.records.get(`${DOCUMENT}${source.id}`)).toEqual(prepared.manifest)
    expect(read.records.get(`${ORIGINALS}${source.id}`)).toEqual(receipt)
    if (kind !== 'missing') expect(read.records.get(key)).toEqual(records.get(key))
    await expect(persistence.save(source, 1)).rejects.toThrow()
    await expect(persistence.remove(source.id, 1)).rejects.toThrow()
    expect(await persistence.loadRecovery(source.id)).toEqual(receipt)
    expect(await db.dump()).toEqual(before)
  } finally {
    db.close()
  }
})

test.each([
  'refs',
  'storedBytes',
  'logicalBytes',
  'name',
  'revision',
  'orphan',
  'originals',
  'binding',
  'inline',
  'deleted-conflict',
])('a %s inconsistency is not permission for an inline write', async (kind) => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneAtlasDocument()
    const prepared = await prepareSceneStorage(source)
    const summary = sceneBlobSummary(prepared, 1, 0)
    const records = stored(prepared)
    records.set(`${SUMMARY}${source.id}`, summary)
    if (kind === 'refs') summary.blobRefs.reverse()
    else if (kind === 'storedBytes') summary.storedBytes += 1
    else if (kind === 'logicalBytes') summary.bytes += 1
    else if (kind === 'name') summary.name = 'Not this document'
    else if (kind === 'revision') summary.revision = 0
    else if (kind === 'orphan') records.delete(`${DOCUMENT}${source.id}`)
    else if (kind === 'originals') summary.originalsBytes = 123
    else if (kind === 'binding') {
      prepared.manifest.document.nodes[0]!.parentId = 'missing-node'
      summary.storedBytes = structuredBytes(prepared.manifest)
    } else if (kind === 'inline') records.set(`${DOCUMENT}${source.id}`, source)
    else
      records.set(`${DELETED}${source.id}`, {
        id: source.id,
        formatVersion: 2,
        storageVersion: 2,
        revision: 2,
        originalsBytes: 0,
      })
    await update(db.store, records)
    const before = await db.dump()
    const persistence = createScenePersistence(db.store)
    expect((await persistence.read(source.id)).status).toBe('invalid')
    await expect(persistence.save(source, 1)).rejects.toThrow()
    await expect(persistence.remove(source.id, 1)).rejects.toThrow()
    await expect(persistence.restore(source, 2)).rejects.toThrow()
    expect(await db.dump()).toEqual(before)
  } finally {
    db.close()
  }
})

test('future versions remain recoverable; native writes keep layout 2 and the older inline inspection refuses it', async () => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneAtlasDocument()
    const prepared = await prepareSceneStorage(source)
    await update(db.store, stored(prepared))
    expect(inspectInlineSceneRecords(stored(prepared), source.id).status).toBe('invalid')
    expect(await createScenePersistence(db.store).save(source, 1)).toEqual({
      status: 'saved',
      revision: 2,
    })
    expect(await db.read(`${DOCUMENT}${source.id}`)).toMatchObject({ storageVersion: 2 })
    const variants = [
      stored(prepared).set(`${DOCUMENT}${source.id}`, { ...source, formatVersion: 3 }),
      stored(prepared).set(`${DOCUMENT}${source.id}`, { ...prepared.manifest, formatVersion: 3 }),
      stored(prepared).set(`${DOCUMENT}${source.id}`, { ...prepared.manifest, storageVersion: 3 }),
      stored(prepared).set(`${SUMMARY}${source.id}`, { formatVersion: 3 }),
    ]
    for (const records of variants) {
      await update(db.store, records)
      const before = await db.dump()
      const persistence = createScenePersistence(db.store)
      const read = await persistence.read(source.id)
      expect(read.status).toBe('unsupported')
      if (read.status === 'unsupported')
        expect(read.records.get(`${DOCUMENT}${source.id}`)).toEqual(
          records.get(`${DOCUMENT}${source.id}`),
        )
      await expect(persistence.save(source, 1)).rejects.toThrow()
      await expect(persistence.remove(source.id, 1)).rejects.toThrow()
      await expect(persistence.restore(source, 1)).rejects.toThrow()
      expect(await db.dump()).toEqual(before)
    }
    const tombstone: SceneTombstone = {
      id: source.id,
      formatVersion: 2,
      storageVersion: 2,
      revision: 2,
      originalsBytes: 0,
    }
    await update(db.store, new Map([[`${DELETED}${source.id}`, tombstone]]), [
      `${DOCUMENT}${source.id}`,
      `${SUMMARY}${source.id}`,
    ])
    const persistence = createScenePersistence(db.store)
    expect(await persistence.read(source.id)).toEqual({ status: 'deleted', tombstone })
    expect(await persistence.readIndexRevision(source.id)).toEqual({
      status: 'deleted',
      revision: 2,
    })
    expect(
      inspectInlineSceneRecords(new Map([[`${DELETED}${source.id}`, tombstone]]), source.id).status,
    ).toBe('invalid')
    expect(await persistence.restore(source, 2)).toEqual({ status: 'saved', revision: 3 })
    expect(await persistence.read(source.id)).toMatchObject({
      status: 'active',
      document: source,
      summary: { storageVersion: 2 },
    })
  } finally {
    db.close()
  }
})

test('quota charges a deduplicated manifest and unique blobs once, not hydrated pixels plus blobs', async () => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneAtlasDocument()
    source.images = source.images.map((image) => ({
      ...image,
      width: 64,
      height: 64,
      encoding: 'rgba',
      layers: Array.from({ length: 4 }, (_, i) => ({
        id: `layer-${i}`,
        name: `Camada ${i}`,
        visible: i === 0,
        opacity: 1,
        pixels: new Uint8Array(64 * 64 * 4).fill(17),
      })),
    }))
    const prepared = await prepareSceneStorage(source)
    expect(prepared.blobs.size).toBe(1)
    await update(db.store, stored(prepared))
    const inline = { ...makeSceneAtlasDocument(), id: 'inline' }
    await createScenePersistence(db.store).save(inline, null)
    const before = await db.dump()
    const exact = [...before.values()].reduce<number>(
      (sum, value) => sum + structuredBytes(value),
      0,
    )
    expect(exact).toBeLessThan(prepared.logicalBytes)
    await expect(
      createScenePersistence(db.store, exact - 1).save(inline, 1),
    ).rejects.toBeInstanceOf(MoldaStorageBudgetError)
    expect(await db.dump()).toEqual(before)
    expect(await createScenePersistence(db.store, exact).save(inline, 1)).toEqual({
      status: 'saved',
      revision: 2,
    })
    expect((await createScenePersistence(db.store).read(source.id)).status).toBe('active')
  } finally {
    db.close()
  }
})

test('identical creation ids and hashes never resolve across persistence namespaces', async () => {
  const first = await nativeDatabase({ name: 'profile-first' })
  const second = await nativeDatabase({ name: 'profile-second' })
  try {
    const source = makeSceneAtlasDocument()
    const prepared = await prepareSceneStorage(source)
    await update(first.store, stored(prepared))
    const incomplete = stored(prepared)
    for (const hash of prepared.blobs.keys()) incomplete.delete(`${BLOB}${hash}`)
    await update(second.store, incomplete)
    expect((await createScenePersistence(first.store).read(source.id)).status).toBe('active')
    const before = await second.dump()
    expect((await createScenePersistence(second.store).read(source.id)).status).toBe('invalid')
    expect(await second.dump()).toEqual(before)
  } finally {
    first.close()
    second.close()
  }
})

test.each([
  1, 2,
])('an unindexed receipt beside layout %s is counted raw, never as zero quota', async (storageVersion) => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneAtlasDocument()
    const prepared = await prepareSceneStorage(source)
    const records =
      storageVersion === 2
        ? stored(prepared)
        : new Map<string, unknown>([
            [`${DOCUMENT}${source.id}`, source],
            [`${SUMMARY}${source.id}`, sceneSummary(source, 1, 0)],
          ])
    records.set(`${ORIGINALS}${source.id}`, { opaque: new Uint8Array(20_000), bytes: 0 })
    await update(db.store, records)
    const inline = { ...makeSceneAtlasDocument(), id: 'another' }
    await createScenePersistence(db.store).save(inline, null)
    const before = await db.dump()
    const exact = [...before.values()].reduce<number>(
      (sum, value) => sum + structuredBytes(value),
      0,
    )
    const reads: string[] = []
    await expect(
      createScenePersistence(observed(db.store, reads), exact - 1).save(inline, 1),
    ).rejects.toBeInstanceOf(MoldaStorageBudgetError)
    expect(reads).toContain(`${ORIGINALS}${source.id}`)
    expect(await db.dump()).toEqual(before)
    expect(await createScenePersistence(db.store, exact).save(inline, 1)).toEqual({
      status: 'saved',
      revision: 2,
    })
    expect((await createScenePersistence(db.store).read(source.id)).status).toBe('invalid')
  } finally {
    db.close()
  }
})

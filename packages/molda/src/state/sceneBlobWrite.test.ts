import { expect, test } from 'bun:test'
import type { UseStore } from 'idb-keyval'
import { MoldaUnsupportedVersionError } from '../core/documentVersion'
import { structuredBytes } from '../core/structuredBytes'
import type { MoldaSceneDocument } from '../scene/document'
import { readSceneDocument } from '../scene/readDocument'
import { deferred } from '../testing/deferred'
import { nativeDatabase } from '../testing/nativeDatabase'
import { makeSceneAtlasDocument } from '../testing/sceneAtlasFixture'
import { MoldaStorageBudgetError } from './guardedWrite'
import { mutateSceneBlobStorage } from './sceneBlobWrite'
import { sceneSummary } from './sceneMetadata'
import { createScenePersistence } from './scenePersistence'
import { prepareSceneStorage } from './sceneStorageDocument'
import {
  SCENE_BLOB_KEY_PREFIX as BLOB,
  SCENE_DOCUMENT_KEY_PREFIX as DOCUMENT,
  SCENE_RECOVERY_KEY_PREFIX as ORIGINALS,
  SCENE_SUMMARY_KEY_PREFIX as SUMMARY,
} from './storageKeys'

const budget = 512 * 1024 * 1024
const save = (
  store: UseStore,
  source: MoldaSceneDocument,
  revision: number | null,
  maxBytes = budget,
) => mutateSceneBlobStorage(store, maxBytes, source.id, revision, 'save', source)
function paint(source: MoldaSceneDocument, color = 2) {
  const result = structuredClone(source)
  for (const image of result.images) for (const layer of image.layers) layer.pixels.fill(color)
  return result
}
async function seedInline(
  db: Awaited<ReturnType<typeof nativeDatabase>>,
  source: MoldaSceneDocument,
  receipt?: unknown,
) {
  const read = readSceneDocument(source)
  if (read.status !== 'valid') throw new Error('Invalid fixture')
  await db.seed(`${DOCUMENT}${source.id}`, read.document)
  await db.seed(
    `${SUMMARY}${source.id}`,
    sceneSummary(read.document, 1, receipt === undefined ? 0 : structuredBytes(receipt)),
  )
  if (receipt !== undefined) await db.seed(`${ORIGINALS}${source.id}`, receipt)
}
function observeWrites(store: UseStore, writes: string[], failKey?: string): UseStore {
  return (mode, callback) =>
    store(mode, (native) =>
      callback(
        new Proxy(native, {
          get(target, property) {
            if (property === 'put')
              return (...args: Parameters<IDBObjectStore['put']>) => {
                const key = args[1]
                if (typeof key === 'string') writes.push(key)
                if (key === failKey) throw new DOMException('Disk full', 'QuotaExceededError')
                return target.put(...args)
              }
            const value = Reflect.get(target, property, target)
            return typeof value === 'function' ? value.bind(target) : value
          },
        }),
      ),
    )
}

test('a future input retains the existing unsupported-version error contract before any IO', async () => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneAtlasDocument()
    Object.assign(source, { formatVersion: 3 })
    let calls = 0
    const store: UseStore = (mode, callback) => {
      calls += 1
      return db.store(mode, callback)
    }
    await expect(createScenePersistence(store).save(source, null)).rejects.toBeInstanceOf(
      MoldaUnsupportedVersionError,
    )
    expect(calls).toBe(0)
    expect((await db.dump()).size).toBe(0)
  } finally {
    db.close()
  }
})

test('blob writer captures source before awaits and reuses verified resources for metadata and shared projects', async () => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneAtlasDocument(),
      expected = structuredClone(source)
    const writes: string[] = [],
      store = observeWrites(db.store, writes)
    const pending = save(store, source, null)
    source.name = 'Mutated caller'
    source.images[0]!.layers[0]!.pixels.fill(7)
    expect(await pending).toEqual({ status: 'saved', revision: 1 })
    const p = createScenePersistence(db.store)
    expect(await p.read(expected.id)).toMatchObject({
      status: 'active',
      document: expected,
      summary: { storageVersion: 2 },
    })
    expect(writes.filter((key) => key.startsWith(BLOB))).toHaveLength(2)
    writes.length = 0
    expect(await save(store, { ...expected, name: 'Nova autoria' }, 1)).toEqual({
      status: 'saved',
      revision: 2,
    })
    expect(writes).toEqual([`${DOCUMENT}${expected.id}`, `${SUMMARY}${expected.id}`])
    writes.length = 0
    const other = { ...expected, id: 'another' }
    expect(await save(store, other, null)).toEqual({ status: 'saved', revision: 1 })
    expect(writes).toEqual([`${DOCUMENT}${other.id}`, `${SUMMARY}${other.id}`])
    const one = await p.read(expected.id),
      two = await p.read(other.id)
    if (one.status !== 'active' || two.status !== 'active') throw new Error('Expected two scenes')
    one.document.images[0]!.layers[0]!.pixels.fill(5)
    expect(two.document).toEqual(other)
    expect(await p.read(other.id)).toMatchObject({ status: 'active', document: other })
  } finally {
    db.close()
  }
})

test('inline migration is lazy, preserves opaque originals, and rolls back every request if the final index write fails', async () => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneAtlasDocument()
    const receipt: { source: string; self?: unknown } = { source: 'Keep exactly' }
    receipt.self = receipt
    await seedInline(db, source, receipt)
    const p = createScenePersistence(db.store),
      before = await db.dump()
    expect((await p.read(source.id)).status).toBe('active')
    await p.listSummaries()
    expect(await db.dump()).toEqual(before)
    const writes: string[] = []
    await expect(
      save(observeWrites(db.store, writes, `${SUMMARY}${source.id}`), source, 1),
    ).rejects.toThrow('Disk full')
    expect(writes.some((key) => key.startsWith(BLOB))).toBe(true)
    expect(Bun.deepEquals(await db.dump(), before)).toBe(true)
    expect(await save(db.store, source, 1)).toEqual({ status: 'saved', revision: 2 })
    expect(await db.read(`${DOCUMENT}${source.id}`)).toMatchObject({
      kind: 'molda-scene-storage',
      storageVersion: 2,
    })
    expect(await p.read(source.id)).toMatchObject({
      status: 'active',
      document: source,
      summary: { revision: 2 },
    })
    expect(Bun.deepEquals(await p.loadRecovery(source.id), receipt)).toBe(true)
  } finally {
    db.close()
  }
})

test.each([
  'inline-document',
  'blob-document',
  'pixels',
  'summary',
  'receipt-presence',
])('commit compares actual %s dependencies even when the revision remains unchanged', async (kind) => {
  const db = await nativeDatabase()
  const entered = deferred(),
    release = deferred()
  try {
    const source = makeSceneAtlasDocument()
    if (kind === 'inline-document') await seedInline(db, source)
    else await save(db.store, source, null)
    const gate: UseStore = async (mode, callback) => {
      if (mode === 'readwrite') {
        entered.resolve()
        await release.promise
      }
      return db.store(mode, callback)
    }
    const pending = save(gate, { ...source, name: 'Queued edit' }, 1)
    await entered.promise
    if (kind === 'inline-document')
      await db.seed(`${DOCUMENT}${source.id}`, { ...source, name: 'Concurrent raw edit' })
    else if (kind === 'blob-document') {
      const prepared = await prepareSceneStorage(source)
      prepared.manifest.document.name = 'Concurrent raw edit'
      await db.seed(`${DOCUMENT}${source.id}`, prepared.manifest)
    } else if (kind === 'pixels') {
      const prepared = await prepareSceneStorage(source)
      const [hash, bytes] = [...prepared.blobs][0]!
      await db.seed(`${BLOB}${hash}`, new Uint8Array(bytes.length).fill(7))
    } else if (kind === 'summary') {
      const read = await createScenePersistence(db.store).read(source.id)
      if (read.status !== 'active') throw new Error('Expected active')
      await db.seed(`${SUMMARY}${source.id}`, { ...read.summary, name: 'Concurrent raw edit' })
    } else await db.seed(`${ORIGINALS}${source.id}`, { opaque: true })
    const changed = await db.dump()
    release.resolve()
    expect(await pending).toEqual({ status: 'conflict' })
    expect(await db.dump()).toEqual(changed)
  } finally {
    release.resolve()
    db.close()
  }
})

test('existing corrupt content-addressed resources cannot be overwritten by an unrelated new scene', async () => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneAtlasDocument(),
      prepared = await prepareSceneStorage(source)
    const [hash, bytes] = [...prepared.blobs][0]!
    await db.seed(`${BLOB}${hash}`, new Uint8Array(bytes.length).fill(9))
    const before = await db.dump()
    await expect(save(db.store, source, null)).rejects.toMatchObject({ reason: 'integrity' })
    expect(await db.dump()).toEqual(before)
  } finally {
    db.close()
  }
})

test('late occupied blob keys and unknown reference owners are inspected in the committing transaction', async () => {
  for (const kind of ['incoming-corruption', 'unknown-owner']) {
    const db = await nativeDatabase(),
      entered = deferred(),
      release = deferred()
    try {
      const source = makeSceneAtlasDocument(),
        changed = paint(source)
      await save(db.store, source, null)
      const gate: UseStore = async (mode, callback) => {
        if (mode === 'readwrite') {
          entered.resolve()
          await release.promise
        }
        return db.store(mode, callback)
      }
      const pending = save(gate, changed, 1)
      await entered.promise
      if (kind === 'incoming-corruption') {
        const prepared = await prepareSceneStorage(changed)
        const [hash, bytes] = [...prepared.blobs][0]!
        await db.seed(`${BLOB}${hash}`, new Uint8Array(bytes.length).fill(9))
      } else await db.seed('molda:future-links', { storageVersion: 99, refs: 'opaque' })
      const before = await db.dump()
      release.resolve()
      if (kind === 'incoming-corruption') {
        await expect(pending).rejects.toMatchObject({ reason: 'integrity' })
        expect(await db.dump()).toEqual(before)
      } else {
        expect(await pending).toMatchObject({
          status: 'saved',
          retainedBlobs: { reason: 'unverified-references' },
        })
        const original = await prepareSceneStorage(source)
        for (const [hash, bytes] of original.blobs)
          expect(await db.read(`${BLOB}${hash}`)).toEqual(bytes)
        expect(await db.read('molda:future-links')).toEqual(before.get('molda:future-links'))
      }
    } finally {
      release.resolve()
      db.close()
    }
  }
})

test('rollback restores retired blobs as well as the prior manifest when the final write fails', async () => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneAtlasDocument()
    await save(db.store, source, null)
    const before = await db.dump()
    await expect(
      save(observeWrites(db.store, [], `${SUMMARY}${source.id}`), paint(source), 1),
    ).rejects.toThrow('Disk full')
    expect(await db.dump()).toEqual(before)
    expect(await createScenePersistence(db.store).read(source.id)).toMatchObject({
      status: 'active',
      document: source,
      summary: { revision: 1 },
    })
  } finally {
    db.close()
  }
})

test('collection reads actual manifests rather than trusting an index that omits another scene’s references', async () => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneAtlasDocument(),
      other = { ...source, id: 'other' }
    await save(db.store, source, null)
    await save(db.store, other, null)
    const read = await createScenePersistence(db.store).read(other.id)
    if (read.status !== 'active' || read.summary.storageVersion !== 2)
      throw new Error('Expected blob scene')
    await db.seed(`${SUMMARY}${other.id}`, { ...read.summary, blobRefs: [] })
    const original = await prepareSceneStorage(source)
    expect(await save(db.store, paint(source), 1)).toEqual({ status: 'saved', revision: 2 })
    for (const [hash, bytes] of original.blobs)
      expect(await db.read(`${BLOB}${hash}`)).toEqual(bytes)
    expect(await db.read(`${SUMMARY}${other.id}`)).toMatchObject({ blobRefs: [] })
    expect((await createScenePersistence(db.store).read(other.id)).status).toBe('invalid')
  } finally {
    db.close()
  }
})

test('collection retains shared references, releases only retired unreferenced blobs, and restore requires the deletion revision', async () => {
  const db = await nativeDatabase()
  try {
    const first = makeSceneAtlasDocument(),
      second = { ...first, id: 'second' }
    const original = await prepareSceneStorage(first)
    await save(db.store, first, null)
    await save(db.store, second, null)
    const painted = paint(first)
    await save(db.store, painted, 1)
    for (const hash of original.blobs.keys())
      expect(await db.read(`${BLOB}${hash}`)).toBeInstanceOf(Uint8Array)
    expect(await mutateSceneBlobStorage(db.store, budget, second.id, 1, 'delete')).toEqual({
      status: 'deleted',
      revision: 2,
    })
    for (const hash of original.blobs.keys())
      expect(await db.read(`${BLOB}${hash}`)).toBeUndefined()
    const p = createScenePersistence(db.store)
    expect(await p.read(first.id)).toMatchObject({ status: 'active', document: painted })
    expect(await save(db.store, second, 2)).toEqual({ status: 'conflict' })
    expect(await mutateSceneBlobStorage(db.store, budget, second.id, 1, 'restore', second)).toEqual(
      { status: 'conflict' },
    )
    expect(await mutateSceneBlobStorage(db.store, budget, second.id, 2, 'restore', second)).toEqual(
      { status: 'saved', revision: 3 },
    )
    expect(await p.read(second.id)).toMatchObject({ status: 'active', document: second })
    await mutateSceneBlobStorage(db.store, budget, first.id, 2, 'delete')
    await mutateSceneBlobStorage(db.store, budget, second.id, 3, 'delete')
    expect(
      [...(await db.dump())].filter(([key]) => typeof key === 'string' && key.startsWith(BLOB)),
    ).toEqual([])
  } finally {
    db.close()
  }
})

test.each([
  'receipt',
  'future',
  'invalid-index',
  'unrecognized',
])('an opaque %s pins retired candidates without repair, collection or zero-cost quota', async (kind) => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneAtlasDocument(),
      original = await prepareSceneStorage(source)
    if (kind === 'receipt') {
      await seedInline(db, source, { unknown: new Uint8Array(100) })
      await save(db.store, source, 1)
    } else {
      await save(db.store, source, null)
      if (kind === 'future')
        await db.seed(`${DOCUMENT}future`, { formatVersion: 3, storageVersion: 9, unknown: true })
      else if (kind === 'invalid-index') await db.seed(`${SUMMARY}invalid`, { bytes: 0 })
      else await db.seed('molda:unknown', { data: new Uint8Array(100), bytes: 0 })
    }
    const before = await db.dump()
    const changed = paint(source)
    const result = await save(db.store, changed, kind === 'receipt' ? 2 : 1)
    expect(result).toMatchObject({
      status: 'saved',
      retainedBlobs: { count: original.blobs.size, reason: 'unverified-references' },
    })
    for (const hash of original.blobs.keys())
      expect(await db.read(`${BLOB}${hash}`)).toEqual(original.blobs.get(hash))
    for (const [key, value] of before)
      if (key !== `${DOCUMENT}${source.id}` && key !== `${SUMMARY}${source.id}`)
        expect(await db.read(String(key))).toEqual(value)
    expect(await createScenePersistence(db.store).read(source.id)).toMatchObject({
      status: 'active',
      document: changed,
    })
  } finally {
    db.close()
  }
})

test('exact physical quota and concurrent creations cannot spend the same remaining space twice', async () => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneAtlasDocument()
    await save(db.store, source, null)
    const before = await db.dump()
    const exact = [...before.values()].reduce<number>((sum, raw) => sum + structuredBytes(raw), 0)
    await expect(save(db.store, source, 1, exact - 1)).rejects.toBeInstanceOf(
      MoldaStorageBudgetError,
    )
    expect(await db.dump()).toEqual(before)
    expect(await save(db.store, source, 1, exact)).toEqual({ status: 'saved', revision: 2 })
    // Deletion remains possible even when retained opaque data already exceeds the budget.
    await db.seed('molda:opaque', { data: new Uint8Array(1000) })
    expect(await mutateSceneBlobStorage(db.store, 1, source.id, 2, 'delete')).toMatchObject({
      status: 'deleted',
      revision: 3,
    })
  } finally {
    db.close()
  }
  const concurrent = await nativeDatabase()
  try {
    const first = { ...makeSceneAtlasDocument(), id: 'first' },
      second = { ...first, id: 'other' }
    const sample = await nativeDatabase()
    let exact: number
    try {
      await save(sample.store, first, null)
      exact = [...(await sample.dump()).values()].reduce<number>(
        (sum, raw) => sum + structuredBytes(raw),
        0,
      )
    } finally {
      sample.close()
    }
    const results = await Promise.allSettled([
      save(concurrent.store, first, null, exact),
      save(concurrent.store, second, null, exact),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toEqual([
      { status: 'rejected', reason: expect.any(MoldaStorageBudgetError) },
    ])
    expect((await createScenePersistence(concurrent.store).listSummaries()).summaries).toHaveLength(
      1,
    )
  } finally {
    concurrent.close()
  }
})

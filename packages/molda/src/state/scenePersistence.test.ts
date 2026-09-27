import { describe, expect, test } from 'bun:test'
import type { UseStore } from 'idb-keyval'
import { MoldaUnsupportedVersionError } from '../core/documentVersion'
import { structuredBytes } from '../core/structuredBytes'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { deferred } from '../testing/deferred'
import { makeModel } from '../testing/fixtures'
import { nativeDatabase } from '../testing/nativeDatabase'
import { MoldaStorageBudgetError } from './guardedWrite'
import { promoteLegacyScene } from './promoteScene'
import { sceneBlobSummary } from './sceneMetadata'
import { createScenePersistence } from './scenePersistence'
import { prepareSceneStorage } from './sceneStorageDocument'
import { SCENE_DOCUMENT_KEY_PREFIX, SCENE_SUMMARY_KEY_PREFIX } from './storageKeys'

function fixture(id = 'model-1') {
  return migrateLegacyModel(makeModel({ id })).document
}

/** Instrument the real IDB boundary by composition, without replacing a prototype or global. */
function observedStore(store: UseStore, reads: string[], failKey?: string): UseStore {
  return (mode, callback) =>
    store(mode, (native) =>
      callback(
        new Proxy(native, {
          get(target, property) {
            if (property === 'getAll')
              return (...args: Parameters<IDBObjectStore['getAll']>) => {
                reads.push('*getAll*')
                return target.getAll(...args)
              }
            if (property === 'openCursor')
              return (...args: Parameters<IDBObjectStore['openCursor']>) => {
                if (typeof args[0] === 'string') reads.push(args[0])
                return target.openCursor(...args)
              }
            if (property === 'put')
              return (...args: Parameters<IDBObjectStore['put']>) => {
                if (args[1] === failKey) throw new DOMException('Disk full', 'QuotaExceededError')
                return target.put(...args)
              }
            const value = Reflect.get(target, property, target)
            return typeof value === 'function' ? value.bind(target) : value
          },
        }),
      ),
    )
}

describe('internal scene persistence', () => {
  test('concurrent creations cannot spend the same remaining quota twice', async () => {
    const db = await nativeDatabase()
    try {
      const a = fixture('first')
      const b = fixture('other')
      const prepared = await prepareSceneStorage(a)
      const budget =
        structuredBytes(prepared.manifest) +
        structuredBytes(sceneBlobSummary(prepared, 1, 0)) +
        [...prepared.blobs.values()].reduce((sum, pixels) => sum + structuredBytes(pixels), 0)
      const persistence = createScenePersistence(db.store, budget)
      const results = await Promise.allSettled([
        persistence.save(a, null),
        persistence.save(b, null),
      ])
      expect(results.filter((result) => result.status === 'fulfilled')).toEqual([
        { status: 'fulfilled', value: { status: 'saved', revision: 1 } },
      ])
      expect(results.find((result) => result.status === 'rejected')).toMatchObject({
        status: 'rejected',
        reason: expect.any(MoldaStorageBudgetError),
      })
      for (const [index, document] of [a, b].entries())
        expect((await persistence.read(document.id)).status).toBe(
          results[index]?.status === 'fulfilled' ? 'active' : 'missing',
        )
      expect((await persistence.listSummaries()).summaries).toHaveLength(1)
    } finally {
      db.close()
    }
  })

  test('a missing original receipt is reported instead of silently rewriting its index', async () => {
    const db = await nativeDatabase()
    try {
      const source = fixture()
      const persistence = createScenePersistence(db.store)
      await persistence.save(source, null)
      const current = await persistence.read(source.id)
      if (current.status !== 'active') throw new Error('Expected active')
      await db.seed(`molda:scene-summary:${source.id}`, { ...current.summary, originalsBytes: 123 })
      const before = await db.dump()
      expect((await persistence.read(source.id)).status).toBe('invalid')
      await expect(persistence.save(source, 1)).rejects.toThrow('cópia original')
      expect(await db.dump()).toEqual(before)
    } finally {
      db.close()
    }
  })
  test('CAS is atomic between tabs even when both edits have the same authorial timestamp', async () => {
    const db = await nativeDatabase()
    try {
      const a = createScenePersistence(db.store)
      const b = createScenePersistence(db.store)
      const source = fixture()
      expect(await a.save(source, null)).toEqual({ status: 'saved', revision: 1 })
      const results = await Promise.all([
        a.save({ ...source, name: 'primeiro' }, 1),
        b.save({ ...source, name: 'segundo' }, 1),
      ])
      expect(results.filter((result) => result.status === 'saved')).toEqual([
        { status: 'saved', revision: 2 },
      ])
      expect(results.filter((result) => result.status === 'conflict')).toEqual([
        { status: 'conflict' },
      ])
      const read = await a.read(source.id)
      if (read.status !== 'active') throw new Error('Expected active')
      expect(read.document.name).toBe(results[0]?.status === 'saved' ? 'primeiro' : 'segundo')
      expect(read.summary.revision).toBe(2)
      expect(read.document.updatedAt).toBe(source.updatedAt)
      expect(await b.save(source, 1)).toEqual({ status: 'conflict' })
      expect(await b.save(source, null)).toEqual({ status: 'conflict' })
    } finally {
      db.close()
    }
  })

  test('a later tab can commit first while an earlier prepared write remains gated; only the winner is stored', async () => {
    const db = await nativeDatabase(),
      entered = deferred(),
      release = deferred()
    try {
      const source = fixture()
      const persistence = createScenePersistence(db.store)
      await persistence.save(source, null)
      const gate: UseStore = async (mode, callback) => {
        if (mode === 'readwrite') {
          entered.resolve()
          await release.promise
        }
        return db.store(mode, callback)
      }
      const pending = createScenePersistence(gate).save({ ...source, name: 'Earlier call' }, 1)
      await entered.promise
      expect(await persistence.save({ ...source, name: 'Earlier commit' }, 1)).toEqual({
        status: 'saved',
        revision: 2,
      })
      release.resolve()
      expect(await pending).toEqual({ status: 'conflict' })
      expect(await persistence.read(source.id)).toMatchObject({
        status: 'active',
        document: { name: 'Earlier commit' },
        summary: { revision: 2 },
      })
    } finally {
      release.resolve()
      db.close()
    }
  })

  test('save captures caller data before an async write and reads return owned bytes', async () => {
    const db = await nativeDatabase()
    try {
      const persistence = createScenePersistence(db.store)
      const source = fixture()
      const expected = structuredClone(source)
      const save = persistence.save(source, null)
      source.name = 'mutated'
      source.images[0]?.layers[0]?.pixels.fill(12)
      await save
      const first = await persistence.read(source.id)
      if (first.status !== 'active') throw new Error('Expected active')
      expect(first.document).toEqual(expected)
      first.document.images[0]?.layers[0]?.pixels.fill(8)
      const second = await persistence.read(source.id)
      if (second.status !== 'active') throw new Error('Expected active')
      expect(second.document).toEqual(expected)
    } finally {
      db.close()
    }
  })

  test('deletion cannot be resurrected by save; explicit restore needs the deletion revision', async () => {
    const db = await nativeDatabase()
    try {
      const persistence = createScenePersistence(db.store)
      const source = fixture()
      await persistence.save(source, null)
      expect(await persistence.remove(source.id, 1)).toEqual({ status: 'deleted', revision: 2 })
      expect((await persistence.read(source.id)).status).toBe('deleted')
      expect(await persistence.save(source, null)).toEqual({ status: 'conflict' })
      expect(await persistence.save(source, 2)).toEqual({ status: 'conflict' })
      expect(await persistence.restore(source, 1)).toEqual({ status: 'conflict' })
      expect(await persistence.restore(source, 2)).toEqual({ status: 'saved', revision: 3 })
      expect(await persistence.remove(source.id, 1)).toEqual({ status: 'conflict' })
      expect(await persistence.restore(source, 2)).toEqual({ status: 'conflict' })
      expect((await persistence.read(source.id)).status).toBe('active')
    } finally {
      db.close()
    }
  })

  test('promoted originals survive save, deletion and explicit restoration exactly', async () => {
    const db = await nativeDatabase()
    try {
      const legacy = { ...makeModel(), legacyNotes: ['keep exact'] }
      await db.seed(`molda:record:${legacy.id}`, legacy)
      const persistence = createScenePersistence(db.store)
      expect(await persistence.save(fixture(), null)).toEqual({ status: 'conflict' })
      await promoteLegacyScene(db.store, legacy.id, legacy.updatedAt)
      const original = await persistence.loadRecovery(legacy.id)
      expect(original).toMatchObject({
        records: [{ key: `molda:record:${legacy.id}`, value: legacy }],
      })
      const current = await persistence.read(legacy.id)
      if (current.status !== 'active') throw new Error('Expected promoted scene')
      expect(current.summary.originalsBytes).toBe(structuredBytes(original))
      await persistence.save({ ...current.document, name: 'mudou' }, 1)
      await persistence.remove(legacy.id, 2)
      await persistence.restore(current.document, 3)
      expect(await persistence.loadRecovery(legacy.id)).toEqual(original)
      expect((await persistence.read(legacy.id)).status).toBe('active')
    } finally {
      db.close()
    }
  })

  test('last-write failure rolls back every document, index and tombstone mutation', async () => {
    const db = await nativeDatabase()
    try {
      const source = fixture()
      const persistence = createScenePersistence(db.store)
      await persistence.save(source, null)
      const before = await db.dump()
      const failing = createScenePersistence(
        observedStore(db.store, [], `${SCENE_SUMMARY_KEY_PREFIX}${source.id}`),
      )
      await expect(failing.save({ ...source, name: 'failed' }, 1)).rejects.toThrow('Disk full')
      expect(await db.dump()).toEqual(before)
      await persistence.remove(source.id, 1)
      const deleted = await db.dump()
      await expect(failing.restore(source, 2)).rejects.toThrow('Disk full')
      expect(await db.dump()).toEqual(deleted)
    } finally {
      db.close()
    }
  })

  test('metadata ledger counts full raw storage including originals and mixed legacy keys', async () => {
    const db = await nativeDatabase()
    try {
      const first = fixture('first')
      const second = fixture('second')
      const persistence = createScenePersistence(db.store)
      await persistence.save(first, null)
      await db.seed('molda:asset:old', { opaqueLegacy: new Uint8Array(10_000) })
      await persistence.save(second, null)
      const before = await db.dump()
      const exact = [...before.values()].reduce<number>(
        (total, value) => total + structuredBytes(value),
        0,
      )
      expect(await createScenePersistence(db.store, exact).save(first, 1)).toEqual({
        status: 'saved',
        revision: 2,
      })
      const after = await db.dump()
      await expect(
        createScenePersistence(db.store, exact - 1).save(first, 2),
      ).rejects.toBeInstanceOf(MoldaStorageBudgetError)
      expect(await db.dump()).toEqual(after)
      // Deletion must remain available when an old tab has already exceeded the quota.
      expect(await createScenePersistence(db.store, 1).remove(first.id, 2)).toEqual({
        status: 'deleted',
        revision: 3,
      })
    } finally {
      db.close()
    }
  })

  test('autosave does not load other valid scene documents or originals; gallery lists only summaries', async () => {
    const db = await nativeDatabase()
    try {
      for (const id of ['first', 'second', 'third']) {
        const legacy = makeModel({ id })
        await db.seed(`molda:record:${id}`, legacy)
        await promoteLegacyScene(db.store, id, legacy.updatedAt)
      }
      const reads: string[] = []
      const persistence = createScenePersistence(observedStore(db.store, reads))
      await persistence.save(fixture('first'), 1)
      expect(reads.filter((key) => key.startsWith(SCENE_DOCUMENT_KEY_PREFIX))).toEqual([
        'molda:scene:first',
        'molda:scene:first', // Async integrity preflight is rechecked in the committing transaction.
      ])
      expect(reads.filter((key) => key.startsWith('molda:scene-originals:'))).toEqual([])
      expect(reads).not.toContain('*getAll*')
      reads.length = 0
      const list = await persistence.listSummaries()
      expect(list.summaries).toHaveLength(3)
      expect(list.issues).toEqual([])
      expect(reads.every((key) => key.startsWith(SCENE_SUMMARY_KEY_PREFIX))).toBe(true)
    } finally {
      db.close()
    }
  })

  test('unknown ledger versions are counted from raw records, not trusted or silently discarded', async () => {
    const db = await nativeDatabase()
    try {
      const persistence = createScenePersistence(db.store)
      const source = fixture()
      await persistence.save(source, null)
      const future = { ...fixture('future'), formatVersion: 3, extra: new Uint8Array(10_000) }
      await db.seed('molda:scene:future', future)
      await db.seed('molda:scene-summary:future', { formatVersion: 3, bytes: 0 })
      const before = await db.dump()
      const exact = [...before.values()].reduce<number>(
        (total, value) => total + structuredBytes(value),
        0,
      )
      const reads: string[] = []
      await expect(
        createScenePersistence(observedStore(db.store, reads), exact - 1).save(source, 1),
      ).rejects.toBeInstanceOf(MoldaStorageBudgetError)
      expect(reads).toContain('molda:scene:future')
      expect(await db.dump()).toEqual(before)
      expect((await persistence.listSummaries()).issues).toHaveLength(1)
    } finally {
      db.close()
    }
  })

  test.each([
    'document',
    'summary',
    'tombstone',
  ])('future %s is recoverable and cannot be overwritten or deleted', async (kind) => {
    const db = await nativeDatabase()
    try {
      const source = fixture()
      const persistence = createScenePersistence(db.store)
      await persistence.save(source, null)
      if (kind === 'document')
        await db.seed(`molda:scene:${source.id}`, { ...source, formatVersion: 3 })
      else if (kind === 'summary')
        await db.seed(`molda:scene-summary:${source.id}`, { formatVersion: 3 })
      else {
        await persistence.remove(source.id, 1)
        await db.seed(`molda:scene-deleted:${source.id}`, { formatVersion: 3 })
      }
      const before = await db.dump()
      expect((await persistence.read(source.id)).status).toBe('unsupported')
      await expect(persistence.save(source, 1)).rejects.toBeInstanceOf(MoldaUnsupportedVersionError)
      await expect(persistence.remove(source.id, 1)).rejects.toBeInstanceOf(
        MoldaUnsupportedVersionError,
      )
      await expect(persistence.restore(source, 2)).rejects.toBeInstanceOf(
        MoldaUnsupportedVersionError,
      )
      expect(await db.dump()).toEqual(before)
    } finally {
      db.close()
    }
  })

  test('orphaned metadata and mismatched summaries are invalid, never interpreted as absence', async () => {
    const db = await nativeDatabase()
    try {
      const source = fixture()
      const persistence = createScenePersistence(db.store)
      await db.seed(`molda:scene-originals:${source.id}`, { keep: 'original' })
      expect((await persistence.read(source.id)).status).toBe('invalid')
      await expect(persistence.save(source, null)).rejects.toThrow('incompleta')
      const other = fixture('other')
      await persistence.save(other, null)
      await db.seed('molda:scene:other', { ...other, name: 'wrong summary' })
      const before = await db.dump()
      expect((await persistence.read(other.id)).status).toBe('invalid')
      await expect(persistence.save(other, 1)).rejects.toThrow('índice')
      expect(await db.dump()).toEqual(before)
    } finally {
      db.close()
    }
  })
})

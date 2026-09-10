import { describe, expect, test } from 'bun:test'
import type { UseStore } from 'idb-keyval'
import { summarizeAsset } from '../core/assetSummary'
import { MoldaUnsupportedVersionError } from '../core/documentVersion'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel, makeSky } from '../testing/fixtures'
import { nativeDatabase } from '../testing/nativeDatabase'
import { guardedWrite, MoldaStorageBudgetError, removeStoredDocuments } from './guardedWrite'
import { promoteLegacyScene } from './promoteScene'
import { createScenePersistence } from './scenePersistence'
import { prepareSceneStorage } from './sceneStorageDocument'
import {
  SCENE_DOCUMENT_KEY_PREFIX,
  SCENE_RECOVERY_KEY_PREFIX,
  SCENE_SUMMARY_KEY_PREFIX,
  V1_DOCUMENT_PREFIXES,
} from './storageKeys'

describe('atomic scene promotion', () => {
  test('an already converted blob scene is verified without another promotion or original rewrite', async () => {
    const db = await nativeDatabase()
    try {
      const legacy = makeModel(),
        source = migrateLegacyModel(legacy).document
      await db.seed(`molda:record:${legacy.id}`, legacy)
      await promoteLegacyScene(db.store, legacy.id, legacy.updatedAt)
      const persistence = createScenePersistence(db.store)
      await persistence.save(source, 1)
      const before = await db.dump()
      expect(await promoteLegacyScene(db.store, source.id, -1)).toEqual({
        status: 'already-migrated',
        document: source,
      })
      expect(await db.dump()).toEqual(before)
      const prepared = await prepareSceneStorage(source)
      const [hash, pixels] = [...prepared.blobs][0]!
      await db.seed(`molda:scene-blob:${hash}`, new Uint8Array(pixels.length).fill(9))
      const corrupt = await db.dump()
      await expect(promoteLegacyScene(db.store, source.id, legacy.updatedAt)).rejects.toThrow()
      expect(await db.dump()).toEqual(corrupt)
    } finally {
      db.close()
    }
  })
  test.each([
    ...V1_DOCUMENT_PREFIXES,
  ])('preserves the exact %s original before promoting document and summary', async (prefix) => {
    const db = await nativeDatabase()
    try {
      const model = makeModel()
      const raw = { ...model, oldExtraField: { keep: true } }
      await db.seed(`${prefix}${model.id}`, raw)
      const result = await promoteLegacyScene(db.store, model.id, model.updatedAt)
      expect(result.status).toBe('promoted')
      if (result.status !== 'promoted') throw new Error('Expected promotion')
      expect(result.document).toEqual(migrateLegacyModel(model).document)
      expect(await db.read(`${SCENE_DOCUMENT_KEY_PREFIX}${model.id}`)).toEqual(result.document)
      expect(await db.read(`${SCENE_SUMMARY_KEY_PREFIX}${model.id}`)).toMatchObject({
        id: model.id,
        name: model.name,
        formatVersion: 2,
      })
      expect(await db.read(`${SCENE_RECOVERY_KEY_PREFIX}${model.id}`)).toMatchObject({
        records: [{ key: `${prefix}${model.id}`, value: raw }],
      })
      for (const legacyPrefix of V1_DOCUMENT_PREFIXES)
        expect(await db.read(`${legacyPrefix}${model.id}`)).toBeUndefined()
      expect(await db.read(`molda:record-deleted:${model.id}`)).toBe(true)
      expect(await db.read(`molda:deleted:${model.id}`)).toBe(true)
      expect(raw.oldExtraField.keep).toBe(true)
    } finally {
      db.close()
    }
  })

  test('earlier recoveries and shadowed records remain exact, not replaced by the sanitized source', async () => {
    const db = await nativeDatabase()
    try {
      const model = makeModel()
      const keys = [
        'molda:asset:',
        'molda:document:',
        'molda:record:',
        'molda:recovery:',
        'molda:record-recovery:',
      ]
      for (const [i, prefix] of keys.entries())
        await db.seed(`${prefix}${model.id}`, { ...model, originalMarker: i })
      const before = await db.dump()
      await promoteLegacyScene(db.store, model.id, model.updatedAt)
      expect(await db.read(`${SCENE_RECOVERY_KEY_PREFIX}${model.id}`)).toMatchObject({
        records: [...V1_DOCUMENT_PREFIXES, 'molda:record-recovery:', 'molda:recovery:'].map(
          (prefix) => ({ key: `${prefix}${model.id}`, value: before.get(`${prefix}${model.id}`) }),
        ),
      })
    } finally {
      db.close()
    }
  })

  test('concurrent promotions are idempotent and do not replace the original receipt', async () => {
    const db = await nativeDatabase()
    try {
      const model = makeModel()
      await db.seed(`molda:record:${model.id}`, model)
      const results = await Promise.all([
        promoteLegacyScene(db.store, model.id, model.updatedAt),
        promoteLegacyScene(db.store, model.id, model.updatedAt),
      ])
      expect(results.map((result) => result.status)).toEqual(['promoted', 'already-migrated'])
      const before = await db.dump()
      await promoteLegacyScene(db.store, model.id, -1)
      expect(await db.dump()).toEqual(before)
    } finally {
      db.close()
    }
  })

  test('a preceding edit wins the comparison and nothing is promoted from a stale read', async () => {
    const db = await nativeDatabase()
    try {
      const model = makeModel()
      await db.seed(`molda:record:${model.id}`, model)
      const next = { ...model, updatedAt: model.updatedAt + 1, name: 'editado' }
      const edit = db.seed(`molda:record:${model.id}`, next)
      const result = promoteLegacyScene(db.store, model.id, model.updatedAt)
      await edit
      expect(await result).toEqual({ status: 'conflict' })
      expect(await db.dump()).toEqual(new Map([[`molda:record:${model.id}`, next]]))
    } finally {
      db.close()
    }
  })

  test.each([
    ...V1_DOCUMENT_PREFIXES,
    'molda:recovery:',
    'molda:record-recovery:',
  ])('future data in retired %s aborts the whole operation', async (prefix) => {
    const db = await nativeDatabase()
    try {
      const model = makeModel()
      const future = { ...model, formatVersion: 3, animations: ['keep'] }
      await db.seed(`molda:record:${model.id}`, model)
      await db.seed(`${prefix}${model.id}`, future)
      const before = await db.dump()
      await expect(promoteLegacyScene(db.store, model.id, model.updatedAt)).rejects.toBeInstanceOf(
        MoldaUnsupportedVersionError,
      )
      expect(await db.dump()).toEqual(before)
    } finally {
      db.close()
    }
  })

  test.each([
    SCENE_RECOVERY_KEY_PREFIX,
    SCENE_SUMMARY_KEY_PREFIX,
  ])('an orphaned %s record is preserved, not overwritten by migration', async (prefix) => {
    const db = await nativeDatabase()
    try {
      const model = makeModel()
      await db.seed(`molda:record:${model.id}`, model)
      await db.seed(`${prefix}${model.id}`, { formatVersion: 3, keep: ['future'] })
      const before = await db.dump()
      await expect(promoteLegacyScene(db.store, model.id, model.updatedAt)).rejects.toThrow(
        'Atualização incompleta',
      )
      expect(await db.dump()).toEqual(before)
    } finally {
      db.close()
    }
  })

  test('quota and last-write failure roll back originals, summary, document and tombstones', async () => {
    const db = await nativeDatabase()
    try {
      const model = makeModel()
      await db.seed(`molda:record:${model.id}`, model)
      await db.seed(`molda:summary:${model.id}`, summarizeAsset(model))
      const before = await db.dump()
      await expect(
        promoteLegacyScene(db.store, model.id, model.updatedAt, 1),
      ).rejects.toBeInstanceOf(MoldaStorageBudgetError)
      expect(await db.dump()).toEqual(before)
      const failing: UseStore = (mode, callback) =>
        db.store(mode, (store) => {
          const put = store.put.bind(store)
          store.put = (value, key) => {
            if (key === `${SCENE_SUMMARY_KEY_PREFIX}${model.id}`)
              throw new DOMException('Disk full', 'QuotaExceededError')
            return put(value, key)
          }
          return callback(store)
        })
      await expect(promoteLegacyScene(failing, model.id, model.updatedAt)).rejects.toThrow(
        'Disk full',
      )
      expect(await db.dump()).toEqual(before)
    } finally {
      db.close()
    }
  })

  test('old-format writes/deletes are refused; a pre-guard tab cannot erase the new generation', async () => {
    const db = await nativeDatabase()
    try {
      const model = makeModel()
      await db.seed(`molda:record:${model.id}`, model)
      await promoteLegacyScene(db.store, model.id, model.updatedAt)
      const promoted = await db.dump()
      await expect(guardedWrite(db.store, [model], 10_000_000)).rejects.toBeInstanceOf(
        MoldaUnsupportedVersionError,
      )
      await expect(removeStoredDocuments(db.store, [model.id])).rejects.toBeInstanceOf(
        MoldaUnsupportedVersionError,
      )
      // Emulate a tab with only the old key layout, not the newly strengthened guards.
      await db.seed(`molda:record:${model.id}`, { ...model, name: 'aba-antiga' })
      await db.store(
        'readwrite',
        (store) =>
          new Promise<void>((resolve, reject) => {
            store.transaction.oncomplete = () => resolve()
            store.transaction.onabort = () => reject(store.transaction.error)
            for (const prefix of V1_DOCUMENT_PREFIXES) store.delete(`${prefix}${model.id}`)
          }),
      )
      expect(await db.dump()).toEqual(promoted)
    } finally {
      db.close()
    }
  })

  test('missing, deleted, corrupt and non-model sources never become an empty scene', async () => {
    const db = await nativeDatabase()
    try {
      const model = makeModel()
      expect(await promoteLegacyScene(db.store, model.id, model.updatedAt)).toEqual({
        status: 'missing',
      })
      await db.seed(`molda:record:${model.id}`, { broken: true })
      await expect(promoteLegacyScene(db.store, model.id, model.updatedAt)).rejects.toThrow()
      const sky = makeSky()
      await db.seed(`molda:record:${sky.id}`, sky)
      await expect(promoteLegacyScene(db.store, sky.id, sky.updatedAt)).rejects.toThrow()
      await db.seed(`molda:record:${model.id}`, model)
      await db.seed(`molda:scene-deleted:${model.id}`, true)
      const before = await db.dump()
      expect(await promoteLegacyScene(db.store, model.id, model.updatedAt)).toEqual({
        status: 'conflict',
      })
      await expect(guardedWrite(db.store, [model], 10_000_000)).rejects.toBeInstanceOf(
        MoldaUnsupportedVersionError,
      )
      expect(await db.dump()).toEqual(before)
    } finally {
      db.close()
    }
  })
})

import { describe, expect, test } from 'bun:test'
import type { UseStore } from 'idb-keyval'
import { indexedAssetBytes, summarizeAsset } from '../core/assetSummary'
import { MoldaUnsupportedVersionError } from '../core/documentVersion'
import { makeModel, makeSky, makeTexture } from '../testing/fixtures'
import { nativeDatabase as database } from '../testing/nativeDatabase'
import { guardedWrite, MoldaStorageBudgetError, removeStoredDocuments } from './guardedWrite'
import { readRecords } from './readRecords'
import {
  DOCUMENT_PREFIXES,
  PREVIOUS_RECOVERY_KEY_PREFIX,
  RECOVERY_KEY_PREFIX,
  storedDocument,
  storedDocumentKey,
} from './storageKeys'

describe('guarded native IDB transactions', () => {
  test.each([
    ...DOCUMENT_PREFIXES,
    RECOVERY_KEY_PREFIX,
    PREVIOUS_RECOVERY_KEY_PREFIX,
  ])('batch deletion preserves unsupported data at %s, even behind a current document', async (prefix) => {
    const db = await database()
    try {
      const asset = makeModel()
      const sky = makeSky()
      await guardedWrite(db.store, [asset, sky], 1_000_000)
      const future = { ...asset, formatVersion: 2, animations: ['keep'] }
      await db.seed(`${prefix}${asset.id}`, future)
      for (const expected of [undefined, new Map([[asset.id, asset.updatedAt]])]) {
        await expect(
          removeStoredDocuments(db.store, [sky.id, asset.id], expected),
        ).rejects.toBeInstanceOf(MoldaUnsupportedVersionError)
        expect(await db.read(`${prefix}${asset.id}`)).toEqual(future)
        expect(await db.read(`molda:record:${sky.id}`)).toMatchObject(sky)
        expect(await db.read(`molda:summary:${asset.id}`)).toMatchObject(summarizeAsset(asset))
        expect(await db.read(`molda:record-deleted:${asset.id}`)).toBeUndefined()
        expect(await db.read(`molda:deleted:${sky.id}`)).toBeUndefined()
      }
    } finally {
      db.close()
    }
  })

  test('simple deletion observes the future format committed immediately before it', async () => {
    const db = await database()
    try {
      const future = { ...makeModel(), formatVersion: 2 }
      const seeded = db.seed('molda:record:model-1', future)
      const removed = removeStoredDocuments(db.store, ['model-1'])
      await seeded
      await expect(removed).rejects.toBeInstanceOf(MoldaUnsupportedVersionError)
      expect(await db.read('molda:record:model-1')).toEqual(future)
      expect(await db.read('molda:record-deleted:model-1')).toBeUndefined()
    } finally {
      db.close()
    }
  })

  test('migration cannot retire a shadowed future document from an older generation', async () => {
    const db = await database()
    try {
      const future = { ...makeModel(), formatVersion: 2, animations: ['keep'] }
      await db.seed('molda:asset:model-1', future)
      await db.seed('molda:document:model-1', makeModel())
      await expect(
        guardedWrite(db.store, [makeSky(), makeModel()], 1_000_000),
      ).rejects.toBeInstanceOf(MoldaUnsupportedVersionError)
      expect(await db.read('molda:asset:model-1')).toEqual(future)
      expect(await db.read('molda:record:model-1')).toBeUndefined()
      expect(await db.read('molda:record:sky-1')).toBeUndefined()
      expect(await db.read('molda:record-recovery:model-1')).toBeUndefined()
    } finally {
      db.close()
    }
  })

  test('explicit deletion can remove corrupt known-format data', async () => {
    const db = await database()
    try {
      await db.seed('molda:record:broken', { formatVersion: 1, broken: true })
      expect(await removeStoredDocuments(db.store, ['broken', 'broken'])).toBe(true)
      expect(await db.read('molda:record:broken')).toBeUndefined()
      expect(await db.read('molda:record-deleted:broken')).toBe(true)
    } finally {
      db.close()
    }
  })

  test('only one concurrent replacement can consume a revision, without Web Locks', async () => {
    const db = await database()
    try {
      const initial = makeModel()
      await guardedWrite(db.store, [initial], 1_000_000)
      const expected = new Map([[initial.id, initial.updatedAt]])
      const next = { ...initial, name: 'primeira', updatedAt: initial.updatedAt + 1 }
      const results = await Promise.all([
        guardedWrite(db.store, [next], 1_000_000, expected),
        guardedWrite(db.store, [{ ...next, name: 'atrasada' }], 1_000_000, expected),
      ])
      expect(results).toEqual([true, false])
      expect(await db.read('molda:record:model-1')).toMatchObject(next)
      expect(await db.read('molda:summary:model-1')).toMatchObject(summarizeAsset(next))
    } finally {
      db.close()
    }
  })

  test('conditional delete sees the preceding edit and preserves its summary and recovery', async () => {
    const db = await database()
    try {
      const initial = makeModel()
      await db.seed('molda:asset:model-1', initial)
      const next = { ...initial, updatedAt: initial.updatedAt + 1 }
      const saved = guardedWrite(db.store, [next], 1_000_000)
      const removed = removeStoredDocuments(
        db.store,
        [initial.id],
        new Map([[initial.id, initial.updatedAt]]),
      )
      await saved
      expect(await removed).toBe(false)
      expect(await db.read('molda:record:model-1')).toMatchObject(next)
      expect(await db.read('molda:summary:model-1')).toMatchObject(summarizeAsset(next))
      expect(await db.read('molda:record-recovery:model-1')).toEqual(initial)
      expect(await db.read('molda:record-deleted:model-1')).toBeUndefined()
      expect(
        await removeStoredDocuments(
          db.store,
          [initial.id],
          new Map([[initial.id, next.updatedAt]]),
        ),
      ).toBe(true)
      expect(await db.read('molda:record:model-1')).toBeUndefined()
      expect(await db.read('molda:summary:model-1')).toBeUndefined()
      expect(await db.read('molda:record-recovery:model-1')).toBeUndefined()
      expect(await db.read('molda:record-deleted:model-1')).toBe(true)
    } finally {
      db.close()
    }
  })

  test('absence is explicit: stale updates cannot resurrect deletes or replace a recreation', async () => {
    const db = await database()
    try {
      const asset = makeModel()
      const expected = new Map([[asset.id, asset.updatedAt]])
      expect(await guardedWrite(db.store, [asset], 1_000_000, expected)).toBe(false)
      expect(await guardedWrite(db.store, [asset], 1_000_000, new Map([[asset.id, null]]))).toBe(
        true,
      )
      expect(
        await guardedWrite(
          db.store,
          [{ ...asset, name: 'restauro atrasado' }],
          1_000_000,
          new Map([[asset.id, null]]),
        ),
      ).toBe(false)
      await removeStoredDocuments(db.store, [asset.id])
      await db.seed('molda:asset:model-1', asset)
      expect(await guardedWrite(db.store, [asset], 1_000_000, expected)).toBe(false)
      expect(await db.read('molda:record-deleted:model-1')).toBe(true)
    } finally {
      db.close()
    }
  })

  test('conditional writes never treat corrupt records as absent or erase future documents', async () => {
    const db = await database()
    try {
      const asset = makeModel()
      await db.seed('molda:record:model-1', undefined)
      for (const revision of [null, asset.updatedAt]) {
        const expected = new Map([[asset.id, revision]])
        expect(await guardedWrite(db.store, [asset], 1_000_000, expected)).toBe(false)
        expect(await removeStoredDocuments(db.store, [asset.id], expected)).toBe(false)
      }
      const future = { ...asset, formatVersion: 2, animations: ['andar'] }
      await db.seed('molda:record:model-1', future)
      const expected = new Map([[asset.id, asset.updatedAt]])
      await expect(guardedWrite(db.store, [asset], 1_000_000, expected)).rejects.toBeInstanceOf(
        MoldaUnsupportedVersionError,
      )
      await expect(removeStoredDocuments(db.store, [asset.id], expected)).rejects.toBeInstanceOf(
        MoldaUnsupportedVersionError,
      )
      expect(await db.read('molda:record:model-1')).toEqual(future)
    } finally {
      db.close()
    }
  })

  test('point reads distinguish stored undefined from absent and never fetch unrelated backups', async () => {
    const db = await database()
    try {
      await db.seed('molda:asset:model-1', makeModel())
      await db.seed('molda:document:model-1', undefined)
      await db.seed('molda:recovery:model-1', makeModel())
      const keys = ['molda:document:model-1', 'molda:deleted:model-1', 'molda:asset:model-1']
      const records = await readRecords(db.store, keys)
      expect(records.has('molda:document:model-1')).toBe(true)
      expect(records.get('molda:document:model-1')).toBeUndefined()
      expect(records.has('molda:deleted:model-1')).toBe(false)
      expect(records.has('molda:recovery:model-1')).toBe(false)
      expect(storedDocumentKey(records, 'model-1')).toBe('molda:document:model-1')
    } finally {
      db.close()
    }
  })

  test('a read aborted before completion rejects instead of returning a partial snapshot', async () => {
    const db = await database()
    try {
      const aborted: UseStore = (mode, callback) =>
        db.store(mode, (store) => {
          const result = callback(store)
          store.transaction.abort()
          return result
        })
      await expect(readRecords(aborted, ['molda:document:model-1'])).rejects.toThrow()
      expect(await readRecords(db.store, [])).toEqual(new Map())
    } finally {
      db.close()
    }
  })

  test('a mismatched id in a tagged canonical record is retained before repair', async () => {
    const db = await database()
    try {
      const corrupt = { ...makeModel(), formatVersion: 1, id: 'wrong-id' }
      await db.seed('molda:document:model-1', corrupt)
      await guardedWrite(db.store, [makeModel()], 1_000_000)
      expect(await db.read('molda:record-recovery:model-1')).toEqual(corrupt)
    } finally {
      db.close()
    }
  })
  test('writer refuses a newer input rather than relabeling it as the current format', async () => {
    const db = await database()
    try {
      const future = { ...makeModel(), formatVersion: 2 }
      await expect(guardedWrite(db.store, [future], 1_000_000)).rejects.toBeInstanceOf(
        MoldaUnsupportedVersionError,
      )
      expect(await db.read('molda:record:model-1')).toBeUndefined()
    } finally {
      db.close()
    }
  })
  test('concurrent quota checks see preceding commits without Web Locks', async () => {
    const db = await database()
    try {
      const first = makeTexture()
      const second = { ...first, id: 'other' }
      const limit = indexedAssetBytes(first) + 1
      const results = await Promise.allSettled([
        guardedWrite(db.store, [first], limit),
        guardedWrite(db.store, [second], limit),
      ])
      expect(results[0]?.status).toBe('fulfilled')
      expect(results[1]).toMatchObject({
        status: 'rejected',
        reason: expect.any(MoldaStorageBudgetError),
      })
      expect(await db.read('molda:record:other')).toBeUndefined()
    } finally {
      db.close()
    }
  })

  test('future format committed by another transaction is visible to the guard', async () => {
    const db = await database()
    try {
      const future = { ...makeModel(), formatVersion: 2, animations: ['keep'] }
      const futureWrite = db.seed('molda:asset:model-1', future)
      const oldWrite = guardedWrite(db.store, [makeSky(), makeModel()], 1_000_000)
      await futureWrite
      await expect(oldWrite).rejects.toBeInstanceOf(MoldaUnsupportedVersionError)
      expect(await db.read('molda:asset:model-1')).toEqual(future)
      expect(await db.read('molda:record:sky-1')).toBeUndefined()
    } finally {
      db.close()
    }
  })

  test('failure on the last put rolls back previous puts and the legacy backup', async () => {
    const db = await database()
    try {
      const legacy = { ...makeModel(), unknownLegacyData: [1, 2] }
      await db.seed('molda:asset:model-1', legacy)
      const unclonable = { ...makeSky(), unexpectedFunction: () => undefined }
      await expect(guardedWrite(db.store, [makeModel(), unclonable], 1_000_000)).rejects.toThrow()
      expect(await db.read('molda:asset:model-1')).toEqual(legacy)
      expect(await db.read('molda:recovery:model-1')).toBeUndefined()
      expect(await db.read('molda:record-recovery:model-1')).toBeUndefined()
      expect(await db.read('molda:summary:model-1')).toBeUndefined()
      expect(await db.read('molda:record:model-1')).toBeUndefined()
      expect(await db.read('molda:document:sky-1')).toBeUndefined()
      expect(await db.read('molda:document:model-1')).toBeUndefined()
    } finally {
      db.close()
    }
  })

  test('successful migration promotes data and preserves the exact original atomically', async () => {
    const db = await database()
    try {
      const original = { ...makeModel(), oldMetadata: 'original' }
      await db.seed('molda:asset:model-1', original)
      await guardedWrite(db.store, [{ ...makeModel(), name: 'editado' }], 1_000_000)
      expect(await db.read('molda:record:model-1')).toMatchObject({
        formatVersion: 1,
        name: 'editado',
      })
      expect(await db.read('molda:record-recovery:model-1')).toEqual(original)
      expect(await db.read('molda:summary:model-1')).toEqual({
        ...summarizeAsset({ ...makeModel(), name: 'editado' }),
        formatVersion: 1,
      })
      expect(await db.read('molda:asset:model-1')).toBeUndefined()
    } finally {
      db.close()
    }
  })

  test('a pre-guard tab cannot overwrite an isolated future document or its original', async () => {
    const db = await database()
    try {
      const original = { ...makeModel(), formatVersion: 1, extra: 'original' }
      await db.seed('molda:asset:model-1', original)
      await guardedWrite(db.store, [makeModel()], 1_000_000)
      const future = { ...makeModel(), formatVersion: 2, animations: ['andar'] }
      await db.seed('molda:record:model-1', future)
      await db.seed('molda:asset:model-1', { ...makeModel(), name: 'aba-antiga' })
      await expect(guardedWrite(db.store, [makeModel()], 1_000_000)).rejects.toBeInstanceOf(
        MoldaUnsupportedVersionError,
      )
      expect(await db.read('molda:record:model-1')).toEqual(future)
      expect(await db.read('molda:record-recovery:model-1')).toEqual(original)
    } finally {
      db.close()
    }
  })

  test('deletion removes recovery atomically and late legacy writes cannot resurrect it', async () => {
    const db = await database()
    try {
      await db.seed('molda:asset:model-1', makeModel())
      await guardedWrite(db.store, [makeModel()], 1_000_000)
      await removeStoredDocuments(db.store, ['model-1'])
      await db.seed('molda:asset:model-1', makeModel())
      const entries: Array<[string, unknown]> = []
      for (const prefix of ['record', 'record-deleted', 'document', 'deleted', 'asset']) {
        const key = `molda:${prefix}:model-1`
        const value = await db.read(key)
        if (value !== undefined) entries.push([key, value])
      }
      expect(storedDocument(new Map(entries), 'model-1')).toBeUndefined()
      expect(await db.read('molda:document:model-1')).toBeUndefined()
      expect(await db.read('molda:recovery:model-1')).toBeUndefined()
      expect(await db.read('molda:record-recovery:model-1')).toBeUndefined()
      expect(await db.read('molda:record:model-1')).toBeUndefined()
      expect(await db.read('molda:summary:model-1')).toBeUndefined()
    } finally {
      db.close()
    }
  })
})

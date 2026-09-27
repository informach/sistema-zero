import { expect, test } from 'bun:test'
import type { UseStore } from 'idb-keyval'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { nativeDatabase } from '../testing/nativeDatabase'
import { readSceneIndexRevision } from './sceneIndexRevision'
import { sceneSummary } from './sceneMetadata'
import { createScenePersistence } from './scenePersistence'
import {
  SCENE_DELETED_KEY_PREFIX,
  SCENE_DOCUMENT_KEY_PREFIX,
  SCENE_SUMMARY_KEY_PREFIX,
} from './storageKeys'

test('revision observation reads only two exact index records, validates them and never certifies or rewrites document content', async () => {
  const db = await nativeDatabase()
  const reads: string[] = []
  const observed: UseStore = (mode, callback) =>
    db.store(mode, (store) =>
      callback(
        new Proxy(store, {
          get(target, key) {
            if (key === 'openCursor')
              return (query: string) => {
                reads.push(query)
                return target.openCursor(query)
              }
            if (key === 'getAll' || key === 'get' || key === 'put' || key === 'delete')
              throw new Error('Unexpected document IO')
            const value = Reflect.get(target, key, target)
            return typeof value === 'function' ? value.bind(target) : value
          },
        }),
      ),
    )
  const document = migrateLegacyModel(makeModel()).document
  const id = document.id
  const summaryKey = `${SCENE_SUMMARY_KEY_PREFIX}${id}`,
    deletedKey = `${SCENE_DELETED_KEY_PREFIX}${id}`
  try {
    expect(await readSceneIndexRevision(observed, id)).toEqual({ status: 'missing' })
    const p = createScenePersistence(db.store)
    await p.save(document, null)
    expect(await readSceneIndexRevision(observed, id)).toEqual({ status: 'indexed', revision: 1 })
    // An index hint is intentionally NOT full document validation or a write token.
    await db.seed(`${SCENE_DOCUMENT_KEY_PREFIX}${id}`, { formatVersion: 99 })
    expect(await readSceneIndexRevision(observed, id)).toEqual({ status: 'indexed', revision: 1 })
    expect((await p.read(id)).status).toBe('unsupported')
    await expect(p.save(document, 1)).rejects.toThrow()
    for (const value of [
      undefined,
      { ...sceneSummary(document, 1, 0), revision: 0 },
      { ...sceneSummary(document, 1, 0), unexpected: true },
      { ...sceneSummary(document, 1, 0), id: 'different' },
    ]) {
      await db.seed(summaryKey, value)
      expect(await readSceneIndexRevision(observed, id)).toEqual({ status: 'invalid' })
    }
    await db.seed(summaryKey, { ...sceneSummary(document, 1, 0), formatVersion: 99 })
    expect(await readSceneIndexRevision(observed, id)).toEqual({ status: 'unsupported' })
    await db.seed(deletedKey, {
      id,
      formatVersion: 2,
      storageVersion: 1,
      revision: 2,
      originalsBytes: 0,
    })
    const before = await db.dump()
    expect(await readSceneIndexRevision(observed, id)).toEqual({ status: 'invalid' })
    expect(await db.dump()).toEqual(before)
    expect(reads.every((key) => key === summaryKey || key === deletedKey)).toBe(true)
    expect(reads.length).toBe(18)
    await expect(readSceneIndexRevision(observed, '../x')).rejects.toThrow()
    expect(reads.length).toBe(18)
  } finally {
    db.close()
  }
})

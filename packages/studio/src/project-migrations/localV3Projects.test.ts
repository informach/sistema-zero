import { expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { createEmptyProject } from '../core/project'
import { readAllKeys, readValue, writeInOneTransaction } from '../state/idbTransaction'
import { projectHeadKey, projectMetaKey } from '../state/projectStorageKeys'
import { projectStorageEntries } from '../state/projectStorageRecords'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'
import { migrateLocalV3Projects } from './localV3Projects'

async function fixture() {
  const identity = `v3-batch-${crypto.randomUUID()}`
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = new IDBFactory().open(identity, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('kv')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  const scope: ProjectStorageScope = {
    identity,
    namespace: '',
    store: (mode, callback) =>
      Promise.resolve(callback(database.transaction('kv', mode).objectStore('kv'))),
  }
  const seed = async (id: string, name = id) => {
    const project = createEmptyProject(id, name)
    await writeInOneTransaction(scope.store, {
      puts: [
        ...projectStorageEntries(project, 3),
        [
          projectHeadKey(id, 3),
          { version: 1, token: crypto.randomUUID(), writer: 'old-tab', base: null, sequence: 1 },
        ],
      ],
    })
    return project
  }
  return { scope, seed, close: () => database.close() }
}

test('listing migrates a base without journals and does not repeatedly treat retained controls as edits', async () => {
  const f = await fixture()
  try {
    const source = await f.seed('base-only')
    expect(await migrateLocalV3Projects(f.scope)).toEqual({ changed: [source.id], pending: [] })
    expect(await readValue(f.scope.store, projectMetaKey(source.id, 4))).toMatchObject({
      id: source.id,
      name: source.name,
    })
    expect(await readValue(f.scope.store, projectMetaKey(source.id, 3))).toBeUndefined()
    expect(await migrateLocalV3Projects(f.scope, await readAllKeys(f.scope.store))).toEqual({
      changed: [],
      pending: [],
    })
  } finally {
    f.close()
  }
})

test('one broken base is preserved and listed as pending while another project migrates', async () => {
  const f = await fixture()
  try {
    await f.seed('complete')
    const broken = createEmptyProject('missing-files', 'Origem preservada')
    const meta = projectStorageEntries(broken, 3).find(
      ([key]) => key === projectMetaKey(broken.id, 3),
    )!
    await writeInOneTransaction(f.scope.store, { puts: [meta] })
    const result = await migrateLocalV3Projects(f.scope)
    expect(result.changed).toEqual(['complete'])
    expect(result.pending).toMatchObject([
      { id: broken.id, name: broken.name, migrationPending: true, hasPreservedEdit: true },
    ])
    expect(await readValue(f.scope.store, meta[0])).toEqual(meta[1])
    expect(await readValue(f.scope.store, projectMetaKey(broken.id, 4))).toBeUndefined()
  } finally {
    f.close()
  }
})

test('opening an incomplete requested base propagates failure and leaves unrelated projects untouched', async () => {
  const f = await fixture()
  try {
    await f.seed('unrelated')
    const head = { version: 1, token: 'missing-source', writer: 'old', base: null, sequence: 1 }
    await writeInOneTransaction(f.scope.store, { puts: [[projectHeadKey('missing', 3), head]] })
    await expect(migrateLocalV3Projects(f.scope, undefined, 'missing')).rejects.toThrow()
    expect(await readValue(f.scope.store, projectHeadKey('missing', 3))).toEqual(head)
    expect(await readValue(f.scope.store, projectMetaKey('unrelated', 3))).toBeDefined()
    expect(await readValue(f.scope.store, projectMetaKey('unrelated', 4))).toBeUndefined()
  } finally {
    f.close()
  }
})

test('a returning old tab becomes a recovered copy without changing the current version', async () => {
  const f = await fixture()
  try {
    const original = await f.seed('old-tab', 'Primeira versão')
    await migrateLocalV3Projects(f.scope)
    await f.seed(original.id, 'Edição antiga que voltou')
    const next = await migrateLocalV3Projects(f.scope)
    expect(next.pending).toEqual([])
    expect(next.changed).toHaveLength(1)
    expect(next.changed[0]).not.toBe(original.id)
    expect(await readValue(f.scope.store, projectMetaKey(original.id, 4))).toMatchObject({
      name: original.name,
    })
    expect(await readValue(f.scope.store, projectMetaKey(next.changed[0]!, 4))).toMatchObject({
      name: 'Edição antiga que voltou (edição recuperada)',
    })
  } finally {
    f.close()
  }
})

test('a future base remains pending without being normalized or removed', async () => {
  const f = await fixture()
  try {
    const source = await f.seed('future')
    const key = projectMetaKey(source.id, 3)
    const meta = { ...((await readValue(f.scope.store, key)) as object), formatVersion: 9999 }
    await writeInOneTransaction(f.scope.store, { puts: [[key, meta]] })
    expect((await migrateLocalV3Projects(f.scope)).pending).toMatchObject([
      { id: source.id, migrationPending: true },
    ])
    expect(await readValue(f.scope.store, key)).toEqual(meta)
    expect(await readValue(f.scope.store, projectMetaKey(source.id, 4))).toBeUndefined()
  } finally {
    f.close()
  }
})

test('an unreadable metadata value remains visible as a pending identity', async () => {
  const f = await fixture()
  try {
    await f.seed('invalid-meta')
    const key = projectMetaKey('invalid-meta', 3)
    await writeInOneTransaction(f.scope.store, { puts: [[key, 'unreadable source']] })
    const result = await migrateLocalV3Projects(f.scope)
    expect(result.changed).toEqual([])
    expect(result.pending).toMatchObject([
      { id: 'invalid-meta', name: 'Projeto preservado', migrationPending: true },
    ])
    expect(await readValue(f.scope.store, key)).toBe('unreadable source')
    expect(await readValue(f.scope.store, projectMetaKey('invalid-meta', 4))).toBeUndefined()
  } finally {
    f.close()
  }
})

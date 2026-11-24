import { expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { createEmptyProject } from '../core/project'
import { buildProProject } from '../core/proProject'
import { documentFixture } from '../state/fixtures/projectDocuments'
import { readAllKeys, readValue, readValues, writeInOneTransaction } from '../state/idbTransaction'
import {
  applicationBudgetKey,
  projectApplicationsKey,
  projectFilesKey,
  projectHeadKey,
  projectMetaKey,
  projectMigrationKey,
} from '../state/projectStorageKeys'
import { projectStorageEntries } from '../state/projectStorageRecords'
import type { ProApplicationRecord } from '../state/projectStorageRevision'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'
import { migrateLocalV3Project } from './localV3'

function database(): ProjectStorageScope & { connection: Promise<IDBDatabase> } {
  const identity = `legacy-v3-${crypto.randomUUID()}`
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = new IDBFactory().open(identity, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('kv')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return {
    identity,
    namespace: '',
    connection: opening,
    store: async (mode, callback) =>
      callback((await opening).transaction('kv', mode).objectStore('kv')),
  }
}
const head = {
  version: 1 as const,
  token: 'legacy-base',
  writer: 'old-tab',
  base: null,
  sequence: 7,
}
function source() {
  return Object.assign(createEmptyProject('v3-game', 'Meu jogo antigo'), {
    futureMetadata: { version: 17, retained: ['object-reference', false] },
  })
}
async function seed(scope: ProjectStorageScope, project = source()) {
  await writeInOneTransaction(scope.store, {
    puts: [
      ...projectStorageEntries(project, 3),
      [projectHeadKey(project.id, 3), head],
      [applicationBudgetKey(3), { other: 100 }],
    ],
  })
  return project
}

test('v3 partitions migrate atomically, retaining identity, unknown metadata, head and source backup', async () => {
  const scope = database()
  const original = await seed(scope)
  expect(await migrateLocalV3Project(original.id, scope)).toBe(original.id)
  expect(await readValue(scope.store, projectMetaKey(original.id, 4))).toMatchObject({
    id: original.id,
    storageVersion: 4,
    futureMetadata: original.futureMetadata,
  })
  expect(await readValue(scope.store, projectHeadKey(original.id, 4))).toEqual(head)
  expect(await readValue(scope.store, projectHeadKey(original.id, 3))).toEqual(head)
  expect(await readValue(scope.store, projectMetaKey(original.id, 3))).toBeUndefined()
  const keys = await readAllKeys(scope.store)
  expect(
    keys.filter((key) => typeof key === 'string' && key.startsWith('sz:v4:project-backup:')),
  ).toHaveLength(1)
  expect(await readValue(scope.store, applicationBudgetKey(4))).toEqual({ other: 100 })
})

test('an old tab returning after migration creates a copy and cannot overwrite the current document', async () => {
  const scope = database()
  const original = await seed(scope)
  await migrateLocalV3Project(original.id, scope)
  await seed(scope, {
    ...original,
    name: 'Edição da aba antiga',
    updatedAt: original.updatedAt + 1,
  })
  const recovered = await migrateLocalV3Project(original.id, scope)
  expect(typeof recovered).toBe('string')
  expect(recovered).not.toBe(original.id)
  expect(await readValue(scope.store, projectMetaKey(original.id, 4))).toMatchObject({
    name: original.name,
  })
  expect(await readValue(scope.store, projectMetaKey(recovered!, 4))).toMatchObject({
    name: 'Edição da aba antiga (edição recuperada)',
  })
  expect(await migrateLocalV3Project(original.id, scope)).toBeUndefined()
})

test('a deleted v3 identity becomes a v4 tombstone without removing the legacy head', async () => {
  const scope = database()
  const deleted = { ...head, deleted: true }
  await writeInOneTransaction(scope.store, { puts: [[projectHeadKey('deleted', 3), deleted]] })
  await migrateLocalV3Project('deleted', scope)
  expect(await readValue(scope.store, projectHeadKey('deleted', 4))).toEqual(deleted)
  expect(await readValue(scope.store, projectHeadKey('deleted', 3))).toEqual(deleted)
  expect(await readValue(scope.store, projectMetaKey('deleted', 4))).toBeUndefined()
})

test('a future legacy head is preserved and cannot create a replacement', async () => {
  const scope = database()
  const original = await seed(scope)
  await writeInOneTransaction(scope.store, {
    puts: [[projectHeadKey(original.id, 3), { ...head, version: 2 }]],
  })
  await expect(migrateLocalV3Project(original.id, scope)).rejects.toThrow()
  const [before, target] = await readValues(scope.store, [
    projectMetaKey(original.id, 3),
    projectMetaKey(original.id, 4),
  ])
  expect(before).toMatchObject({ name: original.name })
  expect(target).toBeUndefined()
  expect(await readValue(scope.store, projectMigrationKey(original.id, 4))).toBeUndefined()
})

function application(index: number): ProApplicationRecord {
  const record: ProApplicationRecord = {
    version: 1,
    operationId: `old-operation-${index}`,
    source: 'editor',
    projectId: 'v3-game',
    beforeHash: 'a'.repeat(64),
    afterHash: 'b'.repeat(64),
    createdAt: index + 1,
    bytes: 0,
    inverse: {
      baseHash: 'b'.repeat(64),
      summary: 'Voltar à revisão anterior',
      patches: [{ path: 'main.ts', before: 'b'.repeat(64), content: 'export const score = 0' }],
    },
  }
  record.bytes = new TextEncoder().encode(JSON.stringify(record)).byteLength + 16
  return record
}

test('Pro applications and budgets remain complete, including the history an old tab can still read', async () => {
  const scope = database()
  const original = Object.assign(
    buildProProject(
      'v3-game',
      'Meu jogo Pro',
      {
        'main.ts': { kind: 'file', content: 'export const score = 1' },
      },
      'dev',
      'vanilla-vite',
    ),
    { futureMetadata: source().futureMetadata },
  )
  await seed(scope, original)
  const history = [application(0), application(1)]
  const totals = {
    other: 100,
    [original.id]: history.reduce((sum, record) => sum + record.bytes, 0),
  }
  await writeInOneTransaction(scope.store, {
    puts: [
      [projectApplicationsKey(original.id, 3), history],
      [applicationBudgetKey(3), totals],
    ],
  })
  await migrateLocalV3Project(original.id, scope)
  expect(await readValue(scope.store, projectApplicationsKey(original.id, 4))).toEqual(history)
  expect(await readValue(scope.store, projectApplicationsKey(original.id, 3))).toEqual(history)
  expect(await readValue(scope.store, applicationBudgetKey(4))).toEqual(totals)
  expect(await readValue(scope.store, applicationBudgetKey(3))).toEqual(totals)
})

test('migration never prunes an over-budget application history to manufacture success', async () => {
  const scope = database()
  const original = await seed(scope)
  const history = Array.from({ length: 21 }, (_, index) => application(index))
  await writeInOneTransaction(scope.store, {
    puts: [
      [projectApplicationsKey(original.id, 3), history],
      [
        applicationBudgetKey(3),
        { [original.id]: history.reduce((sum, record) => sum + record.bytes, 0) },
      ],
    ],
  })
  await expect(migrateLocalV3Project(original.id, scope)).rejects.toThrow()
  expect(await readValue(scope.store, projectApplicationsKey(original.id, 3))).toEqual(history)
  expect(await readValue(scope.store, projectMetaKey(original.id, 3))).toMatchObject({
    name: original.name,
  })
  expect(await readValue(scope.store, projectMetaKey(original.id, 4))).toBeUndefined()
})

test('foreign partition identity is rejected before any source is removed', async () => {
  const scope = database()
  const original = await seed(scope)
  await writeInOneTransaction(scope.store, {
    puts: [[projectFilesKey(original.id, 3), { id: 'somebody-else', files: original.files }]],
  })
  await expect(migrateLocalV3Project(original.id, scope)).rejects.toThrow()
  expect(await readValue(scope.store, projectFilesKey(original.id, 3))).toMatchObject({
    id: 'somebody-else',
  })
  expect(await readValue(scope.store, projectMetaKey(original.id, 4))).toBeUndefined()
})

test('a legacy write ordered before the promotion invalidates the captured snapshot and is retained', async () => {
  const scope = database()
  const original = await seed(scope)
  const metadata = await readValue(scope.store, projectMetaKey(original.id, 3))
  let injected = false
  const connection = await scope.connection
  const transaction = connection.transaction.bind(connection)
  connection.transaction = (...args: Parameters<IDBDatabase['transaction']>) => {
    const tx = transaction(...args)
    if (args[1] === 'readwrite' && !injected) {
      injected = true
      const store = tx.objectStore('kv')
      store.put(
        { ...(metadata as object), name: 'Mudou na aba antiga' },
        projectMetaKey(original.id, 3),
      )
      store.put({ ...head, token: 'next-legacy-head', sequence: 8 }, projectHeadKey(original.id, 3))
    }
    return tx
  }
  expect(await migrateLocalV3Project(original.id, scope)).toBe(original.id)
  expect(injected).toBe(true)
  expect(await readValue(scope.store, projectMetaKey(original.id, 4))).toMatchObject({
    name: 'Mudou na aba antiga',
  })
  expect(await readValue(scope.store, projectHeadKey(original.id, 4))).toMatchObject({
    token: 'next-legacy-head',
    sequence: 8,
  })
})

test('quota on the second promoted put leaves no partial backup or document and preserves the complete source', async () => {
  const scope = database()
  const original = await seed(scope)
  const connection = await scope.connection
  const transaction = connection.transaction.bind(connection)
  let injected = false
  connection.transaction = (...args: Parameters<IDBDatabase['transaction']>) => {
    const tx = transaction(...args)
    if (args[1] === 'readwrite') {
      let writes = 0
      const store = tx.objectStore('kv')
      const put = store.put.bind(store)
      Object.defineProperty(store, 'put', {
        value: (value: unknown, key?: IDBValidKey) => {
          if (typeof key === 'string' && key.startsWith('sz:v4:') && ++writes === 2) {
            injected = true
            throw new DOMException('Injected native quota', 'QuotaExceededError')
          }
          return put(value, key)
        },
      })
    }
    return tx
  }
  await expect(migrateLocalV3Project(original.id, scope)).rejects.toThrow()
  expect(injected).toBe(true)
  expect(await readValue(scope.store, projectMetaKey(original.id, 3))).toMatchObject({
    name: original.name,
  })
  expect(await readValue(scope.store, projectHeadKey(original.id, 3))).toEqual(head)
  expect(
    (await readAllKeys(scope.store)).filter(
      (key) => typeof key === 'string' && key.startsWith('sz:v4:'),
    ),
  ).toEqual([])
})

test('Python documents retain their portable version, files, runtime selection and dependency lock', async () => {
  const scope = database()
  const original = {
    ...documentFixture('python', 'classic'),
    assets: [],
    coverAssetName: undefined,
  }
  if (original.programmingLanguage !== 'python' || original.kind !== 'classic')
    throw new Error('Wrong fixture')
  await writeInOneTransaction(scope.store, {
    puts: [...projectStorageEntries(original, 3), [projectHeadKey(original.id, 3), head]],
  })
  await migrateLocalV3Project(original.id, scope)
  expect(await readValue(scope.store, projectMetaKey(original.id, 4))).toMatchObject({
    formatVersion: 3,
    programmingLanguage: 'python',
    kind: 'classic',
    runtime: original.runtime,
    storageVersion: 4,
  })
  expect(await readValue(scope.store, projectFilesKey(original.id, 4))).toMatchObject({
    files: original.files,
    python: original.python,
  })
})

test('project identity constructor does not read an inherited profile-budget entry', async () => {
  const scope = database()
  const original = await seed(scope, { ...source(), id: 'constructor' })
  expect(await migrateLocalV3Project(original.id, scope)).toBe(original.id)
  expect(await readValue(scope.store, projectMetaKey(original.id, 4))).toMatchObject({
    id: original.id,
  })
})

test('a future destination and both of its sources stay intact', async () => {
  const scope = database()
  const original = await seed(scope)
  await readValue(scope.store, projectMetaKey(original.id, 4))
  const future = {
    id: original.id,
    name: 'Cliente futuro',
    storageVersion: 5,
    futureField: { keep: true },
  }
  await writeInOneTransaction(scope.store, { puts: [[projectMetaKey(original.id, 4), future]] })
  await expect(migrateLocalV3Project(original.id, scope)).rejects.toThrow()
  expect(await readValue(scope.store, projectMetaKey(original.id, 4))).toEqual(future)
  expect(await readValue(scope.store, projectMetaKey(original.id, 3))).toMatchObject({
    name: original.name,
  })
})

test('conflicting fields across source partitions are not silently resolved by spread order', async () => {
  const scope = database()
  const original = await seed(scope)
  await writeInOneTransaction(scope.store, {
    puts: [
      [
        projectFilesKey(original.id, 3),
        {
          id: original.id,
          files: original.files,
          name: 'Outro nome na partição',
        },
      ],
    ],
  })
  await expect(migrateLocalV3Project(original.id, scope)).rejects.toThrow()
  expect(await readValue(scope.store, projectMetaKey(original.id, 3))).toMatchObject({
    name: original.name,
  })
  expect(await readValue(scope.store, projectFilesKey(original.id, 3))).toMatchObject({
    name: 'Outro nome na partição',
  })
  expect(await readValue(scope.store, projectMetaKey(original.id, 4))).toBeUndefined()
})

test('a live legacy head without partitions cannot silently fall through to older formats', async () => {
  const scope = database()
  const id = 'missing-source-parts'
  await writeInOneTransaction(scope.store, { puts: [[projectHeadKey(id, 3), head]] })
  await expect(migrateLocalV3Project(id, scope)).rejects.toMatchObject({
    code: 'migration-pending',
  })
  expect(await readValue(scope.store, projectHeadKey(id, 3))).toEqual(head)
  expect(await readValue(scope.store, projectMetaKey(id, 4))).toBeUndefined()
  expect(await readValue(scope.store, projectHeadKey(id, 4))).toBeUndefined()
})

test('a previously promoted legacy head remains a harmless no-op after its partitions retire', async () => {
  const scope = database()
  const original = await seed(scope)
  await migrateLocalV3Project(original.id, scope)
  const before = await readAllKeys(scope.store)
  expect(await migrateLocalV3Project(original.id, scope)).toBeUndefined()
  expect(await readAllKeys(scope.store)).toEqual(before)
  expect(await readValue(scope.store, projectHeadKey(original.id, 4))).toEqual(head)
})

for (const partition of ['history', 'thumbnail', 'marker'] as const)
  test(`orphaned legacy ${partition} is preserved instead of permitting an older fallback`, async () => {
    const scope = database()
    const id = 'legacy-orphan'
    const key =
      partition === 'history'
        ? projectApplicationsKey(id, 3)
        : partition === 'marker'
          ? projectMigrationKey(id, 3)
          : `sz:v3:project-thumb:${id}`
    const value = { id, evidence: 'preserve this source' }
    await writeInOneTransaction(scope.store, { puts: [[key, value]] })
    await expect(migrateLocalV3Project(id, scope)).rejects.toMatchObject({
      code: 'migration-pending',
    })
    expect(await readValue(scope.store, key)).toEqual(value)
    expect((await readAllKeys(scope.store)).some((key) => String(key).startsWith('sz:v4:'))).toBe(
      false,
    )
  })

import { expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { createEmptyProject } from '../core/project'
import { encodeExitJournal } from '../state/exitJournalCodec'
import { readValue, writeInOneTransaction } from '../state/idbTransaction'
import type { RecoveryWrite } from '../state/projectStorageCoordinator'
import { projectMetaKey, projectRecoveryKey } from '../state/projectStorageKeys'
import { projectStorageEntries } from '../state/projectStorageRecords'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'
import { archiveLocalV3Recovery, prepareLocalV3Recovery } from './localV3Recovery'

async function fixture() {
  const identity = `legacy-recovery-${crypto.randomUUID()}`
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = new IDBFactory().open(identity, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('kv')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  const scope: ProjectStorageScope = {
    identity,
    namespace: '',
    store: async (mode, callback) => callback(database.transaction('kv', mode).objectStore('kv')),
  }
  const project = createEmptyProject('legacy-project', 'Legado')
  const value = {
    version: 1,
    projectId: project.id,
    head: { version: 1, writer: 'writer', token: 'token', base: null, sequence: 1 },
    applications: [],
    write: { puts: projectStorageEntries(project, 3) },
    replacesRecovery: [{ key: projectRecoveryKey(project.id, 'parent', 3), token: 'parent-token' }],
  } satisfies RecoveryWrite
  const entry = {
    key: 'immutable-exit-key',
    projectId: project.id,
    writer: 'writer',
    token: 'token',
    value,
    encoded: encodeExitJournal(value),
  }
  return { scope, project, entry, database, close: () => database.close() }
}

test('legacy projection keeps revision identity and ancestry while changing only local partition keys', async () => {
  const f = await fixture()
  try {
    const prepared = await prepareLocalV3Recovery(f.entry)
    expect(prepared.projected.head).toEqual(f.entry.value.head)
    expect(prepared.projected.replacesRecovery).toEqual([
      { key: projectRecoveryKey(f.project.id, 'parent', 4), token: 'parent-token' },
    ])
    expect(
      prepared.projected.write.puts?.find(([key]) => key === projectMetaKey(f.project.id, 4))?.[1],
    ).toMatchObject({ storageVersion: 4, id: f.project.id })
    expect(f.entry.value.write.puts[0]?.[1]).toMatchObject({ storageVersion: 3 })
    expect(prepared.archive.encoded).toBe(f.entry.encoded)
    expect(prepared.archive).not.toHaveProperty('originalExitEncoded')
  } finally {
    f.close()
  }
})

test('legacy archive is idempotent, preserves the native source and blocks token reuse with different content', async () => {
  const f = await fixture()
  try {
    const key = projectRecoveryKey(f.project.id, f.entry.writer, 3)
    await writeInOneTransaction(f.scope.store, { puts: [[key, f.entry.value]] })
    const first = await prepareLocalV3Recovery(f.entry)
    await archiveLocalV3Recovery(f.scope, first, true)
    await archiveLocalV3Recovery(f.scope, first, true)
    expect(await readValue(f.scope.store, key)).toEqual(f.entry.value)
    expect(await readValue(f.scope.store, first.backupKey)).toEqual(first.archive)
    const changed = structuredClone(f.entry.value)
    const meta = changed.write.puts.find(([key]) => key === projectMetaKey(f.project.id, 3))!
    meta[1] = { ...(meta[1] as object), name: 'Outro conteúdo' }
    const second = await prepareLocalV3Recovery({
      ...f.entry,
      value: changed,
      encoded: encodeExitJournal(changed),
    })
    expect(second.backupKey).toBe(first.backupKey)
    await expect(archiveLocalV3Recovery(f.scope, second)).rejects.toThrow('outro conteúdo')
    expect(await readValue(f.scope.store, first.backupKey)).toEqual(first.archive)
    expect(await readValue(f.scope.store, key)).toEqual(f.entry.value)
  } finally {
    f.close()
  }
})

test('projection captures unknown legacy metadata without aliasing the mutable source', async () => {
  const f = await fixture()
  try {
    const meta = f.entry.value.write.puts.find(([key]) => key === projectMetaKey(f.project.id, 3))!
    const extra = { optional: undefined, zero: -0, labels: ['retained'] }
    meta[1] = { ...(meta[1] as object), formatVersion: 2, futureTool: extra }
    const encoded = encodeExitJournal(f.entry.value)
    const preparing = prepareLocalV3Recovery({ ...f.entry, encoded })
    extra.labels[0] = 'changed after capture'
    const prepared = await preparing
    const captured = prepared.projected.write.puts!.find(
      ([key]) => key === projectMetaKey(f.project.id, 4),
    )![1]
    expect(captured).toMatchObject({
      futureTool: { optional: undefined, zero: -0, labels: ['retained'] },
    })
    expect(prepared.archive.encoded).toBe(encoded)
    expect(prepared.original.write.puts![0]![1]).toMatchObject({ storageVersion: 3 })
  } finally {
    f.close()
  }
})

test('a changed native source cannot be archived as if the captured revision were still current', async () => {
  const f = await fixture()
  try {
    const prepared = await prepareLocalV3Recovery(f.entry)
    const replacement = { ...f.entry.value, head: { ...f.entry.value.head, token: 'newer' } }
    const key = projectRecoveryKey(f.project.id, f.entry.writer, 3)
    await writeInOneTransaction(f.scope.store, { puts: [[key, replacement]] })
    await expect(archiveLocalV3Recovery(f.scope, prepared, true)).rejects.toThrow('mudou')
    expect(await readValue(f.scope.store, prepared.backupKey)).toBeUndefined()
    expect(await readValue(f.scope.store, key)).toEqual(replacement)
  } finally {
    f.close()
  }
})

test('future controls and foreign partition identities remain unmigrated', async () => {
  const f = await fixture()
  try {
    await expect(
      prepareLocalV3Recovery({ ...f.entry, value: { ...f.entry.value, futureControl: true } }),
    ).rejects.toThrow()
    const changed = structuredClone(f.entry.value)
    changed.write.puts[1]![1] = { id: 'foreign', files: f.project.files }
    await expect(prepareLocalV3Recovery({ ...f.entry, value: changed })).rejects.toThrow(
      'outro projeto',
    )
  } finally {
    f.close()
  }
})

test('archive quota failure preserves the source and leaves no partial receipt', async () => {
  const f = await fixture()
  try {
    const prepared = await prepareLocalV3Recovery(f.entry)
    const key = projectRecoveryKey(f.project.id, f.entry.writer, 3)
    await writeInOneTransaction(f.scope.store, { puts: [[key, f.entry.value]] })
    const transaction = f.database.transaction.bind(f.database)
    let injected = false
    f.database.transaction = ((...args: Parameters<IDBDatabase['transaction']>) => {
      const current = transaction(...args)
      if (args[1] === 'readwrite') {
        const objectStore = current.objectStore.bind(current)
        current.objectStore = ((name: string) => {
          const store = objectStore(name)
          const put = store.put.bind(store)
          store.put = ((value: unknown, target?: IDBValidKey) => {
            if (target === prepared.backupKey) {
              injected = true
              throw new DOMException('Quota de arquivo', 'QuotaExceededError')
            }
            return put(value, target)
          }) as typeof store.put
          return store
        }) as typeof current.objectStore
      }
      return current
    }) as typeof f.database.transaction
    await expect(archiveLocalV3Recovery(f.scope, prepared, true)).rejects.toThrow('Quota')
    expect(injected).toBe(true)
    expect(await readValue(f.scope.store, prepared.backupKey)).toBeUndefined()
    expect(await readValue(f.scope.store, key)).toEqual(f.entry.value)
  } finally {
    f.close()
  }
})

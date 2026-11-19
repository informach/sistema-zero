import { expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { buildProProject } from '../core/proProject'
import { readAllKeys, readValue, writeInOneTransaction } from './idbTransaction'
import {
  bindProjectToDurableHead,
  coordinatedProjectWrite,
  projectExitRecoveryStatus,
  recoverProjectWrites,
  stageProjectExit,
} from './projectStorageCoordinator'
import {
  PROJECT_META_KEY_PREFIX,
  projectApplicationsKey,
  projectFilesKey,
  projectMigrationKey,
  projectMetaKey,
  projectRecoveryKey,
} from './projectStorageKeys'
import { projectStorageEntries } from './projectStorageRecords'
import {
  advanceLocalRevision,
  copyLocalRevision,
  type ProApplicationRecord,
  readLocalRevision,
} from './projectStorageRevision'
import type { ProjectStorageScope } from './projectStorageRuntime'
import { readSynchronousExitJournal, stageSynchronousExitJournal } from './synchronousExitJournal'

async function fixture() {
  const identity = `sync-recovery-${crypto.randomUUID()}`
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = new IDBFactory().open(identity, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('kv')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  const scope: ProjectStorageScope = {
    identity,
    namespace: '',
    exitJournalStorage: globalThis.localStorage,
    store: (mode, callback) =>
      Promise.resolve(database).then((db) =>
        callback(db.transaction('kv', mode).objectStore('kv')),
      ),
  }
  const failed: ProjectStorageScope = {
    ...scope,
    store: (mode, callback) =>
      scope.store(mode, (store) => {
        store.transaction.abort() // Real native-like failure, not a successful mock write.
        return callback(store)
      }),
  }
  const project = buildProProject(
    'journal-project',
    'Journal',
    { 'main.ts': { kind: 'file', content: 'initial' } },
    'dev',
    'vanilla-vite',
  )
  await coordinatedProjectWrite(project, { puts: projectStorageEntries(project) }, scope)
  const edit = (content: string) =>
    advanceLocalRevision(project, {
      ...project,
      tree: { 'main.ts': { kind: 'file' as const, content } },
    })
  return {
    database,
    scope,
    failed,
    project,
    edit,
    close() {
      database.close()
      for (const key of Object.keys(localStorage))
        if (key.startsWith('sz:studio-exit:') && key.split('|')[1] === encodeURIComponent(identity))
          localStorage.removeItem(key)
    },
  }
}

test('a synchronous journal restores the latest full revision when the native exit transaction aborts', async () => {
  const f = await fixture()
  try {
    const draft = f.edit('latest')
    await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    expect(projectExitRecoveryStatus(draft).recoverable).toBe(true)
    const revision = readLocalRevision(draft)!
    expect(
      await readValue(f.scope.store, projectRecoveryKey(draft.id, revision.lineage.writer)),
    ).toBeUndefined()
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toHaveLength(1)
    expect(await recoverProjectWrites(f.scope, draft.id)).toContain(draft.id)
    expect(await readValue(f.scope.store, projectFilesKey(draft.id))).toMatchObject({
      tree: { 'main.ts': { content: 'latest' } },
    })
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toEqual([])
  } finally {
    f.close()
  }
})

test('a reused token with different native and synchronous payloads preserves both pending copies', async () => {
  const f = await fixture()
  try {
    const draft = f.edit('synchronous original')
    await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    const entry = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const native = structuredClone(entry.value) as { write: { puts: [string, unknown][] } }
    const file = native.write.puts.find(([key]) => key === projectFilesKey(draft.id))!
    file[1] = {
      ...(file[1] as object),
      tree: { 'main.ts': { kind: 'file', content: 'native replacement' } },
    }
    const key = projectRecoveryKey(draft.id, entry.writer)
    await writeInOneTransaction(f.scope.store, { puts: [[key, native]] })
    await expect(recoverProjectWrites(f.scope, draft.id)).rejects.toThrow('mesma revisão')
    expect(await readValue(f.scope.store, projectFilesKey(draft.id))).toMatchObject({
      tree: { 'main.ts': { content: 'initial' } },
    })
    expect(await readValue(f.scope.store, key)).toEqual(native)
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toEqual([
      entry,
    ])
  } finally {
    f.close()
  }
})

test('same-sequence competing snapshots are both preserved without choosing a later enumeration winner', async () => {
  const f = await fixture()
  try {
    const one = f.edit('first branch'),
      two = f.edit('other branch')
    await stageProjectExit(one, { puts: projectStorageEntries(one) }, f.failed)
    await stageProjectExit(two, { puts: projectStorageEntries(two) }, f.failed)
    await recoverProjectWrites(f.scope, one.id)
    expect(await readValue(f.scope.store, projectFilesKey(one.id))).toMatchObject({
      tree: { 'main.ts': { content: 'initial' } },
    })
    const copies = (await readAllKeys(f.scope.store)).filter(
      (key): key is string =>
        typeof key === 'string' &&
        key.startsWith(PROJECT_META_KEY_PREFIX) &&
        key !== PROJECT_META_KEY_PREFIX + one.id,
    )
    expect(copies).toHaveLength(2)
    for (const key of copies) {
      const archive = await readValue(
        f.scope.store,
        projectMigrationKey(key.slice(PROJECT_META_KEY_PREFIX.length)),
      )
      expect(archive).toMatchObject({ exitRecovery: { version: 1, projectId: one.id } })
    }
    const values = await Promise.all(
      copies.map((key) =>
        readValue(f.scope.store, projectFilesKey(key.slice(PROJECT_META_KEY_PREFIX.length))),
      ),
    )
    expect(values).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tree: { 'main.ts': { kind: 'file', content: 'first branch' } } }),
        expect.objectContaining({ tree: { 'main.ts': { kind: 'file', content: 'other branch' } } }),
      ]),
    )
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toEqual([])
  } finally {
    f.close()
  }
})

test('a confirmed save retires a byte-equivalent exit copy without creating a recovered project', async () => {
  const f = await fixture()
  try {
    const draft = f.edit('saved after returning to the tab')
    const snapshot = copyLocalRevision(draft, { ...draft })
    await stageProjectExit(snapshot, { puts: projectStorageEntries(snapshot) }, f.scope)
    await coordinatedProjectWrite(draft, { puts: projectStorageEntries(draft) }, f.scope)
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toEqual([])
    expect(await recoverProjectWrites(f.scope, draft.id)).toEqual([])
    expect(
      (await readAllKeys(f.scope.store)).filter(
        (key) => typeof key === 'string' && key.startsWith(PROJECT_META_KEY_PREFIX),
      ),
    ).toHaveLength(1)
  } finally {
    f.close()
  }
})

test('quota failure does not claim an exit copy and still requests the native journal', async () => {
  const f = await fixture()
  try {
    const storage = f.scope.exitJournalStorage!
    const denied = new Proxy(storage, {
      get(target, key) {
        if (key === 'setItem')
          return () => {
            throw new DOMException('Full', 'QuotaExceededError')
          }
        const value = Reflect.get(target, key)
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
    const scope = { ...f.scope, exitJournalStorage: denied }
    const draft = f.edit('native copy survives')
    await expect(
      stageProjectExit(draft, { puts: projectStorageEntries(draft) }, scope),
    ).rejects.toThrow()
    expect(projectExitRecoveryStatus(draft).recoverable).toBe(false)
    const revision = readLocalRevision(draft)!
    expect(
      await readValue(f.scope.store, projectRecoveryKey(draft.id, revision.lineage.writer)),
    ).toBeDefined()
    await recoverProjectWrites(f.scope, draft.id)
    expect(await readValue(f.scope.store, projectFilesKey(draft.id))).toMatchObject({
      tree: { 'main.ts': { content: 'native copy survives' } },
    })
  } finally {
    f.close()
  }
})

test('a native revision replaced before the conditional write stays pending without a stale overwrite', async () => {
  const f = await fixture()
  try {
    const draft = f.edit('older pending')
    await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    const entry = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const original = structuredClone(entry.value) as {
      head: { token: string; sequence: number }
      write: { puts: [string, unknown][] }
    }
    const replacement = structuredClone(original)
    replacement.head.token = 'newer-native-token'
    replacement.head.sequence++
    const files = replacement.write.puts.find(([key]) => key === projectFilesKey(draft.id))!
    files[1] = {
      ...(files[1] as object),
      tree: { 'main.ts': { kind: 'file', content: 'newer pending' } },
    }
    const key = projectRecoveryKey(draft.id, entry.writer)
    await writeInOneTransaction(f.scope.store, { puts: [[key, original]] })
    const transaction = f.database.transaction.bind(f.database)
    let injected = false
    f.database.transaction = ((...args: Parameters<IDBDatabase['transaction']>) => {
      if (!injected && args[1] === 'readwrite') {
        injected = true
        transaction('kv', 'readwrite').objectStore('kv').put(replacement, key)
      }
      return transaction(...args)
    }) as IDBDatabase['transaction']
    await recoverProjectWrites({ ...f.scope, exitJournalStorage: undefined }, draft.id)
    expect(injected).toBe(true)
    expect(await readValue(f.scope.store, key)).toEqual(replacement)
    expect(await readValue(f.scope.store, projectFilesKey(draft.id))).toMatchObject({
      tree: { 'main.ts': { content: 'initial' } },
    })
    await recoverProjectWrites({ ...f.scope, exitJournalStorage: undefined }, draft.id)
    expect(await readValue(f.scope.store, projectFilesKey(draft.id))).toMatchObject({
      tree: { 'main.ts': { content: 'newer pending' } },
    })
    expect(await readValue(f.scope.store, key)).toBeUndefined()
  } finally {
    f.close()
  }
})

test('a reused native token cannot acknowledge different content through an existing recovered copy', async () => {
  const f = await fixture()
  try {
    const draft = f.edit('copied original')
    await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    const entry = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const source = structuredClone(entry.value) as { write: { puts: [string, unknown][] } }
    const winner = { ...f.project, name: 'Another writer' }
    await bindProjectToDurableHead(winner, f.scope)
    await coordinatedProjectWrite(winner, { puts: projectStorageEntries(winner) }, f.scope)
    const key = projectRecoveryKey(draft.id, entry.writer)
    await writeInOneTransaction(f.scope.store, { puts: [[key, source]] })
    const scope = { ...f.scope, exitJournalStorage: undefined }
    const copies = await recoverProjectWrites(scope, draft.id)
    expect(copies).toHaveLength(1)
    const copyId = copies[0]!
    expect(copyId).not.toBe(draft.id)
    const changed = structuredClone(source)
    const files = changed.write.puts.find(([key]) => key === projectFilesKey(draft.id))!
    files[1] = {
      ...(files[1] as object),
      tree: { 'main.ts': { kind: 'file', content: 'reused token, new content' } },
    }
    await writeInOneTransaction(f.scope.store, { puts: [[key, changed]] })
    expect(await recoverProjectWrites(scope, draft.id)).toEqual([])
    expect(await readValue(f.scope.store, key)).toEqual(changed)
    expect(await readValue(f.scope.store, projectFilesKey(copyId))).toMatchObject({
      tree: { 'main.ts': { content: 'copied original' } },
    })
  } finally {
    f.close()
  }
})

test('a future document in a native journal cannot replace a readable committed project', async () => {
  const f = await fixture()
  try {
    const draft = f.edit('future document')
    await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    const entry = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const native = structuredClone(entry.value) as { write: { puts: [string, unknown][] } }
    const meta = native.write.puts.find(([key]) => key === projectMetaKey(draft.id))!
    meta[1] = { ...(meta[1] as object), formatVersion: 9999 }
    const key = projectRecoveryKey(draft.id, entry.writer)
    await writeInOneTransaction(f.scope.store, { puts: [[key, native]] })
    await recoverProjectWrites({ ...f.scope, exitJournalStorage: undefined }, draft.id)
    expect(await readValue(f.scope.store, projectFilesKey(draft.id))).toMatchObject({
      tree: { 'main.ts': { content: 'initial' } },
    })
    expect(await readValue(f.scope.store, key)).toEqual(native)
  } finally {
    f.close()
  }
})

test('foreign partitions in a native journal cannot overwrite another project', async () => {
  const f = await fixture()
  try {
    const draft = f.edit('native draft')
    await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    const entry = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const native = structuredClone(entry.value) as { write: { puts: [string, unknown][] } }
    native.write.puts.push([projectFilesKey('other-project'), { files: { 'main.ts': 'foreign' } }])
    const key = projectRecoveryKey(draft.id, entry.writer)
    await writeInOneTransaction(f.scope.store, { puts: [[key, native]] })
    await recoverProjectWrites({ ...f.scope, exitJournalStorage: undefined }, draft.id)
    expect(await readValue(f.scope.store, projectFilesKey('other-project'))).toBeUndefined()
    expect(await readValue(f.scope.store, projectFilesKey(draft.id))).toMatchObject({
      tree: { 'main.ts': { content: 'initial' } },
    })
    expect(await readValue(f.scope.store, key)).toEqual(native)
  } finally {
    f.close()
  }
})

test('an incompatible native descendant cannot suppress a valid pending revision', async () => {
  const f = await fixture()
  try {
    const draft = f.edit('valid pending revision')
    await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    const entry = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const key = projectRecoveryKey(draft.id, entry.writer)
    const source = structuredClone(entry.value) as {
      head: { writer: string; token: string }
      write: { puts: [string, unknown][] }
    }
    const invalid = {
      ...source,
      head: { ...source.head, writer: 'incompatible', token: 'incompatible' },
      replacesRecovery: [{ key, token: entry.token }],
      write: { puts: [...source.write.puts, [projectFilesKey('foreign'), {}]] },
    }
    const invalidKey = projectRecoveryKey(draft.id, invalid.head.writer)
    await writeInOneTransaction(f.scope.store, {
      puts: [
        [key, source],
        [invalidKey, invalid],
      ],
    })
    await recoverProjectWrites({ ...f.scope, exitJournalStorage: undefined }, draft.id)
    expect(await readValue(f.scope.store, projectFilesKey(draft.id))).toMatchObject({
      tree: { 'main.ts': { content: 'valid pending revision' } },
    })
    expect(await readValue(f.scope.store, key)).toBeUndefined()
    expect(await readValue(f.scope.store, invalidKey)).toEqual(invalid)
    expect(await readValue(f.scope.store, projectFilesKey('foreign'))).toBeUndefined()
  } finally {
    f.close()
  }
})

test('foreign partitions in a recovery copy cannot overwrite another project', async () => {
  const f = await fixture()
  try {
    const identity = { projectId: f.project.id, writer: 'writer', token: 'foreign' }
    const payload = {
      version: 1,
      projectId: f.project.id,
      head: { version: 1, writer: 'writer', token: 'foreign', base: null, sequence: 1 },
      applications: [],
      write: { puts: [[projectFilesKey('other-project'), { files: {} }]] },
    }
    stageSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity, identity, payload)
    await expect(recoverProjectWrites(f.scope, f.project.id)).rejects.toThrow()
    expect(await readValue(f.scope.store, projectFilesKey('other-project'))).toBeUndefined()
    expect(await readValue(f.scope.store, projectFilesKey(f.project.id))).toMatchObject({
      tree: { 'main.ts': { content: 'initial' } },
    })
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toHaveLength(1)
  } finally {
    f.close()
  }
})

for (const conflict of ['duplicate-put', 'put-and-delete'] as const) {
  test(`ambiguous journal partitions are preserved without applying: ${conflict}`, async () => {
    const f = await fixture()
    try {
      const draft = f.edit('must not silently win')
      await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
      const [entry] = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)
      const payload = entry!.value as {
        head: { token: string }
        write: { puts: Array<[string, unknown]>; deletes?: string[] }
      }
      f.scope.exitJournalStorage!.removeItem(entry!.key)
      const pair = payload.write.puts[0]!
      if (conflict === 'duplicate-put') payload.write.puts.push(pair)
      else payload.write.deletes = [pair[0]]
      stageSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity, entry!, payload)
      await expect(recoverProjectWrites(f.scope, draft.id)).rejects.toThrow()
      expect(await readValue(f.scope.store, projectFilesKey(draft.id))).toMatchObject({
        tree: { 'main.ts': { content: 'initial' } },
      })
      expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toHaveLength(
        1,
      )
    } finally {
      f.close()
    }
  })
}

test('a colliding application identity preserves the full inverse and unknown fields as a recovery copy', async () => {
  const f = await fixture()
  try {
    const draft = f.edit('pending collision')
    const record: ProApplicationRecord & { futureField: unknown } = {
      version: 1,
      operationId: 'same-operation',
      source: 'editor',
      projectId: draft.id,
      beforeHash: 'a'.repeat(64),
      afterHash: 'b'.repeat(64),
      createdAt: 1,
      bytes: 512,
      inverse: {
        baseHash: 'b'.repeat(64),
        summary: 'Undo',
        patches: [{ path: 'main.ts', before: 'c'.repeat(64), content: 'original inverse' }],
      },
      futureField: { preserve: undefined, data: ['original'] },
    }
    const revision = readLocalRevision(draft)!
    revision.lineage.pending.set(record.operationId, { sequence: revision.sequence, record })
    await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    const saved = { ...record, futureField: { data: ['other revision'] } }
    await writeInOneTransaction(f.scope.store, {
      puts: [[projectApplicationsKey(draft.id), [saved]]],
    })
    const recovered = await recoverProjectWrites(f.scope, draft.id)
    expect(recovered).toHaveLength(1)
    expect(recovered[0]).not.toBe(draft.id)
    expect(await readValue(f.scope.store, projectMigrationKey(recovered[0]!))).toMatchObject({
      exitRecovery: { applications: [record] },
    })
    expect(await readValue(f.scope.store, projectApplicationsKey(draft.id))).toEqual([saved])
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toHaveLength(0)
  } finally {
    f.close()
  }
})

test('inaccessible exit copies block recovery without acknowledging or modifying the committed revision', async () => {
  const f = await fixture()
  try {
    const draft = f.edit('newer inaccessible revision')
    await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    const denied = new Proxy(f.scope.exitJournalStorage!, {
      ownKeys() {
        throw new DOMException('Denied', 'SecurityError')
      },
    })
    await expect(
      recoverProjectWrites({ ...f.scope, exitJournalStorage: denied }, draft.id),
    ).rejects.toThrow('guardar a cópia de recuperação')
    expect(await readValue(f.scope.store, projectFilesKey(draft.id))).toMatchObject({
      tree: { 'main.ts': { content: 'initial' } },
    })
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toHaveLength(1)
  } finally {
    f.close()
  }
})

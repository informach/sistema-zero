import { expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import type { Project } from '../core/project'
import { buildProProject } from '../core/proProject'
import { localSnapshotsEqual } from '../project-migrations/localTransaction'
import { migrateLocalV3Project } from '../project-migrations/localV3'
import { prepareLocalV3Recovery, stageLocalV3Recovery } from '../project-migrations/localV3Recovery'
import { recoverLocalV3ProjectWrites } from '../project-migrations/localV3RecoveryReplay'
import { EXIT_JOURNAL_MAX_CHARS, encodeExitJournal } from './exitJournalCodec'
import { decodeExitJournal, decodeRecoverySnapshot } from './exitJournalDecode'
import { readAllKeys, readValue, writeInOneTransaction } from './idbTransaction'
import {
  bindProjectToDurableHead,
  coordinatedProjectWrite,
  loadRecoverableProjectDraft,
  projectExitRecoveryStatus,
  type RecoveryWrite,
  recoverProjectWrites,
  stageProjectExit,
} from './projectStorageCoordinator'
import {
  applicationBudgetKey,
  PROJECT_META_KEY_PREFIX,
  projectApplicationsKey,
  projectFilesKey,
  projectHeadKey,
  projectMetaKey,
  projectMigrationKey,
  projectRecoveryKey,
} from './projectStorageKeys'
import { projectStorageEntries } from './projectStorageRecords'
import {
  advanceLocalRevision,
  copyLocalRevision,
  installLocalRevision,
  localHead,
  type ProApplicationRecord,
  readLocalRevision,
} from './projectStorageRevision'
import type { ProjectStorageScope } from './projectStorageRuntime'
import { recoverSynchronousProjectWrites } from './projectSynchronousExitRecovery'
import {
  acknowledgeSynchronousExitJournal,
  stageSynchronousExitJournal,
} from './synchronousExitJournal'
import { readSynchronousExitJournal } from './synchronousExitJournalRead'

async function fixture(version: 3 | 4 = 4) {
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
  if (version === 3) {
    const head = {
      version: 1 as const,
      token: crypto.randomUUID(),
      writer: 'legacy-base',
      base: null,
      sequence: 0,
    }
    await writeInOneTransaction(scope.store, {
      puts: [...projectStorageEntries(project, 3), [projectHeadKey(project.id, 3), head]],
    })
    installLocalRevision(project, scope.identity, head)
  } else await coordinatedProjectWrite(project, { puts: projectStorageEntries(project) }, scope)
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

/** Explicit historical wire fixture: never uses the current namespace to simulate an old client. */
async function stageLegacyExit(project: Project, _write: unknown, scope: ProjectStorageScope) {
  const revision = readLocalRevision(project)!
  const head = localHead(revision)
  const incoming: RecoveryWrite = {
    version: 1,
    projectId: project.id,
    head,
    write: { puts: projectStorageEntries(project, 3) },
    applications: [...revision.lineage.pending.values()]
      .filter((entry) => entry.sequence <= revision.sequence)
      .map((entry) => entry.record),
    incompleteBlocks: false,
  }
  stageSynchronousExitJournal(
    scope.exitJournalStorage,
    scope.identity,
    { projectId: project.id, writer: head.writer, token: head.token },
    incoming,
  )
  try {
    await writeInOneTransaction(scope.store, {
      puts: [[projectRecoveryKey(project.id, head.writer, 3), incoming]],
    })
  } catch {
    // An aborted native write is covered by the synchronous copy, like the historical client.
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

for (const mode of ['native', 'synchronous-only', 'confirmed-save'] as const)
  test(`a confirmed descendant retires its exact synchronous ancestor: ${mode}`, async () => {
    const f = await fixture()
    try {
      const parent = Object.assign(f.edit('pending parent'), {
        futureMetadata: { retained: 'source revision', disabled: false },
      })
      await stageProjectExit(parent, { puts: projectStorageEntries(parent) }, f.scope)
      const parentEntry = readSynchronousExitJournal(
        f.scope.exitJournalStorage,
        f.scope.identity,
      )[0]!
      // The editor fallback is available when promotion was interrupted but its journal survived.
      const recovered = await loadRecoverableProjectDraft(f.scope, parent.id)
      if (!recovered) throw new Error('Missing preserved draft')
      const child = advanceLocalRevision(recovered, { ...recovered, name: 'Latest descendant' })
      await stageProjectExit(
        child,
        { puts: projectStorageEntries(child) },
        mode === 'synchronous-only' ? f.failed : f.scope,
      )
      expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toHaveLength(
        2,
      )
      if (mode === 'confirmed-save')
        await coordinatedProjectWrite(child, { puts: projectStorageEntries(child) }, f.scope)
      expect(await recoverProjectWrites(f.scope, child.id)).toEqual(
        mode === 'confirmed-save' ? [] : [child.id],
      )
      expect(await readValue(f.scope.store, projectMetaKey(child.id))).toMatchObject({
        name: 'Latest descendant',
        futureMetadata: parent.futureMetadata,
      })
      const metas = (await readAllKeys(f.scope.store)).filter(
        (key) => typeof key === 'string' && key.startsWith(PROJECT_META_KEY_PREFIX),
      )
      expect(metas).toEqual([projectMetaKey(child.id)])
      const archives = (await readAllKeys(f.scope.store)).filter((key) =>
        String(key).startsWith(`sz:v4:project-backup:${parent.id}:recovery-`),
      )
      expect(archives).toHaveLength(1)
      const archive = (await readValue(f.scope.store, archives[0]!)) as {
        encoding: string
        encoded: string
      }
      expect(archive.encoding).toBe('project-json-graph-v1')
      expect(decodeRecoverySnapshot(archive.encoded)).toEqual(parentEntry.value)
      expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toEqual([])
    } finally {
      f.close()
    }
  })

test('retiring an ancestor cannot acknowledge an unrelated writer that reused its token', async () => {
  const f = await fixture()
  try {
    const parent = f.edit('pending parent')
    await stageProjectExit(parent, { puts: projectStorageEntries(parent) }, f.scope)
    const parentEntry = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const recovered = await loadRecoverableProjectDraft(f.scope, parent.id)
    if (!recovered) throw new Error('Missing preserved draft')
    const child = advanceLocalRevision(recovered, { ...recovered, name: 'Latest descendant' })
    await stageProjectExit(child, { puts: projectStorageEntries(child) }, f.scope)
    const unrelated = structuredClone(parentEntry.value) as RecoveryWrite
    unrelated.head.writer = 'independent-writer'
    unrelated.write = {
      ...unrelated.write,
      puts: unrelated.write.puts!.map(([key, value]) => [
        key,
        key === projectMetaKey(parent.id)
          ? { ...(value as object), name: 'Independent actor' }
          : value,
      ]),
    }
    stageSynchronousExitJournal(
      f.scope.exitJournalStorage,
      f.scope.identity,
      {
        projectId: parent.id,
        writer: unrelated.head.writer,
        token: unrelated.head.token,
      },
      unrelated,
    )
    const ids = await recoverProjectWrites(f.scope, parent.id)
    expect(ids).toHaveLength(2)
    const copy = ids.find((id) => id !== parent.id)!
    expect(await readValue(f.scope.store, projectMetaKey(copy))).toMatchObject({
      name: 'Independent actor (edição recuperada)',
    })
    expect(await readValue(f.scope.store, projectMetaKey(parent.id))).toMatchObject({
      name: 'Latest descendant',
    })
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toEqual([])
  } finally {
    f.close()
  }
})

test('an incomplete descendant preserves the original ancestor journal and its exit mirror', async () => {
  const f = await fixture()
  try {
    const parent = f.edit('pending parent')
    await stageProjectExit(parent, { puts: projectStorageEntries(parent) }, f.scope)
    const parentEntry = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const recovered = await loadRecoverableProjectDraft(f.scope, parent.id)
    if (!recovered) throw new Error('Missing preserved draft')
    const child = advanceLocalRevision(recovered, { ...recovered, name: 'Incomplete descendant' })
    const puts = projectStorageEntries(child).filter(
      ([key]) => !String(key).includes('project-blocks:'),
    )
    await stageProjectExit(child, { puts }, f.scope, true)
    await recoverProjectWrites(f.scope, child.id)
    expect(
      await readValue(f.scope.store, projectRecoveryKey(parent.id, parentEntry.writer)),
    ).toEqual(parentEntry.value)
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toContainEqual(
      parentEntry,
    )
    expect(await readValue(f.scope.store, projectMetaKey(parent.id))).toMatchObject({
      name: 'Incomplete descendant',
    })
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

test('a later confirmed revision of the same lineage retires an older exit copy without duplicating the project', async () => {
  // Revisão completa da missão (persistência, item 2): a cópia de saída só saía quando o
  // conteúdo era igual ao gravado. Uma cópia mais velha do MESMO escritor ficava no journal e,
  // na abertura seguinte, virava "(edição recuperada)" com o estado antigo.
  const f = await fixture()
  try {
    const older = f.edit('hidden tab, older')
    await stageProjectExit(older, { puts: projectStorageEntries(older) }, f.failed)
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toHaveLength(1)
    // Como no editor: a edição seguinte avança a partir da revisão anterior (sequência maior).
    const later = advanceLocalRevision(older, {
      ...older,
      tree: { 'main.ts': { kind: 'file' as const, content: 'edited after returning, saved' } },
    })
    await coordinatedProjectWrite(later, { puts: projectStorageEntries(later) }, f.scope)
    expect(await recoverProjectWrites(f.scope, later.id)).toEqual([])
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toEqual([])
    expect(await readValue(f.scope.store, projectFilesKey(later.id))).toMatchObject({
      tree: { 'main.ts': { content: 'edited after returning, saved' } },
    })
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

// Achado na conferência do staging (21/11/2026): com a aba só escondida a página segue viva, e a
// cópia nativa confirmada basta. Um projeto grande demais para a cópia síncrona (o Reino Zero Ultra
// aberto tem ~3 milhões de caracteres) marcava "Erro ao salvar" a cada troca de aba.
test('page alive: a confirmed native copy is enough when the synchronous copy cannot be staged', async () => {
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
    const draft = f.edit('native copy is enough')
    await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, scope, false, {
      pageAlive: true,
    })
    expect(projectExitRecoveryStatus(draft).recoverable).toBe(true)
    const revision = readLocalRevision(draft)!
    expect(
      await readValue(f.scope.store, projectRecoveryKey(draft.id, revision.lineage.writer)),
    ).toBeDefined()
    // Sem a página viva (o pagehide), o mesmo caso continua sem cópia declarada.
    const other = f.edit('page leaving')
    await expect(
      stageProjectExit(other, { puts: projectStorageEntries(other) }, scope),
    ).rejects.toThrow()
    expect(projectExitRecoveryStatus(other).recoverable).toBe(false)
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
    const winner = { ...f.project, name: 'Another writer' }
    await bindProjectToDurableHead(winner, f.scope)
    const draft = f.edit('copied original')
    await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    const entry = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const source = structuredClone(entry.value) as { write: { puts: [string, unknown][] } }
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

for (const invalid of ['foreign-record-id', 'future-storage-layout'] as const)
  test(`a native journal preserves a valid save when its partition identity is incompatible: ${invalid}`, async () => {
    const f = await fixture()
    try {
      const draft = f.edit('incompatible partition')
      await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
      const entry = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
      const native = structuredClone(entry.value) as { write: { puts: [string, unknown][] } }
      const partition = native.write.puts.find(
        ([key]) =>
          key ===
          (invalid === 'foreign-record-id' ? projectFilesKey(draft.id) : projectMetaKey(draft.id)),
      )!
      partition[1] = {
        ...(partition[1] as object),
        ...(invalid === 'foreign-record-id' ? { id: 'foreign-project' } : { storageVersion: 9999 }),
      }
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

test('projected recovery uses the prepared snapshot and acknowledges its original source only after commit', async () => {
  const f = await fixture()
  try {
    const draft = f.edit('prepared source')
    await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    const source = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const projected = { ...source, encoded: 'original-legacy-wire-kept-for-ack' }
    const acknowledged: string[] = []
    await recoverSynchronousProjectWrites(f.scope, draft.id, undefined, {
      entries: [projected],
      acknowledge: async (entry) => {
        expect(await readValue(f.scope.store, projectFilesKey(draft.id))).toMatchObject({
          tree: { 'main.ts': { content: 'prepared source' } },
        })
        expect(
          await readValue(f.scope.store, projectRecoveryKey(draft.id, source.writer)),
        ).toBeUndefined()
        acknowledged.push(entry.encoded)
      },
    })
    expect(acknowledged).toEqual([projected.encoded])
    // The adapter owns acknowledgement: replay must not remove a different source.
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toEqual([
      source,
    ])
  } finally {
    f.close()
  }
})

test('a failed source acknowledgement can retry after the destination is already confirmed', async () => {
  const f = await fixture()
  try {
    const draft = f.edit('confirmed before ack failure')
    await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    const source = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const projected = { ...source, encoded: 'legacy-source-bytes' }
    let acknowledgements = 0
    const replay = {
      entries: [projected],
      acknowledge: async () => {
        acknowledgements++
        if (acknowledgements === 1) throw new Error('source store temporarily unavailable')
      },
    }
    await recoverSynchronousProjectWrites(f.scope, draft.id, undefined, replay)
    expect(acknowledgements).toBe(1)
    expect(await readValue(f.scope.store, projectFilesKey(draft.id))).toMatchObject({
      tree: { 'main.ts': { content: 'confirmed before ack failure' } },
    })
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toEqual([
      source,
    ])
    await recoverSynchronousProjectWrites(f.scope, draft.id, undefined, replay)
    expect(acknowledgements).toBe(2)
    expect(
      await readValue(f.scope.store, projectRecoveryKey(draft.id, source.writer)),
    ).toBeUndefined()
  } finally {
    f.close()
  }
})

test('a failed destination transaction never acknowledges a prepared legacy source', async () => {
  const f = await fixture()
  try {
    const draft = f.edit('must survive failed destination')
    await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    const source = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    let acknowledged = false
    let aborted = false
    // The driver reuses its warm connection. Inject at that connection rather
    // than a UseStore wrapper which correctly stops running after first read.
    const transaction = f.database.transaction.bind(f.database)
    f.database.transaction = (names, mode, options) => {
      const tx = transaction(names, mode, options)
      if (mode === 'readwrite') {
        aborted = true
        tx.abort()
      }
      return tx
    }
    await expect(
      recoverSynchronousProjectWrites(f.scope, draft.id, undefined, {
        entries: [{ ...source, encoded: 'legacy-bytes-still-pending' }],
        acknowledge: async () => {
          acknowledged = true
        },
      }),
    ).rejects.toThrow()
    expect(aborted).toBe(true)
    expect(acknowledged).toBe(false)
    expect(await readValue(f.scope.store, projectFilesKey(draft.id))).toMatchObject({
      tree: { 'main.ts': { content: 'initial' } },
    })
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toEqual([
      source,
    ])
  } finally {
    f.close()
  }
})

test('prepared legacy recovery promotes only v4 partitions after base migration', async () => {
  const f = await fixture(3)
  try {
    const draft = f.edit('legacy pending edit in v4')
    await stageLegacyExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    const source = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const prepared = await prepareLocalV3Recovery(source, f.scope)
    await migrateLocalV3Project(draft.id, f.scope)
    await stageLocalV3Recovery(f.scope, prepared)
    let acknowledged = false
    const recovered = await recoverSynchronousProjectWrites(f.scope, draft.id, undefined, {
      version: 4,
      entries: [{ ...source, value: prepared.projected }],
      acknowledge: async (entry) => {
        expect(entry.encoded).toBe(source.encoded)
        expect(await readValue(f.scope.store, projectFilesKey(draft.id, 4))).toMatchObject({
          tree: { 'main.ts': { content: 'legacy pending edit in v4' } },
        })
        acknowledged = true
      },
    })
    expect(recovered).toContain(draft.id)
    expect(acknowledged).toBe(true)
    expect(await readValue(f.scope.store, projectFilesKey(draft.id, 3))).toBeUndefined()
    expect(
      await readValue(f.scope.store, projectRecoveryKey(draft.id, source.writer, 4)),
    ).toBeUndefined()
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toEqual([
      source,
    ])
  } finally {
    f.close()
  }
})

test('v4 replay records inverse history and its budget only in the destination namespace', async () => {
  const f = await fixture(3)
  try {
    const draft = f.edit('v4 with undo')
    const record: ProApplicationRecord = {
      version: 1,
      operationId: 'v4-operation',
      source: 'editor',
      projectId: draft.id,
      beforeHash: 'a'.repeat(64),
      afterHash: 'b'.repeat(64),
      createdAt: 1,
      bytes: 512,
      inverse: {
        baseHash: 'b'.repeat(64),
        summary: 'Undo',
        patches: [{ path: 'main.ts', before: 'c'.repeat(64), content: 'initial' }],
      },
    }
    const revision = readLocalRevision(draft)!
    revision.lineage.pending.set(record.operationId, { sequence: revision.sequence, record })
    await stageLegacyExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    const source = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const prepared = await prepareLocalV3Recovery(source, f.scope)
    await migrateLocalV3Project(draft.id, f.scope)
    await stageLocalV3Recovery(f.scope, prepared)
    await recoverSynchronousProjectWrites(f.scope, draft.id, undefined, {
      version: 4,
      entries: [{ ...source, value: prepared.projected }],
      acknowledge: async () => {},
    })
    expect(await readValue(f.scope.store, projectApplicationsKey(draft.id, 4))).toEqual([record])
    expect(await readValue(f.scope.store, applicationBudgetKey(4))).toEqual({ [draft.id]: 512 })
    expect(await readValue(f.scope.store, projectApplicationsKey(draft.id, 3))).toBeUndefined()
    expect(await readValue(f.scope.store, applicationBudgetKey(3))).toBeUndefined()
  } finally {
    f.close()
  }
})

test('v4 recovery conflicts preserve the winner and create a complete v4 copy', async () => {
  const f = await fixture(3)
  try {
    const draft = f.edit('old pending edit')
    await stageLegacyExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    const source = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const prepared = await prepareLocalV3Recovery(source, f.scope)
    await migrateLocalV3Project(draft.id, f.scope)
    const winner = {
      ...f.project,
      tree: { 'main.ts': { kind: 'file' as const, content: 'newer winner' } },
    }
    const winnerHead = {
      version: 1,
      token: 'newer-winner',
      writer: 'other-tab',
      base: null,
      sequence: 1,
    }
    await writeInOneTransaction(f.scope.store, {
      puts: [...projectStorageEntries(winner, 4), [projectHeadKey(draft.id, 4), winnerHead]],
    })
    await stageLocalV3Recovery(f.scope, prepared)
    const recovered = await recoverSynchronousProjectWrites(f.scope, draft.id, undefined, {
      version: 4,
      entries: [{ ...source, value: prepared.projected }],
      acknowledge: async () => {},
    })
    expect(recovered).toHaveLength(1)
    const id = recovered[0]!
    expect(id).toStartWith('recuperado-')
    expect(await readValue(f.scope.store, projectFilesKey(id, 4))).toMatchObject({
      tree: { 'main.ts': { content: 'old pending edit' } },
    })
    expect(await readValue(f.scope.store, projectFilesKey(draft.id, 4))).toMatchObject({
      tree: { 'main.ts': { content: 'newer winner' } },
    })
    expect(await readValue(f.scope.store, projectHeadKey(draft.id, 4))).toEqual(winnerHead)
    expect(await readValue(f.scope.store, projectMigrationKey(id, 4))).toEqual({
      exitRecovery: prepared.projected,
    })
    expect(await readValue(f.scope.store, projectFilesKey(id, 3))).toBeUndefined()
    expect(
      await readValue(f.scope.store, projectRecoveryKey(draft.id, source.writer, 4)),
    ).toBeUndefined()
  } finally {
    f.close()
  }
})

for (const mode of ['synchronous', 'mirrored', 'native-only'] as const)
  test(`legacy sources retire only after complete v4 recovery: ${mode}`, async () => {
    const native = mode !== 'synchronous'
    const f = await fixture(3)
    try {
      const draft = f.edit('complete legacy recovery')
      await stageLegacyExit(
        draft,
        { puts: projectStorageEntries(draft) },
        native ? f.scope : f.failed,
      )
      const source = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
      if (mode === 'native-only')
        acknowledgeSynchronousExitJournal(f.scope.exitJournalStorage, source)
      if (native)
        expect(
          await readValue(f.scope.store, projectRecoveryKey(draft.id, source.writer, 3)),
        ).toBeDefined()
      expect(await recoverLocalV3ProjectWrites(f.scope, draft.id)).toContain(draft.id)
      expect(await readValue(f.scope.store, projectFilesKey(draft.id, 4))).toMatchObject({
        tree: { 'main.ts': { content: 'complete legacy recovery' } },
      })
      expect(
        await readValue(f.scope.store, projectRecoveryKey(draft.id, source.writer, 3)),
      ).toBeUndefined()
      expect(
        await readValue(f.scope.store, projectRecoveryKey(draft.id, source.writer, 4)),
      ).toBeUndefined()
      expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toEqual([])
      const keys = (await readAllKeys(f.scope.store)).map(String)
      // O arquivo da cópia v3 tem chave própria desde 20/11/2026 (P1 da revisão): a chave do
      // arquivo de origem de recuperação (`:recovery-`) fica livre para a revisão que a superar.
      const backups = keys.filter((key) =>
        key.startsWith(`sz:v4:project-backup:${draft.id}:v3-recovery-`),
      )
      expect(backups).toHaveLength(1)
      expect(await readValue(f.scope.store, backups[0]!)).toMatchObject({
        sourceVersion: 3,
        encoded: source.encoded,
      })
      expect(
        keys.filter((key) => key.startsWith(`sz:v4:project-backup:${draft.id}:recovery-`)),
      ).toEqual([])
    } finally {
      f.close()
    }
  })

test('a returning old tab becomes a v4 copy instead of overwriting the previously recovered edit', async () => {
  const f = await fixture(3)
  try {
    const first = f.edit('first recovered edit')
    await stageLegacyExit(first, { puts: projectStorageEntries(first) }, f.scope)
    await recoverLocalV3ProjectWrites(f.scope, first.id)
    const second = f.edit('returning old tab edit')
    await stageLegacyExit(second, { puts: projectStorageEntries(second) }, f.scope)
    const recovered = await recoverLocalV3ProjectWrites(f.scope, second.id)
    expect(recovered).toHaveLength(1)
    expect(recovered[0]).toStartWith('recuperado-')
    expect(await readValue(f.scope.store, projectFilesKey(first.id, 4))).toMatchObject({
      tree: { 'main.ts': { content: 'first recovered edit' } },
    })
    expect(await readValue(f.scope.store, projectFilesKey(recovered[0]!, 4))).toMatchObject({
      tree: { 'main.ts': { content: 'returning old tab edit' } },
    })
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toEqual([])
  } finally {
    f.close()
  }
})

test('mismatched legacy mirrors cannot migrate the base or acknowledge either source', async () => {
  const f = await fixture(3)
  try {
    const draft = f.edit('original synchronous source')
    await stageLegacyExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    const source = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const captured = structuredClone(source.value) as RecoveryWrite
    const other: RecoveryWrite = {
      ...captured,
      write: {
        ...captured.write,
        puts: captured.write.puts!.map(([key, value]) => [
          key,
          key === projectFilesKey(draft.id, 3)
            ? {
                ...(value as object),
                tree: { 'main.ts': { kind: 'file', content: 'different native source' } },
              }
            : value,
        ]),
      },
    }
    const key = projectRecoveryKey(draft.id, source.writer, 3)
    await writeInOneTransaction(f.scope.store, { puts: [[key, other]] })
    await expect(recoverLocalV3ProjectWrites(f.scope, draft.id)).rejects.toThrow('mesma revisão')
    expect(await readValue(f.scope.store, projectFilesKey(draft.id, 3))).toMatchObject({
      tree: { 'main.ts': { content: 'initial' } },
    })
    expect(await readValue(f.scope.store, key)).toEqual(other)
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toEqual([
      source,
    ])
    expect((await readAllKeys(f.scope.store)).some((key) => String(key).startsWith('sz:v4:'))).toBe(
      false,
    )
  } finally {
    f.close()
  }
})

test('overlapping project prefixes cannot recover a different owner through a colon in its writer', async () => {
  const f = await fixture()
  try {
    const draft = f.edit('must remain pending for its actual owner')
    await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, f.failed)
    const entry = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const captured = entry.value as RecoveryWrite
    const incoming: RecoveryWrite = {
      ...captured,
      head: { ...captured.head, base: null, writer: 'section:writer' },
    }
    const key = projectRecoveryKey(draft.id, incoming.head.writer)
    await writeInOneTransaction(f.scope.store, { puts: [[key, incoming]] })
    expect(await recoverLocalV3ProjectWrites(f.scope, `${draft.id}:section`)).toEqual([])
    expect(await readValue(f.scope.store, projectMetaKey(draft.id, 4))).toMatchObject({
      id: draft.id,
      name: 'Journal',
    })
    expect(await loadRecoverableProjectDraft(f.scope, `${draft.id}:section`)).toBeNull()
    expect(await recoverProjectWrites(f.scope, `${draft.id}:section`)).toEqual([])
    expect(await readValue(f.scope.store, projectFilesKey(draft.id))).toMatchObject({
      tree: { 'main.ts': { content: 'initial' } },
    })
    expect(await readValue(f.scope.store, key)).toEqual(incoming)
  } finally {
    f.close()
  }
})

for (const source of ['synchronous', 'native', 'same-writer-synchronous'] as const)
  for (const finish of ['save', 'recover'] as const)
    test(`a supported descendant preserves its future-format ancestor: ${source}/${finish}`, async () => {
      const f = await fixture()
      try {
        const parent = f.edit('future parent source')
        const future: RecoveryWrite = {
          version: 1,
          projectId: parent.id,
          head: {
            version: 1,
            writer:
              source === 'same-writer-synchronous'
                ? readLocalRevision(parent)!.lineage.writer
                : 'future-parent-writer',
            token: 'future-parent-token',
            base: null,
            sequence: 1,
          },
          applications: [],
          write: {
            puts: projectStorageEntries(parent).map(([key, value]) => [
              key,
              key === projectMetaKey(parent.id)
                ? { ...(value as object), formatVersion: 9999 }
                : value,
            ]),
          },
        }
        const parentKey = projectRecoveryKey(parent.id, future.head.writer)
        let exitKey: string | undefined
        if (source === 'native')
          await writeInOneTransaction(f.scope.store, { puts: [[parentKey, future]] })
        else
          exitKey = stageSynchronousExitJournal(
            f.scope.exitJournalStorage,
            f.scope.identity,
            {
              projectId: parent.id,
              writer: future.head.writer,
              token: future.head.token,
            },
            future,
          )
        const child = f.edit('supported child source')
        readLocalRevision(child)!.lineage.recoverySources = [
          { key: parentKey, token: future.head.token },
        ]
        await stageProjectExit(
          child,
          { puts: projectStorageEntries(child) },
          finish === 'save' ? f.failed : f.scope,
        )
        if (finish === 'save')
          await expect(
            coordinatedProjectWrite(child, { puts: projectStorageEntries(child) }, f.scope),
          ).rejects.toThrow()
        else await expect(recoverProjectWrites(f.scope, child.id)).rejects.toThrow()
        if (source === 'native') expect(await readValue(f.scope.store, parentKey)).toEqual(future)
        else expect(f.scope.exitJournalStorage!.getItem(exitKey!)).toBe(encodeExitJournal(future))
        expect(await readValue(f.scope.store, projectFilesKey(child.id))).toMatchObject({
          tree: { 'main.ts': { content: 'initial' } },
        })
        expect(
          readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity).some(
            (entry) => entry.token !== future.head.token,
          ),
        ).toBe(true)
      } finally {
        f.close()
      }
    })

test('an archive write failure rolls back promotion and retains both ancestor and descendant sources', async () => {
  const f = await fixture()
  try {
    const parent = f.edit('ancestor source')
    await stageProjectExit(parent, { puts: projectStorageEntries(parent) }, f.failed)
    const parentEntry = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const child = advanceLocalRevision<Project>(parent, {
      ...parent,
      tree: { 'main.ts': { kind: 'file', content: 'descendant source' } },
    })
    readLocalRevision(child)!.lineage.recoverySources = [
      { key: projectRecoveryKey(parent.id, parentEntry.writer), token: parentEntry.token },
    ]
    await stageProjectExit(child, { puts: projectStorageEntries(child) }, f.scope)
    let injected = false
    const transaction = f.database.transaction.bind(f.database)
    f.database.transaction = (names, mode, options) => {
      const tx = transaction(names, mode, options)
      if (mode === 'readwrite') {
        const objectStore = tx.objectStore.bind(tx)
        tx.objectStore = (name) => {
          const store = objectStore(name)
          const put = store.put.bind(store)
          store.put = (value, key) => {
            if (
              typeof key === 'string' &&
              key.startsWith(`sz:v4:project-backup:${parent.id}:recovery-`)
            ) {
              injected = true
              throw new DOMException('Archive quota', 'QuotaExceededError')
            }
            return put(value, key)
          }
          return store
        }
      }
      return tx
    }
    await expect(recoverProjectWrites(f.scope, child.id)).rejects.toThrow()
    expect(injected).toBe(true)
    expect(await readValue(f.scope.store, projectFilesKey(child.id))).toMatchObject({
      tree: { 'main.ts': { content: 'initial' } },
    })
    expect(readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)).toHaveLength(2)
    expect(
      (await readAllKeys(f.scope.store)).filter((key) =>
        String(key).startsWith(`sz:v4:project-backup:${parent.id}:recovery-`),
      ),
    ).toEqual([])
  } finally {
    f.close()
  }
})

test('a previously archived identity cannot consume a later source with the same token and different content', async () => {
  const f = await fixture()
  try {
    const parent = f.edit('ancestor archived once')
    await stageProjectExit(parent, { puts: projectStorageEntries(parent) }, f.failed)
    const parentEntry = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const key = projectRecoveryKey(parent.id, parentEntry.writer)
    const child = advanceLocalRevision<Project>(parent, {
      ...parent,
      tree: { 'main.ts': { kind: 'file', content: 'first descendant' } },
    })
    readLocalRevision(child)!.lineage.recoverySources = [{ key, token: parentEntry.token }]
    await stageProjectExit(child, { puts: projectStorageEntries(child) }, f.scope)
    await recoverProjectWrites(f.scope, child.id)
    const archiveKey = (await readAllKeys(f.scope.store)).find((key) =>
      String(key).startsWith(`sz:v4:project-backup:${parent.id}:recovery-`),
    )!
    const archive = await readValue(f.scope.store, archiveKey)
    const captured = parentEntry.value as RecoveryWrite
    const changed: RecoveryWrite = {
      ...captured,
      write: {
        ...captured.write,
        puts: captured.write.puts!.map(([key, value]) => [
          key,
          key === projectFilesKey(parent.id)
            ? {
                ...(value as object),
                tree: {
                  'main.ts': { kind: 'file', content: 'different content under the old token' },
                },
              }
            : value,
        ]),
      },
    }
    stageSynchronousExitJournal(
      f.scope.exitJournalStorage,
      f.scope.identity,
      { projectId: parent.id, writer: parentEntry.writer, token: parentEntry.token },
      changed,
    )
    const next = f.edit('next descendant')
    readLocalRevision(next)!.lineage.recoverySources = [{ key, token: parentEntry.token }]
    await stageProjectExit(next, { puts: projectStorageEntries(next) }, f.failed)
    await expect(recoverProjectWrites(f.scope, next.id)).rejects.toThrow('arquivo desta origem')
    expect(await readValue(f.scope.store, archiveKey)).toEqual(archive)
    expect(
      readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity).some(
        (entry) =>
          entry.token === parentEntry.token &&
          encodeExitJournal(entry.value) === encodeExitJournal(changed),
      ),
    ).toBe(true)
    expect(await readValue(f.scope.store, projectFilesKey(child.id))).toMatchObject({
      tree: { 'main.ts': { content: 'first descendant' } },
    })
  } finally {
    f.close()
  }
})

for (const source of ['synchronous', 'native'] as const)
  test(`a foreign-prefix ancestor remains intact without granting retirement authority: ${source}`, async () => {
    const f = await fixture()
    try {
      const foreignId = `${f.project.id}:foreign`
      const foreign: Project = {
        ...f.project,
        id: foreignId,
        tree: { 'main.ts': { kind: 'file', content: 'future foreign source' } },
      }
      const original: RecoveryWrite = {
        version: 1,
        projectId: foreignId,
        head: {
          version: 1,
          writer: 'foreign-writer',
          token: 'foreign-token',
          base: null,
          sequence: 1,
        },
        applications: [],
        write: {
          puts: projectStorageEntries(foreign).map(([key, value]) => [
            key,
            key === projectMetaKey(foreignId)
              ? { ...(value as object), formatVersion: 9999 }
              : value,
          ]),
        },
      }
      const key = projectRecoveryKey(foreignId, original.head.writer)
      let exitKey: string | undefined
      if (source === 'native')
        await writeInOneTransaction(f.scope.store, { puts: [[key, original]] })
      else
        exitKey = stageSynchronousExitJournal(
          f.scope.exitJournalStorage,
          f.scope.identity,
          { projectId: foreignId, writer: original.head.writer, token: original.head.token },
          original,
        )
      const child = f.edit('valid child project')
      readLocalRevision(child)!.lineage.recoverySources = [{ key, token: original.head.token }]
      await stageProjectExit(child, { puts: projectStorageEntries(child) }, f.scope)
      expect(await recoverProjectWrites(f.scope)).toContain(child.id)
      expect(await readValue(f.scope.store, projectFilesKey(child.id))).toMatchObject({
        tree: { 'main.ts': { content: 'valid child project' } },
      })
      if (source === 'native') expect(await readValue(f.scope.store, key)).toEqual(original)
      else expect(f.scope.exitJournalStorage!.getItem(exitKey!)).toBe(encodeExitJournal(original))
    } finally {
      f.close()
    }
  })

test('a live save cannot retire a parent whose native snapshot differs from its immutable mirror', async () => {
  const f = await fixture()
  try {
    const parent = f.edit('original parent source')
    await stageProjectExit(parent, { puts: projectStorageEntries(parent) }, f.scope)
    const entry = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const recovered = await loadRecoverableProjectDraft(f.scope, parent.id)
    if (!recovered || recovered.programmingLanguage === 'python') {
      throw new Error('Missing editable JavaScript parent')
    }
    const captured = entry.value as RecoveryWrite
    const changed: RecoveryWrite = {
      ...captured,
      write: {
        ...captured.write,
        puts: captured.write.puts!.map(([key, value]) => [
          key,
          key === projectFilesKey(parent.id)
            ? {
                ...(value as object),
                tree: { 'main.ts': { kind: 'file', content: 'different native parent content' } },
              }
            : value,
        ]),
      },
    }
    const key = projectRecoveryKey(parent.id, entry.writer)
    await writeInOneTransaction(f.scope.store, { puts: [[key, changed]] })
    const child = advanceLocalRevision<Project>(recovered, {
      ...recovered,
      tree: { 'main.ts': { kind: 'file', content: 'descendant from original mirror' } },
    })
    await stageProjectExit(child, { puts: projectStorageEntries(child) }, f.failed)
    await expect(
      coordinatedProjectWrite(child, { puts: projectStorageEntries(child) }, f.scope),
    ).rejects.toThrow('mesma origem')
    expect(await readValue(f.scope.store, key)).toEqual(changed)
    expect(f.scope.exitJournalStorage!.getItem(entry.key)).toBe(entry.encoded)
    expect(await readValue(f.scope.store, projectFilesKey(parent.id))).toMatchObject({
      tree: { 'main.ts': { content: 'initial' } },
    })
  } finally {
    f.close()
  }
})

test('a parent replaced after preparation is not discarded using the old snapshot', async () => {
  const f = await fixture()
  try {
    const parent = f.edit('parent before the race')
    const original: RecoveryWrite = {
      version: 1,
      projectId: parent.id,
      head: {
        version: 1,
        writer: 'ancestor-writer',
        token: 'immutable-parent-token',
        base: null,
        sequence: 1,
      },
      applications: [],
      write: { puts: projectStorageEntries(parent) },
    }
    const key = projectRecoveryKey(parent.id, original.head.writer)
    await writeInOneTransaction(f.scope.store, { puts: [[key, original]] })
    const changed: RecoveryWrite = {
      ...original,
      write: {
        ...original.write,
        puts: original.write.puts!.map(([path, value]) => [
          path,
          path === projectFilesKey(parent.id)
            ? {
                ...(value as object),
                tree: { 'main.ts': { kind: 'file', content: 'new parent content racing the CAS' } },
              }
            : value,
        ]),
      },
    }
    const child = f.edit('child from the prepared source')
    readLocalRevision(child)!.lineage.recoverySources = [{ key, token: original.head.token }]
    await stageProjectExit(child, { puts: projectStorageEntries(child) }, f.scope)
    let observedParent = false
    let injected = false
    const transaction = f.database.transaction.bind(f.database)
    f.database.transaction = (names, mode, options) => {
      if (mode === 'readwrite' && observedParent && !injected) {
        injected = true
        const update = transaction(names, mode, options)
        update.objectStore('kv').put(changed, key)
        update.commit()
      }
      const tx = transaction(names, mode, options)
      if (mode === 'readonly') {
        const objectStore = tx.objectStore.bind(tx)
        tx.objectStore = (name) => {
          const store = objectStore(name)
          const get = store.get.bind(store)
          store.get = (path) => {
            const request = get(path)
            if (path === key)
              request.addEventListener('success', () => {
                observedParent = true
              })
            return request
          }
          return store
        }
      }
      return tx
    }
    await recoverProjectWrites(f.scope, child.id)
    expect(injected).toBe(true)
    const archives = (await readAllKeys(f.scope.store)).filter((path) =>
      String(path).startsWith(`sz:v4:project-backup:${parent.id}:recovery-`),
    )
    expect(archives).toHaveLength(1)
    const archive = (await readValue(f.scope.store, archives[0]!)) as { encoded: string }
    expect(decodeRecoverySnapshot(archive.encoded)).toEqual(changed)
    expect(await readValue(f.scope.store, projectFilesKey(child.id))).toMatchObject({
      tree: { 'main.ts': { content: 'child from the prepared source' } },
    })
  } finally {
    f.close()
  }
})

test('a deep ancestor is archived without requiring a deep native structured clone', async () => {
  const f = await fixture()
  try {
    let deep: Record<string, unknown> = { leaf: 'kept', missing: undefined, zero: -0 }
    for (let depth = 0; depth < 10_000; depth++) deep = { child: deep }
    const parent = Object.assign(f.edit('deep parent'), { futureMetadata: deep })
    await stageProjectExit(parent, { puts: projectStorageEntries(parent) }, f.failed)
    const entry = readSynchronousExitJournal(f.scope.exitJournalStorage, f.scope.identity)[0]!
    const child = f.edit('small supported descendant')
    readLocalRevision(child)!.lineage.recoverySources = [
      { key: projectRecoveryKey(parent.id, entry.writer), token: entry.token },
    ]
    await coordinatedProjectWrite(child, { puts: projectStorageEntries(child) }, f.scope)
    const archiveKey = (await readAllKeys(f.scope.store)).find((key) =>
      String(key).startsWith(`sz:v4:project-backup:${parent.id}:recovery-`),
    )!
    const archive = (await readValue(f.scope.store, archiveKey)) as { encoded: string }
    expect(localSnapshotsEqual(decodeRecoverySnapshot(archive.encoded), entry.value)).toBe(true)
    expect(await readValue(f.scope.store, projectFilesKey(child.id))).toMatchObject({
      tree: { 'main.ts': { content: 'small supported descendant' } },
    })
  } finally {
    f.close()
  }
})

test('a native-only ancestor above the exit quota remains complete in its durable archive', async () => {
  const f = await fixture()
  try {
    const parent = Object.assign(f.edit('large native parent'), {
      futureMetadata: { text: 'x'.repeat(2_100_000) },
    })
    await stageProjectExit(
      parent,
      { puts: projectStorageEntries(parent) },
      { ...f.scope, exitJournalStorage: undefined },
    )
    const key = projectRecoveryKey(parent.id, readLocalRevision(parent)!.lineage.writer)
    const original = (await readValue(f.scope.store, key)) as RecoveryWrite
    const child = f.edit('small native descendant')
    readLocalRevision(child)!.lineage.recoverySources = [{ key, token: original.head.token }]
    await coordinatedProjectWrite(child, { puts: projectStorageEntries(child) }, f.scope)
    const archiveKey = (await readAllKeys(f.scope.store)).find((key) =>
      String(key).startsWith(`sz:v4:project-backup:${parent.id}:recovery-`),
    )!
    const archive = (await readValue(f.scope.store, archiveKey)) as { encoded: string }
    expect(archive.encoded.length).toBeGreaterThan(EXIT_JOURNAL_MAX_CHARS)
    expect(() => decodeExitJournal(archive.encoded)).toThrow()
    expect(localSnapshotsEqual(decodeRecoverySnapshot(archive.encoded), original)).toBe(true)
    expect(await readValue(f.scope.store, key)).toBeUndefined()
  } finally {
    f.close()
  }
})

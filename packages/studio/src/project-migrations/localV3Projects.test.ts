import { expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { createEmptyProject } from '../core/project'
import {
  interruptConditionalTransactions,
  readAllKeys,
  readValue,
  writeInOneTransaction,
} from '../state/idbTransaction'
import type { RecoveryWrite } from '../state/projectStorageCoordinator'
import { projectHeadKey, projectMetaKey, projectRecoveryKey } from '../state/projectStorageKeys'
import { projectStorageEntries } from '../state/projectStorageRecords'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'
import { stageSynchronousExitJournal } from '../state/synchronousExitJournal'
import { migrateLocalV3Projects, prepareLocalV4ProjectReads } from './localV3Projects'

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
    exitJournalStorage: globalThis.localStorage,
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
  return {
    scope,
    seed,
    close: () => {
      database.close()
      for (const key of Object.keys(globalThis.localStorage))
        if (key.startsWith(`sz:studio-exit:1|${encodeURIComponent(identity)}|`))
          globalThis.localStorage.removeItem(key)
    },
  }
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

function draft(id: string, version: 3 | 4 = 3): RecoveryWrite {
  const project = createEmptyProject(id, `Projeto ${id}`)
  return {
    version: 1,
    projectId: id,
    head: {
      version: 1,
      writer: 'writer:with:colons',
      token: `token-${id}`,
      base: null,
      sequence: 1,
    },
    applications: [],
    write: { puts: projectStorageEntries(project, version) },
  }
}

test('v4 read preparation migrates a saved base without a journal and consumes an independent valid legacy draft', async () => {
  const f = await fixture()
  try {
    const base = await f.seed('saved-base')
    const recovery = draft('unsaved-draft')
    const key = projectRecoveryKey(recovery.projectId, recovery.head.writer, 3)
    await writeInOneTransaction(f.scope.store, { puts: [[key, recovery]] })
    const result = await prepareLocalV4ProjectReads(f.scope)
    expect(result.pending).toEqual([])
    expect(new Set(result.changed)).toEqual(new Set([base.id, recovery.projectId]))
    expect(await readValue(f.scope.store, projectMetaKey(base.id, 4))).toMatchObject({
      name: base.name,
    })
    expect(await readValue(f.scope.store, projectMetaKey(recovery.projectId, 4))).toMatchObject({
      name: 'Projeto unsaved-draft',
    })
    expect(await readValue(f.scope.store, key)).toBeUndefined()
    expect(await prepareLocalV4ProjectReads(f.scope)).toEqual({ changed: [], pending: [] })
  } finally {
    f.close()
  }
})

test('a future draft becomes one pending item without blocking another project', async () => {
  const f = await fixture()
  try {
    const valid = draft('valid-draft')
    const source = draft('future-draft')
    const future: RecoveryWrite = {
      ...source,
      write: {
        ...source.write,
        puts: source.write.puts!.map(
          ([key, value]) =>
            [
              key,
              key === projectMetaKey(source.projectId, 3)
                ? { ...(value as object), formatVersion: 9999 }
                : value,
            ] as const,
        ),
      },
    }
    const futureKey = projectRecoveryKey(future.projectId, future.head.writer, 3)
    await writeInOneTransaction(f.scope.store, {
      puts: [
        [projectRecoveryKey(valid.projectId, valid.head.writer, 3), valid],
        [futureKey, future],
      ],
    })
    const result = await prepareLocalV4ProjectReads(f.scope)
    expect(result.changed).toContain(valid.projectId)
    expect(result.pending).toMatchObject([{ id: future.projectId, migrationPending: true }])
    expect(await readValue(f.scope.store, futureKey)).toEqual(future)
    expect(await readValue(f.scope.store, projectMetaKey(future.projectId, 4))).toBeUndefined()
    await expect(prepareLocalV4ProjectReads(f.scope, undefined, future.projectId)).rejects.toThrow()
  } finally {
    f.close()
  }
})

test('an unreadable synchronous body is isolated by its header and remains byte-exact', async () => {
  const f = await fixture()
  try {
    const bad = draft('future-exit')
    const key = stageSynchronousExitJournal(
      f.scope.exitJournalStorage,
      f.scope.identity,
      {
        projectId: bad.projectId,
        writer: bad.head.writer,
        token: bad.head.token,
      },
      bad,
    )
    const futureWire = '{"version":2,"root":null,"nodes":[]}'
    f.scope.exitJournalStorage!.setItem(key, futureWire)
    const valid = draft('healthy-native')
    await writeInOneTransaction(f.scope.store, {
      puts: [[projectRecoveryKey(valid.projectId, valid.head.writer, 3), valid]],
    })
    const result = await prepareLocalV4ProjectReads(f.scope)
    expect(result.changed).toContain(valid.projectId)
    expect(result.pending).toMatchObject([{ id: bad.projectId, migrationPending: true }])
    expect(f.scope.exitJournalStorage!.getItem(key)).toBe(futureWire)
    await expect(prepareLocalV4ProjectReads(f.scope, undefined, bad.projectId)).rejects.toThrow()
  } finally {
    f.close()
  }
})

test('the same read preparation replays current v4 journals without demoting them to v3', async () => {
  const f = await fixture()
  try {
    const recovery = draft('current-v4', 4)
    const key = projectRecoveryKey(recovery.projectId, recovery.head.writer, 4)
    await readValue(f.scope.store, key)
    await writeInOneTransaction(f.scope.store, { puts: [[key, recovery]] })
    expect((await prepareLocalV4ProjectReads(f.scope)).changed).toContain(recovery.projectId)
    expect(await readValue(f.scope.store, projectMetaKey(recovery.projectId, 4))).toMatchObject({
      name: 'Projeto current-v4',
    })
    expect(await readValue(f.scope.store, projectMetaKey(recovery.projectId, 3))).toBeUndefined()
  } finally {
    f.close()
  }
})

test('a malformed native journal blocks only its candidate and cannot trigger historical fallback', async () => {
  const f = await fixture()
  try {
    const key = 'sz:v3:project-recovery:malformed'
    await writeInOneTransaction(f.scope.store, { puts: [[key, { futurePayload: true }]] })
    const result = await prepareLocalV4ProjectReads(f.scope)
    expect(result.pending).toHaveLength(1)
    expect(result.pending[0]).toMatchObject({
      name: 'Recuperação preservada',
      programmingLanguage: 'unknown',
      migrationPending: true,
    })
    expect(result.pending[0]!.id).toStartWith('recuperacao-')
    expect((await prepareLocalV4ProjectReads(f.scope)).pending[0]!.id).toBe(result.pending[0]!.id)
    await expect(prepareLocalV4ProjectReads(f.scope, undefined, 'malformed')).rejects.toThrow()
    expect(await readValue(f.scope.store, key)).toEqual({ futurePayload: true })
  } finally {
    f.close()
  }
})

test('native journal discovery preserves readable legacy IDs containing colons', async () => {
  const f = await fixture()
  try {
    const recovery = draft('legacy:scene')
    const key = projectRecoveryKey(recovery.projectId, recovery.head.writer, 3)
    await writeInOneTransaction(f.scope.store, { puts: [[key, recovery]] })
    const result = await prepareLocalV4ProjectReads(f.scope)
    expect(result.changed).toContain(recovery.projectId)
    expect(result.changed).not.toContain('legacy')
    expect(await readValue(f.scope.store, projectMetaKey(recovery.projectId, 4))).toMatchObject({
      id: recovery.projectId,
    })
    expect(await readValue(f.scope.store, key)).toBeUndefined()
  } finally {
    f.close()
  }
})

test('a saída da aba escondida no meio da promoção não deixa o projeto "Preservado"', async () => {
  // A gravação de saída com a página VIVA (aba escondida, `pageAlive`) chama
  // `interruptConditionalTransactions`, que aborta as escritas condicionais da mesma identidade.
  // A promoção da migração é uma delas: abortada, ela virava "pendente" e o card dizia
  // "Preservado" até a próxima carga, embora nada estivesse errado (lote 1, item 7, 22/11/2026).
  const f = await fixture()
  try {
    const sources = [await f.seed('escondida-a'), await f.seed('escondida-b')]
    // A conexão fica "quente" depois da primeira transação, e as seguintes abrem direto nela:
    // é nela que a saída precisa chegar, logo depois de a escrita condicional se registrar.
    const database = await new Promise<IDBDatabase>((resolve) =>
      f.scope.store('readonly', (objectStore) => resolve(objectStore.transaction.db)),
    )
    const transaction = database.transaction.bind(database)
    let interrupt = true
    database.transaction = ((names: string | string[], mode?: IDBTransactionMode) => {
      const opened = transaction(names, mode)
      if (mode === 'readwrite' && interrupt) {
        interrupt = false
        queueMicrotask(() => interruptConditionalTransactions(f.scope.identity))
      }
      return opened
    }) as IDBDatabase['transaction']
    const result = await migrateLocalV3Projects(f.scope)
    expect(interrupt).toBe(false)
    expect(result.pending).toEqual([])
    expect([...result.changed].sort()).toEqual(sources.map((source) => source.id).sort())
    for (const source of sources)
      expect(await readValue(f.scope.store, projectMetaKey(source.id, 4))).toMatchObject({
        id: source.id,
        name: source.name,
      })
  } finally {
    f.close()
  }
})

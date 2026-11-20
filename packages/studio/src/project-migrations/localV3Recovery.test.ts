import { expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { createEmptyProject } from '../core/project'
import { encodeExitJournal } from '../state/exitJournalCodec'
import { readAllKeys, readValue, writeInOneTransaction } from '../state/idbTransaction'
import { prepareRecoverySources, recoverySourceArchiveKey } from '../state/projectRecoverySources'
import type { RecoveryWrite } from '../state/projectStorageCoordinator'
import { projectHeadKey, projectMetaKey, projectRecoveryKey } from '../state/projectStorageKeys'
import { projectStorageEntries } from '../state/projectStorageRecords'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'
import type { ExitJournalEntry } from '../state/synchronousExitJournal'
import {
  archiveLocalV3Recovery,
  prepareLocalV3Recovery,
  stageLocalV3Recovery,
} from './localV3Recovery'
import { recoverLocalV3ProjectWrites } from './localV3RecoveryReplay'

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

const prepare = (f: Awaited<ReturnType<typeof fixture>>, entry: ExitJournalEntry) =>
  prepareLocalV3Recovery(entry, f.scope)

test('legacy projection keeps revision identity and ancestry while changing only local partition keys', async () => {
  const f = await fixture()
  try {
    const prepared = await prepare(f, f.entry)
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
    const first = await prepare(f, f.entry)
    await archiveLocalV3Recovery(f.scope, first, true)
    await archiveLocalV3Recovery(f.scope, first, true)
    expect(await readValue(f.scope.store, key)).toEqual(f.entry.value)
    expect(await readValue(f.scope.store, first.backupKey)).toEqual(first.archive)
    const changed = structuredClone(f.entry.value)
    const meta = changed.write.puts.find(([key]) => key === projectMetaKey(f.project.id, 3))!
    meta[1] = { ...(meta[1] as object), name: 'Outro conteúdo' }
    const second = await prepare(f, {
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

test('prepared recovery snapshots stay immutable while the original caller remains editable', async () => {
  const f = await fixture()
  try {
    const prepared = await prepare(f, f.entry)
    expect(() => {
      prepared.projected.head.token = 'changed'
    }).toThrow()
    expect(() => {
      prepared.archive.encoded = 'changed'
    }).toThrow()
    f.entry.value.head.token = 'caller-can-still-edit'
    expect(prepared.original.head.token).toBe('token')
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
    const preparing = prepare(f, { ...f.entry, encoded })
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
    const prepared = await prepare(f, f.entry)
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
      prepare(f, { ...f.entry, value: { ...f.entry.value, futureControl: true } }),
    ).rejects.toThrow()
    const changed = structuredClone(f.entry.value)
    changed.write.puts[1]![1] = { id: 'foreign', files: f.project.files }
    await expect(prepare(f, { ...f.entry, value: changed })).rejects.toThrow('outro projeto')
  } finally {
    f.close()
  }
})

test('archive quota failure preserves the source and leaves no partial receipt', async () => {
  const f = await fixture()
  try {
    const prepared = await prepare(f, f.entry)
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

test('staging atomically keeps the archive, v4 journal and original v3 source; fresh preparation is idempotent', async () => {
  const f = await fixture()
  try {
    const source = projectRecoveryKey(f.project.id, f.entry.writer, 3)
    const target = projectRecoveryKey(f.project.id, f.entry.writer, 4)
    await writeInOneTransaction(f.scope.store, { puts: [[source, f.entry.value]] })
    const prepared = await prepare(f, f.entry)
    await stageLocalV3Recovery(f.scope, prepared, true)
    await stageLocalV3Recovery(f.scope, await prepare(f, f.entry), true)
    expect(await readValue(f.scope.store, prepared.backupKey)).toEqual(prepared.archive)
    expect(await readValue(f.scope.store, target)).toEqual(prepared.projected)
    expect(await readValue(f.scope.store, source)).toEqual(f.entry.value)
    expect(await readValue(f.scope.store, projectMetaKey(f.project.id, 4))).toBeUndefined()
  } finally {
    f.close()
  }
})

test('staging preserves both sources when another v4 revision of the writer is pending', async () => {
  const f = await fixture()
  try {
    const prepared = await prepare(f, f.entry)
    const target = projectRecoveryKey(f.project.id, f.entry.writer, 4)
    await readValue(f.scope.store, target)
    const peer = { ...prepared.projected, head: { ...prepared.projected.head, token: 'another' } }
    await writeInOneTransaction(f.scope.store, { puts: [[target, peer]] })
    await expect(stageLocalV3Recovery(f.scope, prepared)).rejects.toThrow('Outra revisão')
    expect(await readValue(f.scope.store, target)).toEqual(peer)
    expect(await readValue(f.scope.store, prepared.backupKey)).toBeUndefined()
    expect(f.entry.value.head.token).toBe('token')
  } finally {
    f.close()
  }
})

test('staging a changed native source cannot leave an archive or v4 journal behind', async () => {
  const f = await fixture()
  try {
    const prepared = await prepare(f, f.entry)
    const source = projectRecoveryKey(f.project.id, f.entry.writer, 3)
    const replacement = { ...f.entry.value, head: { ...f.entry.value.head, token: 'newer' } }
    await writeInOneTransaction(f.scope.store, { puts: [[source, replacement]] })
    await expect(stageLocalV3Recovery(f.scope, prepared, true)).rejects.toThrow('mudou')
    expect(await readValue(f.scope.store, source)).toEqual(replacement)
    expect(await readValue(f.scope.store, prepared.backupKey)).toBeUndefined()
    expect(
      await readValue(f.scope.store, projectRecoveryKey(f.project.id, f.entry.writer, 4)),
    ).toBeUndefined()
  } finally {
    f.close()
  }
})

test('prepared recovery cannot cross profiles or substitute a different backend', async () => {
  const f = await fixture(),
    other = await fixture()
  try {
    const prepared = await prepare(f, f.entry)
    await expect(stageLocalV3Recovery(other.scope, prepared)).rejects.toThrow('perfil')
    await expect(archiveLocalV3Recovery(other.scope, prepared)).rejects.toThrow('perfil')
    await expect(
      stageLocalV3Recovery({ ...other.scope, identity: f.scope.identity }, prepared),
    ).rejects.toThrow('armazenamento')
    expect(await readAllKeys(other.scope.store)).toEqual([])
    await stageLocalV3Recovery(f.scope, prepared)
    expect(
      await readValue(f.scope.store, projectRecoveryKey(f.project.id, f.entry.writer, 4)),
    ).toEqual(prepared.projected)
  } finally {
    f.close()
    other.close()
  }
})

test('a forged prepared object cannot access or write the database', async () => {
  const f = await fixture()
  try {
    const prepared = await prepare(f, f.entry)
    await expect(stageLocalV3Recovery(f.scope, { ...prepared })).rejects.toThrow(
      'preparado novamente',
    )
    await expect(archiveLocalV3Recovery(f.scope, { ...prepared })).rejects.toThrow(
      'preparado novamente',
    )
    expect(await readAllKeys(f.scope.store)).toEqual([])
  } finally {
    f.close()
  }
})

test('quota on the second staging put rolls back the archive and keeps the native source', async () => {
  const f = await fixture()
  try {
    const prepared = await prepare(f, f.entry)
    const source = projectRecoveryKey(f.project.id, f.entry.writer, 3)
    const target = projectRecoveryKey(f.project.id, f.entry.writer, 4)
    await writeInOneTransaction(f.scope.store, { puts: [[source, f.entry.value]] })
    const transaction = f.database.transaction.bind(f.database)
    let injected = false
    f.database.transaction = ((...args: Parameters<IDBDatabase['transaction']>) => {
      const current = transaction(...args)
      if (args[1] === 'readwrite') {
        const objectStore = current.objectStore.bind(current)
        current.objectStore = ((name: string) => {
          const store = objectStore(name),
            put = store.put.bind(store)
          store.put = ((value: unknown, key?: IDBValidKey) => {
            if (key === target) {
              injected = true
              throw new DOMException('Quota de staging', 'QuotaExceededError')
            }
            return put(value, key)
          }) as typeof store.put
          return store
        }) as typeof current.objectStore
      }
      return current
    }) as typeof f.database.transaction
    await expect(stageLocalV3Recovery(f.scope, prepared, true)).rejects.toThrow('Quota')
    expect(injected).toBe(true)
    expect(await readValue(f.scope.store, source)).toEqual(f.entry.value)
    expect(await readValue(f.scope.store, prepared.backupKey)).toBeUndefined()
    expect(await readValue(f.scope.store, target)).toBeUndefined()
  } finally {
    f.close()
  }
})

test('an already consumed journal in a captured key list does not block reopening the confirmed v4 project', async () => {
  const f = await fixture()
  try {
    const key = projectRecoveryKey(f.project.id, f.entry.writer, 3)
    await writeInOneTransaction(f.scope.store, { puts: [[key, f.entry.value]] })
    const observed = await readAllKeys(f.scope.store)
    expect(await recoverLocalV3ProjectWrites(f.scope, f.project.id, observed)).toContain(
      f.project.id,
    )
    const confirmed = await readValue(f.scope.store, projectMetaKey(f.project.id, 4))
    expect(confirmed).toMatchObject({ name: f.project.name })
    expect(await readValue(f.scope.store, key)).toBeUndefined()
    expect(await recoverLocalV3ProjectWrites(f.scope, f.project.id, observed)).toEqual([])
    expect(await readValue(f.scope.store, projectMetaKey(f.project.id, 4))).toEqual(confirmed)
  } finally {
    f.close()
  }
})

for (const payload of [undefined, null, 0, { version: 2 }])
  test(`a present invalid journal is preserved rather than treated as a disappeared source: ${String(payload)}`, async () => {
    const f = await fixture()
    try {
      const key = projectRecoveryKey(f.project.id, f.entry.writer, 3)
      await writeInOneTransaction(f.scope.store, { puts: [[key, payload]] })
      const observed = await readAllKeys(f.scope.store)
      await expect(recoverLocalV3ProjectWrites(f.scope, f.project.id, observed)).rejects.toThrow()
      expect(await readAllKeys(f.scope.store)).toContain(key)
      expect(await readValue(f.scope.store, key)).toEqual(payload)
      expect(await readValue(f.scope.store, projectMetaKey(f.project.id, 4))).toBeUndefined()
    } finally {
      f.close()
    }
  })

// P1 da revisão de 20/11/2026: o arquivo que a migração grava da cópia de saída v3 usava a MESMA
// chave do arquivo de origem de recuperação v4 (`recoverySourceArchiveKey`). Os dois formatos
// colidiam: a revisão que superava a cópia migrada era recusada, e a cópia mais velha do mesmo
// escritor deixava de ser reconhecida como contida na revisão gravada.
const v3Head = (token: string, sequence: number) => ({
  version: 1 as const,
  writer: 'writer',
  token,
  base: null,
  sequence,
})

test('cópia v3 mais velha do mesmo escritor, já contida na revisão gravada, não vira "(edição recuperada)"', async () => {
  const f = await fixture()
  try {
    const later = { ...f.project, name: 'Revisão gravada depois' }
    const { replacesRecovery: _ancestry, ...older } = f.entry.value
    const nativeKey = projectRecoveryKey(f.project.id, 'writer', 3)
    await writeInOneTransaction(f.scope.store, {
      puts: [
        ...projectStorageEntries(later, 3),
        [projectHeadKey(f.project.id, 3), v3Head('gravada', 5)],
        [nativeKey, { ...older, head: v3Head('token', 1) }],
      ],
    })
    await recoverLocalV3ProjectWrites(f.scope, f.project.id)
    const keys = (await readAllKeys(f.scope.store)).map(String)
    expect(keys.filter((key) => key.startsWith('sz:v4:project-meta:'))).toEqual([
      projectMetaKey(f.project.id, 4),
    ])
    expect(await readValue(f.scope.store, projectMetaKey(f.project.id, 4))).toMatchObject({
      name: later.name,
    })
    expect(await readValue(f.scope.store, nativeKey)).toBeUndefined()
    // O arquivo da cópia v3 fica guardado (nada se perde).
    const archives = keys.filter((key) => key.startsWith(`sz:v4:project-backup:${f.project.id}:`))
    const values = await Promise.all(archives.map((key) => readValue(f.scope.store, key)))
    expect(values).toContainEqual(expect.objectContaining({ sourceVersion: 3, token: 'token' }))
  } finally {
    f.close()
  }
})

test('a revisão v4 que supera a cópia v3 migrada arquiva a origem sem esbarrar no arquivo da migração', async () => {
  const f = await fixture()
  try {
    const prepared = await prepare(f, f.entry)
    await archiveLocalV3Recovery(f.scope, prepared)
    const staged = projectRecoveryKey(f.project.id, 'writer', 4)
    await writeInOneTransaction(f.scope.store, { puts: [[staged, prepared.projected]] })
    const child = {
      version: 1,
      projectId: f.project.id,
      head: { version: 1, writer: 'nova-aba', token: 'filho', base: null, sequence: 0 },
      applications: [],
      write: { puts: projectStorageEntries({ ...f.project, name: 'Depois da cópia' }, 4) },
      replacesRecovery: [{ key: staged, token: 'token' }],
    } satisfies RecoveryWrite
    const sources = await prepareRecoverySources(
      f.scope,
      child,
      child.replacesRecovery,
      projectRecoveryKey(f.project.id, 'nova-aba', 4),
      4,
    )
    expect(sources.puts.map(([key]) => key)).toEqual([
      await recoverySourceArchiveKey(f.project.id, 'writer', 'token', 4),
    ])
    expect(sources.puts[0]![0]).not.toBe(prepared.backupKey)
    expect(await readValue(f.scope.store, prepared.backupKey)).toEqual(prepared.archive)
  } finally {
    f.close()
  }
})

// Navegadores da staging que rodaram a migração antes desta correção guardam o arquivo da cópia
// v3 na chave do arquivo de origem. Ele continua valendo como o arquivo daquela revisão.
async function legacyArchive(f: Awaited<ReturnType<typeof fixture>>, value: RecoveryWrite) {
  const prepared = await prepare(f, { ...f.entry, value, encoded: encodeExitJournal(value) })
  const legacyKey = await recoverySourceArchiveKey(f.project.id, 'writer', value.head.token, 4)
  await writeInOneTransaction(f.scope.store, { puts: [[legacyKey, prepared.archive]] })
  return { prepared, legacyKey }
}

test('o arquivo v3 antigo, gravado na chave da origem, vale como o arquivo daquela revisão', async () => {
  const f = await fixture()
  try {
    const { prepared, legacyKey } = await legacyArchive(f, f.entry.value)
    const staged = projectRecoveryKey(f.project.id, 'writer', 4)
    await writeInOneTransaction(f.scope.store, { puts: [[staged, prepared.projected]] })
    const child = {
      version: 1,
      projectId: f.project.id,
      head: { version: 1, writer: 'nova-aba', token: 'filho', base: null, sequence: 0 },
      applications: [],
      write: { puts: projectStorageEntries({ ...f.project, name: 'Depois da cópia' }, 4) },
      replacesRecovery: [{ key: staged, token: 'token' }],
    } satisfies RecoveryWrite
    const stagedKey = projectRecoveryKey(f.project.id, 'nova-aba', 4)
    const sources = await prepareRecoverySources(
      f.scope,
      child,
      child.replacesRecovery,
      stagedKey,
      4,
    )
    expect(sources.puts).toEqual([])
    expect(await readValue(f.scope.store, legacyKey)).toEqual(prepared.archive)
    // Conteúdo diferente sob o mesmo token continua recusado: os dois ficam preservados.
    const changed = structuredClone(prepared.projected) as RecoveryWrite
    const meta = changed.write.puts!.find(([key]) => key === projectMetaKey(f.project.id, 4))!
    meta[1] = { ...(meta[1] as object), name: 'Outro conteúdo' }
    await writeInOneTransaction(f.scope.store, { puts: [[staged, changed]] })
    await expect(
      prepareRecoverySources(f.scope, child, child.replacesRecovery, stagedKey, 4),
    ).rejects.toThrow('outra revisão')
    expect(await readValue(f.scope.store, legacyKey)).toEqual(prepared.archive)
  } finally {
    f.close()
  }
})

test('com o arquivo v3 antigo na chave da origem, a cópia mais velha do mesmo escritor também não se duplica', async () => {
  const f = await fixture()
  try {
    const later = { ...f.project, name: 'Revisão gravada depois' }
    const { replacesRecovery: _ancestry, ...rest } = f.entry.value
    const older = { ...rest, head: v3Head('token', 1) } satisfies RecoveryWrite
    const { legacyKey, prepared } = await legacyArchive(f, older)
    await writeInOneTransaction(f.scope.store, {
      puts: [
        ...projectStorageEntries(later, 3),
        [projectHeadKey(f.project.id, 3), v3Head('gravada', 5)],
        [projectRecoveryKey(f.project.id, 'writer', 3), older],
      ],
    })
    await recoverLocalV3ProjectWrites(f.scope, f.project.id)
    const keys = (await readAllKeys(f.scope.store)).map(String)
    expect(keys.filter((key) => key.startsWith('sz:v4:project-meta:'))).toEqual([
      projectMetaKey(f.project.id, 4),
    ])
    expect(await readValue(f.scope.store, legacyKey)).toEqual(prepared.archive)
  } finally {
    f.close()
  }
})

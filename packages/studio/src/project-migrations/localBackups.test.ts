import { expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { createEmptyProject, type Project } from '../core/project'
import { encodeExitJournal } from '../state/exitJournalCodec'
import { readAllKeys, readValue, writeInOneTransaction } from '../state/idbTransaction'
import { encodeProjectJsonGraph } from '../state/projectJsonGraph'
import { decodeProjectJsonGraph } from '../state/projectJsonGraphDecode'
import { recoverySourceArchiveKey } from '../state/projectRecoverySources'
import type { RecoveryWrite } from '../state/projectStorageCoordinator'
import {
  projectBackupKey,
  projectHeadKey,
  projectMetaKey,
  projectRecoveryKey,
} from '../state/projectStorageKeys'
import { projectStorageEntries } from '../state/projectStorageRecords'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'
import {
  exportPreservedProjectRecords,
  listLocalProjectBackups,
  projectFromStorageRecords,
  RESTORED_COPY_SUFFIX,
  readLocalProjectBackup,
  restoreLocalProjectBackup,
  restorePreservedProject,
} from './localBackups'
import { migrateLocalProject } from './localProjects'
import { migrateLocalV3Project } from './localV3'
import { archiveLocalV3Recovery, prepareLocalV3Recovery } from './localV3Recovery'

function database(): ProjectStorageScope {
  const identity = `backups-${crypto.randomUUID()}`
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = new IDBFactory().open(identity, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('kv')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return {
    identity,
    namespace: 'perfil-a',
    store: async (mode, callback) =>
      callback((await opening).transaction('kv', mode).objectStore('kv')),
  }
}

const head = { version: 1 as const, token: 'v3-base', writer: 'tab', base: null, sequence: 3 }

function v3Project(id = 'jogo-v3') {
  const project = createEmptyProject(id, 'Meu jogo de antes')
  project.files['script.js'] = 'console.log("antes da atualização")'
  return Object.assign(project, { futureTool: { zero: -0, optional: undefined, nested: [1, 2] } })
}

async function seedV3(scope: ProjectStorageScope, project: Project = v3Project()) {
  await writeInOneTransaction(scope.store, {
    puts: [...projectStorageEntries(project, 3), [projectHeadKey(project.id, 3), head]],
  })
  return project
}

test('o backup da migração v3→v4 devolve o documento de antes, sem gravar nada', async () => {
  const scope = database()
  const original = await seedV3(scope)
  await migrateLocalV3Project(original.id, scope)
  expect(await readValue(scope.store, projectMetaKey(original.id, 3))).toBeUndefined()

  const backups = await listLocalProjectBackups(original.id, scope)
  expect(backups).toHaveLength(1)
  expect(backups[0]).toMatchObject({ kind: 'v3', projectId: original.id })
  const keysBefore = await readAllKeys(scope.store)

  const restored = await readLocalProjectBackup(backups[0]!, scope)
  expect(restored).toMatchObject({ id: original.id, name: original.name })
  expect(restored?.files).toEqual(original.files)
  const futureTool = restored?.futureTool as Record<string, unknown>
  expect(Object.is(futureTool.zero, -0)).toBe(true)
  expect(Object.hasOwn(futureTool, 'optional')).toBe(true)
  expect(await readAllKeys(scope.store)).toEqual(keysBefore)
})

test('restaurar cria uma cópia NOVA pelo import; o projeto atual e o backup ficam', async () => {
  const scope = database()
  const original = await seedV3(scope)
  await migrateLocalV3Project(original.id, scope)
  const [backup] = await listLocalProjectBackups(original.id, scope)
  const current = await readValue(scope.store, projectMetaKey(original.id, 4))
  const calls: Array<{ raw: unknown; opts: { name: string; namespace: string } }> = []

  const result = await restoreLocalProjectBackup(backup!, {
    scope,
    importSnapshot: async (raw, opts) => {
      calls.push({ raw, opts })
      return { project: { id: 'novo-id', name: opts.name }, warnings: [] }
    },
  })

  expect(result).toEqual({
    id: 'novo-id',
    name: `${original.name}${RESTORED_COPY_SUFFIX}`,
    warnings: [],
  })
  expect(calls).toHaveLength(1)
  expect(calls[0]!.opts.namespace).toBe('perfil-a')
  expect((calls[0]!.raw as { files: unknown }).files).toEqual(original.files)
  expect(await readValue(scope.store, projectMetaKey(original.id, 4))).toEqual(current)
  expect(await readValue(scope.store, backup!.key)).toBeDefined()
})

test('o backup de um layout v1/v2 também reconstrói o projeto', async () => {
  const scope = database()
  const original = { ...createEmptyProject('antigo', 'Do tempo do v2'), formatVersion: 2 }
  await writeInOneTransaction(scope.store, { puts: [['sz:v2:project:antigo', original]] })
  await migrateLocalProject('antigo', scope, 4)

  const backups = await listLocalProjectBackups('antigo', scope)
  expect(backups.map((backup) => backup.kind)).toEqual(['legacy-layout'])
  const restored = await readLocalProjectBackup(backups[0]!, scope)
  expect(restored).toMatchObject({ id: 'antigo', name: 'Do tempo do v2' })
  expect(restored?.files).toEqual(original.files)
})

test('o backup antigo (v3, registros em lista) é lido pela mesma porta', async () => {
  const scope = database()
  const original = createEmptyProject('lista', 'Backup em lista')
  const sourceKeys = ['sz:project:lista', 'sz:project-meta:lista']
  await writeInOneTransaction(scope.store, {
    puts: [
      [
        'sz:project-backup:lista:abc',
        {
          version: 1,
          sourceId: 'lista',
          capturedAt: 10,
          sourceKeys,
          records: [original, undefined],
        },
      ],
    ],
  })
  const [backup] = await listLocalProjectBackups('lista', scope)
  expect(backup).toMatchObject({ kind: 'legacy-layout', capturedAt: 10 })
  expect(await readLocalProjectBackup(backup!, scope)).toMatchObject({ name: 'Backup em lista' })
})

test('backup de outro projeto com o mesmo prefixo (id com dois-pontos) não é listado', async () => {
  const scope = database()
  const other = v3Project('a:b')
  await seedV3(scope, other)
  await migrateLocalV3Project('a:b', scope)
  expect(await listLocalProjectBackups('a', scope)).toEqual([])
  expect(await listLocalProjectBackups('a:b', scope)).toHaveLength(1)
})

test('um ancestral de recuperação arquivado reconstrói a revisão daquela gravação', async () => {
  const scope = database()
  const project = createEmptyProject('rec', 'Gravação interrompida')
  const recovery = {
    version: 1,
    projectId: 'rec',
    head: { ...head, token: 'tok', writer: 'w' },
    write: { puts: projectStorageEntries(project, 4) },
    applications: [],
  }
  const encoded = encodeProjectJsonGraph(recovery)
  await writeInOneTransaction(scope.store, {
    puts: [
      [
        projectBackupKey('rec', 'recovery-x', 4),
        { version: 1, kind: 'recovery-source', projectId: 'rec', encoded, sha256: 'x' },
      ],
    ],
  })
  const [backup] = await listLocalProjectBackups('rec', scope)
  expect(backup?.kind).toBe('recovery-source')
  expect(await readLocalProjectBackup(backup!, scope)).toMatchObject({
    id: 'rec',
    name: 'Gravação interrompida',
  })
})

test('sem partições completas não há documento (não inventa projeto)', () => {
  expect(projectFromStorageRecords('x', [['sz:v4:project-meta:x', { id: 'x' }]])).toBeNull()
  expect(projectFromStorageRecords('x', [])).toBeNull()
})

test('a exportação de emergência leva só os registros deste projeto e o journal de saída', async () => {
  const scope = database()
  const original = await seedV3(scope)
  await seedV3(scope, v3Project('outro'))
  await migrateLocalV3Project(original.id, scope)
  const journal = new Map<string, string>([
    [`sz:studio-exit:1|${scope.identity}|${original.id}|w|t`, '{"x":1}'],
    [`sz:studio-exit:1|${scope.identity}|outro|w|t`, '{"y":1}'],
  ])
  const storage = {
    get length() {
      return journal.size
    },
    key: (index: number) => [...journal.keys()][index] ?? null,
    getItem: (key: string) => journal.get(key) ?? null,
  } as unknown as Storage

  const text = await exportPreservedProjectRecords(original.id, {
    ...scope,
    exitJournalStorage: storage,
  })
  const payload = JSON.parse(text)
  expect(payload).toMatchObject({
    format: 'sz-preserved-project',
    version: 1,
    projectId: original.id,
  })
  const records = decodeProjectJsonGraph(payload.indexedDb) as Array<[string, unknown]>
  const keys = records.map(([key]) => key)
  expect(keys).toContain(projectMetaKey(original.id, 4))
  expect(keys.some((key) => key.startsWith(`sz:v4:project-backup:${original.id}:`))).toBe(true)
  expect(keys.some((key) => key.includes('outro'))).toBe(false)
  expect(payload.exitJournal).toEqual([
    [`sz:studio-exit:1|${scope.identity}|${original.id}|w|t`, '{"x":1}'],
  ])
})

const fakeImport = async (raw: unknown, opts: { name: string }) => ({
  project: { id: `copia-${(raw as { id: string }).id}`, name: opts.name },
  warnings: [] as string[],
})

test('card preservado sem backup: a cópia vem dos registros que continuam no lugar', async () => {
  const scope = database()
  // A migração não chegou a promover: as partições v3 estão aí e não há backup.
  const original = await seedV3(scope)
  expect(await listLocalProjectBackups(original.id, scope)).toEqual([])
  const imported: unknown[] = []
  const copy = await restorePreservedProject(original.id, {
    scope,
    importSnapshot: async (raw, opts) => {
      imported.push(raw)
      return fakeImport(raw, opts)
    },
  })
  expect(copy).toMatchObject({ source: 'records', name: `${original.name}${RESTORED_COPY_SUFFIX}` })
  expect((imported[0] as { files: unknown }).files).toEqual(original.files)
  // Nada foi apagado nem regravado.
  expect(await readValue(scope.store, `sz:v3:project-meta:${original.id}`)).toBeDefined()
})

// P1 da revisão de 20/11/2026: "Restaurar uma cópia" pegava o backup do dia da migração antes de
// tudo e ignorava a edição preservada, que é justamente o que o card "Preservado" guarda.
function capturingImport() {
  const imported: Array<{ files: Project['files']; name: string }> = []
  return {
    imported,
    importSnapshot: async (raw: unknown, opts: { name: string; namespace: string }) => {
      imported.push(raw as { files: Project['files']; name: string })
      return fakeImport(raw, opts)
    },
  }
}

function editedProject(id: string, script: string, updatedAt: number) {
  const project = createEmptyProject(id, 'Meu jogo de antes')
  project.files['script.js'] = script
  project.updatedAt = updatedAt
  return project
}

function exitCopy(
  project: ReturnType<typeof editedProject>,
  writer: string,
  version: 3 | 4,
  extra: Partial<RecoveryWrite> = {},
): RecoveryWrite {
  return {
    version: 1,
    projectId: project.id,
    head: { version: 1, writer, token: `saida-${writer}`, base: 'v3-base', sequence: 0 },
    applications: [],
    write: { puts: projectStorageEntries(project, version) },
    ...extra,
  }
}

test('sem edição preservada, a cópia é o documento atual; o backup do dia da migração fica por último', async () => {
  const scope = database()
  const original = await seedV3(scope)
  await migrateLocalV3Project(original.id, scope)
  const copy = await restorePreservedProject(original.id, { scope, importSnapshot: fakeImport })
  expect(copy?.source).toBe('records')
})

test('só o backup reconstrói: a cópia vem dele', async () => {
  const scope = database()
  const original = await seedV3(scope)
  await migrateLocalV3Project(original.id, scope)
  await writeInOneTransaction(scope.store, {
    deletes: (await readAllKeys(scope.store)).filter((key) =>
      /^sz:v4:project-(meta|files|state):/.test(String(key)),
    ),
  })
  const { imported, importSnapshot } = capturingImport()
  const copy = await restorePreservedProject(original.id, { scope, importSnapshot })
  expect(copy?.source).toBe('backup')
  expect(imported[0]!.files).toEqual(original.files)
})

test('com uma cópia de saída v3 deixada depois da migração, a cópia restaurada é essa edição', async () => {
  const scope = database()
  const original = await seedV3(scope)
  await migrateLocalV3Project(original.id, scope)
  const edit = editedProject(original.id, 'console.log("edição preservada")', Date.now() + 60_000)
  const nativeKey = projectRecoveryKey(original.id, 'aba-antiga', 3)
  await writeInOneTransaction(scope.store, {
    puts: [[nativeKey, exitCopy(edit, 'aba-antiga', 3)]],
  })
  const { imported, importSnapshot } = capturingImport()
  const copy = await restorePreservedProject(original.id, { scope, importSnapshot })
  expect(copy?.source).toBe('edit')
  expect(imported[0]!.files['script.js']).toBe('console.log("edição preservada")')
  // Nada do que existe muda: a cópia de saída, o documento atual e o backup continuam lá.
  expect(await readValue(scope.store, nativeKey)).toBeDefined()
  expect(await readValue(scope.store, projectMetaKey(original.id, 4))).toBeDefined()
  expect(await listLocalProjectBackups(original.id, scope)).toHaveLength(1)
})

test('entre várias edições preservadas vale a mais nova; a de blocos incompletos não entra', async () => {
  const scope = database()
  const original = await seedV3(scope)
  await migrateLocalV3Project(original.id, scope)
  const now = Date.now()
  const older = editedProject(original.id, 'console.log("cópia v4 mais velha")', now + 1_000)
  const newer = editedProject(original.id, 'console.log("cópia v4 mais nova")', now + 2_000)
  const incomplete = editedProject(original.id, 'console.log("sem os blocos")', now + 3_000)
  await writeInOneTransaction(scope.store, {
    puts: [
      [projectRecoveryKey(original.id, 'aba-1', 4), exitCopy(older, 'aba-1', 4)],
      [projectRecoveryKey(original.id, 'aba-2', 4), exitCopy(newer, 'aba-2', 4)],
      [
        projectRecoveryKey(original.id, 'aba-3', 4),
        exitCopy(incomplete, 'aba-3', 4, { incompleteBlocks: true }),
      ],
    ],
  })
  const { imported, importSnapshot } = capturingImport()
  const copy = await restorePreservedProject(original.id, { scope, importSnapshot })
  expect(copy?.source).toBe('edit')
  expect(imported[0]!.files['script.js']).toBe('console.log("cópia v4 mais nova")')
})

test('a cópia de saída que ficou no journal síncrono também é a edição preservada', async () => {
  const scope = database()
  const original = await seedV3(scope)
  await migrateLocalV3Project(original.id, scope)
  const edit = editedProject(original.id, 'console.log("só no journal")', Date.now() + 60_000)
  const value = exitCopy(edit, 'aba-saindo', 4)
  const key = `sz:studio-exit:1|${encodeURIComponent(scope.identity)}|${original.id}|aba-saindo|${value.head.token}`
  globalThis.localStorage.setItem(key, encodeExitJournal(value))
  try {
    const { imported, importSnapshot } = capturingImport()
    const copy = await restorePreservedProject(original.id, {
      scope: { ...scope, exitJournalStorage: globalThis.localStorage },
      importSnapshot,
    })
    expect(copy?.source).toBe('edit')
    expect(imported[0]!.files['script.js']).toBe('console.log("só no journal")')
    expect(globalThis.localStorage.getItem(key)).not.toBeNull()
  } finally {
    globalThis.localStorage.removeItem(key)
  }
})

test('as partes v3 que uma aba antiga gravou depois da migração são a edição preservada', async () => {
  const scope = database()
  const original = await seedV3(scope)
  await migrateLocalV3Project(original.id, scope)
  const edit = editedProject(original.id, 'console.log("gravado pela aba v3")', Date.now() + 60_000)
  await seedV3(scope, edit)
  const { imported, importSnapshot } = capturingImport()
  const copy = await restorePreservedProject(original.id, { scope, importSnapshot })
  expect(copy?.source).toBe('records')
  expect(imported[0]!.files['script.js']).toBe('console.log("gravado pela aba v3")')
})

test('o arquivo da cópia v3 que a migração guardou é listado e devolve aquela edição', async () => {
  const scope = database()
  const original = await seedV3(scope)
  await migrateLocalV3Project(original.id, scope)
  const edit = editedProject(original.id, 'console.log("cópia v3 arquivada")', Date.now())
  const value = exitCopy(edit, 'aba-antiga', 3)
  const prepared = await prepareLocalV3Recovery(
    {
      key: 'entrada-imutavel',
      projectId: original.id,
      writer: 'aba-antiga',
      token: value.head.token,
      value,
      encoded: encodeExitJournal(value),
    },
    scope,
  )
  await archiveLocalV3Recovery(scope, prepared)
  // O mesmo arquivo, gravado antes de 20/11/2026 na chave do arquivo de origem.
  const legacyKey = await recoverySourceArchiveKey(original.id, 'aba-antiga', value.head.token, 4)
  await writeInOneTransaction(scope.store, { puts: [[legacyKey, prepared.archive]] })
  const backups = await listLocalProjectBackups(original.id, scope)
  const archived = backups.filter((backup) => backup.kind === 'v3-recovery')
  expect(archived.map((backup) => backup.key).sort()).toEqual(
    [prepared.backupKey, legacyKey].sort(),
  )
  for (const backup of archived)
    expect((await readLocalProjectBackup(backup, scope))?.files).toMatchObject({
      'script.js': 'console.log("cópia v3 arquivada")',
    })
})

test('sem backup e sem registros, não inventa cópia', async () => {
  expect(
    await restorePreservedProject('nada-aqui', { scope: database(), importSnapshot: fakeImport }),
  ).toBeNull()
})

test('arquivo físico conserva envelope futuro e separa perfil, anônimo, id e prefixos no journal compartilhado', async () => {
  const db = database()
  const id = 'oficina',
    future = {
      format: 'sz-project-json-graph',
      version: 9,
      payload: 'desconhecido',
      campo: { presente: undefined },
    }
  const part = projectMetaKey(id)
  await db.store(
    'readwrite',
    (s) =>
      new Promise<void>((resolve, reject) => {
        s.transaction.oncomplete = () => resolve()
        s.transaction.onabort = () => reject(s.transaction.error)
        s.put(future, part)
        s.put('outro id', projectMetaKey('oficina:outra'))
        s.put('backup de outro id', projectBackupKey('oficina:outra', 'a'.repeat(64)))
        s.put('outro projeto', projectRecoveryKey('x', id))
      }),
  )
  const names = [
    'sistema-zero-studio-pessoa',
    'sistema-zero-studio-pessoa-extra',
    'sistema-zero-studio',
    'pinta:regional/ç',
  ]
  const key = (owner: string, project: string) =>
    'sz:studio-exit:' + ['1', owner, project, 'escritor', 'token'].map(encodeURIComponent).join('|')
  const values = new Map<string, string>()
  for (const owner of names) {
    values.set(key(owner, id), 'futuro de ' + owner)
    values.set(key(owner, 'oficina-extra'), 'outro projeto')
    values.set(key(owner, 'outro').replace('escritor', id), 'id só na posição de escritor')
    values.set(key(owner, id) + '|sobra', 'chave distinta')
  }
  const storage = {
    get length() {
      return values.size
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (k: string) => values.get(k) ?? null,
  } as unknown as Storage
  for (const owner of names) {
    const report = JSON.parse(
      await exportPreservedProjectRecords(id, {
        ...db,
        identity: owner,
        exitJournalStorage: storage,
      }),
    )
    expect(report.exitJournal).toEqual([[key(owner, id), 'futuro de ' + owner]])
    expect(decodeProjectJsonGraph(report.indexedDb)).toStrictEqual([[part, future]])
  }
})

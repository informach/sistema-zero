import { expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { createEmptyProject } from '../core/project'
import { readAllKeys, readValue, writeInOneTransaction } from '../state/idbTransaction'
import { encodeProjectJsonGraph } from '../state/projectJsonGraph'
import { decodeProjectJsonGraph } from '../state/projectJsonGraphDecode'
import { projectBackupKey, projectHeadKey, projectMetaKey } from '../state/projectStorageKeys'
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

async function seedV3(scope: ProjectStorageScope, project = v3Project()) {
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

test('com backup, o card preservado restaura o backup', async () => {
  const scope = database()
  const original = await seedV3(scope)
  await migrateLocalV3Project(original.id, scope)
  const copy = await restorePreservedProject(original.id, { scope, importSnapshot: fakeImport })
  expect(copy?.source).toBe('backup')
})

test('sem backup e sem registros, não inventa cópia', async () => {
  expect(
    await restorePreservedProject('nada-aqui', { scope: database(), importSnapshot: fakeImport }),
  ).toBeNull()
})

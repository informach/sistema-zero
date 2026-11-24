import { expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { createEmptyProject } from '../core/project'
import { readAllKeys, readValue, writeInOneTransaction } from './idbTransaction'
import {
  listAllProjects,
  listProjectSummariesLight,
  loadProjectAssetsById,
  loadProjectBlocksById,
  loadProjectById,
  loadProjectMetaById,
  loadProjectShellById,
  loadProjectSummariesByIds,
  loadProjectSummaryById,
  persistProject,
} from './persistence'
import { encodeProjectJsonGraph } from './projectJsonGraph'
import { bindProjectToDurableHead } from './projectStorageCoordinator'
import {
  PROJECT_STORAGE_VERSION,
  projectFilesKey,
  projectHeadKey,
  projectMetaKey,
  projectRecoveryKey,
} from './projectStorageKeys'
import { projectStorageEntries } from './projectStorageRecords'
import type { ProjectStorageScope } from './projectStorageRuntime'

async function fixture() {
  const identity = `v4-opening-${crypto.randomUUID()}`
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
  const project = Object.assign(createEmptyProject('opening-project', 'Projeto anterior'), {
    futureSlot: undefined,
    futureMetadata: { retained: undefined, zero: -0 },
    mode: 'code' as const,
    files: { 'index.html': '', 'style.css': '', 'script.js': 'const pontos = 4;' },
    assets: [
      {
        id: 'image',
        name: 'imagem',
        kind: 'image' as const,
        source: 'upload' as const,
        dataUrl:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII=',
      },
    ],
  })
  const seed = async (version: 3 | 4 = 3) => {
    if (version === 4) await readValue(scope.store, projectMetaKey(project.id, 4))
    await writeInOneTransaction(scope.store, {
      puts: [
        ...projectStorageEntries(project, version),
        [
          projectHeadKey(project.id, version),
          { version: 1, token: 'original-token', writer: 'old-tab', base: null, sequence: 1 },
        ],
      ],
    })
  }
  return { scope, project, seed, database, close: () => database.close() }
}

const loaders = {
  document: loadProjectById,
  shell: loadProjectShellById,
  metadata: loadProjectMetaById,
  blocks: loadProjectBlocksById,
  assets: loadProjectAssetsById,
  summary: loadProjectSummaryById,
  summaries: (id: string, scope: ProjectStorageScope) => loadProjectSummariesByIds([id], scope),
}
for (const [name, load] of Object.entries(loaders))
  test(`v4 ${name} read crosses the legacy boundary without visiting the project list`, async () => {
    expect(PROJECT_STORAGE_VERSION).toBe(4)
    const f = await fixture()
    try {
      await f.seed()
      await load(f.project.id, f.scope)
      expect(await readValue(f.scope.store, projectMetaKey(f.project.id, 4))).toMatchObject({
        name: f.project.name,
        storageVersion: 4,
      })
      expect(await readValue(f.scope.store, projectMetaKey(f.project.id, 3))).toBeUndefined()
      const loaded = await loadProjectById(f.project.id, f.scope)
      expect(loaded!.files).toEqual(f.project.files)
      expect(loaded!.assets).toEqual(f.project.assets)
      expect(Object.hasOwn(loaded!, 'futureSlot')).toBe(true)
      expect(encodeProjectJsonGraph(loaded!.futureMetadata)).toBe(
        encodeProjectJsonGraph(f.project.futureMetadata),
      )
    } finally {
      f.close()
    }
  })

test('v4 project lists migrate bases and isolate one future project without hiding healthy projects', async () => {
  expect(PROJECT_STORAGE_VERSION).toBe(4)
  const f = await fixture()
  try {
    await f.seed()
    const future = { ...f.project, id: 'future-project', formatVersion: 9999 }
    await writeInOneTransaction(f.scope.store, {
      puts: [
        ...projectStorageEntries(future, 3),
        [
          projectHeadKey(future.id, 3),
          { version: 1, token: 'future', writer: 'old-tab', base: null, sequence: 1 },
        ],
        [`sz:project:${future.id}`, { ...f.project, id: future.id, name: 'Cópia mais velha' }],
      ],
    })
    const listed = await listAllProjects(f.scope)
    expect(listed.find((item) => item.id === f.project.id)?.migrationPending).toBeUndefined()
    expect(listed.find((item) => item.id === future.id)).toMatchObject({
      migrationPending: true,
      hasPreservedEdit: true,
    })
    await expect(loadProjectById(future.id, f.scope)).rejects.toThrow()
    expect(await readValue(f.scope.store, projectMetaKey(future.id, 4))).toBeUndefined()
    expect(await readValue(f.scope.store, projectMetaKey(future.id, 3))).toMatchObject({
      formatVersion: 9999,
    })
    expect(await readValue(f.scope.store, `sz:project:${future.id}`)).toMatchObject({
      name: 'Cópia mais velha',
    })
    expect(
      (await listProjectSummariesLight(f.scope)).find((item) => item.id === f.project.id),
    ).toBeDefined()
    expect(
      (await listProjectSummariesLight(f.scope)).find((item) => item.id === future.id),
    ).toMatchObject({ migrationPending: true, hasPreservedEdit: true })
  } finally {
    f.close()
  }
})

for (const load of [loadProjectById, loadProjectShellById])
  test(`v4 ${load.name} refuses another partition owner instead of masking it`, async () => {
    const f = await fixture()
    try {
      await f.seed(4)
      const key = projectFilesKey(f.project.id, 4)
      const wrong = { ...((await readValue(f.scope.store, key)) as object), id: 'another-project' }
      await writeInOneTransaction(f.scope.store, { puts: [[key, wrong]] })
      await expect(load(f.project.id, f.scope)).rejects.toThrow('outra identidade')
      expect(await readValue(f.scope.store, key)).toEqual(wrong)
    } finally {
      f.close()
    }
  })

test('partial current v4 storage cannot fall back to an older portable project', async () => {
  const f = await fixture()
  try {
    await readValue(f.scope.store, projectMetaKey(f.project.id, 4))
    const meta = projectStorageEntries(f.project, 4)[0]!
    await writeInOneTransaction(f.scope.store, {
      puts: [meta, [`sz:project:${f.project.id}`, f.project]],
    })
    await expect(loadProjectById(f.project.id, f.scope)).rejects.toThrow('incompletas')
    expect(await readValue(f.scope.store, `sz:project:${f.project.id}`)).toEqual(f.project)
    expect(await readValue(f.scope.store, projectFilesKey(f.project.id, 4))).toBeUndefined()
  } finally {
    f.close()
  }
})

// P4 da revisão de 20/11/2026: a migração v3 → v4 só troca o formato (a cabeça v3 vira a
// cabeça v4, o conteúdo é o mesmo). Capturar a base ANTES dela fazia a primeira substituição
// de um projeto que só existia em v3 acusar um conflito falso.
test('substituir um projeto que só existe em v3 não acusa conflito: migrar não muda o conteúdo', async () => {
  const f = await fixture()
  try {
    await f.seed()
    const incoming = { ...f.project, name: 'Snapshot recebido depois' }
    await bindProjectToDurableHead(incoming, f.scope)
    await persistProject(incoming, { replace: true }, f.scope)
    expect(await readValue(f.scope.store, projectMetaKey(f.project.id, 4))).toMatchObject({
      name: 'Snapshot recebido depois',
      storageVersion: 4,
    })
    expect(await readValue(f.scope.store, projectMetaKey(f.project.id, 3))).toBeUndefined()
    // O backup da migração continua lá: substituir não apaga o que a migração guardou.
    expect(
      (await readAllKeys(f.scope.store)).some((key) =>
        String(key).startsWith('sz:v4:project-backup:'),
      ),
    ).toBe(true)
  } finally {
    f.close()
  }
})

test('um rascunho recuperado durante o vínculo continua protegido: a substituição não o apaga', async () => {
  const f = await fixture()
  try {
    await f.seed()
    // Uma aba v3 deixou um rascunho de saída mais novo do que o documento gravado.
    const draft = { ...f.project, name: 'Edição que só a recuperação conhece' }
    await writeInOneTransaction(f.scope.store, {
      puts: [
        [
          projectRecoveryKey(f.project.id, 'aba-antiga', 3),
          {
            version: 1,
            projectId: f.project.id,
            head: {
              version: 1,
              token: 'rascunho',
              writer: 'aba-antiga',
              base: 'original-token',
              sequence: 0,
            },
            applications: [],
            write: { puts: projectStorageEntries(draft, 3) },
          },
        ],
      ],
    })
    const incoming = { ...f.project, name: 'Snapshot recebido depois' }
    await bindProjectToDurableHead(incoming, f.scope)
    await expect(persistProject(incoming, { replace: true }, f.scope)).rejects.toThrow()
    expect(await readValue(f.scope.store, projectMetaKey(f.project.id, 4))).toMatchObject({
      name: draft.name,
    })
  } finally {
    f.close()
  }
})

test('first-write migration reserves its queue position before another unbound save', async () => {
  const f = await fixture()
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let entered!: () => void
  const began = new Promise<void>((resolve) => {
    entered = resolve
  })
  const pending: Promise<void>[] = []
  try {
    await f.seed(3)
    let reads = 0
    const scope: ProjectStorageScope = {
      ...f.scope,
      store: (mode, callback) => {
        if (mode === 'readonly' && ++reads === 1) {
          entered()
          return gate.then(() => f.scope.store(mode, callback))
        }
        return f.scope.store(mode, callback)
      },
    }
    const first = persistProject({ ...f.project, name: 'Primeiro snapshot recebido' }, {}, scope)
    pending.push(first)
    await began
    const second = persistProject({ ...f.project, name: 'Segundo snapshot recebido' }, {}, scope)
    pending.push(second)
    await Bun.sleep(0)
    // Both mutations were requested, but only the first may begin preparation.
    expect(reads).toBe(1)
    release()
    expect((await Promise.allSettled([first, second])).map((result) => result.status)).toEqual([
      'rejected',
      'rejected',
    ])
    expect(await readValue(f.scope.store, projectMetaKey(f.project.id, 4))).toMatchObject({
      name: f.project.name,
    })
    expect(await readValue(f.scope.store, projectFilesKey(f.project.id, 4))).toMatchObject({
      files: f.project.files,
    })
  } finally {
    release()
    await Promise.allSettled(pending)
    f.close()
  }
})

test('a journal with a foreign key cannot advertise a recoverable project for its claimed owner', async () => {
  const f = await fixture()
  try {
    await f.seed(4)
    const other = createEmptyProject('other-project', 'Cópia sem identidade válida')
    const value = {
      version: 1,
      projectId: other.id,
      head: { version: 1, token: 'foreign', writer: 'writer', base: null, sequence: 1 },
      applications: [],
      write: { puts: projectStorageEntries(other, 4) },
    }
    const key = projectRecoveryKey(f.project.id, 'writer', 4)
    await writeInOneTransaction(f.scope.store, { puts: [[key, value]] })
    const summaries = await listAllProjects(f.scope)
    expect(summaries.some((summary) => summary.id === other.id)).toBe(false)
    expect(summaries.find((summary) => summary.id === f.project.id)).toMatchObject({
      migrationPending: true,
      hasPreservedEdit: true,
    })
    expect(await readValue(f.scope.store, key)).toEqual(value)
    expect(await readValue(f.scope.store, projectMetaKey(other.id, 4))).toBeUndefined()
  } finally {
    f.close()
  }
})

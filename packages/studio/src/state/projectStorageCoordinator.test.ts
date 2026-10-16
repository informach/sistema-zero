import { describe, expect, it } from 'bun:test'
import { studioProDigest } from '@sistemazero/core/studio'
import { IDBFactory } from 'fake-indexeddb'
import { digestProAssistance, getProAssistance, parseProAssistance } from '../core/proAssistance'
import { createEmptyProject } from '../core/project'
import { buildProProject } from '../core/proProject'
import { migrateLocalProject } from '../project-migrations/localProjects'
import { readAllKeys, readValue, writeInOneTransaction } from './idbTransaction'
import {
  deleteProject,
  listAllProjects,
  loadProjectById,
  loadProjectShellById,
  persistProject,
} from './persistence'
import { proBuilderDeletionKey } from './proBuilderDeletion'
import { projectPersistence, registerProjectPersistence } from './projectOperations'
import { recoverProjectWrites } from './projectStorageCoordinator'
import {
  APPLICATION_BUDGET_KEY,
  projectApplicationsKey,
  projectFilesKey,
  projectHeadKey,
  projectMetaKey,
} from './projectStorageKeys'
import { projectStorageEntries } from './projectStorageRecords'
import { type ProApplicationRecord, readLocalRevision } from './projectStorageRevision'
import type { ProjectStorageScope } from './projectStorageRuntime'
import { setProjectStorageNamespace } from './projectStorageRuntime'
import { createProjectStore } from './projectStore'
import {
  applyProProposal,
  captureProRevision,
  listProApplications,
  listProSessionApplications,
  retryProApplication,
  undoProApplication,
} from './proRevision'
import {
  applyPreparedProWorkspaceOperation,
  prepareProWorkspaceOperation,
} from './proWorkspaceOperations'

function database(): ProjectStorageScope {
  const identity = `coordinator-${crypto.randomUUID()}`
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = new IDBFactory().open(identity, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('kv')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return {
    identity,
    namespace: '',
    store: async (mode, callback) =>
      callback((await opening).transaction('kv', mode).objectStore('kv')),
  }
}
async function scenario() {
  const scope = database()
  const project = buildProProject(
    'arena',
    'Arena',
    { 'main.ts': { kind: 'file', content: 'export const score = 0' } },
    'dev',
    'vanilla-vite',
  )
  await persistProject(project, {}, scope)
  const store = createProjectStore()
  store.getState().hydrateProject((await loadProjectById(project.id, scope))!)
  let fail = false
  registerProjectPersistence(store, {
    localScope: scope,
    scopeIdentity: scope.identity,
    load: (id) => loadProjectById(id, scope),
    save: async (p) => {
      if (fail) {
        // Real transaction abort, after put requests are issued; neither half commits.
        const failing: ProjectStorageScope = {
          ...scope,
          store: (mode, callback) =>
            scope.store(mode, (objectStore) => {
              const original = objectStore.put.bind(objectStore)
              objectStore.put = ((value: unknown, key?: IDBValidKey) => {
                if (key === projectApplicationsKey(p.id))
                  throw new DOMException('Quota injetada no histórico.', 'QuotaExceededError')
                return original(value, key)
              }) as typeof objectStore.put
              return callback(objectStore)
            }),
        }
        await persistProject(p, {}, failing)
      } else await persistProject(p, {}, scope)
    },
  })
  const base = await captureProRevision(store.getState().project!)
  const input = {
    request: {
      version: 1 as const,
      intent: 'change' as const,
      scope: 'part' as const,
      criteria: [],
    },
    operationId: 'apply-1',
    jobId: 'job-1',
    change: {
      baseHash: base.hash,
      summary: 'Score',
      patches: [
        {
          path: 'main.ts',
          before: await studioProDigest(base.files['main.ts']!),
          content: 'export const score = 1',
        },
      ],
    },
  }
  return {
    scope,
    store,
    input,
    setFailure(value: boolean) {
      fail = value
    },
  }
}

describe('local revision transactions on IndexedDB', () => {
  it('keeps a deleted material and its inverse atomic through failure, retry and reload', async () => {
    const { scope, store, setFailure } = await scenario()
    store.getState().addAsset({
      name: 'som',
      kind: 'audio',
      dataUrl: 'data:audio/wav;base64,aGVsbG8=',
      source: 'upload',
    })
    const asset = store.getState().project!.assets![0]!
    await persistProject(store.getState().project!, {}, scope)
    const operation = await prepareProWorkspaceOperation(store, 'arena', null, {
      kind: 'material-delete',
      id: asset.id,
    })
    setFailure(true)
    const receipt = await applyPreparedProWorkspaceOperation(store, operation)
    expect(receipt.status).toBe('pending')
    expect((await loadProjectById('arena', scope))!.assets).toEqual([asset])
    expect(await listProApplications(scope, 'arena')).toHaveLength(0)
    setFailure(false)
    expect((await retryProApplication(store, 'arena', operation.id)).status).toBe('saved')
    store.getState().hydrateProject((await loadProjectById('arena', scope))!)
    expect(store.getState().project!.assets).toEqual([])
    expect((await listProApplications(scope, 'arena'))[0]!.assetInverse?.value).toEqual(asset)
    await undoProApplication(store, 'arena', operation.id)
    expect((await loadProjectById('arena', scope))!.assets).toEqual([asset])
  })
  it('publishes inverse before subscribers autosave or switch projects in a microtask', async () => {
    const { scope, store, input } = await scenario()
    const other = buildProProject(
      'other',
      'Outro',
      { 'main.ts': { kind: 'file', content: 'other' } },
      'dev',
      'vanilla-vite',
    )
    await persistProject(other, {}, scope)
    const otherLoaded = (await loadProjectById('other', scope))!
    let save: Promise<void> | undefined
    const unsubscribe = store.subscribe((state) => {
      if (state.project?.id !== 'arena' || !state.isDirty || save) return
      expect(readLocalRevision(state.project)!.lineage.pending.has(input.operationId)).toBe(true)
      save = persistProject(state.project, {}, scope)
      queueMicrotask(() => store.getState().hydrateProject(otherLoaded))
    })
    try {
      await applyProProposal(store, 'arena', input)
      await save
      expect(store.getState().project!.id).toBe('other')
      await persistProject(store.getState().project!, {}, scope)
      expect(await listProApplications(scope, 'arena')).toHaveLength(1)
      expect(await listProApplications(scope, 'other')).toHaveLength(0)
      expect((await loadProjectById('other', scope))!.tree!['main.ts']).toMatchObject({
        content: 'other',
      })
      const record = (await listProApplications(scope, 'arena'))[0]!
      const stamp = readLocalRevision(store.getState().project!)!
      stamp.lineage.pending.set(record.operationId, { sequence: stamp.sequence, record })
      await expect(persistProject(store.getState().project!, {}, scope)).rejects.toThrow(
        'outro projeto',
      )
      expect(await listProApplications(scope, 'other')).toHaveLength(0)
    } finally {
      unsubscribe()
    }
  })
  it('reopened quota draft supersedes its exact staged ancestor on recovery, without inventing a conflict', async () => {
    const { scope, store, input } = await scenario()
    await writeInOneTransaction(scope.store, {
      puts: [
        [
          APPLICATION_BUDGET_KEY,
          { a: 8 * 1024 * 1024, b: 8 * 1024 * 1024, c: 8 * 1024 * 1024, d: 8 * 1024 * 1024 },
        ],
      ],
    })
    readLocalRevision(store.getState().project!)!.lineage.writer = 'a'
    expect((await applyProProposal(store, 'arena', input)).status).toBe('pending')
    await persistProject(store.getState().project!, { exit: true }, scope)
    store.getState().hydrateProject((await loadProjectShellById('arena', scope))!)
    readLocalRevision(store.getState().project!)!.lineage.writer = 'z'
    store.getState().setProFileContent('main.ts', 'export const score = 2')
    await persistProject(store.getState().project!, { exit: true }, scope)
    expect(
      (await readAllKeys(scope.store)).filter((key) => String(key).includes('project-recovery:')),
    ).toHaveLength(2)
    await writeInOneTransaction(scope.store, { puts: [[APPLICATION_BUDGET_KEY, {}]] })
    expect((await loadProjectById('arena', scope))!.tree!['main.ts']).toMatchObject({
      content: 'export const score = 2',
    })
    expect(await listAllProjects(scope)).toHaveLength(1)
    expect(await listProApplications(scope, 'arena')).toHaveLength(1)
    expect(
      (await readAllKeys(scope.store)).some((key) => String(key).includes('project-recovery:')),
    ).toBe(false)
  })
  it('an autosave ACK survives rehydrating the same store before reopening the panel', async () => {
    const { scope, store, input, setFailure } = await scenario()
    setFailure(true)
    await applyProProposal(store, 'arena', input)
    setFailure(false)
    await projectPersistence(store)!.save(store.getState().project!)
    store.getState().hydrateProject((await loadProjectById('arena', scope))!)
    expect(listProSessionApplications(store, 'arena')[0]!.receipt.status).toBe('saved')
    expect((await retryProApplication(store, 'arena', input.operationId)).status).toBe('saved')
  })
  it('quota recovery does not block the profile; editor reopens dirty draft with inverse while cloud reads committed data', async () => {
    const { scope, store, input } = await scenario()
    await writeInOneTransaction(scope.store, {
      puts: [
        [
          APPLICATION_BUDGET_KEY,
          { a: 8 * 1024 * 1024, b: 8 * 1024 * 1024, c: 8 * 1024 * 1024, d: 8 * 1024 * 1024 },
        ],
      ],
    })
    expect((await applyProProposal(store, 'arena', input)).status).toBe('pending')
    await persistProject(store.getState().project!, { exit: true }, scope)
    expect(await listAllProjects(scope)).toHaveLength(1)
    expect((await loadProjectById('arena', scope))!.tree!['main.ts']).toMatchObject({
      content: 'export const score = 0',
    })
    store.getState().hydrateProject((await loadProjectShellById('arena', scope))!)
    expect(store.getState().isDirty).toBe(true)
    expect(store.getState().saveError).toContain('pendente')
    expect(store.getState().project!.tree!['main.ts']).toMatchObject({
      content: 'export const score = 1',
    })
    expect(readLocalRevision(store.getState().project!)!.lineage.pending.size).toBe(1)
    await writeInOneTransaction(scope.store, { puts: [[APPLICATION_BUDGET_KEY, {}]] })
    expect((await retryProApplication(store, 'arena', input.operationId)).status).toBe('saved')
    expect(await listProApplications(scope, 'arena')).toHaveLength(1)
    expect(
      (await readAllKeys(scope.store)).some((key) => String(key).includes('project-recovery:')),
    ).toBe(false)
  })
  it('pending undo works in memory and an ordinary autosave acknowledges session receipts', async () => {
    const { scope, store, input, setFailure } = await scenario()
    setFailure(true)
    await applyProProposal(store, 'arena', input)
    expect((await undoProApplication(store, 'arena', input.operationId)).status).toBe('pending')
    expect(store.getState().project!.tree!['main.ts']).toMatchObject({
      content: 'export const score = 0',
    })
    setFailure(false)
    await projectPersistence(store)!.save(store.getState().project!)
    expect(listProSessionApplications(store, 'arena').map((entry) => entry.receipt.status)).toEqual(
      ['saved', 'saved'],
    )
    expect(await listProApplications(scope, 'arena')).toHaveLength(2)
  })
  it('profile A→B→A during the initial journal read cannot apply to a reopened editor', async () => {
    const { scope, store, input } = await scenario()
    const adapter = projectPersistence(store)!
    let release = () => {},
      entered = () => {}
    const waiting = new Promise<void>((resolve) => {
      entered = resolve
    })
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const heldScope = {
      ...scope,
      store: async (mode: IDBTransactionMode, callback: Parameters<typeof scope.store>[1]) => {
        if (mode === 'readonly') {
          entered()
          await gate
        }
        return scope.store(mode, callback)
      },
    } as ProjectStorageScope
    registerProjectPersistence(store, { ...adapter, localScope: heldScope })
    setProjectStorageNamespace('scope-a')
    try {
      const applying = applyProProposal(store, 'arena', input)
      await waiting
      setProjectStorageNamespace('scope-b')
      setProjectStorageNamespace('scope-a')
      store.getState().hydrateProject(store.getState().project!)
      release()
      await expect(applying).rejects.toThrow('mudou')
      expect(store.getState().project!.tree!['main.ts']).toMatchObject({
        content: 'export const score = 0',
      })
    } finally {
      release()
      setProjectStorageNamespace('')
    }
  })
  it('a transaction cannot evict its newly added inverses and report them as saved', async () => {
    const { scope, store } = await scenario()
    const project = store.getState().project!
    const stamp = readLocalRevision(project)!
    for (let i = 0; i < 2; i++) {
      const record: ProApplicationRecord = {
        version: 1,
        operationId: `large-${i}`,
        source: 'zappy',
        jobId: `job-${i}`,
        projectId: project.id,
        beforeHash: 'a'.repeat(64),
        afterHash: 'b'.repeat(64),
        inverse: {
          baseHash: 'b'.repeat(64),
          summary: 'large',
          patches: [
            { path: 'main.ts', before: 'c'.repeat(64), content: 'x'.repeat(4 * 1024 * 1024) },
          ],
        },
        bytes: 0,
        createdAt: 1,
      }
      record.bytes = new TextEncoder().encode(JSON.stringify(record)).length + 16
      stamp.lineage.pending.set(record.operationId, { sequence: stamp.sequence, record })
    }
    await expect(persistProject(project, {}, scope)).rejects.toThrow('pendentes ultrapassam')
    expect(stamp.lineage.saved.size).toBe(0)
    expect(stamp.lineage.pending.size).toBe(2)
    expect(await listProApplications(scope, 'arena')).toHaveLength(0)
  })
  it('commits document and inverse together, reopens and undoes exactly once', async () => {
    const { scope, store, input } = await scenario()
    expect((await applyProProposal(store, 'arena', input)).status).toBe('saved')
    expect(await listProApplications(scope, 'arena')).toHaveLength(1)
    const loaded = (await loadProjectById('arena', scope))!
    expect(loaded.tree!['main.ts']).toEqual({ kind: 'file', content: 'export const score = 1' })
    store.getState().hydrateProject(loaded)
    expect((await undoProApplication(store, 'arena', 'apply-1')).status).toBe('saved')
    expect(store.getState().project!.tree!['main.ts']).toEqual({
      kind: 'file',
      content: 'export const score = 0',
    })
    expect((await undoProApplication(store, 'arena', 'apply-1')).status).toBe('saved')
    expect(await listProApplications(scope, 'arena')).toHaveLength(2)
  })
  it('abort preserves both durable halves and dirty memory; same operation retries without patching again', async () => {
    const { scope, store, input, setFailure } = await scenario()
    setFailure(true)
    const receipt = await applyProProposal(store, 'arena', input)
    expect(receipt.status).toBe('pending')
    expect(receipt.error).toContain('Quota')
    expect(store.getState().isDirty).toBe(true)
    expect((await loadProjectById('arena', scope))!.tree!['main.ts']).toEqual({
      kind: 'file',
      content: 'export const score = 0',
    })
    expect(await listProApplications(scope, 'arena')).toHaveLength(0)
    const memory = store.getState().project
    setFailure(false)
    expect((await applyProProposal(store, 'arena', input)).status).toBe('saved')
    expect(store.getState().project).toBe(memory)
    expect(store.getState().isDirty).toBe(false)
    expect(await listProApplications(scope, 'arena')).toHaveLength(1)
  })
  it('two independent editors cannot overwrite the winning head; stale undo also fails', async () => {
    const { scope, store, input } = await scenario()
    const second = createProjectStore()
    second.getState().hydrateProject((await loadProjectById('arena', scope))!)
    await applyProProposal(store, 'arena', input)
    second.getState().setProFileContent('main.ts', 'export const score = 99')
    await expect(persistProject(second.getState().project!, {}, scope)).rejects.toThrow('outra aba')
    const fresh = createProjectStore()
    fresh.getState().hydrateProject((await loadProjectById('arena', scope))!)
    fresh.getState().setProFileContent('main.ts', 'export const score = 2')
    await persistProject(fresh.getState().project!, {}, scope)
    expect((await undoProApplication(store, 'arena', 'apply-1')).status).toBe('pending')
    expect((await loadProjectById('arena', scope))!.tree!['main.ts']).toEqual({
      kind: 'file',
      content: 'export const score = 2',
    })
  })
  it('exit recovery promotes the latest snapshot and preserves another writer on conflict', async () => {
    const { scope, store } = await scenario()
    store.getState().setProFileContent('main.ts', 'export const exit = true')
    await persistProject(store.getState().project!, { exit: true }, scope)
    await recoverProjectWrites(scope, 'arena')
    expect((await loadProjectById('arena', scope))!.tree!['main.ts']).toEqual({
      kind: 'file',
      content: 'export const exit = true',
    })
    const stale = store.getState().project!
    const fresh = createProjectStore()
    fresh.getState().hydrateProject((await loadProjectById('arena', scope))!)
    fresh.getState().setProFileContent('main.ts', 'export const other = true')
    await persistProject(fresh.getState().project!, {}, scope)
    await persistProject(stale, { exit: true }, scope)
    await recoverProjectWrites(scope, 'arena')
    expect((await loadProjectById('arena', scope))!.tree!['main.ts']).toEqual({
      kind: 'file',
      content: 'export const other = true',
    })
    const keys = await readAllKeys(scope.store)
    expect(keys.some((key) => String(key).includes('project-recovery:arena:'))).toBe(false)
    const recoveredKey = keys.find((key) =>
      String(key).startsWith('sz:v3:project-files:recuperado-'),
    )
    expect(recoveredKey).toBeDefined()
    expect(await readValue(scope.store, recoveredKey!)).toMatchObject({
      tree: { 'main.ts': { kind: 'file', content: 'export const exit = true' } },
    })
  })
  it('deletion leaves a durable tombstone that rejects stale autosaves', async () => {
    const { scope, store } = await scenario()
    const stale = store.getState().project!
    await deleteProject('arena', scope)
    await expect(persistProject(stale, {}, scope)).rejects.toThrow('apagado')
    expect(await readValue(scope.store, projectMetaKey('arena'))).toBeUndefined()
    expect(await readValue(scope.store, projectHeadKey('arena'))).toMatchObject({ deleted: true })
    expect(await readValue(scope.store, proBuilderDeletionKey('arena'))).toMatchObject({
      version: 1,
      projectId: 'arena',
    })
  })
  it('retains the latest 20 durable inverses and resets them with an explicit complete replacement', async () => {
    const { scope, store } = await scenario()
    for (let index = 1; index <= 21; index++) {
      const base = await captureProRevision(store.getState().project!)
      expect(
        (
          await applyProProposal(store, 'arena', {
            request: { version: 1, intent: 'change', scope: 'part', criteria: [] },
            operationId: `step-${index}`,
            jobId: `job-${index}`,
            change: {
              baseHash: base.hash,
              summary: 'Score',
              patches: [
                {
                  path: 'main.ts',
                  before: await studioProDigest(base.files['main.ts']!),
                  content: `export const score = ${index}`,
                },
              ],
            },
          })
        ).status,
      ).toBe('saved')
    }
    const history = await listProApplications(scope, 'arena')
    expect(history).toHaveLength(20)
    expect(history[0]!.operationId).toBe('step-2')
    expect(listProSessionApplications(store, 'arena')).toHaveLength(20)
    await expect(undoProApplication(store, 'arena', 'step-1')).rejects.toThrow('expirou')
    await persistProject(store.getState().project!, { replace: true }, scope)
    expect(await listProApplications(scope, 'arena')).toHaveLength(0)
    expect(await readValue(scope.store, APPLICATION_BUDGET_KEY)).toEqual({})
  })
  it('migrates v2 with backup and isolates a later v2 writer as a recovered copy', async () => {
    const scope = database()
    const project = createEmptyProject('old-v2', 'Antigo')
    const legacy = projectStorageEntries(project).map(
      ([key, value]) => [key.replace('sz:v3:', 'sz:v2:'), value] as const,
    )
    await writeInOneTransaction(scope.store, { puts: legacy })
    await migrateLocalProject(project.id, scope)
    expect(await readValue(scope.store, projectMetaKey(project.id))).toMatchObject({
      name: 'Antigo',
    })
    const changed = { ...project, files: { ...project.files, 'script.js': 'console.log("late")' } }
    await writeInOneTransaction(scope.store, {
      puts: projectStorageEntries(changed).map(
        ([key, value]) => [key.replace('sz:v3:', 'sz:v2:'), value] as const,
      ),
    })
    const recovered = await migrateLocalProject(project.id, scope)
    expect(recovered).toStartWith('recuperado-')
    expect(await readValue(scope.store, projectFilesKey(project.id))).toMatchObject({
      files: project.files,
    })
    expect(
      (await readAllKeys(scope.store)).filter((key) =>
        String(key).startsWith('sz:project-backup:'),
      ),
    ).toHaveLength(2)
    await deleteProject(recovered!, scope)
    await writeInOneTransaction(scope.store, {
      puts: projectStorageEntries(changed).map(
        ([key, value]) => [key.replace('sz:v3:', 'sz:v2:'), value] as const,
      ),
    })
    await migrateLocalProject(project.id, scope)
    expect(await readValue(scope.store, projectMetaKey(recovered!))).toBeUndefined()
    expect(await readValue(scope.store, projectHeadKey(recovered!))).toMatchObject({
      deleted: true,
    })
  })
})

describe('assistance reader', () => {
  it('preserves provenance and questions; order-independent digest does not alter source revision', async () => {
    const { store } = await scenario()
    const before = await captureProRevision(store.getState().project!)
    const assistance = parseProAssistance({
      version: 1,
      briefing: 'Meu jogo',
      decisions: [{ id: 'a', text: 'Roxo', provenance: 'suggestion', confirmed: false }],
      questions: [
        {
          id: 'q',
          text: 'Qual cor?',
          status: 'answered',
          answer: 'Roxo',
          revisionHash: before.hash,
        },
      ],
    })
    expect(store.getState().setProAssistance(assistance)).toBeNull()
    expect(getProAssistance(store.getState().project!)).toEqual(assistance)
    expect((await captureProRevision(store.getState().project!)).hash).toBe(before.hash)
    expect(await digestProAssistance(assistance)).toHaveLength(64)
    expect(() => parseProAssistance({ ...assistance, version: 2 })).toThrow()
    expect(() =>
      parseProAssistance({ version: 1, decisions: [{ id: 'a', text: 'Cor', confirmed: true }] }),
    ).toThrow()
    expect(() => parseProAssistance({ version: 1, briefing: 'a'.repeat(2001) })).toThrow()
  })
})

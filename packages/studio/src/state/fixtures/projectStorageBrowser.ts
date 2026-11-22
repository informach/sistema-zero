import demoAssets from '../../../playground/moldaDemoAssets.json'
import { createEmptyProject, type Project } from '../../core/project'
import {
  createPersistenceService,
  setAutosaveDelayForTests,
  setAutosaveMaxWaitForTests,
} from '../../persistence/service'
import { localSnapshotsEqual } from '../../project-migrations/localTransaction'
import { decodeRecoverySnapshot } from '../exitJournalDecode'
import { readAllKeys, readValue, readValues, writeInOneTransaction } from '../idbTransaction'
import {
  bindProjectToDurableHead,
  coordinatedProjectWrite,
  projectExitRecoveryStatus,
  recoverProjectWrites,
  stageProjectExit,
} from '../projectStorageCoordinator'
import {
  projectAssetsKey,
  projectBlocksKey,
  projectFilesKey,
  projectHeadKey,
  projectMetaKey,
  projectRecoveryKey,
  projectStateKey,
} from '../projectStorageKeys'
import { assembleProjectRecord, projectStorageEntries } from '../projectStorageRecords'
import {
  advanceLocalRevision,
  installLocalRevision,
  isLocalHead,
  readLocalRevision,
} from '../projectStorageRevision'
import { createProjectStorageScope, type ProjectStorageScope } from '../projectStorageRuntime'
import type { ProjectStoreApi } from '../projectStore'
import { prepareProjectForHost } from '../projectValidation'
import { readSynchronousExitJournal } from '../synchronousExitJournalRead'
import { qualifyDeepStorage } from './projectDeepStorageBrowser'

// Observe real browser transactions. window.name survives the same-origin reload
// even when the departing document cannot deliver another async callback.
const previousLifecycle = window.name
let exitCommit = false
const abortExit = new URLSearchParams(location.search).has('abort-exit')
function lifecycle(event: string) {
  const previous: unknown = window.name ? JSON.parse(window.name) : []
  const entries = Array.isArray(previous)
    ? previous.filter((value) => typeof value === 'string')
    : []
  window.name = JSON.stringify([...entries.slice(-39), event])
}
const transaction = IDBDatabase.prototype.transaction
const transactionIds = new WeakMap<IDBTransaction, number>()
let transactionNumber = 0
IDBDatabase.prototype.transaction = function (...args) {
  const id = ++transactionNumber
  lifecycle(`transaction:${id}:${String(args[1] ?? 'readonly')}`)
  try {
    const opened = transaction.apply(this, args)
    transactionIds.set(opened, id)
    opened.addEventListener('complete', () => lifecycle(`complete:${id}`))
    opened.addEventListener('abort', () =>
      lifecycle(`abort:${id}:${opened.error?.name ?? 'unknown'}`),
    )
    return opened
  } catch (error) {
    lifecycle(`transaction-error:${id}:${error instanceof Error ? error.name : 'unknown'}`)
    throw error
  }
}
const commit = IDBTransaction.prototype.commit
IDBTransaction.prototype.commit = function () {
  const id = transactionIds.get(this) ?? 'unknown'
  lifecycle(`commit-request:${id}`)
  try {
    if (exitCommit && abortExit) {
      lifecycle(`injected-abort:${id}`)
      this.abort()
    }
    commit.call(this)
    lifecycle(`commit-requested:${id}`)
  } catch (error) {
    lifecycle(`commit-error:${id}:${error instanceof Error ? error.name : 'unknown'}`)
    throw error
  }
}
window.addEventListener('beforeunload', () => lifecycle('beforeunload'))
window.addEventListener('pagehide', () => lifecycle('pagehide'))

const id = new URLSearchParams(location.search).get('project') ?? 'reload'
// `profile` reproduz a troca de perfil: outro banco, o mesmo localStorage do journal de saída.
const nativeScope = createProjectStorageScope(
  new URLSearchParams(location.search).get('profile') ?? 'storage-browser',
)
// Fault injection belongs to this fixture, never to the production storage path.
const deniedExit = new URLSearchParams(location.search).has('deny-exit')
const scope =
  deniedExit && nativeScope.exitJournalStorage
    ? {
        ...nativeScope,
        exitJournalStorage: new Proxy(nativeScope.exitJournalStorage, {
          get(target, key) {
            if (key === 'setItem')
              return () => {
                throw new DOMException('Injected quota exhaustion', 'QuotaExceededError')
              }
            const value = Reflect.get(target, key)
            return typeof value === 'function' ? value.bind(target) : value
          },
        }),
      }
    : nativeScope
// A separate document proves that binding prepares the transport before any
// current-version read has incidentally loaded it in this JavaScript realm.
if (new URLSearchParams(location.search).has('cold-bind')) {
  let coldWriteRejected = false
  const cold = createEmptyProject(`${id}-cold`, 'Primeira saída profunda')
  try {
    await writeInOneTransaction(scope.store, { puts: projectStorageEntries(cold) })
  } catch {
    coldWriteRejected = true
  }
  if (!coldWriteRejected) throw new Error('Cold transport probe unexpectedly wrote a document')
  await bindProjectToDurableHead(cold, scope)
  let futureMetadata: Record<string, unknown> = { leaf: 'preserved', absent: undefined, zero: -0 }
  for (let depth = 0; depth < 40_000; depth++) futureMetadata = { child: futureMetadata }
  const draft = Object.assign(advanceLocalRevision(cold, { ...cold }), { futureMetadata })
  await stageProjectExit(draft, { puts: projectStorageEntries(draft) }, scope)
  const key = projectRecoveryKey(draft.id, readLocalRevision(draft)!.lineage.writer)
  const nativePresent = (await readAllKeys(scope.store)).includes(key)
  if (!nativePresent) throw new Error('Binding did not prepare a complete native exit copy')
  await recoverProjectWrites(scope, draft.id)
  const meta = (await readValue(scope.store, projectMetaKey(draft.id))) as {
    futureMetadata: Record<string, unknown>
  }
  let leaf = meta.futureMetadata
  for (let depth = 0; depth < 40_000; depth++) leaf = leaf.child as Record<string, unknown>
  if (leaf.leaf !== 'preserved' || !Object.hasOwn(leaf, 'absent') || !Object.is(leaf.zero, -0))
    throw new Error('Cold exit recovery changed the deep document')
  const nativeAcknowledged = !(await readAllKeys(scope.store)).includes(key)
  const synchronousAcknowledged =
    readSynchronousExitJournal(scope.exitJournalStorage, scope.identity, draft.id).length === 0
  Object.assign(window, {
    coldStorageResult: {
      coldWriteRejected,
      nativePresent,
      nativeAcknowledged,
      synchronousAcknowledged,
      depth: 40_000,
    },
  })
  await new Promise<void>(() => {}) // The driver inspects this document and closes it.
}
const recoveredProjectIds = await recoverProjectWrites(scope, id)
const [meta, files, stateRecord, assets, blocks, head] = await readValues(scope.store, [
  projectMetaKey(id),
  projectFilesKey(id),
  projectStateKey(id),
  projectAssetsKey(id),
  projectBlocksKey(id),
  projectHeadKey(id),
])
const loaded = assembleProjectRecord(id, meta, files, stateRecord, assets, blocks)
let project: Project
if (loaded) {
  const validated = await prepareProjectForHost(loaded)
  if (!validated) throw new Error('O projeto de teste persistido é inválido.')
  project = validated
  installLocalRevision(project, scope.identity, isLocalHead(head) ? head : undefined)
} else {
  project = {
    id,
    name: 'Reload',
    formatVersion: 2,
    projectTools: [],
    createdAt: 1,
    updatedAt: 1,
    mode: 'code',
    kind: 'pro',
    tree: { 'main.ts': { kind: 'file', content: 'initial' } },
    proMeta: { devScript: 'dev', templateId: 'test' },
    files: { 'index.html': '', 'style.css': '', 'script.js': '' },
    ir: null,
    blocksState: null,
    installedExtensions: [],
    extraFiles: [],
    assets: [
      {
        id: 'large',
        name: 'large',
        kind: 'environment3d',
        source: 'upload',
        originalFileName: 'large.hdr',
        dataUrl: demoAssets.sky.dataUrl,
      },
    ],
  }
  installLocalRevision(project, scope.identity)
  await coordinatedProjectWrite(project, { puts: projectStorageEntries(project) }, scope)
}
const listeners = new Set<(next: typeof state, previous: typeof state) => void>()
let state = {
  project,
  isDirty: false,
  saveError: null as string | null,
  markSaved() {
    state = { ...state, isDirty: false, saveError: null }
  },
  markSaveFailed(message: string) {
    state = { ...state, saveError: message }
  },
}
const store = {
  getState: () => state,
  subscribe: (listener: (next: typeof state, previous: typeof state) => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
} as unknown as ProjectStoreApi
const save = (p: Project) => coordinatedProjectWrite(p, { puts: projectStorageEntries(p) }, scope)
setAutosaveDelayForTests(600_000)
setAutosaveMaxWaitForTests(600_000)
createPersistenceService(store, {
  localScope: scope,
  scopeIdentity: scope.identity,
  load: async () => null,
  save,
  flushOnExit: (p, options) => {
    lifecycle(
      `flush:${p.tree?.['main.ts']?.kind === 'file' ? p.tree['main.ts'].content : 'unknown'}`,
    )
    exitCommit = true
    try {
      // As mesmas opções do adapter de produção (`persistProject`): sem o `pageAlive`, a aba
      // escondida deste fixture provaria um caminho que o Estúdio não usa.
      return stageProjectExit(
        p,
        { puts: projectStorageEntries(p) },
        scope,
        options?.incompleteBlocks ?? false,
        { pageAlive: options?.pageAlive === true },
      )
    } finally {
      exitCommit = false
    }
  },
  exitRecoveryStatus: projectExitRecoveryStatus,
  appliesSavesInCallOrder: true,
}).attach()
Object.assign(window, {
  storageHarness: {
    qualifyDeepStorage: () => qualifyDeepStorage(scope),
    async qualifyDeepAncestorArchive() {
      const base: Project = { ...project, id: `${id}-deep-archive`, assets: [] }
      installLocalRevision(base, scope.identity)
      await save(base)
      let deep: Record<string, unknown> = { leaf: 'preserved', missing: undefined, zero: -0 }
      for (let depth = 0; depth < 10_000; depth++) deep = { child: deep }
      const parent = Object.assign(advanceLocalRevision(base, { ...base, name: 'Deep ancestor' }), {
        futureMetadata: deep,
      })
      // Force the synchronous recovery path, regardless of native clone depth support.
      const denied: ProjectStorageScope = {
        ...scope,
        store: (mode, callback) =>
          scope.store(mode, (store) => {
            store.transaction.abort()
            return callback(store)
          }),
      }
      await stageProjectExit(parent, { puts: projectStorageEntries(parent) }, denied)
      const entry = readSynchronousExitJournal(scope.exitJournalStorage, scope.identity, base.id)[0]
      if (!entry) throw new Error('Missing deep ancestor source')
      const child = advanceLocalRevision<Project>(base, { ...base, name: 'Small descendant' })
      readLocalRevision(child)!.lineage.recoverySources = [
        { key: projectRecoveryKey(base.id, entry.writer), token: entry.token },
      ]
      await stageProjectExit(child, { puts: projectStorageEntries(child) }, scope)
      await save(child)
      const keys = (await readAllKeys(scope.store)).filter((key) =>
        String(key).startsWith(`sz:v4:project-backup:${base.id}:recovery-`),
      )
      if (keys.length !== 1) throw new Error('Missing unique ancestor archive')
      const archive = (await readValue(scope.store, keys[0]!)) as { encoded: string }
      const exact = localSnapshotsEqual(decodeRecoverySnapshot(archive.encoded), entry.value)
      const acknowledged = scope.exitJournalStorage!.getItem(entry.key) === null
      const [meta, journal] = await readValues(scope.store, [
        projectMetaKey(base.id),
        projectRecoveryKey(base.id, entry.writer),
      ])
      return {
        exact,
        acknowledged,
        archived: keys.length,
        meta,
        journalAbsent: journal === undefined,
      }
    },
    previousLifecycle,
    recoveredProjectIds,
    recoveredHead: isLocalHead(head) ? head : null,
    /** As cópias "(edição recuperada)" deste projeto que estão no banco, com nome e conteúdo. */
    async recoveredCopies(sourceId: string) {
      const prefix = projectMetaKey(`recuperado-${sourceId.slice(0, 28)}-`)
      const ids = (await readAllKeys(scope.store))
        .filter((key): key is string => typeof key === 'string' && key.startsWith(prefix))
        .map((key) => key.slice(projectMetaKey('').length))
      const copies: Array<{ id: string; name: string; text: unknown }> = []
      for (const copyId of ids) {
        const [copyMeta, copyFiles, copyState, copyAssets, copyBlocks] = await readValues(
          scope.store,
          [
            projectMetaKey(copyId),
            projectFilesKey(copyId),
            projectStateKey(copyId),
            projectAssetsKey(copyId),
            projectBlocksKey(copyId),
          ],
        )
        const copy = assembleProjectRecord(
          copyId,
          copyMeta,
          copyFiles,
          copyState,
          copyAssets,
          copyBlocks,
        )
        copies.push({
          id: copyId,
          name: copy?.name ?? '',
          text: copy?.tree?.['main.ts'] ?? null,
        })
      }
      return copies
    },
    clearLifecycle: () => {
      window.name = '[]'
    },
    read: () => ({
      text: state.project!.tree!['main.ts'],
      dirty: state.isDirty,
      error: state.saveError,
    }),
    exitStatus: () => projectExitRecoveryStatus(state.project!),
    edit(text: string) {
      const previous = state
      state = {
        ...state,
        project: advanceLocalRevision(state.project, {
          ...state.project!,
          tree: { 'main.ts': { kind: 'file', content: text } },
        }),
        isDirty: true,
      }
      for (const listener of listeners) listener(state, previous)
    },
    async save() {
      try {
        await save(state.project!)
        return 'saved'
      } catch (error) {
        return error instanceof Error ? error.name : 'error'
      }
    },
    startSave() {
      void save(state.project!).catch(() => undefined)
    },
  },
})

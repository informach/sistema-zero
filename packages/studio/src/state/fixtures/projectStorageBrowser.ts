import demoAssets from '../../../playground/moldaDemoAssets.json'
import type { Project } from '../../core/project'
import {
  createPersistenceService,
  setAutosaveDelayForTests,
  setAutosaveMaxWaitForTests,
} from '../../persistence/service'
import { readValues } from '../idbTransaction'
import {
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
  projectStateKey,
} from '../projectStorageKeys'
import { assembleProjectRecord, projectStorageEntries } from '../projectStorageRecords'
import { advanceLocalRevision, installLocalRevision, isLocalHead } from '../projectStorageRevision'
import { createProjectStorageScope } from '../projectStorageRuntime'
import type { ProjectStoreApi } from '../projectStore'
import { prepareProjectForHost } from '../projectValidation'

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
const nativeScope = createProjectStorageScope('storage-browser')
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
  flushOnExit: (p) => {
    lifecycle(
      `flush:${p.tree?.['main.ts']?.kind === 'file' ? p.tree['main.ts'].content : 'unknown'}`,
    )
    exitCommit = true
    try {
      return stageProjectExit(p, { puts: projectStorageEntries(p) }, scope)
    } finally {
      exitCommit = false
    }
  },
  exitRecoveryStatus: projectExitRecoveryStatus,
  appliesSavesInCallOrder: true,
}).attach()
Object.assign(window, {
  storageHarness: {
    previousLifecycle,
    recoveredProjectIds,
    recoveredHead: isLocalHead(head) ? head : null,
    clearLifecycle: () => {
      window.name = '[]'
    },
    read: () => ({
      text: state.project!.tree!['main.ts'],
      dirty: state.isDirty,
      error: state.saveError,
    }),
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

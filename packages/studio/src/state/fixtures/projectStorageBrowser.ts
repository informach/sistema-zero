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

const id = new URLSearchParams(location.search).get('project') ?? 'reload'
const scope = createProjectStorageScope('storage-browser')
await recoverProjectWrites(scope, id)
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
  project = loaded
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
  flushOnExit: (p) => stageProjectExit(p, { puts: projectStorageEntries(p) }, scope),
  appliesSavesInCallOrder: true,
}).attach()
Object.assign(window, {
  storageHarness: {
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

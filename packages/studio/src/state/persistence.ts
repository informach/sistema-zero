import { createStore, delMany, get, getMany, keys, setMany } from 'idb-keyval'
import { IDE_MODES, type IDEMode, type Project } from '#core'
import { useProjectStore } from './projectStore'

const LEGACY_PROJECT_KEY_PREFIX = 'sz:project:'
const PROJECT_META_KEY_PREFIX = 'sz:project-meta:'
const PROJECT_FILES_KEY_PREFIX = 'sz:project-files:'
const PROJECT_STATE_KEY_PREFIX = 'sz:project-state:'
const MAX_PROJECT_SUMMARY_NAME_CHARS = 200
const legacyProjectKey = (id: string) => `${LEGACY_PROJECT_KEY_PREFIX}${id}`
const projectMetaKey = (id: string) => `${PROJECT_META_KEY_PREFIX}${id}`
const projectFilesKey = (id: string) => `${PROJECT_FILES_KEY_PREFIX}${id}`
const projectStateKey = (id: string) => `${PROJECT_STATE_KEY_PREFIX}${id}`

let store: ReturnType<typeof createStore> | null = null

function getStore() {
  if (!store) store = createStore('sistema-zero-studio', 'kv')
  return store
}

interface PendingAutosave {
  timer: ReturnType<typeof setTimeout>
  project: Project
}

const pendingAutosaves = new Map<string, PendingAutosave>()
const AUTOSAVE_DELAY_DEFAULT = 1000
let autosaveDelay = AUTOSAVE_DELAY_DEFAULT

/**
 * Encurta o debounce do autosave em testes — bun:test não tem fake timers
 * (substitui o vi.useFakeTimers/advanceTimersByTimeAsync do repo de origem),
 * então os testes usam timers reais com um delay curto.
 */
export function setAutosaveDelayForTests(ms: number | null): void {
  autosaveDelay = ms ?? AUTOSAVE_DELAY_DEFAULT
}

function clearAutosaveTimerForProject(id: string): void {
  const pending = pendingAutosaves.get(id)
  if (!pending) return
  clearTimeout(pending.timer)
  pendingAutosaves.delete(id)
}

function clearAutosaveTimers(): void {
  for (const pending of pendingAutosaves.values()) {
    clearTimeout(pending.timer)
  }
  pendingAutosaves.clear()
}

function formatPersistenceError(err: unknown): string {
  const detail = err instanceof Error ? err.message : String(err)
  return detail ? `Falha ao salvar projeto: ${detail}` : 'Falha ao salvar projeto.'
}

export function bootstrapPersistence(): () => void {
  const unsub = useProjectStore.subscribe((state, prev) => {
    if (!state.project) {
      return
    }
    if (state.project === prev.project) return
    const projectToPersist = state.project
    clearAutosaveTimerForProject(projectToPersist.id)
    const timer = setTimeout(async () => {
      try {
        await persistProject(projectToPersist)
        if (useProjectStore.getState().project === projectToPersist) {
          useProjectStore.getState().markSaved()
        }
      } catch (err) {
        if (useProjectStore.getState().project === projectToPersist) {
          useProjectStore.getState().markSaveFailed(formatPersistenceError(err))
        }
      } finally {
        const pending = pendingAutosaves.get(projectToPersist.id)
        if (pending?.timer === timer) {
          pendingAutosaves.delete(projectToPersist.id)
        }
      }
    }, autosaveDelay)
    pendingAutosaves.set(projectToPersist.id, { timer, project: projectToPersist })
  })

  const flushOnPageExit = () => {
    flushPendingAutosaves()
  }
  window.addEventListener('pagehide', flushOnPageExit)
  window.addEventListener('beforeunload', flushOnPageExit)

  return () => {
    unsub()
    window.removeEventListener('pagehide', flushOnPageExit)
    window.removeEventListener('beforeunload', flushOnPageExit)
    clearAutosaveTimers()
  }
}

function flushPendingAutosaves(): void {
  const snapshots = Array.from(pendingAutosaves.values(), (pending) => pending.project)
  const currentState = useProjectStore.getState()
  if (
    currentState.project &&
    currentState.isDirty &&
    !snapshots.some((project) => project.id === currentState.project?.id)
  ) {
    snapshots.push(currentState.project)
  }
  clearAutosaveTimers()

  for (const projectToPersist of snapshots) {
    void persistProject(projectToPersist)
      .then(() => {
        if (useProjectStore.getState().project === projectToPersist) {
          useProjectStore.getState().markSaved()
        }
      })
      .catch((err: unknown) => {
        if (useProjectStore.getState().project === projectToPersist) {
          useProjectStore.getState().markSaveFailed(formatPersistenceError(err))
          return
        }
        console.warn(formatPersistenceError(err))
      })
  }
}

export async function persistProject(project: Project): Promise<void> {
  await setMany(
    [
      [projectMetaKey(project.id), projectToMetaRecord(project)],
      [projectFilesKey(project.id), projectToFilesRecord(project)],
      [projectStateKey(project.id), projectToStateRecord(project)],
    ],
    getStore(),
  )
}

export async function loadProjectById(id: string): Promise<Project | null> {
  const kvStore = getStore()
  const [meta, files, state] = await getMany<unknown[]>(
    [projectMetaKey(id), projectFilesKey(id), projectStateKey(id)],
    kvStore,
  )
  if (meta && files && state) {
    return assembleProjectRecord(id, meta, files, state)
  }

  return ((await get<Project>(legacyProjectKey(id), kvStore)) ?? null) as Project | null
}

export async function deleteProject(id: string): Promise<void> {
  clearAutosaveTimerForProject(id)
  await delMany(
    [projectMetaKey(id), projectFilesKey(id), projectStateKey(id), legacyProjectKey(id)],
    getStore(),
  )
}

export interface ProjectSummary {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  /** Modo salvo do projeto — permite abrir o editor já no modo correto. */
  mode: IDEMode
}

function toProjectSummary(id: string, value: unknown): ProjectSummary | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  if (!id) return null
  const name =
    typeof raw.name === 'string' && raw.name.trim()
      ? raw.name.trim().slice(0, MAX_PROJECT_SUMMARY_NAME_CHARS)
      : 'Sem título'
  const createdAt =
    typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt) ? raw.createdAt : 0
  const updatedAt =
    typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : createdAt
  const mode = IDE_MODES.includes(raw.mode as IDEMode) ? (raw.mode as IDEMode) : 'blocks'
  return { id, name, createdAt, updatedAt, mode }
}

export async function listAllProjects(): Promise<ProjectSummary[]> {
  const kvStore = getStore()
  const allKeys = await keys(kvStore)
  const metaKeys = allKeys.filter(
    (key): key is string => typeof key === 'string' && key.startsWith(PROJECT_META_KEY_PREFIX),
  )
  const metaValues = metaKeys.length > 0 ? await getMany<unknown[]>(metaKeys, kvStore) : []
  const summaries = metaKeys
    .map((key, index) =>
      toProjectSummary(key.slice(PROJECT_META_KEY_PREFIX.length), metaValues[index]),
    )
    .filter((summary): summary is ProjectSummary => Boolean(summary))

  const indexedIds = new Set(summaries.map((summary) => summary.id))
  const legacyKeys = allKeys.filter(
    (key): key is string =>
      typeof key === 'string' &&
      key.startsWith(LEGACY_PROJECT_KEY_PREFIX) &&
      !indexedIds.has(key.slice(LEGACY_PROJECT_KEY_PREFIX.length)),
  )
  if (legacyKeys.length > 0) {
    const legacyValues = await getMany<unknown[]>(legacyKeys, kvStore)
    for (let index = 0; index < legacyKeys.length; index += 1) {
      const key = legacyKeys[index]
      if (!key) continue
      const summary = toProjectSummary(
        key.slice(LEGACY_PROJECT_KEY_PREFIX.length),
        legacyValues[index],
      )
      if (summary) summaries.push(summary)
    }
  }

  summaries.sort((a, b) => b.updatedAt - a.updatedAt)
  return summaries
}

export async function saveCurrentProject(): Promise<void> {
  const project = useProjectStore.getState().project
  if (!project) return
  clearAutosaveTimerForProject(project.id)
  try {
    await persistProject(project)
    if (useProjectStore.getState().project === project) {
      useProjectStore.getState().markSaved()
    }
  } catch (err) {
    if (useProjectStore.getState().project === project) {
      useProjectStore.getState().markSaveFailed(formatPersistenceError(err))
    }
    throw err
  }
}

function projectToMetaRecord(
  project: Project,
): Pick<Project, 'id' | 'name' | 'createdAt' | 'updatedAt' | 'mode' | 'installedExtensions'> {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    mode: project.mode,
    installedExtensions: project.installedExtensions,
  }
}

function projectToFilesRecord(project: Project): Pick<Project, 'id' | 'files' | 'extraFiles'> {
  return {
    id: project.id,
    files: project.files,
    extraFiles: project.extraFiles,
  }
}

function projectToStateRecord(project: Project): Pick<Project, 'id' | 'ir' | 'blocksState'> {
  return {
    id: project.id,
    ir: project.ir,
    blocksState: project.blocksState,
  }
}

function assembleProjectRecord(
  id: string,
  meta: unknown,
  files: unknown,
  state: unknown,
): Project | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  if (!files || typeof files !== 'object' || Array.isArray(files)) return null
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null
  return {
    ...(meta as Record<string, unknown>),
    ...(files as Record<string, unknown>),
    ...(state as Record<string, unknown>),
    id,
  } as Project
}

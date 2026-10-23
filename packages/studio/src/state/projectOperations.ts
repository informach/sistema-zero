import type { StudioPersistenceAdapter } from '../persistence/types'
import type { ProjectStoreApi } from './projectStore'

type ProjectOperation = { projectId: string; flush: () => Promise<void> }
const operations = new WeakMap<ProjectStoreApi, Set<ProjectOperation>>()
const persistence = new WeakMap<ProjectStoreApi, StudioPersistenceAdapter>()
export function registerProjectPersistence(
  store: ProjectStoreApi,
  adapter: StudioPersistenceAdapter | null,
): () => void {
  if (adapter) persistence.set(store, adapter)
  return () => {
    if (persistence.get(store) === adapter) persistence.delete(store)
  }
}
export function projectPersistence(store: ProjectStoreApi): StudioPersistenceAdapter | undefined {
  return persistence.get(store)
}

/** Each Studio instance owns its async writers. No project or family shares a queue. */
export function registerProjectOperation(
  store: ProjectStoreApi,
  operation: ProjectOperation,
): () => void {
  let entries = operations.get(store)
  if (!entries) {
    entries = new Set()
    operations.set(store, entries)
  }
  entries.add(operation)
  return () => {
    entries.delete(operation)
    if (!entries.size) operations.delete(store)
  }
}

export async function flushProjectOperations(
  store: ProjectStoreApi,
  projectId = store.getState().project?.id,
): Promise<void> {
  if (!projectId) return
  if (store.getState().project?.id !== projectId)
    throw new Error('O projeto mudou durante a sincronização. Tente novamente.')
  for (const operation of operations.get(store) ?? []) {
    if (operation.projectId === projectId) await operation.flush()
  }
  if (store.getState().project?.id !== projectId)
    throw new Error('O projeto mudou durante a sincronização. Tente novamente.')
}

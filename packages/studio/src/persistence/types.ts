import type { Project } from '#core'
import type { ProjectSummary } from '../state/persistence'

/**
 * Adapter de persistência do <Studio>. `'local'` usa a implementação
 * IndexedDB embutida (createLocalPersistenceAdapter); um objeto permite o host
 * salvar onde quiser (ex.: backend via BFF).
 */
export interface StudioPersistenceAdapter {
  /** Carrega um projeto por id (usado pelo host/ProjectList; o Studio em si recebe initialProject). */
  load(id: string): Promise<Project | null>
  /** Persiste o snapshot completo. Chamado no debounce do autosave e no salvar explícito. */
  save(project: Project): Promise<void>
  // Opcionais — exigidos só pelo <ProjectList>:
  list?(): Promise<ProjectSummary[]>
  delete?(id: string): Promise<void>
}

export type StudioPersistence = 'local' | 'none' | StudioPersistenceAdapter

export function resolvePersistenceAdapter(
  persistence: StudioPersistence,
  createLocal: () => StudioPersistenceAdapter,
): StudioPersistenceAdapter | null {
  if (persistence === 'none') return null
  if (persistence === 'local') return createLocal()
  return persistence
}

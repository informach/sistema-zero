import type { Project } from '#core'
import type { ProjectSummary } from '../state/persistence'

/**
 * Adapter de persistência do <Studio>. `'local'` usa a implementação
 * IndexedDB embutida (createLocalPersistenceAdapter); um objeto permite o host
 * salvar onde quiser (ex.: backend via BFF).
 */
export interface StudioPersistenceAdapter {
  /**
   * Identidade estável do backend/tenant. Isola filas e cercas quando dois
   * perfis mantêm o mesmo id de projeto na mesma página.
   */
  scopeIdentity?: string
  /** Carrega um projeto por id (usado pelo host/ProjectList; o Studio em si recebe initialProject). */
  load(id: string): Promise<Project | null>
  /**
   * Opcional: restaura partes pesadas que o load rápido pode ter omitido.
   * O adapter deve devolver somente um blocksState já confiável/sanitizado.
   */
  loadBlocksState?(project: Project): Promise<Project['blocksState']>
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

import { deleteProject, listAllProjects, persistProject } from '../state/persistence'
import { loadSanitizedProjectById } from '../state/projectStore'
import type { StudioPersistenceAdapter } from './types'

/**
 * Adapter de persistência LOCAL (IndexedDB via idb-keyval) — o comportamento
 * histórico do studio standalone, agora plugável. É o default do <Studio>
 * (`persistence="local"`) e a fonte do <ProjectList> no playground.
 */
export function createLocalPersistenceAdapter(): StudioPersistenceAdapter {
  return {
    load: loadSanitizedProjectById,
    save: persistProject,
    list: listAllProjects,
    delete: deleteProject,
  }
}

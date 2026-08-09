import { deleteProject, listAllProjects, persistProject } from '../state/persistence'
import { captureProjectStorageScope } from '../state/projectStorageRuntime'
import {
  loadSanitizedProjectBlocksStateById,
  loadSanitizedProjectShellById,
} from '../state/projectStore'
import type { StudioPersistenceAdapter } from './types'

/**
 * Adapter de persistência LOCAL (IndexedDB via idb-keyval) — o comportamento
 * histórico do studio standalone, agora plugável. É o default do <Studio>
 * (`persistence="local"`) e a fonte do <ProjectList> no playground.
 */
export function createLocalPersistenceAdapter(): StudioPersistenceAdapter {
  const scopeIdentity = captureProjectStorageScope().identity
  return {
    scopeIdentity,
    // ABERTURA RÁPIDA: lê só meta+arquivos+assets (ir/blocksState voltam null). Ler
    // o `blocksState` (que pode ser ENORME) de forma síncrona aqui trava a tela
    // "Carregando projeto…" no structured clone do IndexedDB. O `blocksState` é
    // restaurado em SEGUNDO PLANO pelo `PersistenceService.hydrateAfterLoad` (ligado
    // no StudioCore), depois que o editor já abriu — sem travar.
    load: loadSanitizedProjectShellById,
    // Restore em segundo plano da partição pesada de blocos (chamado por
    // hydrateAfterLoad). Tem fallback p/ projetos legados (blocksState junto do IR).
    loadBlocksState: (project) =>
      loadSanitizedProjectBlocksStateById(project.id, project.installedExtensions),
    save: persistProject,
    list: listAllProjects,
    delete: deleteProject,
  }
}

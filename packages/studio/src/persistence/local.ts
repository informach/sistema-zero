import { deleteProject, listAllProjects, persistProject } from '../state/persistence'
import { captureProjectStorageScope, getProjectStorageScope } from '../state/projectStorageRuntime'
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
export function createLocalPersistenceAdapter(
  options: { namespace?: string } = {},
): StudioPersistenceAdapter {
  const scope =
    options.namespace === undefined
      ? captureProjectStorageScope()
      : getProjectStorageScope(options.namespace)
  return {
    scopeIdentity: scope.identity,
    // ABERTURA RÁPIDA: lê só meta+arquivos+assets (ir/blocksState voltam null). Ler
    // o `blocksState` (que pode ser ENORME) de forma síncrona aqui trava a tela
    // "Carregando projeto…" no structured clone do IndexedDB. O `blocksState` é
    // restaurado em SEGUNDO PLANO pelo `PersistenceService.hydrateAfterLoad` (ligado
    // no StudioCore), depois que o editor já abriu — sem travar.
    load: (id) => loadSanitizedProjectShellById(id, scope),
    // Restore em segundo plano da partição pesada de blocos (chamado por
    // hydrateAfterLoad). Tem fallback p/ projetos legados (blocksState junto do IR).
    loadBlocksState: (project) =>
      loadSanitizedProjectBlocksStateById(project.id, project.installedExtensions, scope),
    save: (project) => persistProject(project, {}, scope),
    list: () => listAllProjects(scope),
    delete: (id) => deleteProject(id, scope),
  }
}

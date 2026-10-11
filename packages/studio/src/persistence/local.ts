/** Entrada pública do adapter local; a implementação compartilha as fronteiras da store. */
export { createLocalPersistenceAdapter } from '../state/projectStore'

import type { Project } from '../core/project'
import { persistProject } from '../state/persistence'
import { getProjectStorageScope } from '../state/projectStorageRuntime'

/** Substitui todas as partições de um projeto local, inclusive blocos/capa ausentes no novo modelo. */
export function replaceLocalProject(
  project: Project,
  options?: { namespace?: string },
): Promise<void> {
  const scope =
    options?.namespace === undefined ? undefined : getProjectStorageScope(options.namespace)
  return persistProject(project, { replace: true }, scope)
}

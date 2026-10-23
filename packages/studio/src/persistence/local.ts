/** Entrada pública do adapter local; a implementação compartilha as fronteiras da store. */
export { createLocalPersistenceAdapter } from '../state/projectStore'

import type { EditableStudioProject as Project } from '../core/editableProject'
import { persistProject } from '../state/persistence'
import { bindProjectToDurableHead } from '../state/projectStorageCoordinator'
import { captureProjectStorageScope, getProjectStorageScope } from '../state/projectStorageRuntime'

/** Substitui todas as partições de um projeto local, inclusive blocos/capa ausentes no novo modelo. */
export async function replaceLocalProject(
  project: Project,
  options?: { namespace?: string },
): Promise<void> {
  const scope =
    options?.namespace === undefined
      ? captureProjectStorageScope()
      : getProjectStorageScope(options.namespace)
  await bindProjectToDurableHead(project, scope)
  return persistProject(project, { replace: true }, scope)
}

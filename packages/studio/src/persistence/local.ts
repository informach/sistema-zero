/** Entrada pública do adapter local; a implementação compartilha as fronteiras da store. */
export { createLocalPersistenceAdapter } from '../state/projectStore'

import type { Project } from '../core/project'
import { persistProject } from '../state/persistence'

/** Substitui todas as partições de um projeto local, inclusive blocos/capa ausentes no novo modelo. */
export function replaceLocalProject(project: Project): Promise<void> {
  return persistProject(project, { replace: true })
}

import type { EditableStudioProject } from '../core/editableProject'
import { snapshotProjectWithCurrentAuthority } from '../state/bridgeAuthority'
import type { PendingEditorEdits } from '../state/pendingEditorEdits'
import { flushProjectOperations, projectPersistence } from '../state/projectOperations'
import { readLocalRevision } from '../state/projectStorageRevision'
import { captureProjectStorageScope } from '../state/projectStorageRuntime'
import type { ProjectStoreApi } from '../state/projectStore'

/** Both source and web downloads observe the same editor buffers, writers and actor lineage. */
export async function prepareProjectDownload<Result>(
  store: ProjectStoreApi,
  pending: PendingEditorEdits | undefined,
  signal: AbortSignal,
  build: (snapshot: EditableStudioProject, signal: AbortSignal) => Promise<Result>,
) {
  const initial = store.getState().project
  if (!initial) throw new Error('Abra um projeto antes de baixar a fonte.')
  const scope = captureProjectStorageScope()
  const adapter = projectPersistence(store)
  const lineage = readLocalRevision(initial)?.lineage
  const controller = new AbortController()
  const combined = AbortSignal.any([signal, controller.signal])
  const changed = () => {
    const current = store.getState().project
    return (
      current?.id !== initial.id ||
      (lineage && (!current || readLocalRevision(current)?.lineage !== lineage)) ||
      captureProjectStorageScope() !== scope ||
      projectPersistence(store) !== adapter
    )
  }
  const assertCurrent = () => {
    combined.throwIfAborted()
    if (changed())
      throw new Error(
        'O projeto ou perfil mudou durante o download. Tente novamente no projeto atual.',
      )
  }
  // A → B → A cannot resurrect an old pending export.
  const unsubscribe = store.subscribe(() => {
    if (changed()) controller.abort(new Error('O projeto ou perfil mudou durante o download.'))
  })
  try {
    assertCurrent()
    pending?.flush()
    assertCurrent()
    await flushProjectOperations(store, initial.id)
    assertCurrent()
    pending?.flush()
    assertCurrent()
    const project = store.getState().project
    if (!project) throw new Error('O projeto foi fechado.')
    const snapshot = snapshotProjectWithCurrentAuthority(project)
    const result = await build(snapshot, combined)
    assertCurrent()
    return result
  } finally {
    unsubscribe()
  }
}

import type { PendingEditorEdits } from '../state/pendingEditorEdits'
import type { ProjectStoreApi } from '../state/projectStore'
import { prepareProjectDownload } from './projectDownload'
import { exportProjectSource } from './sourceExport'

/** A download observes the same editor buffers, async writers and scope as other snapshot consumers. */
export function prepareSourceDownload(
  store: ProjectStoreApi,
  pending: PendingEditorEdits | undefined,
  signal: AbortSignal,
) {
  return prepareProjectDownload(store, pending, signal, (snapshot, combined) =>
    exportProjectSource(snapshot, { signal: combined }),
  )
}

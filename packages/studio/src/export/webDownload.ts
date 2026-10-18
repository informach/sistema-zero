import type { PendingEditorEdits } from '../state/pendingEditorEdits'
import type { ProjectStoreApi } from '../state/projectStore'
import { type ExportOptions, exportProject } from './exportProject'
import { prepareProjectDownload } from './projectDownload'

export function prepareWebDownload(
  store: ProjectStoreApi,
  pending: PendingEditorEdits | undefined,
  signal: AbortSignal,
  options: ExportOptions = {},
) {
  const joined = options.runtimeEnvironment?.signal
    ? AbortSignal.any([signal, options.runtimeEnvironment.signal])
    : signal
  return prepareProjectDownload(store, pending, joined, (snapshot, combined) =>
    exportProject(snapshot, { ...options, signal: combined }),
  )
}

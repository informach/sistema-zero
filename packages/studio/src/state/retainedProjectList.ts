import { ProjectDocumentError } from '../core/projectDocumentGuards'
import { ProjectWriteConflict } from './projectStorageRevision'
import type { ProjectStorageScope } from './projectStorageRuntime'
import { type ProjectSummary, toProjectSummary } from './projectSummary'
import { thumbDataUrlOf } from './projectThumbData'
import { readRetainedManifest, readRetainedParts } from './retainedProjectStore'

/** undefined means V4 owns the ID, null means a V5 tombstone owns it. */
export async function readRetainedSummary(
  scope: ProjectStorageScope,
  id: string,
  withThumb: boolean,
): Promise<ProjectSummary | null | undefined> {
  try {
    const manifest = await readRetainedManifest(scope, id)
    if (!manifest) return undefined
    if (manifest.deleted) return null
    const { meta, thumb } = await readRetainedParts(
      scope,
      manifest,
      withThumb ? ['meta', 'thumb'] : ['meta'],
    )
    const summary = toProjectSummary(id, meta)
    if (!summary)
      throw new ProjectDocumentError('migration-pending', 'As partes do projeto estão preservadas.')
    const dataUrl = thumbDataUrlOf(thumb)
    if (dataUrl) summary.thumbDataUrl = dataUrl
    return summary
  } catch (err) {
    if (!(err instanceof ProjectDocumentError || err instanceof ProjectWriteConflict)) throw err
    return {
      ...toProjectSummary(id, { name: 'Projeto preservado' })!,
      hasPreservedEdit: true,
      migrationPending: true,
    }
  }
}

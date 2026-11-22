import { isDocumentRecord, ProjectDocumentError } from '../core/projectDocumentGuards'
import { hasAnyPhysicalProjectKey, readPhysicalProjectRecords } from './idbTransaction'
import { projectHeadKey } from './projectStorageKeys'
import { ProjectWriteConflict } from './projectStorageRevision'
import type { ProjectStorageScope } from './projectStorageRuntime'
import { type ProjectSummary, toProjectSummary } from './projectSummary'
import { thumbDataUrlOf } from './projectThumbData'
import { legacyProjectKeys } from './retainedProjectKeys'
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
    const [oldHead] = await readPhysicalProjectRecords(scope.store, [projectHeadKey(id)])
    const oldSource =
      (oldHead !== undefined && !(isDocumentRecord(oldHead) && oldHead.deleted === true)) ||
      (await hasAnyPhysicalProjectKey(
        scope.store,
        Object.values(legacyProjectKeys(id)).filter((key) => key !== projectHeadKey(id)),
      ))
    if (manifest.deleted) {
      if (!oldSource) return null
      // A late V4 restore cannot resurrect this lineage. The recovery menu can copy or export
      // those exact records under a different ID before the learner decides what to keep.
      return preservedSummary(id)
    }
    const { meta, thumb, source } = await readRetainedParts(
      scope,
      manifest,
      withThumb ? ['meta', 'thumb', 'source'] : ['meta', 'source'],
    )
    const summary = toProjectSummary(id, meta)
    if (!summary)
      throw new ProjectDocumentError('migration-pending', 'As partes do projeto estão preservadas.')
    const dataUrl = thumbDataUrlOf(thumb)
    if (dataUrl) summary.thumbDataUrl = dataUrl
    // The legacy head is small but does not certify mutable auxiliary state. The explicit archive
    // stays available even when the token matches. Never load all the files to list a gallery.
    if (oldSource) {
      summary.hasRetainedLegacySource = true
      if (
        isDocumentRecord(source) &&
        source.legacyToken !== undefined &&
        (!isDocumentRecord(oldHead) || oldHead.token !== source.legacyToken)
      )
        summary.hasPreservedEdit = true
    }
    return summary
  } catch (err) {
    if (!(err instanceof ProjectDocumentError || err instanceof ProjectWriteConflict)) throw err
    return preservedSummary(id)
  }
}

function preservedSummary(id: string): ProjectSummary {
  return {
    ...toProjectSummary(id, { name: 'Projeto preservado' })!,
    hasPreservedEdit: true,
    migrationPending: true,
  }
}

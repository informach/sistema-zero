import type { ArtifactRef } from '@sistemazero/agent-core'
import type { z } from 'zod'
import { Artifacts } from '../store/artifacts'
import { workspaceExportSchema } from '../workspace/export'
import type { Patches, patchSchema } from '../workspace/patch'

export class Integrator {
  private artifacts: Artifacts
  constructor(
    private patches: Patches,
    directory: string,
  ) {
    this.artifacts = new Artifacts(directory)
  }
  async apply(reference: ArtifactRef, workspace: string, runId: string, signal: AbortSignal) {
    const manifest = workspaceExportSchema.parse(
      JSON.parse((await this.artifacts.read(reference)).toString('utf8')),
    )
    if (manifest.changes.length > 30)
      throw new Error('Integration exceeds 30 files; split the team task before applying')
    const changes: z.infer<typeof patchSchema>['changes'] = manifest.changes.map((change) =>
      change.after
        ? {
            operation: 'artifact',
            path: change.path,
            expectedHash: change.before,
            artifact: change.after,
          }
        : { operation: 'delete', path: change.path, expectedHash: change.before ?? '' },
    )
    if (!changes.length) return { files: [] }
    return this.patches.apply(workspace, runId, { changes }, signal)
  }
}

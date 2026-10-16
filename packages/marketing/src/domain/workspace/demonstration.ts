import {
  type AssetManifest,
  demonstrationSources,
  isDemonstrationAsset,
  type Revision,
  type VideoProject,
} from '@sistemazero/marketing-contracts'
import { WorkspaceError } from './workspace-error'

/** Sources are factual editorial records, never an assertion invented by a render or a model. */
export function validateDemonstrationSources(
  timeline: VideoProject,
  projectId: string,
  revisions: Pick<Revision, 'id' | 'entityId' | 'projectId' | 'document'>[],
  assets: AssetManifest[],
) {
  for (const source of demonstrationSources(timeline)) {
    const evidence = revisions.find((revision) => revision.id === source.evidenceRevisionId)
    const asset = assets.find((asset) => asset.id === source.assetId)
    if (
      !evidence ||
      evidence.projectId !== projectId ||
      evidence.entityId !== source.evidenceId ||
      evidence.document.kind !== 'evidence' ||
      evidence.document.classification !== 'fact' ||
      evidence.document.validity !== 'current' ||
      !evidence.document.assetIds?.includes(source.assetId) ||
      !asset ||
      asset.projectId !== projectId ||
      asset.sha256 !== source.sha256 ||
      !isDemonstrationAsset(asset) ||
      asset.width !== source.width ||
      asset.height !== source.height
    )
      throw new WorkspaceError(
        'INVALID_RESULT',
        'A demonstração exige uma imagem confirmada e normalizada, sem rotação EXIF, vinculada à revisão factual informada',
      )
  }
}

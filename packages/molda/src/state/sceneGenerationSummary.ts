import type { MoldaAssetSummary } from '../core/assetSummary'
import type { SceneStoredSummary } from './sceneMetadata'

/**
 * O resumo da geração seguinte no formato que a galeria e a nuvem já leem, marcado com
 * a geração. Um só lugar constrói isso: se a galeria e o espelho divergissem no que
 * marcam, a mesma criação seria uma coisa numa lista e outra na outra.
 */
export function sceneCloudSummary(summary: SceneStoredSummary): MoldaAssetSummary {
  return {
    id: summary.id,
    name: summary.name,
    kind: summary.kind,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    bytes: summary.bytes,
    thumbDataUrl: summary.thumbDataUrl,
    formatVersion: 2,
  }
}

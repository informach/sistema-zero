import { COPY } from '../../../core/copy'
import type { MapBrushFailure } from './mapBrush'

export function mapBrushMessage(result: {
  failure?: MapBrushFailure
  unmatched?: boolean
}): string | null {
  if (result.failure === 'work-budget') return COPY.scene.brushWorkLimit
  if (result.failure === 'cell-budget' || result.failure === 'storage-budget')
    return COPY.scene.brushStorageLimit
  if (result.failure === 'locked') return COPY.layers.lockedWarning
  if (result.failure) return COPY.scene.brushRefused
  return result.unmatched ? COPY.scene.faltamPecasDeBordaOuCantoNeste : null
}

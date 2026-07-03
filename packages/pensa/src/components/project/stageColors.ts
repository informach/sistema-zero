/**
 * Mapas etapa → classe utilitária / var CSS dos tokens pz-stage-* (o Tailwind
 * do host só gera classes escritas por extenso, nunca interpoladas).
 */
import type { PensaPlanStage } from '../../core/stages'

export const STAGE_BG_CLASS: Record<PensaPlanStage, string> = {
  z: 'bg-pz-stage-z',
  e: 'bg-pz-stage-e',
  r: 'bg-pz-stage-r',
  o: 'bg-pz-stage-o',
}

export const STAGE_COLOR_VAR: Record<PensaPlanStage, string> = {
  z: 'var(--color-pz-stage-z)',
  e: 'var(--color-pz-stage-e)',
  r: 'var(--color-pz-stage-r)',
  o: 'var(--color-pz-stage-o)',
}

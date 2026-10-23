import type { JourneyLevelSlug, MoldaToolBand } from '../../src/journey'

/** Pre-canonical seed reference only; no normal host reads a fixed rank-to-band table. */
export const MOLDA_TOOL_BAND_LEVELS: Readonly<Record<MoldaToolBand, JourneyLevelSlug>> = {
  basic: 'explorer',
  intermediate: 'architect',
  professional: 'god',
}

import { type AdultJourneyView, KIDS_MOLDA_BAND_CAPABILITIES } from '@sistemazero/core/journey'
import {
  MOLDA_TOOL_BANDS,
  type MoldaToolAccess,
  moldaToolFamilyIds,
} from '@sistemazero/molda/tools'

type AdultMoldaJourney = Pick<AdultJourneyView, 'capabilities' | 'curriculum'>

/** A legacy Molda grant covered every band. Curriculum grants are explicit per band. */
export function adultMoldaOpenBands(journey: AdultMoldaJourney) {
  if (!journey.curriculum && journey.capabilities.includes('molda')) return [...MOLDA_TOOL_BANDS]
  return MOLDA_TOOL_BANDS.filter((band) =>
    journey.capabilities.includes(KIDS_MOLDA_BAND_CAPABILITIES[band]),
  )
}

export function adultMoldaToolAccess(journey: AdultMoldaJourney): MoldaToolAccess | undefined {
  const open = adultMoldaOpenBands(journey)
  if (open.length === MOLDA_TOOL_BANDS.length) return undefined
  return {
    allow: moldaToolFamilyIds(open),
    upcoming: [
      {
        when: 'Veja na jornada como liberar estas ferramentas.',
        families: moldaToolFamilyIds(MOLDA_TOOL_BANDS.filter((band) => !open.includes(band))),
      },
    ],
  }
}

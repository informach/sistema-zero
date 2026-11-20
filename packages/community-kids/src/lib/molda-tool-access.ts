import { KIDS_MOLDA_BAND_CAPABILITIES } from '@sistemazero/core/journey'
import { cenariosToolAccessFromBands } from '@sistemazero/member-shell/lib/cenarios-tool-access'
import {
  hasKidsCapability,
  isKidsStaffPreview,
  type KidsJourneyAccess,
} from '@sistemazero/member-shell/lib/kids-journey-access'
import {
  MOLDA_TOOL_BANDS,
  type MoldaToolAccess,
  type MoldaToolBandId,
  moldaToolFamilyIds,
} from '@sistemazero/molda/tools'
import { BEYOND_HORIZON_PHRASE } from '@/lib/journey-horizon'
import { LEVEL_ORDER, levelInfo } from '@/lib/level-info'

export const MOLDA_BEYOND_HORIZON = BEYOND_HORIZON_PHRASE

/** Existing creations remain readable; these capabilities restrict authoring controls only. */
function openBands(journey: KidsJourneyAccess) {
  return MOLDA_TOOL_BANDS.filter((band) =>
    hasKidsCapability(journey, KIDS_MOLDA_BAND_CAPABILITIES[band]),
  )
}

/**
 * The closed bands and the sentence telling when each one opens. A named promise requires a
 * reachable award in the actual published policy. The same bands gate Molda and Molda Cenários.
 */
function kidsMoldaBands(journey: KidsJourneyAccess) {
  const open = openBands(journey)
  const upcoming: { when: string; bands: MoldaToolBandId[] }[] = []
  for (const band of MOLDA_TOOL_BANDS) {
    if (open.includes(band)) continue
    const capability = KIDS_MOLDA_BAND_CAPABILITIES[band]
    const award =
      !isKidsStaffPreview(journey) && journey.mode === 'active'
        ? journey.advances.find((advance) => advance.capabilities.includes(capability))
        : undefined
    const horizon = journey.readiness.horizon
    const reachable =
      award && horizon !== null && LEVEL_ORDER.indexOf(award.level) <= LEVEL_ORDER.indexOf(horizon)
    const when = reachable ? `Abrem no nível ${levelInfo(award.level).label}` : MOLDA_BEYOND_HORIZON
    const last = upcoming.at(-1)
    if (last?.when === when) last.bands.push(band)
    else upcoming.push({ when, bands: [band] })
  }
  return { open, upcoming }
}

export function moldaToolAccessFor({
  journey,
}: {
  journey: KidsJourneyAccess
}): MoldaToolAccess | undefined {
  const { open, upcoming } = kidsMoldaBands(journey)
  if (open.length === MOLDA_TOOL_BANDS.length) return undefined
  return {
    allow: moldaToolFamilyIds(open),
    upcoming: upcoming.map(({ when, bands }) => ({ when, families: moldaToolFamilyIds(bands) })),
  }
}

/** The scene workshop (Molda Cenários) follows the same bands with its own tool families. */
export function cenariosToolAccessFor({ journey }: { journey: KidsJourneyAccess }) {
  const { open, upcoming } = kidsMoldaBands(journey)
  return cenariosToolAccessFromBands(open, upcoming)
}

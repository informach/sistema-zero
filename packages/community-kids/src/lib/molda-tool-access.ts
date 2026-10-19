import { KIDS_MOLDA_BAND_CAPABILITIES } from '@sistemazero/core/journey'
import { hasKidsCapability, isKidsStaffPreview, type KidsJourneyAccess } from '@sistemazero/member-shell/lib/kids-journey-access'
import { MOLDA_TOOL_BANDS, type MoldaToolAccess, moldaToolFamilyIds } from '@sistemazero/molda/tools'
import { BEYOND_HORIZON_PHRASE } from '@/lib/journey-horizon'
import { LEVEL_ORDER, levelInfo } from '@/lib/level-info'

export const MOLDA_BEYOND_HORIZON = BEYOND_HORIZON_PHRASE

/** Existing creations remain readable; these capabilities restrict authoring controls only. */
function openBands(journey: KidsJourneyAccess) {
  return MOLDA_TOOL_BANDS.filter((band) => hasKidsCapability(journey, KIDS_MOLDA_BAND_CAPABILITIES[band]))
}

/** A named promise requires a reachable award in the actual published policy. */
export function moldaToolAccessFor({ journey }: { journey: KidsJourneyAccess }): MoldaToolAccess | undefined {
  const open = openBands(journey)
  if (open.length === MOLDA_TOOL_BANDS.length) return undefined
  const upcoming: { when: string; families: string[] }[] = []
  for (const band of MOLDA_TOOL_BANDS) {
    if (open.includes(band)) continue
    const capability = KIDS_MOLDA_BAND_CAPABILITIES[band]
    const award = !isKidsStaffPreview(journey) && journey.mode === 'active'
      ? journey.advances.find((advance) => advance.capabilities.includes(capability))
      : undefined
    const horizon = journey.readiness.horizon
    const reachable = award && horizon !== null && LEVEL_ORDER.indexOf(award.level) <= LEVEL_ORDER.indexOf(horizon)
    const when = reachable ? `Abrem no nível ${levelInfo(award.level).label}` : MOLDA_BEYOND_HORIZON
    const families = moldaToolFamilyIds([band])
    const last = upcoming.at(-1)
    if (last?.when === when) last.families.push(...families)
    else upcoming.push({ when, families })
  }
  return { allow: moldaToolFamilyIds(open), upcoming }
}

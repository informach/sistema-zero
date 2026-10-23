import type { KidsJourneyAccess } from '@sistemazero/member-shell/lib/kids-journey-access'
import { canOpenFreeStudio, type StudioUnlocksResult } from './studio-cta'

/**
 * A posse do produto é necessária, mas não suficiente: qualquer entrada vinda
 * do Pensa/Pinta precisa respeitar o mesmo gate usado por `/estudio` (jornada e
 * blocos conquistados). A régua é a do `canOpenFreeStudio`.
 */
export function canOpenPensaStudioTask({
  studioProductOwned,
  journey,
  unlocks,
}: {
  studioProductOwned: boolean
  journey: KidsJourneyAccess | null
  unlocks: StudioUnlocksResult | null
}): boolean {
  return canOpenFreeStudio(studioProductOwned, journey, unlocks)
}

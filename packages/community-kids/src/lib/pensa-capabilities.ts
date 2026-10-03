import { canOpenFreeStudio, type StudioUnlocksResult } from './studio-cta'

/**
 * A posse do produto é necessária, mas não suficiente: qualquer entrada vinda
 * do Pensa/Pinta precisa respeitar o mesmo gate usado por `/estudio` (jornada e
 * blocos conquistados). A régua é a do `canOpenFreeStudio`.
 */
export function canOpenPensaStudioTask({
  studioProductOwned,
  levelSlug,
  role,
  unlocks,
}: {
  studioProductOwned: boolean
  levelSlug: string | undefined
  role: string | undefined
  unlocks: StudioUnlocksResult | null
}): boolean {
  return canOpenFreeStudio(studioProductOwned, levelSlug, role, unlocks)
}

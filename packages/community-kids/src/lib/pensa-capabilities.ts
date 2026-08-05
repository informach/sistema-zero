import { resolveStudioTier } from '@sistemazero/member-shell/lib/studio-tier'

/**
 * A posse do produto é necessária, mas não suficiente: qualquer entrada vinda
 * do Pensa/Pinta precisa respeitar o mesmo gate de carreira usado por `/estudio`.
 */
export function canOpenPensaStudioTask({
  studioProductOwned,
  levelSlug,
  role,
}: {
  studioProductOwned: boolean
  levelSlug: string | undefined
  role: string | undefined
}): boolean {
  return studioProductOwned && resolveStudioTier(levelSlug, role).freeStudio
}

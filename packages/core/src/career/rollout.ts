/** A family is one cohort: switching between siblings never changes the experience. */
export function creatorWorkshopEnabled(
  accountId: string | null,
  accounts: string | undefined,
): boolean {
  if (!accountId) return false
  const selection = accounts?.trim()
  if (selection === 'all') return true
  if (!selection || selection === 'none') return false
  return selection.split(',').some((id) => id.trim() === accountId)
}

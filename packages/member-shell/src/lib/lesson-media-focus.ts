/** A video and the short lesson narration share one audio focus. Registration happens only
 * in mounted browser components; embedded players provide their own pause API. */
const players = new Map<symbol, () => unknown>()
let activeOwner: symbol | null = null
let requestVersion = 0
export function hasLessonMediaFocus(owner: symbol): boolean {
  return activeOwner === owner && players.has(owner)
}
export function cancelLessonMediaFocus(owner: symbol) {
  if (activeOwner === owner) {
    activeOwner = null
    requestVersion++
  }
}
export function registerLessonMedia(owner: symbol, pause: () => unknown) {
  players.set(owner, pause)
  return () => {
    players.delete(owner)
    cancelLessonMediaFocus(owner)
  }
}
export async function requestLessonMediaFocus(owner: symbol): Promise<boolean> {
  if (!players.has(owner)) return false
  activeOwner = owner
  const version = ++requestVersion
  const results = await Promise.allSettled(
    [...players].filter(([id]) => id !== owner).map(async ([, pause]) => pause()),
  )
  return (
    version === requestVersion &&
    hasLessonMediaFocus(owner) &&
    results.every((result) => result.status === 'fulfilled')
  )
}

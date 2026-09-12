/** A video and the short lesson narration share one audio focus. Registration happens only
 * in mounted browser components; embedded players provide their own pause API. */
const players = new Map<symbol, () => unknown>()
export function registerLessonMedia(owner: symbol, pause: () => unknown) {
  players.set(owner, pause)
  return () => {
    players.delete(owner)
  }
}
export async function requestLessonMediaFocus(owner: symbol): Promise<boolean> {
  const results = await Promise.allSettled(
    [...players].filter(([id]) => id !== owner).map(async ([, pause]) => pause()),
  )
  return results.every((result) => result.status === 'fulfilled')
}

/** A video and the short lesson narration share one audio focus. Registration happens only
 * in mounted browser components; embedded players provide their own pause API.
 *
 * ⭐ Tipos (08/11/2026): a fala do Zappy e o relógio de uma cena NÃO se pausam entre si. A voz
 * automática do Zappy tocava a cada fala nova e, pedindo o foco, congelava os quadros do Farol no
 * meio da caminhada (e o relógio, ao rodar, calava o Zappy). Vídeo (`midia`) continua pausando
 * tudo e sendo pausado por tudo; duas falas, ou dois relógios, ainda se pausam.
 */
export type LessonMediaKind = 'midia' | 'fala' | 'relogio'
const players = new Map<symbol, { pause: () => unknown; tipo: LessonMediaKind }>()
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
export function registerLessonMedia(
  owner: symbol,
  pause: () => unknown,
  { tipo = 'midia' }: { tipo?: LessonMediaKind } = {},
) {
  players.set(owner, { pause, tipo })
  return () => {
    players.delete(owner)
    cancelLessonMediaFocus(owner)
  }
}
/** A fala e o relógio convivem; o resto se pausa. */
function convivem(a: LessonMediaKind, b: LessonMediaKind) {
  return (a === 'fala' && b === 'relogio') || (a === 'relogio' && b === 'fala')
}
export async function requestLessonMediaFocus(owner: symbol): Promise<boolean> {
  const quem = players.get(owner)
  if (!quem) return false
  activeOwner = owner
  const version = ++requestVersion
  const results = await Promise.allSettled(
    [...players]
      .filter(([id, outro]) => id !== owner && !convivem(quem.tipo, outro.tipo))
      .map(async ([, outro]) => outro.pause()),
  )
  return (
    version === requestVersion &&
    hasLessonMediaFocus(owner) &&
    results.every((result) => result.status === 'fulfilled')
  )
}

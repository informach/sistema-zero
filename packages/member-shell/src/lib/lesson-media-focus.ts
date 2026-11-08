/** A video and the short lesson narration share one audio focus. Registration happens only
 * in mounted browser components; embedded players provide their own pause API.
 *
 * ⭐ Tipos (08/11/2026): a fala do Zappy e o relógio de uma cena NÃO se pausam entre si. A voz
 * automática do Zappy tocava a cada fala nova e, pedindo o foco, congelava os quadros do Farol no
 * meio da caminhada (e o relógio, ao rodar, calava o Zappy). Vídeo (`midia`) continua pausando
 * tudo e sendo pausado por tudo; duas falas, ou dois relógios, ainda se pausam.
 *
 * ⚠️ Por isso o foco é de MAIS DE UM dono ao mesmo tempo (`comFoco`): quem convive com quem pediu
 * não é pausado e continua com o foco. Com um dono só, a fala do Zappy tirava o foco do relógio da
 * cena sem pausá-lo, e o bipe da cena (`hasLessonMediaFocus`) calava para sempre.
 */
export type LessonMediaKind = 'midia' | 'fala' | 'relogio'
const players = new Map<symbol, { pause: () => unknown; tipo: LessonMediaKind }>()
const comFoco = new Set<symbol>()
/** O pedido mais novo de cada dono: um pedido antigo do mesmo dono não vale mais. */
const pedidos = new Map<symbol, symbol>()
export function hasLessonMediaFocus(owner: symbol): boolean {
  return comFoco.has(owner) && players.has(owner)
}
export function cancelLessonMediaFocus(owner: symbol) {
  comFoco.delete(owner)
  pedidos.delete(owner)
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
  const pedido = Symbol('pedido')
  pedidos.set(owner, pedido)
  const pausar = [...players].filter(
    ([id, outro]) => id !== owner && !convivem(quem.tipo, outro.tipo),
  )
  for (const [id] of pausar) cancelLessonMediaFocus(id)
  comFoco.add(owner)
  const results = await Promise.allSettled(pausar.map(async ([, outro]) => outro.pause()))
  return (
    pedidos.get(owner) === pedido &&
    hasLessonMediaFocus(owner) &&
    results.every((result) => result.status === 'fulfilled')
  )
}

/**
 * Régua PURA de como o palco do jogo cabe na tela, na página pública de jogar.
 *
 * Duas perguntas moram aqui, e nenhuma delas toca no DOM:
 *  1. que PROPORÇÃO o jogo tem (ela vem do próprio iframe, então é dado hostil);
 *  2. vale a pena GIRAR o palco para ele caber maior.
 */

/** Proporção padrão: 800x480, o palco dos jogos do Estúdio. */
export const DEFAULT_STAGE_ASPECT = 5 / 3

/**
 * O jogo não tem palco (uma página só de HTML e CSS): a caixa inteira é dele,
 * sem proporção a preservar.
 */
export const STAGE_FILL = 'preencher'

export type StageAspect = number | typeof STAGE_FILL

/**
 * Fora desta faixa a proporção é lixo (ou hostil): o jogo é da CRIANÇA e roda
 * num iframe, então a mensagem dele é dado, nunca verdade. Recusar devolve o
 * padrão, que é o comportamento de sempre.
 */
const MIN_ASPECT = 0.2
const MAX_ASPECT = 5

/** Altura do cabeçalho em cada modo (ele encolhe quando o palco gira). */
export const STAGE_HEADER_PX = 60
export const STAGE_HEADER_ROTATED_PX = 44

/**
 * Girar só compensa com ganho de verdade. Abaixo disso a criança viraria o
 * aparelho para quase nada: um tablet quase quadrado ganha ~1,05x, um celular
 * em pé com jogo deitado ganha ~1,48x.
 */
export const ROTATION_MIN_GAIN = 1.25

/** Lê a resposta `sz:stage` do iframe. Qualquer coisa torta vira `null`. */
export function sanitizeStageAspect(raw: unknown): StageAspect | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { w, h } = raw as { w?: unknown; h?: unknown }
  if (typeof w !== 'number' || typeof h !== 'number') return null
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null
  if (w === 0 && h === 0) return STAGE_FILL
  if (w <= 0 || h <= 0) return null
  const aspect = w / h
  if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) return null
  return aspect
}

/** A proporção que a conta de layout usa (o "preencher" não tem uma própria). */
export function layoutAspect(aspect: StageAspect): number {
  return aspect === STAGE_FILL ? DEFAULT_STAGE_ASPECT : aspect
}

export interface StageFitInput {
  /** A viewport INTEIRA: o cabeçalho gira junto, então ele entra dos dois lados. */
  viewportW: number
  viewportH: number
  aspect: StageAspect
  /** Girar só faz sentido em aparelho que a criança consegue virar. */
  coarsePointer: boolean
}

/** A caixa que sobra para o palco com o aparelho em pé. */
export function uprightStageBox(input: StageFitInput): { w: number; h: number } {
  return { w: input.viewportW, h: input.viewportH - STAGE_HEADER_PX }
}

/** A caixa que sobra para o palco depois de girar (os eixos trocam de papel). */
export function rotatedStageBox(input: StageFitInput): { w: number; h: number } {
  return { w: input.viewportH, h: input.viewportW - STAGE_HEADER_ROTATED_PX }
}

/** O maior palco daquela proporção que cabe numa caixa, sem deformar. */
export function fittedStageBox(
  box: { w: number; h: number },
  aspect: StageAspect,
): { width: number; height: number } {
  if (aspect === STAGE_FILL) {
    return { width: Math.max(0, box.w), height: Math.max(0, box.h) }
  }
  const width = Math.max(0, Math.min(box.w, box.h * aspect))
  return { width, height: width / aspect }
}

/**
 * Vale a pena girar?
 *
 * A decisão é GEOMÉTRICA, não "é celular": compara o palco que cabe em pé com o
 * que cabe deitado e gira só com ganho relevante. É o que faz a regra se acertar
 * sozinha em cada caso, sem lista de aparelhos — um jogo EM PÉ num celular em pé
 * nunca gira (girar o encolheria), um desktop nunca gira, e um jogo deitado num
 * celular em pé sempre gira.
 */
export function shouldRotateStage(input: StageFitInput): boolean {
  if (!input.coarsePointer) return false
  if (input.aspect === STAGE_FILL) return false
  if (!(input.viewportW > 0) || !(input.viewportH > 0)) return false
  const upright = fittedStageBox(uprightStageBox(input), input.aspect).width
  const rotated = fittedStageBox(rotatedStageBox(input), input.aspect).width
  if (!(upright > 0)) return false
  return rotated >= upright * ROTATION_MIN_GAIN
}

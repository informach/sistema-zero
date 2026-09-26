/**
 * Linhas-guia do palco do VETOR: retas horizontais/verticais que a criança puxa da régua para
 * alinhar o desenho DE OLHO. Regras (decisões dela, 26/09/2026):
 * - só visuais: NADA encaixa nelas (este módulo não exporta nada que o `maybeSnap` possa usar);
 * - vivem na SESSÃO do editor (morrem ao fechar o desenho): não há campo no asset, sanitize,
 *   migração nem export. É por construção que elas nunca saem no SVG/PNG/miniatura/Estúdio.
 * As posições são em UNIDADES DO DOCUMENTO e inteiras (lêem limpas na régua; guia em meio
 * pixel de sprite não ajuda ninguém).
 */
import type { Vec2 } from './model'

export type GuideAxis = 'x' | 'y'

export interface StageGuide {
  id: string
  /** `x` = guia VERTICAL (posição no eixo x); `y` = guia HORIZONTAL. */
  axis: GuideAxis
  pos: number
}

export const MAX_GUIDES = 32

let nextGuideId = 1

export function clampGuidePos(pos: number, docSize: number): number {
  if (!Number.isFinite(pos)) return 0
  return Math.min(Math.max(Math.round(pos), 0), Math.max(0, Math.round(docSize)))
}

/** Acrescenta uma guia; no teto devolve o MESMO array (quem chama avisa). */
export function addGuide(
  guides: readonly StageGuide[],
  axis: GuideAxis,
  pos: number,
  docSize: number,
): readonly StageGuide[] {
  if (guides.length >= MAX_GUIDES) return guides
  const id = `guide-${nextGuideId}`
  nextGuideId += 1
  return [...guides, { id, axis, pos: clampGuidePos(pos, docSize) }]
}

export function moveGuide(
  guides: readonly StageGuide[],
  id: string,
  pos: number,
  docSize: number,
): readonly StageGuide[] {
  const next = clampGuidePos(pos, docSize)
  let changed = false
  const result = guides.map((guide) => {
    if (guide.id !== id || guide.pos === next) return guide
    changed = true
    return { ...guide, pos: next }
  })
  return changed ? result : guides
}

export function removeGuide(guides: readonly StageGuide[], id: string): readonly StageGuide[] {
  const result = guides.filter((guide) => guide.id !== id)
  return result.length === guides.length ? guides : result
}

/** A guia mais perto do ponto dentro da tolerância (em unidades do documento), ou nenhuma. */
export function guideAt(
  guides: readonly StageGuide[],
  point: Vec2,
  tolerance: number,
): StageGuide | null {
  let best: StageGuide | null = null
  let bestDistance = tolerance
  for (const guide of guides) {
    const distance = Math.abs((guide.axis === 'x' ? point.x : point.y) - guide.pos)
    if (distance <= bestDistance) {
      best = guide
      bestDistance = distance
    }
  }
  return best
}

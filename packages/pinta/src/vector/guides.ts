/**
 * Linhas-guia do palco do VETOR: retas horizontais/verticais que a criança puxa da régua para
 * alinhar o desenho DE OLHO. Regras (decisões dela, 26/09/2026):
 * - só visuais: NADA encaixa nelas (este módulo não exporta nada que o `maybeSnap` possa usar);
 * - vivem na SESSÃO do editor (morrem ao fechar o desenho): não há campo no asset, sanitize,
 *   migração nem export. É por construção que elas nunca saem no SVG/PNG/miniatura/Estúdio.
 * As posições são em UNIDADES DO DOCUMENTO e inteiras (lêem limpas na régua; guia em meio
 * pixel de sprite não ajuda ninguém).
 * Não há hit-test aqui: quem descobre qual guia foi tocada é o NAVEGADOR (o `pointerdown` no
 * `<g data-guide>` de cada uma), então o módulo só cuida da lista.
 */

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

/**
 * Traz para dentro do documento as guias que ficaram de fora quando ele ENCOLHEU (pos maior
 * que o tamanho): órfã, a guia seguia invisível, mas contava no teto e acendia o "Limpar".
 * Devolve o MESMO array quando nenhuma precisou mexer.
 */
export function clampGuides(
  guides: readonly StageGuide[],
  docWidth: number,
  docHeight: number,
): readonly StageGuide[] {
  let changed = false
  const result = guides.map((guide) => {
    const next = clampGuidePos(guide.pos, guide.axis === 'x' ? docWidth : docHeight)
    if (next === guide.pos) return guide
    changed = true
    return { ...guide, pos: next }
  })
  return changed ? result : guides
}

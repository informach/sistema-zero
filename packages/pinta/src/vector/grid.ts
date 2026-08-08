/**
 * Grade de APOIO do editor vetorial — SÓ no editor, nunca no export (`svg.ts`
 * e `VectorFrameSvg` não a conhecem). O espaçamento acompanha o tamanho do
 * documento; com a grade LIGADA, desenhar/mover/redimensionar encaixam nos
 * cruzamentos (o pincel e os nós do "editar pontos" ficam livres).
 */
import type { Vec2 } from './model'

/** Espaçamento da grade (unidades do documento) por tamanho do documento. */
export function gridSpacingFor(width: number, height: number): number {
  const size = Math.max(width, height)
  if (size <= 64) return 4
  if (size <= 256) return 8
  return 16
}

/** Arredonda um valor para o múltiplo de `spacing` mais próximo. */
export function snapValue(value: number, spacing: number): number {
  return Math.round(value / spacing) * spacing
}

/** Arredonda um ponto para o cruzamento de grade mais próximo. */
export function snapPoint(point: Vec2, spacing: number): Vec2 {
  return { x: snapValue(point.x, spacing), y: snapValue(point.y, spacing) }
}

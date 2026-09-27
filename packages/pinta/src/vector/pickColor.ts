/**
 * Conta-gotas do VETOR: qual forma está sob o toque e QUAL cor sai dela.
 *
 * Duas perguntas puras, sem DOM, compartilhadas pela ferramenta Conta-gotas (que
 * adota o estilo inteiro) e pelo modo de captura da janelinha de cor (que pede
 * UMA cor para uma ponta do degradê). O hit-test é a caixa (bbox) da forma, do
 * topo para baixo, alargada pela folga do toque e por metade do contorno, com o
 * ponto levado ao espaço LOCAL da forma girada; a cor de um degradê é a PONTA
 * mais próxima do toque, medida do jeito que o SVG mede o próprio degradê
 * (unidades da caixa), então o que ela vê é o que ela pega.
 */
import { normalizeHex } from '../core/color'
import { type Bounds, rotatePoint, rotationPivotOf, shapeBounds } from './geometry'
import { gradientGeometry } from './gradient'
import { pointPassesMask, resolveMaskScene } from './mask'
import { isVectorGradient, type Vec2, type VectorGradient, type VectorShape } from './model'

/** Ponto dentro do retângulo (hit-test grosso do conta-gotas). */
export function boundsContains(b: Bounds, p: Vec2): boolean {
  return p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height
}

/** A caixa crescida para todos os lados (o centro não se move). Exportado: o `hitTest.ts` usa. */
export function inflate(b: Bounds, by: number): Bounds {
  if (by <= 0) return b
  return { x: b.x - by, y: b.y - by, width: b.width + by * 2, height: b.height + by * 2 }
}

/** O ponto no espaço LOCAL da forma (desfaz a rotação em torno do centro da caixa). Exportado: o `hitTest.ts` usa. */
export function localPoint(shape: VectorShape, _bounds: Bounds, point: Vec2): Vec2 {
  return shape.rotation === 0 ? point : rotatePoint(point, rotationPivotOf(shape), -shape.rotation)
}

/**
 * O ponto em coordenadas 0..1 DENTRO da figura (0,0 = canto de cima à esquerda
 * da imagem; 1,1 = o de baixo à direita), ou `null` fora dela. É regra de três
 * pura porque o `<image>` sai com `preserveAspectRatio="none"` (`svg.ts`): a
 * imagem PREENCHE a caixa, sem tarja e sem corte. `localPoint` desfaz a
 * rotação, então figura girada também responde certo.
 *
 * ⚠️ `slack` (unidades do documento) tem que ser a MESMA folga com que o
 * `hitShapeAt` escolheu esta figura, e o resultado então é CLAMPADO em [0,1]:
 * o hit-test acerta um anel de `10/zoom` em volta da caixa, e sem a folga aqui
 * mirar a beirada do adesivo caía "fora da imagem" — a criança levava um recado
 * de erro com a figura perfeitamente carregada. Dentro do anel ela pega o pixel
 * da borda, que é exatamente o que está vendo.
 *
 * Quem transforma isto em cor é o `imageSampler.ts` — ler pixel precisa de
 * canvas, e este módulo é puro.
 */
export function imageUvAt(
  shape: Extract<VectorShape, { type: 'image' }>,
  point: Vec2,
  slack = 0,
): Vec2 | null {
  const bounds = shapeBounds(shape)
  // Defensivo: o sanitize recusa figura com `w`/`h` não positivos, então uma
  // caixa degenerada não chega aqui vinda do disco.
  if (bounds.width <= 0 || bounds.height <= 0) return null
  const local = localPoint(shape, bounds, point)
  const u = (local.x - bounds.x) / bounds.width
  const v = (local.y - bounds.y) / bounds.height
  const du = slack / bounds.width
  const dv = slack / bounds.height
  if (u < -du || u > 1 + du || v < -dv || v > 1 + dv) return null
  return { x: Math.min(1, Math.max(0, u)), y: Math.min(1, Math.max(0, v)) }
}

/**
 * A forma PINTA alguma coisa? Preenchimento ou contorno com cor (a figura de
 * pixel art sempre pinta). "Sem cor" nos DOIS canais é um estado que a paleta
 * produz, e a forma fica invisível: ela não pode roubar o toque da forma que a
 * criança está vendo embaixo.
 */
export function paintsSomething(shape: VectorShape): boolean {
  if (shape.type === 'image') return true
  if (shape.type === 'line') return shape.stroke !== null
  return shape.fill !== 'none' || shape.stroke !== null
}

/**
 * A forma mais AO TOPO cuja caixa contém o ponto. `slack` (unidades do
 * documento) é a folga do toque; a caixa cresce por ela mais METADE do contorno,
 * que pinta para fora da geometria. Sem isso uma linha reta horizontal tem caixa
 * de altura ZERO e nunca acerta. Escondida e invisível não contam; TRANCADA
 * conta (pegar cor é leitura, mesma régua do conta-gotas do pixel).
 */
export function hitShapeAt(
  shapes: readonly VectorShape[],
  point: Vec2,
  slack = 0,
): VectorShape | null {
  const scene = resolveMaskScene(shapes)
  for (let i = scene.painted.length - 1; i >= 0; i -= 1) {
    const shape = scene.painted[i]
    if (!shape || shape.hidden === true || !paintsSomething(shape)) continue
    const bounds = shapeBounds(shape)
    const hit = inflate(bounds, slack + (shape.stroke?.width ?? 0) / 2)
    if (
      pointPassesMask(scene, shape, point) &&
      boundsContains(hit, localPoint(shape, bounds, point))
    ) {
      return shape
    }
  }
  return null
}

/** Coordenada 0..1 dentro da caixa (0,5 quando a caixa não tem extensão). */
function unit(value: number, start: number, size: number): number {
  return size > 0 ? (value - start) / size : 0.5
}

/**
 * A ponta do degradê mais perto do ponto (já no espaço local da forma), em
 * unidades da caixa, exatamente como o SVG avalia `objectBoundingBox`. Radial:
 * `cx=cy=r=0,5` por default, então o meio do degradê antigo fica a 0,25 do centro.
 */
function nearestGradientStop(gradient: VectorGradient, bounds: Bounds, point: Vec2): string {
  const u = unit(point.x, bounds.x, bounds.width)
  const v = unit(point.y, bounds.y, bounds.height)
  const geometry = gradientGeometry(gradient)
  if (geometry.type === 'radial') {
    return Math.hypot(u - geometry.center.x, v - geometry.center.y) < geometry.radius / 2
      ? gradient.from
      : gradient.to
  }
  const dx = geometry.end.x - geometry.start.x
  const dy = geometry.end.y - geometry.start.y
  const length = dx * dx + dy * dy
  const t = length > 0 ? ((u - geometry.start.x) * dx + (v - geometry.start.y) * dy) / length : 0
  return t < 0.5 ? gradient.from : gradient.to
}

/**
 * UMA cor da forma, ou `null` quando não dá para responder SEM DOM (a figura de
 * pixel art, cuja cor é o PIXEL sob o toque — quem a lê é o `imageSampler.ts`),
 * ou quando não há cor nenhuma. Preenchimento sólido vence; sem preenchimento (traço
 * do pincel) e linha valem o contorno; degradê devolve a ponta mais perto do
 * toque. Sempre normalizada (`#rrggbb` minúsculo: desenho antigo pode guardar
 * maiúsculas).
 */
export function colorAtPoint(shape: VectorShape, point: Vec2): string | null {
  if (shape.type === 'image') return null
  const strokeColor = shape.stroke ? normalizeHex(shape.stroke.color) : null
  if (shape.type === 'line') return strokeColor
  if (isVectorGradient(shape.fill)) {
    const bounds = shapeBounds(shape)
    const stop = nearestGradientStop(shape.fill, bounds, localPoint(shape, bounds, point))
    return normalizeHex(stop)
  }
  if (shape.fill !== 'none') return normalizeHex(shape.fill)
  return strokeColor
}

/**
 * As duas perguntas de uma vez: a forma tocada e a cor dela. `hex` nulo só
 * acontece com a figura de pixel art (forma sem cor nem entra no hit-test) —
 * aí quem responde é o `imageSampler.ts`, com o pixel.
 */
export function pickColorAt(
  shapes: readonly VectorShape[],
  point: Vec2,
  slack = 0,
): { shape: VectorShape; hex: string | null } | null {
  const shape = hitShapeAt(shapes, point, slack)
  return shape ? { shape, hex: colorAtPoint(shape, point) } : null
}

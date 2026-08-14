/**
 * Booleanas entre polígonos do Pathfinder.
 *
 * O modelo do Pinta usa um `Poly` plano (anéis externos, furos e ilhas no
 * mesmo array) e preenchimento nonzero. A conta robusta fica com o algoritmo
 * Martinez de `polygon-clipping`; este módulo preserva a fronteira do Pinta:
 * converte o nonzero para MultiPolygon, remove o ponto de fechamento da saída,
 * orienta furos e serializa no dialeto M/L/Z aceito pelo projeto.
 */
// ⚠️⚠️ IMPORT DEFAULT, NUNCA NOMEADO — e o motivo é uma mentira do pacote.
//
// O `polygon-clipping.d.ts` DECLARA `export function union/intersection/xor/difference`,
// então o `tsc` aceita o import nomeado numa boa. Só que o bundle real exporta UMA coisa:
// `var index = { union, intersection, xor, difference }; export { index as default }`.
// O CJS faz o mesmo (`module.exports = index`).
//
// Resultado: `bun test` e `tsc` passam (o bun resolve pela interop de CJS), e o BUILD do
// Next/Turbopack do community-kids FALHA com "Export union doesn't exist in target module".
// Nem o portão local nem o CI enxergam isso — só o build do app, no Railway. Trocar de volta
// para nomeado derruba o deploy do kids inteiro, e a página que morre é a do Pinta.
//
// O default import é honesto nos dois lados: o `tsc` o aceita por `allowSyntheticDefaultImports`
// (ligado no tsconfig do pinta) e o bundler entrega o objeto de verdade.

import type { MultiPolygon as ClippingMultiPolygon, Ring as ClippingRing } from 'polygon-clipping'
import polygonClipping from 'polygon-clipping'
import { round2 } from './geometry'
import type { Vec2 } from './model'

const { difference, intersection, union, xor } = polygonClipping

/** Anel FECHADO: o último ponto liga no primeiro e NÃO se repete. */
export type Ring = Vec2[]
/** Uma forma achatada: 1+ anéis (externos, furos e ilhas). */
export type Poly = Ring[]

export type ClipOp = 'union' | 'intersect' | 'difference' | 'xor'

/** Anel com área menor que isto é lasca de ruído numérico, não desenho. */
const MIN_RING_AREA = 0.02
const SAME_POINT_EPSILON = 1e-7

/** Shoelace em coordenadas do DOCUMENTO (y para baixo). */
export function signedArea(ring: Ring): number {
  let sum = 0
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    if (!a || !b) continue
    sum += a.x * b.y - b.x * a.y
  }
  return sum / 2
}

/** Área com SINAL da forma inteira: furo entra negativo e desconta. */
export function polyArea(poly: Poly): number {
  return poly.reduce((sum, ring) => sum + signedArea(ring), 0)
}

/** Winding number (Sunday), somado sobre TODOS os anéis. */
export function windingNumber(point: Vec2, poly: Poly): number {
  let winding = 0
  for (const ring of poly) {
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i]
      const b = ring[(i + 1) % ring.length]
      if (!a || !b) continue
      const cross = (b.x - a.x) * (point.y - a.y) - (point.x - a.x) * (b.y - a.y)
      if (a.y <= point.y) {
        if (b.y > point.y && cross > 0) winding += 1
      } else if (b.y <= point.y && cross < 0) winding -= 1
    }
  }
  return winding
}

/** A mesma regra NONZERO usada pelo SVG quando não há `fill-rule`. */
export function pointInPoly(point: Vec2, poly: Poly): boolean {
  return windingNumber(point, poly) !== 0
}

/** Um ponto seguramente dentro de um anel simples, perto do vértice mais baixo. */
function innerSample(ring: Ring): Vec2 {
  let index = 0
  for (let i = 1; i < ring.length; i += 1) {
    const point = ring[i]
    const best = ring[index]
    if (!point || !best) continue
    if (point.y > best.y || (point.y === best.y && point.x < best.x)) index = i
  }
  const point = ring[index] ?? { x: 0, y: 0 }
  const previous = ring[(index - 1 + ring.length) % ring.length] ?? point
  const next = ring[(index + 1) % ring.length] ?? point
  const middle = { x: (previous.x + next.x) / 2, y: (previous.y + next.y) / 2 }
  return {
    x: point.x + (middle.x - point.x) * 0.01,
    y: point.y + (middle.y - point.y) * 0.01,
  }
}

/**
 * Externo positivo, furo negativo. A profundidade — não o tamanho — decide:
 * uma ilha dentro de um furo volta a ser externa.
 */
export function orientForNonzero(poly: Poly): Poly {
  const samples = poly.map(innerSample)
  return poly.map((ring, index) => {
    const sample = samples[index]
    let depth = 0
    if (sample) {
      poly.forEach((other, otherIndex) => {
        if (index !== otherIndex && pointInPoly(sample, [other])) depth += 1
      })
    }
    const wantPositive = depth % 2 === 0
    const area = signedArea(ring)
    return area > 0 === wantPositive ? ring : [...ring].reverse()
  })
}

interface RingNode {
  ring: Ring
  sample: Vec2
  area: number
  parent: number | null
  winding: number
  ownerPolygon: number | null
}

function closeRing(ring: Ring): ClippingRing {
  const coordinates: ClippingRing = ring.map((point) => [point.x, point.y])
  const first = coordinates[0]
  if (first) coordinates.push(first)
  return coordinates
}

/**
 * Converte os anéis planos para MultiPolygon sem perder a regra nonzero.
 *
 * Um anel só vira fronteira quando muda "fora" (winding 0) para "dentro"
 * (winding != 0), ou vice-versa. Assim, dois anéis aninhados no mesmo sentido
 * não inventam um furo; um anel oposto abre o furo; e a ilha dentro dele cria
 * um novo polígono externo.
 */
function toClippingMultiPolygon(poly: Poly): ClippingMultiPolygon {
  const nodes: RingNode[] = poly
    .filter((ring) => ring.length >= 3 && Math.abs(signedArea(ring)) >= MIN_RING_AREA)
    .map((ring) => ({
      ring,
      sample: innerSample(ring),
      area: signedArea(ring),
      parent: null,
      winding: 0,
      ownerPolygon: null,
    }))
  const bySize = nodes
    .map((_, index) => index)
    .sort((a, b) => Math.abs(nodes[b]?.area ?? 0) - Math.abs(nodes[a]?.area ?? 0))
  const output: ClippingMultiPolygon = []

  for (const index of bySize) {
    const node = nodes[index]
    if (!node) continue
    let parent: number | null = null
    let parentArea = Number.POSITIVE_INFINITY
    for (const candidateIndex of bySize) {
      const candidate = nodes[candidateIndex]
      if (
        !candidate ||
        candidateIndex === index ||
        Math.abs(candidate.area) <= Math.abs(node.area) ||
        Math.abs(candidate.area) >= parentArea
      ) {
        continue
      }
      if (pointInPoly(node.sample, [candidate.ring])) {
        parent = candidateIndex
        parentArea = Math.abs(candidate.area)
      }
    }
    node.parent = parent

    const parentNode = parent === null ? null : nodes[parent]
    const parentWinding = parentNode?.winding ?? 0
    const nextWinding = parentWinding + (node.area >= 0 ? 1 : -1)
    node.winding = nextWinding

    if (parentWinding === 0 && nextWinding !== 0) {
      node.ownerPolygon = output.length
      output.push([closeRing(node.ring)])
    } else if (parentWinding !== 0 && nextWinding === 0) {
      const owner = parentNode?.ownerPolygon ?? null
      if (owner !== null) {
        output[owner]?.push(closeRing(node.ring))
        node.ownerPolygon = owner
      }
    } else {
      node.ownerPolygon = parentNode?.ownerPolygon ?? null
    }
  }

  return output
}

function samePoint(a: Vec2, b: Vec2): boolean {
  return Math.abs(a.x - b.x) <= SAME_POINT_EPSILON && Math.abs(a.y - b.y) <= SAME_POINT_EPSILON
}

function fromClippingMultiPolygon(multiPolygon: ClippingMultiPolygon): Poly {
  const rings: Poly = []
  for (const polygon of multiPolygon) {
    for (const coordinates of polygon) {
      const ring = coordinates.map(([x, y]) => ({ x, y }))
      const first = ring[0]
      const last = ring[ring.length - 1]
      if (first && last && samePoint(first, last)) ring.pop()
      if (ring.length >= 3 && Math.abs(signedArea(ring)) >= MIN_RING_AREA) rings.push(ring)
    }
  }
  return orientForNonzero(rings)
}

/**
 * Executa a booleana. `null` fica reservado para entrada que a biblioteca
 * robusta rejeitou; `[]` é um resultado geométrico vazio legítimo.
 */
export function clipPolys(a: Poly, b: Poly, op: ClipOp): Poly | null {
  const left = toClippingMultiPolygon(a)
  const right = toClippingMultiPolygon(b)
  if (left.length === 0 || right.length === 0) return null
  try {
    const result =
      op === 'union'
        ? union(left, right)
        : op === 'intersect'
          ? intersection(left, right)
          : op === 'difference'
            ? difference(left, right)
            : xor(left, right)
    return fromClippingMultiPolygon(result)
  } catch {
    return null
  }
}

/** `M x y L x y … Z` por anel: o dialeto exato aceito pelo `parsePathD`. */
export function polyToPathD(poly: Poly): string {
  const parts: string[] = []
  for (const ring of poly) {
    const first = ring[0]
    if (!first || ring.length < 3) continue
    parts.push(`M ${round2(first.x)} ${round2(first.y)}`)
    for (let i = 1; i < ring.length; i += 1) {
      const point = ring[i]
      if (point) parts.push(`L ${round2(point.x)} ${round2(point.y)}`)
    }
    parts.push('Z')
  }
  return parts.join(' ')
}

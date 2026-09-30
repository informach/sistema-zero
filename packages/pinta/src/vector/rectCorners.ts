/**
 * Os CANTOS do retângulo, canto a canto (30/09/2026).
 *
 * Pedido dela: "ao arredondar os cantos, em vez de só arredondar todos, poder escolher qual
 * canto arredondar". O `<rect>` do SVG só conhece UM `rx`, então um retângulo com cantos
 * diferentes tem que sair como `<path>` — e a geometria desse caminho, a dos nós do "editar os
 * pontos" e a do achatamento do pathfinder precisam bater número a número. Por isso tudo o que
 * sabe onde fica cada canto mora AQUI, e os outros módulos só compõem em cima.
 *
 * ⭐ Este módulo NÃO importa nada de runtime (só tipos): o `model.ts` (o sanitizer) o consome,
 * e o `geometry.ts` importa valores do `model.ts`: um import de runtime aqui fecharia o ciclo.
 *
 * O contrato do modelo (`VectorShape` rect):
 * - `rx` continua OBRIGATÓRIO e passa a ser "o maior raio". Um Pinta antigo, que só lê `rx`,
 *   arredonda os QUATRO com ele (degrada para redondo, nunca para reto nem para forma sumida).
 * - `corners` é a tupla `[tl, tr, br, bl]` (horário a partir de cima-esquerda, a ordem do
 *   `border-radius` do CSS), presente SÓ quando os raios diferem. Iguais → só `rx`, byte a byte
 *   como todo retângulo que já existe.
 * - A tupla é imutável de contrato: `animation/frames.ts` clona a forma de forma RASA, então o
 *   array é compartilhado entre quadros duplicados. Toda escrita passa por `rectCornerFields`,
 *   que cria uma tupla NOVA.
 */
import type { Vec2, VectorShape } from './model'

/** Raios por canto: cima-esquerda, cima-direita, baixo-direita, baixo-esquerda. */
export type RectCornerRadii = readonly [tl: number, tr: number, br: number, bl: number]

/** Quais cantos ficam redondos (a grade 2x2 do painel), na MESMA ordem dos raios. */
export type RectCornerMask = readonly [tl: boolean, tr: boolean, br: boolean, bl: boolean]

export type RectCorner = 'tl' | 'tr' | 'br' | 'bl'

/** A ordem canônica dos cantos (índice na tupla = posição aqui). */
export const RECT_CORNERS: readonly RectCorner[] = ['tl', 'tr', 'br', 'bl']

/** Todos redondos: o comportamento de sempre do slider. */
export const ALL_CORNERS: RectCornerMask = [true, true, true, true]

/** Aproxima um quarto de círculo com uma cúbica, como no traçado SVG usual. */
export const QUARTER_CIRCLE_KAPPA = (4 * (Math.SQRT2 - 1)) / 3

type RectShape = Extract<VectorShape, { type: 'rect' }>

function sameCorners(a: RectCornerRadii | undefined, b: RectCornerRadii | undefined): boolean {
  if (a === undefined || b === undefined) return a === b
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]
}

/**
 * Cada raio em `[0, min(|w|, |h|) / 2]`. É o MESMO clamp que o `makeRect` e o slider já
 * aplicavam ao `rx` uniforme — e ele garante sozinho que dois raios vizinhos nunca passam do
 * lado que dividem (`tl + tr ≤ w`, `tr + br ≤ h`…), então o caminho nunca se cruza.
 */
export function clampCornerRadii(radii: RectCornerRadii, w: number, h: number): RectCornerRadii {
  const max = Math.max(0, Math.min(Math.abs(w), Math.abs(h)) / 2)
  const clamp = (r: number) => (Number.isFinite(r) ? Math.min(Math.max(r, 0), max) : 0)
  return [clamp(radii[0]), clamp(radii[1]), clamp(radii[2]), clamp(radii[3])]
}

/**
 * Os raios EFETIVOS de um retângulo: `corners` quando existe, senão `rx` nos quatro; sempre
 * clampados à metade do menor lado. Todo consumidor de geometria lê por aqui, nunca por `rx`.
 */
export function rectCornerRadii(
  shape: Pick<RectShape, 'w' | 'h' | 'rx' | 'corners'>,
): RectCornerRadii {
  const raw: RectCornerRadii = shape.corners ?? [shape.rx, shape.rx, shape.rx, shape.rx]
  return clampCornerRadii(raw, shape.w, shape.h)
}

/**
 * Os campos PERSISTIDOS a partir de quatro raios: iguais → `{ rx }` sem a chave `corners`
 * (o retângulo de hoje, byte a byte); diferentes → `{ rx: max, corners }`, com uma tupla NOVA.
 * É o normalizador único: sanitize, fábrica e UI passam por ele.
 */
export function rectCornerFields(
  radii: RectCornerRadii,
  w: number,
  h: number,
): { rx: number; corners?: RectCornerRadii } {
  const [tl, tr, br, bl] = clampCornerRadii(radii, w, h)
  if (tl === tr && tr === br && br === bl) return { rx: tl }
  return { rx: Math.max(tl, tr, br, bl), corners: [tl, tr, br, bl] }
}

/**
 * O retângulo com estes raios aplicados. Devolve a MESMA referência quando nada muda — o
 * `updateFree` do escopo depende disso para não gravar um desfazer vazio.
 */
export function withRectCorners(shape: RectShape, radii: RectCornerRadii): RectShape {
  const next = rectCornerFields(radii, shape.w, shape.h)
  if (shape.rx === next.rx && sameCorners(shape.corners, next.corners)) return shape
  const { corners: _drop, ...rest } = shape
  return { ...rest, ...next }
}

/** Raio para os cantos LIGADOS da máscara, zero para os desligados. */
export function radiiFromMask(mask: RectCornerMask, radius: number): RectCornerRadii {
  const r = Math.max(0, radius)
  return [mask[0] ? r : 0, mask[1] ? r : 0, mask[2] ? r : 0, mask[3] ? r : 0]
}

/** Quais cantos estão redondos (raio acima de zero). */
export function maskFromRadii(radii: RectCornerRadii): RectCornerMask {
  return [radii[0] > 0, radii[1] > 0, radii[2] > 0, radii[3] > 0]
}

/** A máscara com UM canto invertido (tupla nova; a de entrada não muda). */
export function toggleCornerMask(mask: RectCornerMask, corner: RectCorner): RectCornerMask {
  const i = RECT_CORNERS.indexOf(corner)
  return [
    i === 0 ? !mask[0] : mask[0],
    i === 1 ? !mask[1] : mask[1],
    i === 2 ? !mask[2] : mask[2],
    i === 3 ? !mask[3] : mask[3],
  ]
}

/**
 * Os raios para uma máscara aplicada a uma forma que JÁ tem raios: canto ligado mantém o raio
 * que tinha e, se era reto, ganha `fallback` (o raio do slider); canto desligado vai a zero.
 */
export function radiiForMask(
  current: RectCornerRadii,
  mask: RectCornerMask,
  fallback: number,
): RectCornerRadii {
  const pick = (i: 0 | 1 | 2 | 3) => (mask[i] ? current[i] || fallback : 0)
  return [pick(0), pick(1), pick(2), pick(3)]
}

/**
 * Um canto pronto para ser desenhado, no sentido HORÁRIO do contorno.
 *
 * `from` é onde a aresta que CHEGA encosta no arco e `to` onde a aresta que SAI começa; `c1` e
 * `c2` são os controles da cúbica de `from` a `to` (com o kappa do quarto de círculo); `center`
 * e `startAngle` descrevem o mesmo arco como círculo (para quem achata em pontos). Canto reto
 * (raio 0): `from`, `to`, `c1`, `c2` e `center` são o próprio `point`.
 */
export interface RectCornerArc {
  corner: RectCorner
  /** O canto reto (a quina do retângulo). */
  point: Vec2
  radius: number
  from: Vec2
  to: Vec2
  c1: Vec2
  c2: Vec2
  center: Vec2
  /** Ângulo (radianos) em que o arco começa; ele varre +π/2 até `to`. */
  startAngle: number
}

/**
 * Os quatro cantos, SEMPRE na ordem tl, tr, br, bl, sobre a caixa normalizada
 * (`X = min(x, x+w)`, `Y = min(y, y+h)`, `|w|`, `|h|`). Os centros e ângulos são os mesmos que o
 * `rectRing` do `flatten.ts` sempre usou, e os controles os mesmos do `toEditablePath` — a troca
 * para este módulo não muda um número.
 */
export type RectCornerArcs = readonly [
  tl: RectCornerArc,
  tr: RectCornerArc,
  br: RectCornerArc,
  bl: RectCornerArc,
]

export function rectCornerArcs(shape: RectShape): RectCornerArcs {
  const X = Math.min(shape.x, shape.x + shape.w)
  const Y = Math.min(shape.y, shape.y + shape.h)
  const W = Math.abs(shape.w)
  const H = Math.abs(shape.h)
  const [tl, tr, br, bl] = rectCornerRadii(shape)
  const k = QUARTER_CIRCLE_KAPPA
  const arc = (
    corner: RectCorner,
    r: number,
    point: Vec2,
    from: Vec2,
    to: Vec2,
    c1: Vec2,
    c2: Vec2,
    center: Vec2,
    startAngle: number,
  ): RectCornerArc =>
    r > 0
      ? { corner, radius: r, point, from, to, c1, c2, center, startAngle }
      : {
          corner,
          radius: 0,
          point,
          from: point,
          to: point,
          c1: point,
          c2: point,
          center: point,
          startAngle,
        }
  return [
    arc(
      'tl',
      tl,
      { x: X, y: Y },
      { x: X, y: Y + tl },
      { x: X + tl, y: Y },
      { x: X, y: Y + tl - k * tl },
      { x: X + tl - k * tl, y: Y },
      { x: X + tl, y: Y + tl },
      Math.PI,
    ),
    arc(
      'tr',
      tr,
      { x: X + W, y: Y },
      { x: X + W - tr, y: Y },
      { x: X + W, y: Y + tr },
      { x: X + W - tr + k * tr, y: Y },
      { x: X + W, y: Y + tr - k * tr },
      { x: X + W - tr, y: Y + tr },
      -Math.PI / 2,
    ),
    arc(
      'br',
      br,
      { x: X + W, y: Y + H },
      { x: X + W, y: Y + H - br },
      { x: X + W - br, y: Y + H },
      { x: X + W, y: Y + H - br + k * br },
      { x: X + W - br + k * br, y: Y + H },
      { x: X + W - br, y: Y + H - br },
      0,
    ),
    arc(
      'bl',
      bl,
      { x: X, y: Y + H },
      { x: X + bl, y: Y + H },
      { x: X, y: Y + H - bl },
      { x: X + bl - k * bl, y: Y + H },
      { x: X, y: Y + H - bl + k * bl },
      { x: X + bl, y: Y + H - bl },
      Math.PI / 2,
    ),
  ]
}

/**
 * A geometria dos objetos do mapa, PURA: onde está cada ponto, o que o toque acerta, e as
 * contas de mexer nos pontos e de mudar o tamanho de um objeto girado.
 *
 * Uma regra só para o desenho e para o toque: o objeto gira em volta do canto de cima à
 * esquerda dele (`x`, `y`), e "virar de lado / para cima" vale para o DESENHO de dentro (a
 * figura), nunca para o contorno. Então nenhuma conta daqui espelha pontos.
 */
import type { TilemapObject } from '../core/project'

export interface ObjectBounds {
  x: number
  y: number
  width: number
  height: number
}
export interface Point {
  x: number
  y: number
}
export type ObjectHandle = 'nw' | 'ne' | 'sw' | 'se'

const radians = (o: TilemapObject): number => ((o.rotation ?? 0) * Math.PI) / 180

/** Ponto do mapa → ponto no espaço do objeto (sem o giro, a partir do canto dele). */
export function objectLocalPoint(o: TilemapObject, x: number, y: number): Point {
  const a = -radians(o),
    dx = x - o.x,
    dy = y - o.y
  return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) }
}

/** Ponto no espaço do objeto → ponto do mapa (o contrário do `objectLocalPoint`). */
export function objectWorldPoint(o: TilemapObject, x: number, y: number): Point {
  const a = radians(o)
  return {
    x: o.x + x * Math.cos(a) - y * Math.sin(a),
    y: o.y + x * Math.sin(a) + y * Math.cos(a),
  }
}

/** Os pontos do contorno no espaço do objeto (os quatro cantos, quando não há lista). */
function outline(o: TilemapObject): Point[] {
  return o.points?.length
    ? o.points
    : [
        { x: 0, y: 0 },
        { x: o.width, y: 0 },
        { x: o.width, y: o.height },
        { x: 0, y: o.height },
      ]
}

/** A caixa reta que cobre o objeto no mapa, já com o giro. */
export function objectBounds(o: TilemapObject): ObjectBounds {
  const world = outline(o).map((p) => objectWorldPoint(o, p.x, p.y))
  const x = Math.min(...world.map((p) => p.x)),
    y = Math.min(...world.map((p) => p.y))
  return {
    x,
    y,
    width: Math.max(...world.map((p) => p.x)) - x,
    height: Math.max(...world.map((p) => p.y)) - y,
  }
}

function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}

export function objectContains(o: TilemapObject, x: number, y: number, slack = 0): boolean {
  const p = objectLocalPoint(o, x, y)
  if (o.shape === 'point' || (!o.shape && !o.width && !o.height))
    return Math.hypot(p.x, p.y) <= Math.max(1, slack)
  if (o.shape === 'ellipse')
    return (
      ((p.x - o.width / 2) / Math.max(0.001, o.width / 2 + slack)) ** 2 +
        ((p.y - o.height / 2) / Math.max(0.001, o.height / 2 + slack)) ** 2 <=
      1
    )
  const pts = o.points
  if ((o.shape === 'polygon' || o.shape === 'polyline') && pts?.length) {
    let inside = false
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i]!,
        b = pts[j]!
      if (
        o.shape !== 'polyline' &&
        a.y > p.y !== b.y > p.y &&
        p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
      )
        inside = !inside
      if (o.shape === 'polyline' && i === 0) continue
      if (segmentDistance(p, a, b) <= Math.max(slack, 1)) return true
    }
    return inside
  }
  return p.x >= -slack && p.y >= -slack && p.x <= o.width + slack && p.y <= o.height + slack
}

/** Os quatro cantos do objeto NO MAPA (com o giro): é onde as alças aparecem. */
export function objectHandlePoints(o: TilemapObject): Record<ObjectHandle, Point> {
  return {
    nw: objectWorldPoint(o, 0, 0),
    ne: objectWorldPoint(o, o.width, 0),
    sw: objectWorldPoint(o, 0, o.height),
    se: objectWorldPoint(o, o.width, o.height),
  }
}

/** A alça de canto que o toque acertou (a mais perto dentro do alcance). */
export function objectHandleAt(
  o: TilemapObject,
  x: number,
  y: number,
  reach: number,
): ObjectHandle | null {
  let best: ObjectHandle | null = null,
    bestDistance = reach
  for (const [handle, p] of Object.entries(objectHandlePoints(o)) as [ObjectHandle, Point][]) {
    const d = Math.hypot(p.x - x, p.y - y)
    if (d <= bestDistance) {
      best = handle
      bestDistance = d
    }
  }
  return best
}

/**
 * Mudar o tamanho puxando um canto, com o canto do outro lado PARADO no mapa. O ponteiro vai
 * para o espaço do objeto, então a conta vale também para o objeto girado. Passar do canto
 * parado troca os lados (nunca fica do avesso). Os pontos de um polígono esticam junto.
 */
export function resizeObjectFromHandle(
  o: TilemapObject,
  handle: ObjectHandle,
  pointer: Point,
  minSize = 1,
): Pick<TilemapObject, 'x' | 'y' | 'width' | 'height'> & { points?: Point[] } {
  const local = objectLocalPoint(o, pointer.x, pointer.y)
  const fixedX = handle === 'nw' || handle === 'sw' ? o.width : 0,
    fixedY = handle === 'nw' || handle === 'ne' ? o.height : 0
  const left = Math.min(fixedX, local.x),
    top = Math.min(fixedY, local.y)
  const width = Math.max(minSize, Math.abs(local.x - fixedX)),
    height = Math.max(minSize, Math.abs(local.y - fixedY))
  // Com o tamanho mínimo, o canto parado continua parado: a caixa cresce para o lado do ponteiro.
  const originX = local.x < fixedX ? fixedX - width : left,
    originY = local.y < fixedY ? fixedY - height : top
  const origin = objectWorldPoint(o, originX, originY)
  const out: ReturnType<typeof resizeObjectFromHandle> = {
    x: origin.x,
    y: origin.y,
    width,
    height,
  }
  if (o.points?.length && o.width > 0 && o.height > 0)
    out.points = o.points.map((p) => ({
      x: (p.x / o.width) * width,
      y: (p.y / o.height) * height,
    }))
  return out
}

/** O ponto (vértice) que o toque acertou, pelo índice; `-1` = nenhum. */
export function objectVertexAt(o: TilemapObject, x: number, y: number, reach: number): number {
  const p = objectLocalPoint(o, x, y)
  let best = -1,
    bestDistance = reach
  for (const [i, v] of (o.points ?? []).entries()) {
    const d = Math.hypot(v.x - p.x, v.y - p.y)
    if (d <= bestDistance) {
      best = i
      bestDistance = d
    }
  }
  return best
}

/**
 * O trecho (entre dois pontos) que o toque acertou: devolve o índice onde um ponto NOVO
 * entraria na lista, ou `-1`. O polígono tem também o trecho que fecha (último → primeiro).
 */
export function objectSegmentAt(o: TilemapObject, x: number, y: number, reach: number): number {
  const pts = o.points ?? [],
    p = objectLocalPoint(o, x, y),
    closed = o.shape === 'polygon'
  let best = -1,
    bestDistance = reach
  const count = closed ? pts.length : pts.length - 1
  for (let i = 0; i < count; i++) {
    const d = segmentDistance(p, pts[i]!, pts[(i + 1) % pts.length]!)
    if (d <= bestDistance) {
      best = i + 1
      bestDistance = d
    }
  }
  return best
}

/**
 * Arruma o objeto depois de mexer nos pontos: o canto dele vai para o canto da caixa dos
 * pontos (sem tirar nenhum ponto do lugar no mapa) e a largura e a altura passam a ser as da caixa.
 */
export function withObjectPoints(
  o: TilemapObject,
  points: readonly Point[],
): Pick<TilemapObject, 'x' | 'y' | 'width' | 'height'> & { points: Point[] } {
  if (!points.length) return { x: o.x, y: o.y, width: o.width, height: o.height, points: [] }
  const minX = Math.min(...points.map((p) => p.x)),
    minY = Math.min(...points.map((p) => p.y))
  const origin = objectWorldPoint(o, minX, minY)
  return {
    x: origin.x,
    y: origin.y,
    width: Math.max(...points.map((p) => p.x)) - minX,
    height: Math.max(...points.map((p) => p.y)) - minY,
    points: points.map((p) => ({ x: p.x - minX, y: p.y - minY })),
  }
}

/** O menor número de pontos que a forma aguenta (triângulo ou um trecho de linha). */
export function minObjectPoints(shape: TilemapObject['shape']): number {
  return shape === 'polygon' ? 3 : 2
}

/** Põe um ponto novo (em pixels do MAPA) na posição `index` da lista. */
export function insertObjectPoint(
  o: TilemapObject,
  index: number,
  world: Point,
  max: number,
): ReturnType<typeof withObjectPoints> | null {
  const pts = o.points ?? []
  if (pts.length >= max || index < 0 || index > pts.length) return null
  const local = objectLocalPoint(o, world.x, world.y)
  return withObjectPoints(o, [...pts.slice(0, index), local, ...pts.slice(index)])
}

/** Tira um ponto; `null` quando a forma ficaria com pontos de menos. */
export function removeObjectPoint(
  o: TilemapObject,
  index: number,
): ReturnType<typeof withObjectPoints> | null {
  const pts = o.points ?? []
  if (pts.length <= minObjectPoints(o.shape) || index < 0 || index >= pts.length) return null
  return withObjectPoints(
    o,
    pts.filter((_, i) => i !== index),
  )
}

/** Leva um ponto para outro lugar do mapa (os outros ficam onde estavam). */
export function moveObjectPoint(
  o: TilemapObject,
  index: number,
  world: Point,
): ReturnType<typeof withObjectPoints> | null {
  const pts = o.points ?? []
  if (index < 0 || index >= pts.length) return null
  const local = objectLocalPoint(o, world.x, world.y)
  return withObjectPoints(
    o,
    pts.map((p, i) => (i === index ? local : p)),
  )
}

/** Uma forma nova a partir dos pontos tocados no mapa (sem giro). */
export function objectFromWorldPoints(
  points: readonly Point[],
): Pick<TilemapObject, 'x' | 'y' | 'width' | 'height'> & { points: Point[] } {
  const minX = Math.min(...points.map((p) => p.x)),
    minY = Math.min(...points.map((p) => p.y))
  return {
    x: minX,
    y: minY,
    width: Math.max(...points.map((p) => p.x)) - minX,
    height: Math.max(...points.map((p) => p.y)) - minY,
    points: points.map((p) => ({ x: p.x - minX, y: p.y - minY })),
  }
}

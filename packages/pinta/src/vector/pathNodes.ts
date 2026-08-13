/**
 * Os NÓS de uma forma, na visão que o editor de pontos precisa: âncora + alças.
 *
 * ⭐ O modelo (`model.ts`) NÃO guarda nada por ponto — `path` é uma string `d` e
 * `polygon` é um `Vec2[]` cru. Esta forma canônica vive só em MEMÓRIA, entre um
 * `toEditablePath` e o `fromEditablePath` que devolve a forma. Com isso não há
 * migração, o sanitize não muda e o orçamento de undo (`shapeBytes`) continua
 * honesto.
 *
 * ⭐ "Suave" e "canto" também não são guardados: um nó é SUAVE quando as duas
 * alças são colineares e espelhadas em torno da âncora — dá para ler da
 * geometria. O pincel entrega isso de graça, porque a Catmull-Rom gera saída
 * `p + (p₊₁−p₋₁)/6` e entrada `p − (p₊₁−p₋₁)/6`, exatamente espelhadas.
 *
 * Tudo aqui é PURO: sem React, sem DOM, sem SVG.
 */
import { parsePathD, round2 } from './geometry'
import {
  MAX_PATH_CHARS,
  MAX_POLYGON_POINTS,
  MIN_POLYGON_POINTS,
  type Vec2,
  type VectorShape,
} from './model'
import { catmullRomToPath, simplifyRDP } from './smoothing'

/** Um nó: a âncora sobre a curva e, quando há curva, as alças ABSOLUTAS. */
export interface PathNode {
  p: Vec2
  /** Controle que CHEGA nesta âncora (fim do segmento anterior). */
  in?: Vec2
  /** Controle que SAI desta âncora (começo do próximo segmento). */
  out?: Vec2
}

export interface EditablePath {
  nodes: PathNode[]
  closed: boolean
}

/** Piso de nós de um traço aberto. Abaixo disso não sobra desenho nenhum. */
export const MIN_PATH_NODES = 2

/** Coordenadas são arredondadas em 2 casas, então 0.01 é "o mesmo ponto". */
const SAME_POINT = 0.01

function samePoint(a: Vec2, b: Vec2): boolean {
  return Math.abs(a.x - b.x) <= SAME_POINT && Math.abs(a.y - b.y) <= SAME_POINT
}

function copy(p: Vec2): Vec2 {
  return { x: p.x, y: p.y }
}

function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/** O segmento `a → b` tem curva? (basta uma das duas alças existir) */
export function segmentIsCurved(a: PathNode, b: PathNode): boolean {
  return a.out !== undefined || b.in !== undefined
}

function hasAnyCurve(ep: EditablePath): boolean {
  return ep.nodes.some((n) => n.in !== undefined || n.out !== undefined)
}

// ── Modelo → nós ────────────────────────────────────────────────────────────

/**
 * `null` quando a forma não se edita por pontos (rect/ellipse/text) ou quando o
 * `d` sai do nosso dialeto. ⚠️ Vários sub-caminhos (mais de um `M`) também dão
 * `null`: nada que a gente gera produz isso, e adivinhar mancharia o desenho.
 */
export function toEditablePath(shape: VectorShape): EditablePath | null {
  switch (shape.type) {
    case 'polygon':
      return { nodes: shape.points.map((p) => ({ p: copy(p) })), closed: true }
    case 'line':
      return {
        nodes: [{ p: { x: shape.x1, y: shape.y1 } }, { p: { x: shape.x2, y: shape.y2 } }],
        closed: false,
      }
    case 'path':
      return parseEditablePath(shape.d)
    default:
      return null
  }
}

function parseEditablePath(d: string): EditablePath | null {
  const parsed = parsePathD(d)
  if (!parsed) return null
  const nodes: PathNode[] = []
  let closed = false
  let sawMove = false

  for (const command of parsed.commands) {
    const op = command.op.toUpperCase()
    const c = command.coords
    if (op === 'M') {
      if (sawMove || c.length < 2) return null // sub-caminhos: não sabemos editar
      sawMove = true
      nodes.push({ p: { x: c[0] ?? 0, y: c[1] ?? 0 } })
    } else if (op === 'L') {
      if (!sawMove || c.length < 2) return null
      nodes.push({ p: { x: c[0] ?? 0, y: c[1] ?? 0 } })
    } else if (op === 'C') {
      if (!sawMove || c.length < 6) return null
      const previous = nodes[nodes.length - 1]
      if (!previous) return null
      // ⭐ Controle EM CIMA da própria âncora não é alça, é o jeito de escrever
      // "esta ponta do trecho é reta" num cúbico. Sem descartá-lo aqui, a
      // ida-e-volta pelo `d` INVENTAVA alças degeneradas nos vizinhos: o
      // "ponto de canto" parecia não fazer nada neles e a forma nunca mais
      // conseguia perder a curvatura.
      const c1 = { x: c[0] ?? 0, y: c[1] ?? 0 }
      const c2 = { x: c[2] ?? 0, y: c[3] ?? 0 }
      const anchor = { x: c[4] ?? 0, y: c[5] ?? 0 }
      if (!samePoint(c1, previous.p)) previous.out = c1
      const node: PathNode = { p: anchor }
      if (!samePoint(c2, anchor)) node.in = c2
      nodes.push(node)
    } else if (op === 'Z') {
      closed = true
    } else {
      return null
    }
  }
  if (nodes.length === 0) return null

  // Fechamento CURVO: o último C volta à âncora inicial e o `Z` apenas sela.
  // Essa âncora repetida é a MESMA do nó 0 — a alça de chegada é dele.
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  if (closed && first && last && nodes.length > 1 && samePoint(first.p, last.p)) {
    if (last.in) first.in = last.in
    nodes.pop()
  }
  return { nodes, closed }
}

// ── Nós → modelo ────────────────────────────────────────────────────────────

/** Monta o `d` do nosso dialeto (M/L/C/Z absolutos) a partir dos nós. */
export function editablePathToD(ep: EditablePath): string {
  const first = ep.nodes[0]
  if (!first) return ''
  const parts = [`M ${round2(first.p.x)} ${round2(first.p.y)}`]
  const segment = (a: PathNode, b: PathNode): string => {
    if (!segmentIsCurved(a, b)) return `L ${round2(b.p.x)} ${round2(b.p.y)}`
    // Alça ausente de um dos lados = controle na própria âncora (cúbica que
    // encosta reta naquela ponta).
    const c1 = a.out ?? a.p
    const c2 = b.in ?? b.p
    return `C ${round2(c1.x)} ${round2(c1.y)} ${round2(c2.x)} ${round2(c2.y)} ${round2(b.p.x)} ${round2(b.p.y)}`
  }
  for (let i = 1; i < ep.nodes.length; i += 1) {
    const a = ep.nodes[i - 1]
    const b = ep.nodes[i]
    if (a && b) parts.push(segment(a, b))
  }
  if (ep.closed && ep.nodes.length > 1) {
    const a = ep.nodes[ep.nodes.length - 1]
    // O fechamento RETO é o próprio `Z`; só o curvo precisa de um C de volta.
    if (a && segmentIsCurved(a, first)) parts.push(segment(a, first))
    parts.push('Z')
  }
  return parts.join(' ')
}

/**
 * Devolve a forma editada.
 *
 * ⭐ Decisão de produto: polígono e linha se convertem em TRAÇO assim que ganham
 * curva (ou deixam de ser fechados/abertos como nasceram). Enquanto continuam do
 * jeito nativo, a forma é PRESERVADA — senão arrastar um nó já mataria o slider
 * de lados do polígono.
 *
 * Devolve a forma ORIGINAL se o `d` estourar `MAX_PATH_CHARS`: acima disso o
 * sanitize descarta a forma no próximo load (perda silenciosa de desenho).
 */
export function fromEditablePath(shape: VectorShape, ep: EditablePath): VectorShape {
  if (ep.nodes.length === 0) return shape
  const curved = hasAnyCurve(ep)

  if (
    shape.type === 'polygon' &&
    !curved &&
    ep.closed &&
    ep.nodes.length >= MIN_POLYGON_POINTS &&
    ep.nodes.length <= MAX_POLYGON_POINTS
  ) {
    return { ...shape, points: ep.nodes.map((n) => ({ x: round2(n.p.x), y: round2(n.p.y) })) }
  }

  if (shape.type === 'line' && !curved && !ep.closed && ep.nodes.length === 2) {
    const [a, b] = ep.nodes
    if (a && b) {
      return {
        ...shape,
        x1: round2(a.p.x),
        y1: round2(a.p.y),
        x2: round2(b.p.x),
        y2: round2(b.p.y),
      }
    }
  }

  const d = editablePathToD(ep)
  if (!d || d.length > MAX_PATH_CHARS) return shape
  const { id, fill, stroke, opacity, rotation, groupId, hidden } = shape
  return {
    id,
    fill,
    stroke,
    opacity,
    rotation,
    ...(groupId ? { groupId } : {}),
    ...(hidden === true ? { hidden: true } : {}),
    type: 'path',
    d,
  }
}

// ── Operações ───────────────────────────────────────────────────────────────

/** Quantos nós esta forma pode perder sem sumir do desenho no próximo load. */
export function minNodesFor(shape: VectorShape): number {
  return shape.type === 'polygon' ? MIN_POLYGON_POINTS : MIN_PATH_NODES
}

/** Move âncora E alças do nó (a alça pertence ao nó, viaja com ele). */
export function moveNodes(ep: EditablePath, indices: readonly number[], d: Vec2): EditablePath {
  const chosen = new Set(indices)
  return {
    closed: ep.closed,
    nodes: ep.nodes.map((node, i) => {
      if (!chosen.has(i)) return node
      const shift = (p: Vec2 | undefined): Vec2 | undefined =>
        p ? { x: p.x + d.x, y: p.y + d.y } : undefined
      const next: PathNode = { p: { x: node.p.x + d.x, y: node.p.y + d.y } }
      const movedIn = shift(node.in)
      const movedOut = shift(node.out)
      if (movedIn) next.in = movedIn
      if (movedOut) next.out = movedOut
      return next
    }),
  }
}

export function setClosed(ep: EditablePath, closed: boolean): EditablePath {
  if (ep.closed === closed) return ep
  return { nodes: ep.nodes, closed }
}

/**
 * Cópia do nó como INÍCIO de um caminho aberto: guarda a alça de SAÍDA e larga
 * a de chegada (num caminho aberto o primeiro nó não tem segmento chegando, e o
 * `editablePathToD` nunca lê o `in` dele).
 */
function asStart(node: PathNode): PathNode {
  return node.out ? { p: copy(node.p), out: copy(node.out) } : { p: copy(node.p) }
}

/** Cópia do nó como FIM de um caminho aberto: guarda a alça de CHEGADA. */
function asEnd(node: PathNode): PathNode {
  return node.in ? { p: copy(node.p), in: copy(node.in) } : { p: copy(node.p) }
}

/**
 * Abre um caminho FECHADO exatamente no nó `index`: ele vira o começo E o fim
 * (duplicado na emenda). NENHUM segmento se perde — cada trecho `i → i+1` do
 * laço aparece uma vez, inclusive o que o `Z` desenhava —, então o desenho é o
 * MESMO, só deixou de ser um laço. `null` = recusado (já estava aberto, ou o
 * índice não existe).
 *
 * ⚠️ O resultado tem o primeiro e o último nó no MESMO ponto, que é justo o
 * caso que o `parseEditablePath` funde — mas ele só funde quando o caminho está
 * FECHADO. Aberto, a emenda sobrevive à ida e volta pelo `d`; e se a criança
 * fechar de novo depois, a fusão acontece e devolve o laço original.
 */
export function openClosedPathAt(ep: EditablePath, index: number): EditablePath | null {
  const total = ep.nodes.length
  if (!ep.closed || total < 2 || index < 0 || index >= total) return null
  const seam = ep.nodes[index]
  if (!seam) return null
  const nodes: PathNode[] = [asStart(seam)]
  for (let step = 1; step < total; step += 1) {
    const node = ep.nodes[(index + step) % total]
    if (node) nodes.push({ ...node, p: copy(node.p) })
  }
  nodes.push(asEnd(seam))
  return { nodes, closed: false }
}

/**
 * Corta um caminho ABERTO no nó `index` e devolve os DOIS pedaços — o nó do
 * corte é duplicado, um em cada ponta, e nenhum segmento se perde.
 *
 * `null` = recusado: caminho FECHADO (aí a operação é `openClosedPathAt`) ou
 * índice numa PONTA. Numa ponta não há o que cortar, e o pedaço resultante
 * ficaria com um nó só — abaixo de `MIN_PATH_NODES`, o sanitize o DESCARTARIA
 * no próximo load. Com `0 < index < n-1` os dois pedaços já nascem com 2+.
 */
export function splitOpenPathAt(
  ep: EditablePath,
  index: number,
): [EditablePath, EditablePath] | null {
  const total = ep.nodes.length
  if (ep.closed || index <= 0 || index >= total - 1) return null
  const seam = ep.nodes[index]
  if (!seam) return null
  const clone = (node: PathNode): PathNode => ({ ...node, p: copy(node.p) })
  const first: EditablePath = {
    nodes: [...ep.nodes.slice(0, index).map(clone), asEnd(seam)],
    closed: false,
  }
  const second: EditablePath = {
    nodes: [asStart(seam), ...ep.nodes.slice(index + 1).map(clone)],
    closed: false,
  }
  if (first.nodes.length < MIN_PATH_NODES || second.nodes.length < MIN_PATH_NODES) return null
  return [first, second]
}

/**
 * Tira os nós escolhidos. `null` = recusado (ficaria abaixo do piso e a forma
 * sumiria no próximo load). Os vizinhos ficam com as alças que já tinham: é o
 * que menos surpreende quem apagou um ponto do meio.
 */
export function removeNodes(
  ep: EditablePath,
  indices: readonly number[],
  minNodes: number,
): EditablePath | null {
  const chosen = new Set(indices)
  const nodes = ep.nodes.filter((_, i) => !chosen.has(i))
  if (nodes.length === ep.nodes.length) return null
  if (nodes.length < minNodes) return null
  return { nodes, closed: ep.closed }
}

/** O segmento `index` vai do nó `index` ao seguinte (o último volta ao 0). */
export function segmentEnds(ep: EditablePath, index: number): [PathNode, PathNode] | null {
  const a = ep.nodes[index]
  if (!a) return null
  const isClosing = index === ep.nodes.length - 1
  if (isClosing && !ep.closed) return null
  const b = isClosing ? ep.nodes[0] : ep.nodes[index + 1]
  if (!b || a === b) return null
  return [a, b]
}

export function segmentCount(ep: EditablePath): number {
  if (ep.nodes.length < 2) return 0
  return ep.closed ? ep.nodes.length : ep.nodes.length - 1
}

/**
 * Acrescenta um nó no meio do segmento, em `t` (0..1).
 *
 * ⭐ Na curva a divisão é de CASTELJAU: as duas cúbicas resultantes desenham
 * EXATAMENTE a mesma curva de antes. Acrescentar ponto não pode deformar o
 * desenho — é a diferença entre "editar" e "estragar".
 */
export function insertNodeAt(ep: EditablePath, index: number, t: number): EditablePath | null {
  const ends = segmentEnds(ep, index)
  if (!ends) return null
  const [a, b] = ends
  const clamped = Math.min(Math.max(t, 0), 1)
  const nodes = ep.nodes.map((n) => ({ ...n }))
  const left = nodes[index]
  const right = index === nodes.length - 1 ? nodes[0] : nodes[index + 1]
  if (!left || !right) return null

  let fresh: PathNode
  if (!segmentIsCurved(a, b)) {
    fresh = { p: lerp(a.p, b.p, clamped) }
  } else {
    const p1 = a.out ?? a.p
    const p2 = b.in ?? b.p
    const q0 = lerp(a.p, p1, clamped)
    const q1 = lerp(p1, p2, clamped)
    const q2 = lerp(p2, b.p, clamped)
    const r0 = lerp(q0, q1, clamped)
    const r1 = lerp(q1, q2, clamped)
    const anchor = lerp(r0, r1, clamped)
    left.out = q0
    right.in = q2
    fresh = { p: anchor, in: r0, out: r1 }
  }
  nodes.splice(index + 1, 0, fresh)
  return { nodes, closed: ep.closed }
}

// ── Achar o traço embaixo do dedo ───────────────────────────────────────────

export interface PathHit {
  segmentIndex: number
  t: number
  distance: number
  point: Vec2
}

function cubicAt(a: PathNode, b: PathNode, t: number): Vec2 {
  const p1 = a.out ?? a.p
  const p2 = b.in ?? b.p
  const u = 1 - t
  const w0 = u * u * u
  const w1 = 3 * u * u * t
  const w2 = 3 * u * t * t
  const w3 = t * t * t
  return {
    x: a.p.x * w0 + p1.x * w1 + p2.x * w2 + b.p.x * w3,
    y: a.p.y * w0 + p1.y * w1 + p2.y * w2 + b.p.y * w3,
  }
}

/** Ponto do segmento em `t`, reto ou curvo. */
export function pointOnSegment(a: PathNode, b: PathNode, t: number): Vec2 {
  return segmentIsCurved(a, b) ? cubicAt(a, b, t) : lerp(a.p, b.p, t)
}

const FLATTEN_STEPS = 24
const REFINE_STEPS = 12

/** Pé da perpendicular na reta `a→b`, preso ao segmento. EXATO, sem amostrar. */
function nearestOnSegment(a: Vec2, b: Vec2, point: Vec2): { t: number; distance: number } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return { t: 0, distance: Math.hypot(point.x - a.x, point.y - a.y) }
  const raw = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq
  const t = Math.min(Math.max(raw, 0), 1)
  return { t, distance: Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy)) }
}

/**
 * Segmento e `t` mais perto do ponto, dentro da tolerância.
 *
 * Reta usa a projeção exata; curva é achatada em sub-retas e depois refinada por
 * bisseção. ⚠️ Nada de `SVGGeometryElement.getPointAtLength`: o happy-dom não
 * implementa e o hit-test do "clicar no traço" precisa ser testável fora do
 * navegador.
 */
export function nearestOnPath(ep: EditablePath, point: Vec2, tolerance: number): PathHit | null {
  let best: PathHit | null = null
  const total = segmentCount(ep)
  for (let index = 0; index < total; index += 1) {
    const ends = segmentEnds(ep, index)
    if (!ends) continue
    const [a, b] = ends
    let bestT: number
    let bestDistance: number

    if (!segmentIsCurved(a, b)) {
      const exact = nearestOnSegment(a.p, b.p, point)
      bestT = exact.t
      bestDistance = exact.distance
    } else {
      bestT = 0
      bestDistance = Number.POSITIVE_INFINITY
      for (let s = 0; s <= FLATTEN_STEPS; s += 1) {
        const t = s / FLATTEN_STEPS
        const at = cubicAt(a, b, t)
        const distance = Math.hypot(at.x - point.x, at.y - point.y)
        if (distance < bestDistance) {
          bestDistance = distance
          bestT = t
        }
      }
      // Bisseção em torno do melhor palpite: o mínimo é único dentro do passo.
      const span = 1 / FLATTEN_STEPS
      let low = Math.max(0, bestT - span)
      let high = Math.min(1, bestT + span)
      for (let r = 0; r < REFINE_STEPS; r += 1) {
        const mid = (low + high) / 2
        const leftT = (low + mid) / 2
        const rightT = (mid + high) / 2
        const leftAt = cubicAt(a, b, leftT)
        const rightAt = cubicAt(a, b, rightT)
        const dl = Math.hypot(leftAt.x - point.x, leftAt.y - point.y)
        const dr = Math.hypot(rightAt.x - point.x, rightAt.y - point.y)
        if (dl < dr) {
          high = mid
          if (dl < bestDistance) {
            bestDistance = dl
            bestT = leftT
          }
        } else {
          low = mid
          if (dr < bestDistance) {
            bestDistance = dr
            bestT = rightT
          }
        }
      }
    }

    if (bestDistance <= tolerance && (!best || bestDistance < best.distance)) {
      best = {
        segmentIndex: index,
        t: bestT,
        distance: bestDistance,
        point: pointOnSegment(a, b, bestT),
      }
    }
  }
  return best
}

// ── Curvas: alças, suave × canto, curva × reta ──────────────────────────────

function length(v: Vec2): number {
  return Math.hypot(v.x, v.y)
}

function normalized(v: Vec2): Vec2 | null {
  const l = length(v)
  return l === 0 ? null : { x: v.x / l, y: v.y / l }
}

/**
 * ⭐ SUAVE é LIDO, não guardado: o nó é suave quando as duas alças estão na
 * MESMA RETA, uma de cada lado da âncora — a curva passa por ele sem quina.
 *
 * ⚠️ É colinear, NÃO simétrico. Simetria (mesmo tamanho dos dois lados) é mais
 * forte do que a continuidade da curva, e barraria dois casos legítimos: o
 * "ponto suave" que preserva os tamanhos que já existiam, e arrastar uma alça de
 * um nó suave, que alonga um lado só. O pincel entrega os dois de graça, e o
 * teste da simetria da Catmull-Rom continua valendo à parte.
 */
const SMOOTH_COS = 1 - 5e-3

export function isSmoothNode(node: PathNode): boolean {
  if (!node.in || !node.out) return false
  const dirIn = normalized({ x: node.p.x - node.in.x, y: node.p.y - node.in.y })
  const dirOut = normalized({ x: node.out.x - node.p.x, y: node.out.y - node.p.y })
  if (!dirIn || !dirOut) return false
  return dirIn.x * dirOut.x + dirIn.y * dirOut.y >= SMOOTH_COS
}

/** Vizinhos do nó no caminho; `null` na ponta de um caminho ABERTO. */
function neighbours(
  ep: EditablePath,
  index: number,
): { prev: PathNode | null; next: PathNode | null } {
  const n = ep.nodes.length
  const prevIndex = index === 0 ? (ep.closed ? n - 1 : -1) : index - 1
  const nextIndex = index === n - 1 ? (ep.closed ? 0 : -1) : index + 1
  return {
    prev: prevIndex >= 0 ? (ep.nodes[prevIndex] ?? null) : null,
    next: nextIndex >= 0 ? (ep.nodes[nextIndex] ?? null) : null,
  }
}

function mapNodes(
  ep: EditablePath,
  indices: readonly number[],
  fn: (node: PathNode, index: number) => PathNode,
): EditablePath {
  const chosen = new Set(indices)
  return {
    closed: ep.closed,
    nodes: ep.nodes.map((node, i) => (chosen.has(i) ? fn(node, i) : node)),
  }
}

/**
 * Deixa o nó redondo. Três casos, do que menos mexe no desenho para o que mais:
 * com as DUAS alças, alinha as duas na direção média e preserva os tamanhos;
 * com UMA, espelha ela; sem nenhuma, inventa as duas pela corda dos vizinhos
 * (é o "arredonde este canto", e é a fórmula da Catmull-Rom do pincel).
 */
export function makeSmooth(ep: EditablePath, indices: readonly number[]): EditablePath {
  return mapNodes(ep, indices, (node, index) => {
    const p = node.p
    if (node.in && node.out) {
      const dirIn = normalized({ x: p.x - node.in.x, y: p.y - node.in.y })
      const dirOut = normalized({ x: node.out.x - p.x, y: node.out.y - p.y })
      if (!dirIn || !dirOut) return node
      const avg = normalized({ x: dirIn.x + dirOut.x, y: dirIn.y + dirOut.y }) ?? dirOut
      const lenIn = length({ x: p.x - node.in.x, y: p.y - node.in.y })
      const lenOut = length({ x: node.out.x - p.x, y: node.out.y - p.y })
      return {
        p,
        in: { x: p.x - avg.x * lenIn, y: p.y - avg.y * lenIn },
        out: { x: p.x + avg.x * lenOut, y: p.y + avg.y * lenOut },
      }
    }
    const lone = node.in ?? node.out
    if (lone) {
      const away = node.in
        ? { x: p.x - lone.x, y: p.y - lone.y }
        : { x: lone.x - p.x, y: lone.y - p.y }
      return {
        p,
        in: { x: p.x - away.x, y: p.y - away.y },
        out: { x: p.x + away.x, y: p.y + away.y },
      }
    }
    const { prev, next } = neighbours(ep, index)
    const from = prev ?? node
    const to = next ?? node
    const chord = { x: (to.p.x - from.p.x) / 6, y: (to.p.y - from.p.y) / 6 }
    if (chord.x === 0 && chord.y === 0) return node
    const fresh: PathNode = { p }
    // Ponta de caminho aberto tem UM lado só: criar a alça do lado que não
    // existe deixaria um controle solto, sem segmento para curvar.
    if (prev) fresh.in = { x: p.x - chord.x, y: p.y - chord.y }
    if (next) fresh.out = { x: p.x + chord.x, y: p.y + chord.y }
    return fresh
  })
}

/** Tira as duas alças: o nó vira uma quina de verdade (mudança VISÍVEL). */
export function makeCorner(ep: EditablePath, indices: readonly number[]): EditablePath {
  return mapNodes(ep, indices, (node) => ({ p: node.p }))
}

/** Os dois ÍNDICES das pontas do segmento (o último fecha no 0). */
export function segmentEndIndices(ep: EditablePath, index: number): [number, number] | null {
  const n = ep.nodes.length
  if (index < 0 || index >= n || n < 2) return null
  const isClosing = index === n - 1
  if (isClosing && !ep.closed) return null
  return [index, isClosing ? 0 : index + 1]
}

/**
 * Quais segmentos os botões de curva/reta atingem. Com 2+ nós escolhidos, os
 * segmentos ENTRE eles; com um só, os dois que encostam nele — senão escolher um
 * ponto e pedir "curva" não faria nada.
 */
export function segmentsForNodes(ep: EditablePath, indices: readonly number[]): number[] {
  const chosen = new Set(indices)
  if (chosen.size === 0) return []
  const total = segmentCount(ep)
  const out: number[] = []
  for (let i = 0; i < total; i += 1) {
    const ends = segmentEndIndices(ep, i)
    if (!ends) continue
    const both = chosen.has(ends[0]) && chosen.has(ends[1])
    const touches = chosen.has(ends[0]) || chosen.has(ends[1])
    if (chosen.size === 1 ? touches : both) out.push(i)
  }
  return out
}

/**
 * Curva ou endireita os segmentos.
 *
 * ⭐ Ao curvar, os controles nascem em 1/3 e 2/3 da corda: a cúbica resultante É
 * a própria reta, então NADA se move e o que a criança vê é a alça aparecer —
 * que é exatamente o que o rótulo promete.
 */
export function setSegmentCurved(
  ep: EditablePath,
  segments: readonly number[],
  curved: boolean,
): EditablePath {
  if (segments.length === 0) return ep
  const nodes = ep.nodes.map((node) => ({ ...node }))
  for (const segment of segments) {
    const ends = segmentEndIndices(ep, segment)
    if (!ends) continue
    const a = nodes[ends[0]]
    const b = nodes[ends[1]]
    if (!a || !b) continue
    if (curved) {
      if (!a.out) a.out = lerp(a.p, b.p, 1 / 3)
      if (!b.in) b.in = lerp(a.p, b.p, 2 / 3)
    } else {
      a.out = undefined
      b.in = undefined
    }
  }
  return { nodes, closed: ep.closed }
}

/**
 * Arrasta UMA alça. `mirror` (o nó era suave quando o gesto começou) mantém a
 * outra alinhada, conservando o TAMANHO dela — quem é canto move uma alça sem a
 * outra saber, que é a diferença entre os dois tipos de nó.
 */
export function setHandle(
  ep: EditablePath,
  index: number,
  which: 'in' | 'out',
  pos: Vec2,
  mirror: boolean,
): EditablePath {
  const node = ep.nodes[index]
  if (!node) return ep
  const next: PathNode = { p: node.p, in: node.in, out: node.out }
  next[which] = pos
  const other = which === 'in' ? 'out' : 'in'
  const existing = next[other]
  if (mirror && existing) {
    const away = normalized({ x: pos.x - node.p.x, y: pos.y - node.p.y })
    if (away) {
      const len = length({ x: existing.x - node.p.x, y: existing.y - node.p.y })
      next[other] = { x: node.p.x - away.x * len, y: node.p.y - away.y * len }
    }
  }
  const nodes = ep.nodes.slice()
  nodes[index] = next
  return { nodes, closed: ep.closed }
}

/**
 * Tira o tremido do desenho à mão: joga fora os pontos que não mudam o traço
 * (Ramer-Douglas-Peucker) e recurva o que sobrou com a MESMA Catmull-Rom do
 * pincel. `null` quando não há o que suavizar.
 *
 * ⭐ Repetir suaviza mais, porque cada passada re-simplifica o resultado JÁ
 * simplificado (encolhe monotonicamente) — é o idioma do laço de cap do
 * `smoothStrokeToPathCapped`.
 */
export function smoothPath(ep: EditablePath, epsilon = 1.5): EditablePath | null {
  const anchors = ep.nodes.map((n) => n.p)
  if (anchors.length < 3) return null
  const pass = (eps: number): EditablePath | null => {
    let simplified = simplifyRDP(anchors, eps)
    // Um caminho fechado com dois nós vira apenas uma ida-e-volta. Além de
    // deixar de representar a área original, ele não tem vizinhança suficiente
    // para uma emenda Catmull-Rom suave.
    if (ep.closed) {
      if (simplified.length < 3) {
        if (anchors.length <= 3) return null
        // Num contorno simétrico (um quadrado, por exemplo), o RDP pode saltar
        // de 4 direto para 2. A passagem precisa continuar visível sem produzir
        // um fechado inválido: remove só o vértice de menor desvio local.
        let leastIndex = 0
        let leastArea = Number.POSITIVE_INFINITY
        for (let index = 0; index < anchors.length; index += 1) {
          const previous = anchors[(index - 1 + anchors.length) % anchors.length]
          const point = anchors[index]
          const next = anchors[(index + 1) % anchors.length]
          if (!previous || !point || !next) continue
          const area = Math.abs(
            (point.x - previous.x) * (next.y - previous.y) -
              (point.y - previous.y) * (next.x - previous.x),
          )
          if (area < leastArea) {
            leastArea = area
            leastIndex = index
          }
        }
        simplified = anchors.filter((_, index) => index !== leastIndex)
      }
      const total = simplified.length
      const nodes = simplified.map((point, index): PathNode => {
        const previous = simplified[(index - 1 + total) % total]
        const next = simplified[(index + 1) % total]
        if (!previous || !next) return { p: copy(point) }
        const tangent = { x: (next.x - previous.x) / 6, y: (next.y - previous.y) / 6 }
        return {
          p: copy(point),
          in: { x: point.x - tangent.x, y: point.y - tangent.y },
          out: { x: point.x + tangent.x, y: point.y + tangent.y },
        }
      })
      return { nodes, closed: true }
    }
    return parseEditablePath(catmullRomToPath(simplified))
  }
  // ⚠️ Um toque só vale se a criança VER diferença. Há duas maneiras de a
  // passada mudar o desenho: tirar pontos, ou arredondar um canto que ainda era
  // quina. Quando nenhuma das duas se aplica (traço de pincel, que já é todo
  // curvo e cujos pontos o RDP guarda na mesma régua), o botão ficava MUDO —
  // apertava e nada acontecia. Aí a régua aperta até sair ponto.
  const temCanto = ep.nodes.some((n) => !n.in && !n.out)
  let eps = epsilon
  let next = pass(eps)
  while (next && !temCanto && next.nodes.length >= anchors.length && eps < 4096) {
    eps *= 2
    next = pass(eps)
  }
  if (!next) return null
  if (!temCanto && next.nodes.length >= anchors.length) return null
  return next
}

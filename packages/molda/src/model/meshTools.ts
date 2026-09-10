/**
 * As FERRAMENTAS da malha (Puxar, Cortar no meio, Juntar pontos, Fechar face,
 * Conectar pontos, Encolher dentro, Virar face, Dividir em triângulos) e os
 * consertos das `meshIssues`. Puras:
 * cada uma devolve o modelo com a peça regravada por `withMesh` (caixa derivada,
 * peles re-amostradas) e a SELEÇÃO NOVA explícita. `null` = a ferramenta não se
 * aplica à seleção, ou o resultado
 * passaria de algum teto (vértices/faces por peça, triângulos do modelo).
 *
 * Orientação: uma face selecionada é CCW vista de fora; a parede de uma aresta
 * de borda `a → b` (na ordem do ciclo) é o quad `[a, b, b', a']`, que fica CCW
 * visto de fora quando a face aponta para fora (testado: a malha continua fechada
 * e sem face virada).
 */
import { MOLDA_LIMITS } from '../core/limits'
import type {
  MeshFace,
  MeshFaceKey,
  MeshLooseEdge,
  MoldaMesh,
  MoldaModelAsset,
  MoldaPart,
  Vec3,
} from '../core/model'
import { modelTriangleCount } from './geometry'
import {
  faceCenter,
  faceGeometryIssue,
  faceNormal,
  faceVertices,
  type MeshIssue,
  meshCenter,
  meshEdges,
  newFaceKey,
  newVertexKey,
  orderQuad,
} from './mesh'
import { withMesh } from './meshOps'
import {
  type MeshEdge,
  type MeshPick,
  pruneMeshSelection,
  selectedEdges,
  selectedFaces,
  selectionNormal,
} from './meshSelection'
import { faceSkinSize } from './shapes'
import { flipSkinH } from './skinOps'
import { reprojectSkin } from './skinReproject'
import { add, cross, dot, length, normalize, scale, sub } from './vec'

export interface MeshToolResult {
  model: MoldaModelAsset
  /** Os vértices que a ferramenta criou (a seleção seguinte). */
  vertices: string[]
  /** Os elementos exatos que ficam escolhidos depois da ferramenta. */
  selection: MeshPick[]
}

function sourceMesh(
  model: MoldaModelAsset,
  partId: string,
): { part: MoldaPart; mesh: MoldaMesh } | null {
  const part = model.parts.find((item) => item.id === partId)
  return part &&
    !part.mirrorOf &&
    !part.locked &&
    !part.hidden &&
    part.shape === 'mesh' &&
    part.mesh
    ? { part, mesh: part.mesh }
    : null
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a} ${b}` : `${b} ${a}`
}

function roundedPoint(point: Vec3): Vec3 {
  const precision = MOLDA_LIMITS.meshPrecision
  return [
    Math.round(point[0] / precision) * precision,
    Math.round(point[1] / precision) * precision,
    Math.round(point[2] / precision) * precision,
  ]
}

function pointKey(point: Vec3): string {
  return `${point[0]}|${point[1]}|${point[2]}`
}

/**
 * O deslocamento do Puxar anda pelo ENCAIXE, eixo a eixo (os pontos novos ficam na grade,
 * como toda edição): numa normal diagonal a distância pedida vira o vetor arredondado; se
 * o arredondamento zerar tudo, vale o eixo dominante da normal com um encaixe inteiro.
 */
function snapOffset(offset: Vec3, snap: number): Vec3 {
  const step = snap > 0 ? snap : 1
  const snapped: Vec3 = [
    Math.round(offset[0] / step) * step,
    Math.round(offset[1] / step) * step,
    Math.round(offset[2] / step) * step,
  ]
  if (snapped.some((value) => value !== 0)) return snapped
  let axis = 0
  for (let i = 1; i < 3; i += 1)
    if (Math.abs(offset[i] as number) > Math.abs(offset[axis] as number)) axis = i
  const along = offset[axis] as number
  snapped[axis] = (along < 0 ? -1 : 1) * Math.max(step, Math.round(Math.abs(along) / step) * step)
  return snapped
}

/**
 * Fecha a ferramenta: regrava a peça e recusa o que passa dos tetos por peça e do
 * orçamento de triângulos do modelo (senão o sanitize derrubaria a peça no reload).
 */
function finish(
  model: MoldaModelAsset,
  part: MoldaPart,
  mesh: MoldaMesh,
  vertices: string[],
  skins?: MoldaPart['faces'],
  selection: MeshPick[] = vertices.map((key) => ({ kind: 'vertex', key })),
): MeshToolResult | null {
  if (
    Object.keys(mesh.vertices).length > MOLDA_LIMITS.maxMeshVertices ||
    Object.keys(mesh.faces).length > MOLDA_LIMITS.maxMeshFaces ||
    (mesh.looseEdges?.length ?? 0) > MOLDA_LIMITS.maxMeshLooseEdges
  ) {
    return null
  }
  const next = withMesh(model, part, mesh, skins)
  // O sincronizador desliga o espelho ao receber um estado externo que não
  // comporta todos os gêmeos; numa edição local, a operação deve ser atômica.
  if (model.mirrorX && !next.mirrorX) return null
  if (modelTriangleCount(next) > MOLDA_LIMITS.maxTriangles) return null
  const nextPart = next.parts.find((item) => item.id === part.id)
  const committed = nextPart?.mesh
  const alive = new Set(Object.keys(committed?.vertices ?? {}))
  return {
    model: next,
    vertices: vertices.filter((key) => alive.has(key)),
    selection: committed ? pruneMeshSelection(committed, selection) : [],
  }
}

/**
 * PUXAR faces: a região selecionada sobe ao longo da normal média; as faces viram
 * as tampas (mesmas chaves, a pele migra) e cada aresta de BORDA da região ganha
 * uma parede. Arestas internas (entre duas faces selecionadas) não ganham parede.
 */
export function extrudeFaces(
  model: MoldaModelAsset,
  partId: string,
  faceKeys: readonly MeshFaceKey[],
  distance: number,
): MeshToolResult | null {
  const source = sourceMesh(model, partId)
  if (!source) return null
  const { part, mesh } = source
  const selection: MeshPick[] = faceKeys.map((key) => ({ kind: 'face', key }))
  const faces = selectedFaces(mesh, selection)
  // Só para FORA: distância zero duplicaria os pontos e negativa faria paredes
  // coplanares com as faces vizinhas (e viradas).
  if (faces.length === 0 || !(distance > 0)) return null
  const normal = selectionNormal(mesh, selection)
  if (!normal) return null
  const offset = snapOffset(scale(normal, distance), model.snap)
  const taken = new Set(Object.keys(mesh.vertices))
  const faceTaken = new Set(Object.keys(mesh.faces))
  const lifted = new Map<string, string>()
  const vertices: Record<string, Vec3> = { ...mesh.vertices }
  const edgeUse = new Map<string, number>()
  for (const key of faces) {
    const cycle = mesh.faces[key]?.v ?? []
    for (let i = 0; i < cycle.length; i += 1) {
      const a = cycle[i] as string
      const b = cycle[(i + 1) % cycle.length] as string
      edgeUse.set(pairKey(a, b), (edgeUse.get(pairKey(a, b)) ?? 0) + 1)
      if (!lifted.has(a)) {
        const fresh = newVertexKey(taken)
        taken.add(fresh)
        lifted.set(a, fresh)
        vertices[fresh] = add(mesh.vertices[a] as Vec3, offset)
      }
    }
  }
  const nextFaces: Record<MeshFaceKey, MeshFace> = { ...mesh.faces }
  for (const key of faces) {
    const cycle = mesh.faces[key]?.v ?? []
    nextFaces[key] = { v: cycle.map((vertex) => lifted.get(vertex) as string) }
    for (let i = 0; i < cycle.length; i += 1) {
      const a = cycle[i] as string
      const b = cycle[(i + 1) % cycle.length] as string
      if (edgeUse.get(pairKey(a, b)) !== 1) continue
      const wall = newFaceKey(faceTaken)
      faceTaken.add(wall)
      nextFaces[wall] = { v: [a, b, lifted.get(b) as string, lifted.get(a) as string] }
    }
  }
  return finish(
    model,
    part,
    { ...mesh, vertices, faces: nextFaces },
    [...lifted.values()],
    undefined,
    faces.map((key) => ({ kind: 'face', key })),
  )
}

/**
 * PUXAR arestas: cada aresta selecionada ganha uma "aba" (um quad) ao longo da
 * normal média das faces em volta; vértice compartilhado por duas arestas sobe uma
 * vez só. A orientação segue a face vizinha em que a aresta aparece como `a → b`.
 */
export type MeshExtrudeDirection = 'auto' | 'x' | '-x' | 'y' | '-y' | 'z' | '-z'

const EXTRUDE_AXIS: Record<Exclude<MeshExtrudeDirection, 'auto'>, Vec3> = {
  x: [1, 0, 0],
  '-x': [-1, 0, 0],
  y: [0, 1, 0],
  '-y': [0, -1, 0],
  z: [0, 0, 1],
  '-z': [0, 0, -1],
}

function edgeVector(mesh: MoldaMesh, [a, b]: MeshEdge): Vec3 | null {
  const first = mesh.vertices[a]
  const second = mesh.vertices[b]
  return first && second ? sub(second, first) : null
}

function extrudeDirection(
  mesh: MoldaMesh,
  edges: readonly MeshEdge[],
  direction: MeshExtrudeDirection,
): Vec3 | null {
  const vectors = edges.flatMap((edge) => {
    const vector = edgeVector(mesh, edge)
    return vector && length(vector) > 1e-9 ? [normalize(vector)] : []
  })
  if (vectors.length !== edges.length) return null
  if (direction !== 'auto') {
    const axis = EXTRUDE_AXIS[direction]
    return vectors.some((vector) => length(cross(vector, axis)) < 1e-9) ? null : axis
  }
  const surfaceNormal = selectionNormal(
    mesh,
    edges.map((keys) => ({ kind: 'edge', keys })),
  )
  if (surfaceNormal) return surfaceNormal
  // Aresta totalmente solta: escolha o eixo menos paralelo. A ordem desempata
  // de forma previsível para crianças: para cima, depois X, depois Z.
  const candidates: Vec3[] = [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, 1],
  ]
  return candidates.reduce((best, candidate) => {
    const score = Math.max(...vectors.map((vector) => Math.abs(dot(vector, candidate))))
    const bestScore = Math.max(...vectors.map((vector) => Math.abs(dot(vector, best))))
    return score < bestScore - 1e-9 ? candidate : best
  })
}

export function canExtrudeEdgesInDirection(
  mesh: MoldaMesh,
  edgeKeys: readonly MeshEdge[],
  direction: MeshExtrudeDirection,
): boolean {
  const selection = edgeKeys.map((keys) => ({ kind: 'edge' as const, keys }))
  const edges = selectedEdges(mesh, selection)
  return edges.length > 0 && extrudeDirection(mesh, edges, direction) !== null
}

export function extrudeEdges(
  model: MoldaModelAsset,
  partId: string,
  edgeKeys: readonly MeshEdge[],
  distance: number,
  direction: MeshExtrudeDirection = 'auto',
): MeshToolResult | null {
  const source = sourceMesh(model, partId)
  if (!source) return null
  const { part, mesh } = source
  const selection: MeshPick[] = edgeKeys.map((keys) => ({ kind: 'edge', keys }))
  const edges = selectedEdges(mesh, selection)
  if (edges.length === 0 || !(distance > 0)) return null
  const normal = extrudeDirection(mesh, edges, direction)
  if (!normal) return null
  const offset = snapOffset(scale(normal, distance), model.snap)
  const taken = new Set(Object.keys(mesh.vertices))
  const faceTaken = new Set(Object.keys(mesh.faces))
  const lifted = new Map<string, string>()
  const vertices: Record<string, Vec3> = { ...mesh.vertices }
  const lift = (key: string): string => {
    let fresh = lifted.get(key)
    if (!fresh) {
      fresh = newVertexKey(taken)
      taken.add(fresh)
      lifted.set(key, fresh)
      vertices[fresh] = add(mesh.vertices[key] as Vec3, offset)
    }
    return fresh
  }
  const nextFaces: Record<MeshFaceKey, MeshFace> = { ...mesh.faces }
  for (const [x, y] of edges) {
    // A ordem `a → b` de uma face vizinha decide o lado da aba.
    let a = x
    let b = y
    for (const face of Object.values(mesh.faces)) {
      const i = face.v.indexOf(x)
      if (i < 0) continue
      if (face.v[(i + 1) % face.v.length] === y) break
      if (face.v[(i + face.v.length - 1) % face.v.length] === y) {
        a = y
        b = x
        break
      }
    }
    const key = newFaceKey(faceTaken)
    faceTaken.add(key)
    // A vizinha percorre a aresta como `a → b`; a aba tem de percorrê-la ao CONTRÁRIO
    // (duas faces coerentes atravessam a aresta que dividem em sentidos opostos).
    nextFaces[key] = { v: [b, a, lift(a), lift(b)] }
  }
  const selectedKeys = new Set(edges.map(([a, b]) => pairKey(a, b)))
  const looseEdges = (mesh.looseEdges ?? []).filter(([a, b]) => !selectedKeys.has(pairKey(a, b)))
  return finish(
    model,
    part,
    { ...mesh, vertices, faces: nextFaces, looseEdges },
    [...lifted.values()],
    undefined,
    edges.map(([a, b]) => ({
      kind: 'edge',
      keys: [lifted.get(a) as string, lifted.get(b) as string],
    })),
  )
}

export interface LoopCutResult extends MeshToolResult {
  /** O corte caiu no meio de um bloco: o encaixe de meio bloco foi ligado no MESMO commit. */
  snapChanged: boolean
  /** Mesmo com o meio bloco os pontos do corte ficaram fora do encaixe (aresta de 0,5). */
  offGrid: boolean
}

export interface LoopCutOptions {
  /** Quantos cortes paralelos criar. */
  cuts?: number
  /** Posição do corte único, em porcentagem da aresta escolhida. */
  position?: number
}

/**
 * CORTAR NO MEIO: divide a aresta ao meio e atravessa os quads vizinhos, sempre
 * pela aresta oposta, até fechar o anel ou bater num triângulo/borda. Cada quad
 * cortado vira dois (a pele é reprojetada nos dois); um triângulo que toca uma
 * aresta cortada recebe o ponto do meio no ciclo (sem rachadura).
 */
export function loopCut(
  model: MoldaModelAsset,
  partId: string,
  edge: [string, string],
  options: LoopCutOptions = {},
): LoopCutResult | null {
  const source = sourceMesh(model, partId)
  if (!source) return null
  const { part, mesh } = source
  const cuts = options.cuts ?? 1
  const position = options.position ?? 50
  if (!Number.isInteger(cuts) || cuts < 1 || cuts > 8) return null
  if (cuts === 1 && (!Number.isFinite(position) || position < 10 || position > 90)) return null
  if (!meshEdges(mesh).some(([a, b]) => pairKey(a, b) === pairKey(edge[0], edge[1]))) {
    return null
  }
  const fractions = Array.from({ length: cuts }, (_unused, index) =>
    cuts === 1 ? position / 100 : (index + 1) / (cuts + 1),
  )
  const taken = new Set(Object.keys(mesh.vertices))
  const vertices: Record<string, Vec3> = { ...mesh.vertices }
  const occupiedPoints = new Set(
    Object.values(vertices).map((point) => pointKey(roundedPoint(point))),
  )
  const created: string[] = []
  const makePoints = (a: string, b: string): string[] | null => {
    const start = mesh.vertices[a]
    const end = mesh.vertices[b]
    if (!start || !end) return null
    const keys: string[] = []
    for (const fraction of fractions) {
      const point = roundedPoint(add(scale(start, 1 - fraction), scale(end, fraction)))
      const occupied = pointKey(point)
      if (occupiedPoints.has(occupied)) return null
      const key = newVertexKey(taken)
      taken.add(key)
      occupiedPoints.add(occupied)
      vertices[key] = point
      keys.push(key)
      created.push(key)
    }
    return keys
  }
  const finishCut = (
    nextMesh: MoldaMesh,
    selection: MeshPick[],
    skins?: MoldaPart['faces'],
  ): LoopCutResult | null => {
    const offWholeGrid = created.some((key) =>
      (vertices[key] as Vec3).some((value) => Math.abs(value - Math.round(value)) > 1e-9),
    )
    const snapChanged = model.snap === 1 && offWholeGrid
    const base = snapChanged ? { ...model, snap: 0.5 as const } : model
    const offGrid = created.some((key) =>
      (vertices[key] as Vec3).some(
        (value) => Math.abs(value / base.snap - Math.round(value / base.snap)) > 1e-9,
      ),
    )
    const result = finish(base, part, nextMesh, created, skins, selection)
    return result && result.vertices.length === created.length
      ? { ...result, snapChanged, offGrid }
      : null
  }

  const looseIndex = (mesh.looseEdges ?? []).findIndex(
    ([a, b]) => pairKey(a, b) === pairKey(edge[0], edge[1]),
  )
  if (looseIndex >= 0) {
    const points = makePoints(edge[0], edge[1])
    if (!points) return null
    const chain = [edge[0], ...points, edge[1]]
    const segments = chain
      .slice(0, -1)
      .map((a, index) => [a, chain[index + 1] as string] as [string, string])
    const looseEdges = (mesh.looseEdges ?? []).filter((_item, index) => index !== looseIndex)
    looseEdges.push(...segments)
    return finishCut(
      { ...mesh, vertices, looseEdges },
      segments.map((keys) => ({ kind: 'edge', keys })),
    )
  }

  type OrientedEdge = [string, string]
  const oriented = new Map<string, OrientedEdge>()
  const queue: OrientedEdge[] = [[edge[0], edge[1]]]
  oriented.set(pairKey(edge[0], edge[1]), [edge[0], edge[1]])
  const visited = new Set<MeshFaceKey>()
  const cutFaces = new Map<MeshFaceKey, { first: OrientedEdge; opposite: OrientedEdge }>()
  while (queue.length > 0) {
    const current = queue.pop() as OrientedEdge
    for (const [key, face] of Object.entries(mesh.faces) as Array<[MeshFaceKey, MeshFace]>) {
      if (visited.has(key) || face.v.length !== 4) continue
      const at = face.v.indexOf(current[0])
      if (at < 0) continue
      const forward = face.v[(at + 1) % 4] === current[1]
      const backward = face.v[(at + 3) % 4] === current[1]
      if (!forward && !backward) continue
      const c = face.v[(at + 2) % 4] as string
      const d = face.v[forward ? (at + 3) % 4 : (at + 1) % 4] as string
      const opposite: OrientedEdge = [d, c]
      const oppositeKey = pairKey(opposite[0], opposite[1])
      const known = oriented.get(oppositeKey)
      if (known && (known[0] !== opposite[0] || known[1] !== opposite[1])) return null
      visited.add(key)
      cutFaces.set(key, { first: current, opposite })
      if (!known) {
        oriented.set(oppositeKey, opposite)
        queue.push(opposite)
      }
    }
  }
  if (cutFaces.size === 0) return null

  const pointsByEdge = new Map<string, string[]>()
  for (const [key, [a, b]] of oriented) {
    const points = makePoints(a, b)
    if (!points) return null
    pointsByEdge.set(key, points)
  }
  const pointsAlong = (a: string, b: string): string[] | null => {
    const direction = oriented.get(pairKey(a, b))
    const points = pointsByEdge.get(pairKey(a, b))
    if (!direction || !points) return null
    return direction[0] === a && direction[1] === b ? [...points] : [...points].reverse()
  }

  const nextFaces: Record<MeshFaceKey, MeshFace> = { ...mesh.faces }
  const faceTaken = new Set(Object.keys(mesh.faces))
  const derived = new Map<MeshFaceKey, MeshFaceKey[]>()
  const selectedCrossEdges: MeshEdge[] = []
  const addPiece = (parent: MeshFaceKey, cycle: string[], reuse: boolean): MeshFaceKey => {
    const key = reuse ? parent : newFaceKey(faceTaken)
    faceTaken.add(key)
    nextFaces[key] = { v: cycle }
    const targets = derived.get(parent) ?? []
    targets.push(key)
    derived.set(parent, targets)
    return key
  }
  for (const [key, face] of Object.entries(mesh.faces) as Array<[MeshFaceKey, MeshFace]>) {
    if (!cutFaces.has(key)) continue
    const firstKey = pairKey(
      (cutFaces.get(key) as { first: OrientedEdge }).first[0],
      (cutFaces.get(key) as { first: OrientedEdge }).first[1],
    )
    const start = face.v.findIndex(
      (vertex, index) => pairKey(vertex, face.v[(index + 1) % 4] as string) === firstKey,
    )
    if (start < 0) return null
    const a = face.v[start] as string
    const b = face.v[(start + 1) % 4] as string
    const c = face.v[(start + 2) % 4] as string
    const d = face.v[(start + 3) % 4] as string
    const left = pointsAlong(a, b)
    const right = pointsAlong(d, c)
    if (!left || !right || left.length !== cuts || right.length !== cuts) return null
    const leftBoundary = [a, ...left, b]
    const rightBoundary = [d, ...right, c]
    for (let index = 0; index <= cuts; index += 1) {
      addPiece(
        key,
        [
          leftBoundary[index] as string,
          leftBoundary[index + 1] as string,
          rightBoundary[index + 1] as string,
          rightBoundary[index] as string,
        ],
        index === 0,
      )
      if (index < cuts) {
        selectedCrossEdges.push([
          leftBoundary[index + 1] as string,
          rightBoundary[index + 1] as string,
        ])
      }
    }
  }

  // Uma face triangular terminal consome os pontos para não deixar T-junction.
  // Com vários cortes em mais de uma aresta, a divisão deixaria de ser uma faixa
  // simples; nesse caso recusamos a transação inteira.
  for (const [key, face] of Object.entries(mesh.faces) as Array<[MeshFaceKey, MeshFace]>) {
    if (visited.has(key)) continue
    const touched = face.v.flatMap((a, index) => {
      const b = face.v[(index + 1) % face.v.length] as string
      const points = pointsAlong(a, b)
      return points ? [{ index, points }] : []
    })
    if (touched.length === 0) continue
    if (face.v.length !== 3 || (cuts > 1 && touched.length > 1)) return null
    if (touched.length === 1) {
      const touch = touched[0] as { index: number; points: string[] }
      const a = face.v[touch.index] as string
      const b = face.v[(touch.index + 1) % 3] as string
      const c = face.v[(touch.index + 2) % 3] as string
      const boundary = [a, ...touch.points, b]
      for (let index = 0; index <= cuts; index += 1) {
        addPiece(key, [boundary[index] as string, boundary[index + 1] as string, c], index === 0)
      }
      continue
    }
    const midpointByEdge = new Map(touched.map((touch) => [touch.index, touch.points[0] as string]))
    if (touched.length === 2) {
      const corner = face.v.findIndex(
        (_vertex, index) => midpointByEdge.has((index + 2) % 3) && midpointByEdge.has(index),
      )
      if (corner < 0) return null
      const previous = face.v[(corner + 2) % 3] as string
      const current = face.v[corner] as string
      const next = face.v[(corner + 1) % 3] as string
      const previousMidpoint = midpointByEdge.get((corner + 2) % 3)
      const nextMidpoint = midpointByEdge.get(corner)
      if (!previousMidpoint || !nextMidpoint) return null
      addPiece(key, [previous, previousMidpoint, nextMidpoint, next], true)
      addPiece(key, [previousMidpoint, current, nextMidpoint], false)
      continue
    }
    if (touched.length !== 3) return null
    const midpointAfter = [0, 1, 2].map((index) => midpointByEdge.get(index) as string)
    addPiece(key, midpointAfter, true)
    for (let index = 0; index < 3; index += 1) {
      addPiece(
        key,
        [
          face.v[index] as string,
          midpointAfter[index] as string,
          midpointAfter[(index + 2) % 3] as string,
        ],
        false,
      )
    }
  }

  const nextMesh: MoldaMesh = { ...mesh, vertices, faces: nextFaces }
  const skins = reprojectDerivedSkins(
    model,
    part,
    mesh,
    nextMesh,
    [...derived].map(([source, targets]) => ({ source, targets })),
  )
  const result = finishCut(
    nextMesh,
    selectedCrossEdges.map((keys) => ({ kind: 'edge', keys })),
    skins,
  )
  const committed = result?.model.parts.find((item) => item.id === part.id)?.mesh
  return result &&
    committed &&
    Object.keys(committed.faces).length === Object.keys(nextFaces).length
    ? result
    : null
}

/** JUNTAR PONTOS: os vértices escolhidos viram UM (no centro deles); face que degenera cai. */
export function mergeVertices(
  model: MoldaModelAsset,
  partId: string,
  selection: readonly string[],
): MeshToolResult | null {
  const source = sourceMesh(model, partId)
  if (!source) return null
  const { part, mesh } = source
  const keys = selection.filter((key) => key in mesh.vertices)
  if (keys.length < 2) return null
  const survivor = keys[0] as string
  const merged = new Set(keys)
  const vertices: Record<string, Vec3> = { ...mesh.vertices }
  vertices[survivor] = faceCenter(keys.map((key) => mesh.vertices[key] as Vec3))
  const faces: Record<MeshFaceKey, MeshFace> = {}
  // Duas faces que colapsam no MESMO conjunto de pontos viram uma só (senão ficavam duas
  // faces coincidentes, uma de costas para a outra, brigando no palco).
  const emitted = new Set<string>()
  for (const [key, face] of Object.entries(mesh.faces) as Array<[MeshFaceKey, MeshFace]>) {
    const cycle: string[] = []
    for (const vertex of face.v) {
      const mapped = merged.has(vertex) ? survivor : vertex
      if (!cycle.includes(mapped)) cycle.push(mapped)
    }
    if (cycle.length < 3) continue
    const setKey = [...cycle].sort().join(' ')
    if (emitted.has(setKey)) continue
    emitted.add(setKey)
    faces[key] = { v: cycle }
  }
  const looseEdges: MeshLooseEdge[] = (mesh.looseEdges ?? []).flatMap(([a, b]) => {
    const first = merged.has(a) ? survivor : a
    const second = merged.has(b) ? survivor : b
    return first === second ? [] : [[first, second] as const]
  })
  return finish(model, part, { vertices, faces, looseEdges }, [survivor])
}

/**
 * FECHAR FACE: 3 ou 4 vértices viram uma face nova, em ciclo (a "gravata" é
 * desfeita) e virada para FORA da malha (pelo centro dela).
 */
export function createFace(
  model: MoldaModelAsset,
  partId: string,
  selection: readonly string[],
): MeshToolResult | null {
  const source = sourceMesh(model, partId)
  if (!source) return null
  const { part, mesh } = source
  const keys = [...new Set(selection.filter((key) => key in mesh.vertices))]
  if (keys.length < 3 || keys.length > 4) return null
  const wanted = new Set(keys)
  for (const face of Object.values(mesh.faces)) {
    if (face.v.length === keys.length && face.v.every((vertex) => wanted.has(vertex))) return null
  }
  const points = keys.map((key) => mesh.vertices[key] as Vec3)
  let cycle = orderQuad(points).map((index) => keys[index] as string)
  // Orientação pelas VIZINHAS: uma face coerente percorre a aresta que divide com a
  // vizinha ao contrário dela. Sem vizinha (face solta), vale o centro da malha.
  let same = 0
  let opposite = 0
  for (let i = 0; i < cycle.length; i += 1) {
    const a = cycle[i] as string
    const b = cycle[(i + 1) % cycle.length] as string
    for (const face of Object.values(mesh.faces)) {
      const at = face.v.indexOf(a)
      if (at < 0) continue
      if (face.v[(at + 1) % face.v.length] === b) same += 1
      else if (face.v[(at + face.v.length - 1) % face.v.length] === b) opposite += 1
    }
  }
  if (same > opposite) cycle = [...cycle].reverse()
  else if (same === 0 && opposite === 0) {
    const ordered = cycle.map((key) => mesh.vertices[key] as Vec3)
    const normal = faceNormal(ordered)
    if (dot(normal, sub(faceCenter(ordered), meshCenter(mesh))) < 0) cycle = [...cycle].reverse()
  }
  const key = newFaceKey(Object.keys(mesh.faces))
  const nextMesh = {
    ...mesh,
    vertices: mesh.vertices,
    faces: { ...mesh.faces, [key]: { v: cycle } },
  }
  if (faceGeometryIssue(nextMesh, key) === 'degenerate') return null
  const result = finish(model, part, nextMesh, keys)
  const committed = result?.model.parts.find((item) => item.id === part.id)?.mesh
  if (!result || !committed?.faces[key]) return null
  return result
}

/** Existe uma aresta de superfície ou de construção entre os dois pontos. */
export function meshHasEdge(mesh: MoldaMesh, a: string, b: string): boolean {
  const wanted = pairKey(a, b)
  return meshEdges(mesh).some(([x, y]) => pairKey(x, y) === wanted)
}

function selectedQuadDiagonal(
  mesh: MoldaMesh,
  vertices: readonly string[],
): [string, string] | null {
  if (vertices.length !== 3) return null
  const selected = new Set(vertices)
  const matches: Array<[string, string]> = []
  for (const face of Object.values(mesh.faces)) {
    if (face.v.length !== 4 || !vertices.every((key) => face.v.includes(key))) continue
    const missing = face.v.findIndex((key) => !selected.has(key))
    if (missing < 0) continue
    matches.push([face.v[(missing + 3) % 4] as string, face.v[(missing + 1) % 4] as string])
  }
  return matches.length === 1 ? (matches[0] as [string, string]) : null
}

export function canCreateFaceOrEdge(mesh: MoldaMesh, selection: readonly string[]): boolean {
  const keys = [...new Set(selection.filter((key) => key in mesh.vertices))]
  if (keys.length < 2 || keys.length > 4) return false
  if (keys.length === 2) {
    return (
      canConnectVertices(mesh, keys) || !meshHasEdge(mesh, keys[0] as string, keys[1] as string)
    )
  }
  const wanted = new Set(keys)
  return !Object.values(mesh.faces).some(
    (face) => face.v.length === keys.length && face.v.every((key) => wanted.has(key)),
  )
}

/**
 * CRIAR FACE OU ARESTA: dois pontos dividem um quad ou criam uma aresta solta;
 * três pontos de um quad o dividem; três/quatro pontos livres fecham uma face.
 */
export function createFaceOrEdge(
  model: MoldaModelAsset,
  partId: string,
  selection: readonly string[],
): MeshToolResult | null {
  const source = sourceMesh(model, partId)
  if (!source) return null
  const { part, mesh } = source
  const keys = [...new Set(selection.filter((key) => key in mesh.vertices))]
  if (!canCreateFaceOrEdge(mesh, keys)) return null
  if (keys.length === 2) {
    if (canConnectVertices(mesh, keys)) return connectVertices(model, partId, keys)
    const edge = [keys[0] as string, keys[1] as string] as const
    return finish(
      model,
      part,
      { ...mesh, looseEdges: [...(mesh.looseEdges ?? []), edge] },
      [...keys],
      undefined,
      [{ kind: 'edge', keys: [edge[0], edge[1]] }],
    )
  }
  const diagonal = selectedQuadDiagonal(mesh, keys)
  if (diagonal) {
    const result = connectVertices(model, partId, diagonal)
    const committed = result?.model.parts.find((item) => item.id === partId)?.mesh
    if (!result || !committed) return null
    const wanted = new Set(keys)
    const face = (Object.keys(committed.faces) as MeshFaceKey[]).find((key) => {
      const cycle = committed.faces[key]?.v ?? []
      return cycle.length === keys.length && cycle.every((vertex) => wanted.has(vertex))
    })
    return face ? { ...result, vertices: keys, selection: [{ kind: 'face', key: face }] } : null
  }
  return createFace(model, partId, keys)
}

/** Uma face reta e convexa pode receber um miolo sem gerar faces quebradas. */
export function canInsetFace(mesh: MoldaMesh, faceKey: MeshFaceKey | undefined): boolean {
  if (!faceKey) return false
  const face = mesh.faces[faceKey]
  return (
    Boolean(face && (face.v.length === 3 || face.v.length === 4)) &&
    !faceGeometryIssue(mesh, faceKey)
  )
}

/**
 * ENCOLHER DENTRO: a face escolhida vira o miolo e um quad nasce em volta de
 * cada lado. O percentual diz quanto cada canto anda em direção ao centro.
 */
export function insetFace(
  model: MoldaModelAsset,
  partId: string,
  faceKey: MeshFaceKey,
  percent: number,
): MeshToolResult | null {
  const source = sourceMesh(model, partId)
  if (!source || !Number.isFinite(percent) || percent < 10 || percent > 80) return null
  const { part, mesh } = source
  const face = mesh.faces[faceKey]
  const points = faceVertices(mesh, faceKey)
  if (!face || !points || !canInsetFace(mesh, faceKey)) return null

  const center = faceCenter(points)
  const taken = new Set(Object.keys(mesh.vertices))
  const vertices: Record<string, Vec3> = { ...mesh.vertices }
  const inner: string[] = []
  const amount = percent / 100
  for (let i = 0; i < face.v.length; i += 1) {
    const key = newVertexKey(taken)
    taken.add(key)
    const point = points[i] as Vec3
    vertices[key] = roundedPoint(add(point, scale(sub(center, point), amount)))
    inner.push(key)
  }

  const faces: Record<MeshFaceKey, MeshFace> = { ...mesh.faces, [faceKey]: { v: inner } }
  const faceTaken = new Set(Object.keys(mesh.faces))
  const ring: MeshFaceKey[] = []
  for (let i = 0; i < face.v.length; i += 1) {
    const key = newFaceKey(faceTaken)
    faceTaken.add(key)
    ring.push(key)
    faces[key] = {
      v: [
        face.v[i] as string,
        face.v[(i + 1) % face.v.length] as string,
        inner[(i + 1) % inner.length] as string,
        inner[i] as string,
      ],
    }
  }
  const nextMesh = { ...mesh, vertices, faces }
  // O arredondamento de uma face muito pequena pode colapsar o miolo ou o anel.
  if ([faceKey, ...ring].some((key) => faceGeometryIssue(nextMesh, key))) return null

  const skins = reprojectDerivedSkins(model, part, mesh, nextMesh, [
    { source: faceKey, targets: [faceKey, ...ring] },
  ])
  return finish(model, part, nextMesh, inner, skins, [{ kind: 'face', key: faceKey }])
}

/** VIRAR FACE: inverte o ciclo (a normal vira) e espelha a pele, que fica no lugar. */
export function flipFaces(
  model: MoldaModelAsset,
  partId: string,
  faceKeys: readonly MeshFaceKey[],
): MeshToolResult | null {
  const source = sourceMesh(model, partId)
  if (!source) return null
  const { part, mesh } = source
  const targets = faceKeys.filter((key) => key in mesh.faces)
  if (targets.length === 0) return null
  const faces: Record<MeshFaceKey, MeshFace> = { ...mesh.faces }
  const skins: MoldaPart['faces'] = { ...part.faces }
  for (const key of targets) {
    faces[key] = { v: [...(mesh.faces[key] as MeshFace).v].reverse() }
    const skin = part.faces[key]
    if (skin) skins[key] = flipSkinH(skin)
  }
  const vertices = [...new Set(targets.flatMap((key) => mesh.faces[key]?.v ?? []))]
  return finish(
    model,
    part,
    { ...mesh, vertices: mesh.vertices, faces },
    vertices,
    skins,
    targets.map((key) => ({ kind: 'face', key })),
  )
}

type QuadDiagonal = 'even' | 'odd'

function quadSplit(
  mesh: MoldaMesh,
  key: MeshFaceKey,
  requested?: readonly [string, string],
): { first: string[]; second: string[]; diagonal: [string, string] } | null {
  const face = mesh.faces[key]
  if (face?.v.length !== 4) return null
  const [p0, p1, p2, p3] = face.v as [string, string, string, string]
  const points = faceVertices(mesh, key)
  if (points?.length !== 4) return null
  const normal = faceNormal(points)
  const turnAt = (index: number): number => {
    const a = points[(index + 3) % 4] as Vec3
    const b = points[index] as Vec3
    const c = points[(index + 1) % 4] as Vec3
    return dot(cross(sub(b, a), sub(c, b)), normal)
  }
  const turns = [0, 1, 2, 3].map(turnAt)
  const throughOdd = (turns[1] as number) < -1e-9 || (turns[3] as number) < -1e-9
  const concave = turns.some((turn) => turn < -1e-9)
  let diagonal: QuadDiagonal = throughOdd ? 'odd' : 'even'
  if (requested) {
    const wanted = pairKey(requested[0], requested[1])
    if (wanted === pairKey(p0, p2)) diagonal = 'even'
    else if (wanted === pairKey(p1, p3)) diagonal = 'odd'
    else return null
    // Num quad côncavo só a diagonal que passa pelo canto reflexo fica dentro.
    if (concave && diagonal !== (throughOdd ? 'odd' : 'even')) return null
  }
  return diagonal === 'odd'
    ? { first: [p1, p2, p3], second: [p3, p0, p1], diagonal: [p1, p3] }
    : { first: [p0, p1, p2], second: [p0, p2, p3], diagonal: [p0, p2] }
}

function reprojectDerivedSkins(
  model: MoldaModelAsset,
  part: MoldaPart,
  oldMesh: MoldaMesh,
  nextMesh: MoldaMesh,
  groups: ReadonlyArray<{ source: MeshFaceKey; targets: readonly MeshFaceKey[] }>,
): MoldaPart['faces'] {
  const skins: MoldaPart['faces'] = { ...part.faces }
  const nextPart = { shape: 'mesh' as const, from: part.from, to: part.to, mesh: nextMesh }
  for (const group of groups) {
    const oldSkin = part.faces[group.source]
    for (const target of group.targets) {
      if (!oldSkin) {
        delete skins[target]
        continue
      }
      const size = faceSkinSize(nextPart, target, model.texelsPerUnit)
      const projected = size
        ? reprojectSkin(oldMesh, group.source, oldSkin, nextMesh, target, size)
        : undefined
      if (projected) skins[target] = projected
      else delete skins[target]
    }
  }
  return skins
}

function connectableQuad(
  mesh: MoldaMesh,
  selection: readonly string[],
): { key: MeshFaceKey; diagonal: [string, string] } | null {
  const vertices = [...new Set(selection.filter((key) => key in mesh.vertices))]
  if (vertices.length !== 2) return null
  const requested = [vertices[0] as string, vertices[1] as string] as [string, string]
  const matches: Array<{ key: MeshFaceKey; diagonal: [string, string] }> = []
  for (const key of Object.keys(mesh.faces) as MeshFaceKey[]) {
    const split = quadSplit(mesh, key, requested)
    if (split) matches.push({ key, diagonal: requested })
  }
  return matches.length === 1
    ? (matches[0] as { key: MeshFaceKey; diagonal: [string, string] })
    : null
}

export function canConnectVertices(mesh: MoldaMesh, selection: readonly string[]): boolean {
  return connectableQuad(mesh, selection) !== null
}

/** CONECTAR PONTOS: a diagonal escolhida divide um único quad em dois triângulos. */
export function connectVertices(
  model: MoldaModelAsset,
  partId: string,
  selection: readonly string[],
): MeshToolResult | null {
  const source = sourceMesh(model, partId)
  if (!source) return null
  const { part, mesh } = source
  const target = connectableQuad(mesh, selection)
  if (!target) return null
  const split = quadSplit(mesh, target.key, target.diagonal)
  if (!split) return null
  const faceTaken = new Set(Object.keys(mesh.faces))
  const other = newFaceKey(faceTaken)
  const faces: Record<MeshFaceKey, MeshFace> = {
    ...mesh.faces,
    [target.key]: { v: split.first },
    [other]: { v: split.second },
  }
  const nextMesh = { ...mesh, vertices: mesh.vertices, faces }
  const skins = reprojectDerivedSkins(model, part, mesh, nextMesh, [
    { source: target.key, targets: [target.key, other] },
  ])
  return finish(model, part, nextMesh, [...target.diagonal], skins, [
    { kind: 'edge', keys: target.diagonal },
  ])
}

/** DIVIDIR quads em triângulos (pela diagonal que passa pelo dente, se houver); a pele é reprojetada nos dois. */
export function splitQuads(
  model: MoldaModelAsset,
  partId: string,
  faceKeys: readonly MeshFaceKey[],
): MeshToolResult | null {
  const source = sourceMesh(model, partId)
  if (!source) return null
  const { part, mesh } = source
  const targets = faceKeys.filter((key) => mesh.faces[key]?.v.length === 4)
  if (targets.length === 0) return null
  const faces: Record<MeshFaceKey, MeshFace> = { ...mesh.faces }
  const faceTaken = new Set(Object.keys(mesh.faces))
  const halves: Array<[MeshFaceKey, MeshFaceKey]> = []
  for (const key of targets) {
    const split = quadSplit(mesh, key)
    if (!split) continue
    faces[key] = { v: split.first }
    const other = newFaceKey(faceTaken)
    faceTaken.add(other)
    faces[other] = { v: split.second }
    halves.push([key, other])
  }
  if (halves.length === 0) return null
  const nextMesh = { ...mesh, vertices: mesh.vertices, faces }
  const skins = reprojectDerivedSkins(
    model,
    part,
    mesh,
    nextMesh,
    halves.map(([source, other]) => ({ source, targets: [source, other] })),
  )
  const vertices = [...new Set(targets.flatMap((key) => mesh.faces[key]?.v ?? []))]
  return finish(
    model,
    part,
    nextMesh,
    vertices,
    skins,
    halves.flatMap(([first, second]) => [
      { kind: 'face' as const, key: first },
      { kind: 'face' as const, key: second },
    ]),
  )
}

/** O conserto de um problema apontado por `meshIssues`. */
export function applyMeshFix(
  model: MoldaModelAsset,
  partId: string,
  issue: MeshIssue,
): MeshToolResult | null {
  switch (issue.kind) {
    case 'overlap':
      return mergeVertices(model, partId, issue.vertices)
    case 'non-planar':
    case 'concave':
      return splitQuads(model, partId, [issue.face])
    case 'flipped':
      return flipFaces(model, partId, [issue.face])
  }
}

/** Toda aresta é usada por exatamente duas faces (a malha não tem buraco nem borda). */
export function isClosedMesh(mesh: MoldaMesh): boolean {
  const use = new Map<string, number>()
  for (const face of Object.values(mesh.faces)) {
    for (let i = 0; i < face.v.length; i += 1) {
      const key = pairKey(face.v[i] as string, face.v[(i + 1) % face.v.length] as string)
      use.set(key, (use.get(key) ?? 0) + 1)
    }
  }
  return [...use.values()].every((count) => count === 2)
}

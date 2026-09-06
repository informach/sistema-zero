/**
 * As FERRAMENTAS da malha (Puxar, Cortar no meio, Juntar pontos, Fechar face,
 * Virar face, Dividir em triângulos) e os consertos das `meshIssues`. Puras:
 * cada uma devolve o modelo com a peça regravada por `withMesh` (caixa derivada,
 * peles re-amostradas) e a SELEÇÃO NOVA (os vértices criados), a régua "a seleção
 * vira as novas". `null` = a ferramenta não se aplica à seleção, ou o resultado
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
  MoldaMesh,
  MoldaModelAsset,
  MoldaPart,
  Vec3,
} from '../core/model'
import { modelTriangleCount } from './geometry'
import {
  faceCenter,
  faceNormal,
  faceVertices,
  type MeshIssue,
  meshCenter,
  newFaceKey,
  newVertexKey,
  orderQuad,
} from './mesh'
import { withMesh } from './meshOps'
import { selectedEdges, selectedFaces, selectionNormal } from './meshSelection'
import { faceSkinSize } from './shapes'
import { flipSkinH } from './skinOps'
import { reprojectSkin } from './skinReproject'
import { add, cross, dot, scale, sub } from './vec'

export interface MeshToolResult {
  model: MoldaModelAsset
  /** Os vértices que a ferramenta criou (a seleção seguinte). */
  vertices: string[]
}

function sourceMesh(
  model: MoldaModelAsset,
  partId: string,
): { part: MoldaPart; mesh: MoldaMesh } | null {
  const part = model.parts.find((item) => item.id === partId)
  return part && !part.mirrorOf && part.shape === 'mesh' && part.mesh
    ? { part, mesh: part.mesh }
    : null
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a} ${b}` : `${b} ${a}`
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
): MeshToolResult | null {
  if (
    Object.keys(mesh.vertices).length > MOLDA_LIMITS.maxMeshVertices ||
    Object.keys(mesh.faces).length > MOLDA_LIMITS.maxMeshFaces
  ) {
    return null
  }
  const next = withMesh(model, part, mesh, skins)
  if (modelTriangleCount(next) > MOLDA_LIMITS.maxTriangles) return null
  const nextPart = next.parts.find((item) => item.id === part.id)
  const alive = new Set(Object.keys(nextPart?.mesh?.vertices ?? {}))
  return { model: next, vertices: vertices.filter((key) => alive.has(key)) }
}

/**
 * PUXAR faces: a região selecionada sobe ao longo da normal média; as faces viram
 * as tampas (mesmas chaves, a pele migra) e cada aresta de BORDA da região ganha
 * uma parede. Arestas internas (entre duas faces selecionadas) não ganham parede.
 */
export function extrudeFaces(
  model: MoldaModelAsset,
  partId: string,
  selection: readonly string[],
  distance: number,
): MeshToolResult | null {
  const source = sourceMesh(model, partId)
  if (!source) return null
  const { part, mesh } = source
  const faces = selectedFaces(mesh, selection)
  // Só para FORA: distância zero duplicaria os pontos e negativa faria paredes
  // coplanares com as faces vizinhas (e viradas).
  if (faces.length === 0 || !(distance > 0)) return null
  const normal = selectionNormal(mesh, selection) ?? [0, 1, 0]
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
  return finish(model, part, { vertices, faces: nextFaces }, [...lifted.values()])
}

/**
 * PUXAR arestas: cada aresta selecionada ganha uma "aba" (um quad) ao longo da
 * normal média das faces em volta; vértice compartilhado por duas arestas sobe uma
 * vez só. A orientação segue a face vizinha em que a aresta aparece como `a → b`.
 */
export function extrudeEdges(
  model: MoldaModelAsset,
  partId: string,
  selection: readonly string[],
  distance: number,
): MeshToolResult | null {
  const source = sourceMesh(model, partId)
  if (!source) return null
  const { part, mesh } = source
  const edges = selectedEdges(mesh, selection)
  if (edges.length === 0 || !(distance > 0)) return null
  const normal = selectionNormal(mesh, selection) ?? [0, 1, 0]
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
  return finish(model, part, { vertices, faces: nextFaces }, [...lifted.values()])
}

export interface LoopCutResult extends MeshToolResult {
  /** O corte caiu no meio de um bloco: o encaixe de meio bloco foi ligado no MESMO commit. */
  snapChanged: boolean
  /** Mesmo com o meio bloco os pontos do corte ficaram fora do encaixe (aresta de 0,5). */
  offGrid: boolean
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
): LoopCutResult | null {
  const source = sourceMesh(model, partId)
  if (!source) return null
  const { part, mesh } = source
  if (!(edge[0] in mesh.vertices) || !(edge[1] in mesh.vertices)) return null
  const taken = new Set(Object.keys(mesh.vertices))
  const faceTaken = new Set(Object.keys(mesh.faces))
  const vertices: Record<string, Vec3> = { ...mesh.vertices }
  const midpoints = new Map<string, string>()
  const midpointOf = (a: string, b: string): string => {
    const key = pairKey(a, b)
    let mid = midpoints.get(key)
    if (!mid) {
      mid = newVertexKey(taken)
      taken.add(mid)
      midpoints.set(key, mid)
      vertices[mid] = scale(add(mesh.vertices[a] as Vec3, mesh.vertices[b] as Vec3), 0.5)
    }
    return mid
  }
  const nextFaces: Record<MeshFaceKey, MeshFace> = { ...mesh.faces }
  /** De qual face antiga cada face nova nasceu (para reprojetar a pele). */
  const parentOf = new Map<MeshFaceKey, MeshFaceKey>()
  const visited = new Set<MeshFaceKey>()
  const queue: Array<[string, string]> = [edge]
  while (queue.length > 0) {
    const [p, q] = queue.pop() as [string, string]
    for (const [key, face] of Object.entries(mesh.faces) as Array<[MeshFaceKey, MeshFace]>) {
      if (visited.has(key) || face.v.length !== 4) continue
      const i = face.v.indexOf(p)
      if (i < 0) continue
      const next = face.v[(i + 1) % 4]
      const prev = face.v[(i + 3) % 4]
      if (next !== q && prev !== q) continue
      visited.add(key)
      // Reordena o ciclo para começar na aresta cortada: e0 → e1 → o0 → o1.
      const start = next === q ? i : (i + 3) % 4
      const e0 = face.v[start] as string
      const e1 = face.v[(start + 1) % 4] as string
      const o0 = face.v[(start + 2) % 4] as string
      const o1 = face.v[(start + 3) % 4] as string
      const m1 = midpointOf(e0, e1)
      const m2 = midpointOf(o0, o1)
      nextFaces[key] = { v: [e0, m1, m2, o1] }
      const half = newFaceKey(faceTaken)
      faceTaken.add(half)
      nextFaces[half] = { v: [m1, e1, o0, m2] }
      parentOf.set(half, key)
      queue.push([o0, o1])
    }
  }
  if (midpoints.size === 0) return null
  // Triângulos (e quads que sobraram) que tocam uma aresta cortada recebem o meio.
  for (const [key, face] of Object.entries(nextFaces) as Array<[MeshFaceKey, MeshFace]>) {
    if (visited.has(key) || parentOf.has(key)) continue
    const cycle = [...face.v]
    for (let i = 0; i < cycle.length && cycle.length < 4; i += 1) {
      const a = cycle[i] as string
      const b = cycle[(i + 1) % cycle.length] as string
      const mid = midpoints.get(pairKey(a, b))
      if (!mid) continue
      cycle.splice(i + 1, 0, mid)
      i += 1
    }
    if (cycle.length !== face.v.length) nextFaces[key] = { v: cycle }
  }
  const nextMesh = { vertices, faces: nextFaces }
  const skins: MoldaPart['faces'] = { ...part.faces }
  for (const [key, parent] of [...visited].map((k) => [k, k] as const).concat([...parentOf])) {
    const oldSkin = part.faces[parent]
    if (!oldSkin) {
      delete skins[key]
      continue
    }
    const size = faceSkinSize(
      { shape: 'mesh', from: part.from, to: part.to, mesh: nextMesh },
      key,
      model.texelsPerUnit,
    )
    const projected = size ? reprojectSkin(mesh, parent, oldSkin, nextMesh, key, size) : undefined
    if (projected) skins[key] = projected
    else delete skins[key]
  }
  const midKeys = [...midpoints.values()]
  const offGrid = midKeys.some((key) =>
    (vertices[key] as Vec3).some((value) => Math.abs(value - Math.round(value)) > 1e-9),
  )
  const snapChanged = model.snap === 1 && offGrid
  const base = snapChanged ? { ...model, snap: 0.5 as const } : model
  const offGridAfter = midKeys.some((key) =>
    (vertices[key] as Vec3).some(
      (value) => Math.abs(value / base.snap - Math.round(value / base.snap)) > 1e-9,
    ),
  )
  const result = finish(base, part, nextMesh, midKeys, skins)
  return result ? { ...result, snapChanged, offGrid: offGridAfter } : null
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
  return finish(model, part, { vertices, faces }, [survivor])
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
  return finish(
    model,
    part,
    { vertices: mesh.vertices, faces: { ...mesh.faces, [key]: { v: cycle } } },
    keys,
  )
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
  return finish(model, part, { vertices: mesh.vertices, faces }, vertices, skins)
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
    const [p0, p1, p2, p3] = (mesh.faces[key] as MeshFace).v as [string, string, string, string]
    // Num quad côncavo a diagonal tem de passar pelo "dente" (o canto reflexo), senão
    // um dos triângulos cai fora do polígono e nasce virado.
    const points = faceVertices(mesh, key) ?? []
    const normal = faceNormal(points)
    const turnAt = (index: number): number => {
      const a = points[(index + 3) % 4] as Vec3
      const b = points[index] as Vec3
      const c = points[(index + 1) % 4] as Vec3
      return dot(cross(sub(b, a), sub(c, b)), normal)
    }
    const throughOdd = points.length === 4 && (turnAt(1) < -1e-9 || turnAt(3) < -1e-9)
    faces[key] = { v: throughOdd ? [p1, p2, p3] : [p0, p1, p2] }
    const other = newFaceKey(faceTaken)
    faceTaken.add(other)
    faces[other] = { v: throughOdd ? [p3, p0, p1] : [p0, p2, p3] }
    halves.push([key, other])
  }
  const nextMesh = { vertices: mesh.vertices, faces }
  const skins: MoldaPart['faces'] = { ...part.faces }
  for (const [key, other] of halves) {
    const oldSkin = part.faces[key]
    for (const target of [key, other]) {
      if (!oldSkin) {
        delete skins[target]
        continue
      }
      const size = faceSkinSize(
        { shape: 'mesh', from: part.from, to: part.to, mesh: nextMesh },
        target,
        model.texelsPerUnit,
      )
      const projected = size ? reprojectSkin(mesh, key, oldSkin, nextMesh, target, size) : undefined
      if (projected) skins[target] = projected
      else delete skins[target]
    }
  }
  const vertices = [...new Set(targets.flatMap((key) => mesh.faces[key]?.v ?? []))]
  return finish(model, part, nextMesh, vertices, skins)
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

export function faceVerticesOf(mesh: MoldaMesh, key: MeshFaceKey): Vec3[] | null {
  return faceVertices(mesh, key)
}

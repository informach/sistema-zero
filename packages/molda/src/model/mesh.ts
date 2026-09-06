/**
 * A MALHA de uma peça (`shape: 'mesh'`): vértices e faces em MAPAS por chave, nunca
 * por índice (ideia do Blockbench: apagar um vértice não desloca os outros e uma
 * face sobrevive à edição das vizinhas). Faces são triângulos ou quads, CCW vistas
 * de FORA; a PRIMEIRA e a ÚLTIMA posição do ciclo definem a base da pele (ver
 * `meshFrame.ts`: `s` = último − primeiro, `t` = "para baixo"), então a ordem do
 * ciclo importa e é preservada, nunca reordenada por gosto.
 *
 * Coordenadas da CAIXA da peça (antes do giro), como `from`/`to`; numa peça de
 * malha `from`/`to` são DERIVADOS (`meshBox`), o que faz `partMatrix`, `partBounds`,
 * o histórico, os gêmeos e o JSON valerem sem mexer. Vértices guardam precisão de
 * `MOLDA_LIMITS.meshPrecision` (1/16): a EDIÇÃO encaixa na grade, mas uma bola ou um
 * cilindro convertidos em malha não podem ser arredondados ao encaixe.
 */
import { MOLDA_LIMITS } from '../core/limits'
import type { MeshFace, MeshFaceKey, MoldaMesh, Vec3 } from '../core/model'
import { add, cross, dot, length, normalize, scale, sub } from './vec'

export const MESH_VERTEX_KEY = /^v_[a-z0-9]{1,16}$/
export const MESH_FACE_KEY = /^f_[a-z0-9]{1,16}$/

export function isMeshVertexKey(value: unknown): value is string {
  return typeof value === 'string' && MESH_VERTEX_KEY.test(value)
}

export function isMeshFaceKey(value: unknown): value is MeshFaceKey {
  return typeof value === 'string' && MESH_FACE_KEY.test(value)
}

const KEY_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

function randomKey(prefix: string, taken: ReadonlySet<string>): string {
  for (;;) {
    let body = ''
    for (let i = 0; i < 6; i += 1) {
      body += KEY_ALPHABET[Math.floor(Math.random() * KEY_ALPHABET.length)]
    }
    const key = `${prefix}${body}`
    if (!taken.has(key)) return key
  }
}

export function newVertexKey(taken: Iterable<string>): string {
  return randomKey('v_', new Set(taken))
}

export function newFaceKey(taken: Iterable<string>): MeshFaceKey {
  return randomKey('f_', new Set(taken)) as MeshFaceKey
}

/** As faces da caixa quando ela vira malha: as mesmas chaves das faces da forma `box`. */
export const BOX_MESH_FACES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const

/**
 * Uma caixa como malha: 8 vértices (`v_xyz` com os bits do canto) e 6 quads cujo
 * ciclo [TL, BL, BR, TR] reproduz EXATAMENTE a base de cada face da forma `box`
 * (`planarFaceFrame`): a pele migra da caixa para a malha sem re-amostrar. Testado
 * face a face em `meshFrame.test.ts`.
 */
export function boxMesh(from: Vec3, to: Vec3): MoldaMesh {
  const [x0, y0, z0] = from
  const [x1, y1, z1] = to
  const vertices: Record<string, Vec3> = {
    v_000: [x0, y0, z0],
    v_001: [x0, y0, z1],
    v_010: [x0, y1, z0],
    v_011: [x0, y1, z1],
    v_100: [x1, y0, z0],
    v_101: [x1, y0, z1],
    v_110: [x1, y1, z0],
    v_111: [x1, y1, z1],
  }
  const faces: Record<MeshFaceKey, MeshFace> = {
    f_px: { v: ['v_111', 'v_101', 'v_100', 'v_110'] },
    f_nx: { v: ['v_010', 'v_000', 'v_001', 'v_011'] },
    f_py: { v: ['v_010', 'v_011', 'v_111', 'v_110'] },
    f_ny: { v: ['v_001', 'v_000', 'v_100', 'v_101'] },
    f_pz: { v: ['v_011', 'v_001', 'v_101', 'v_111'] },
    f_nz: { v: ['v_110', 'v_100', 'v_000', 'v_010'] },
  }
  return { vertices, faces }
}

/** A caixa envolvente dos vértices; `null` sem vértice nenhum. */
export function meshBox(mesh: MoldaMesh): { from: Vec3; to: Vec3 } | null {
  const from: Vec3 = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
  const to: Vec3 = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
  let any = false
  for (const v of Object.values(mesh.vertices)) {
    any = true
    for (let i = 0; i < 3; i += 1) {
      from[i] = Math.min(from[i] as number, v[i] as number)
      to[i] = Math.max(to[i] as number, v[i] as number)
    }
  }
  return any ? { from, to } : null
}

/** Os pontos de uma face na ordem do ciclo; `null` se falta vértice. */
export function faceVertices(mesh: MoldaMesh, face: MeshFaceKey | MeshFace): Vec3[] | null {
  const entry = typeof face === 'string' ? mesh.faces[face] : face
  if (!entry) return null
  const points: Vec3[] = []
  for (const key of entry.v) {
    const vertex = mesh.vertices[key]
    if (!vertex) return null
    points.push(vertex)
  }
  return points
}

/** Normal de Newell (unitária) de um polígono; `[0, 0, 0]` para face degenerada. */
export function faceNormal(points: readonly Vec3[]): Vec3 {
  let x = 0
  let y = 0
  let z = 0
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i] as Vec3
    const b = points[(i + 1) % points.length] as Vec3
    x += (a[1] - b[1]) * (a[2] + b[2])
    y += (a[2] - b[2]) * (a[0] + b[0])
    z += (a[0] - b[0]) * (a[1] + b[1])
  }
  const size = Math.hypot(x, y, z)
  return size < 1e-12 ? [0, 0, 0] : [x / size, y / size, z / size]
}

export function faceCenter(points: readonly Vec3[]): Vec3 {
  const sum = points.reduce<Vec3>((acc, p) => add(acc, p), [0, 0, 0])
  return scale(sum, 1 / Math.max(points.length, 1))
}

export function meshCenter(mesh: MoldaMesh): Vec3 {
  return faceCenter(Object.values(mesh.vertices))
}

/** Triângulos que a malha vira ao desenhar (quad = 2). */
export function meshTriangleCount(mesh: MoldaMesh): number {
  let total = 0
  for (const face of Object.values(mesh.faces)) total += Math.max(face.v.length - 2, 0)
  return total
}

/** Arestas únicas (par de chaves em ordem), para o overlay de arestas e o loop cut. */
export function meshEdges(mesh: MoldaMesh): Array<[string, string]> {
  const seen = new Set<string>()
  const edges: Array<[string, string]> = []
  for (const face of Object.values(mesh.faces)) {
    for (let i = 0; i < face.v.length; i += 1) {
      const a = face.v[i] as string
      const b = face.v[(i + 1) % face.v.length] as string
      const pair: [string, string] = a < b ? [a, b] : [b, a]
      const key = `${pair[0]} ${pair[1]}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push(pair)
    }
  }
  return edges
}

/**
 * A ordem de um quad como CICLO em volta do centro (uma "gravata borboleta" vira
 * um quadrilátero), mantendo o PRIMEIRO ponto e a orientação da ordem dada. Um
 * ciclo já bom volta igual (idempotente: é o que faz o round-trip dos modelos
 * prontos ser byte a byte). Triângulos são sempre um ciclo.
 */
function segmentsCross(
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
  d: readonly [number, number],
): boolean {
  const orient = (
    p: readonly [number, number],
    q: readonly [number, number],
    r: readonly [number, number],
  ): number => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  const o1 = orient(a, b, c)
  const o2 = orient(a, b, d)
  const o3 = orient(c, d, a)
  const o4 = orient(c, d, b)
  return o1 * o2 < 0 && o3 * o4 < 0
}

/**
 * A ordem canônica dos 4 pontos de um quad: SÓ a "gravata borboleta" (o ciclo que
 * se cruza) é reordenada, pelo ângulo em volta do centro, mantendo o 1º ponto. Um
 * quad simples fica como está, convexo OU côncavo: reordenar um dardo pelo ângulo
 * trocaria a forma dele (o "dente" viraria uma pipa), e o dardo é uma face válida
 * que a criança pode ter feito de propósito (`meshIssues` avisa e oferece Dividir).
 */
export function orderQuad(points: readonly Vec3[]): number[] {
  const identity = points.map((_p, index) => index)
  if (points.length !== 4) return identity
  // Newell zera numa "gravata" simétrica (os dois lobos se cancelam): aí a
  // orientação vem dos dois vizinhos do 1º ponto no ciclo.
  const [p0, p1, , p3] = points as [Vec3, Vec3, Vec3, Vec3]
  let normal = faceNormal(points)
  if (length(normal) < 1e-9) normal = normalize(cross(sub(p1, p0), sub(p3, p0)))
  if (length(normal) < 1e-9) return identity
  const center = faceCenter(points)
  const first = sub(points[0] as Vec3, center)
  if (length(first) < 1e-9) return identity
  const e1 = normalize(first)
  const e2 = cross(normal, e1)
  const flat = points.map((p): [number, number] => {
    const d = sub(p, center)
    return [dot(d, e1), dot(d, e2)]
  })
  const [f0, f1, f2, f3] = flat as [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ]
  if (!segmentsCross(f0, f1, f2, f3) && !segmentsCross(f1, f2, f3, f0)) return identity
  const angles = flat.map(([x, y], index) => {
    let angle = Math.atan2(y, x)
    if (index === 0) angle = 0
    if (angle < 0) angle += Math.PI * 2
    return { index, angle }
  })
  angles.sort((a, b) => a.angle - b.angle || a.index - b.index)
  return angles.map((entry) => entry.index)
}

function sortedKeys<T>(record: Record<string, T>): string[] {
  return Object.keys(record).sort()
}

/**
 * A forma CANÔNICA de uma malha: só vértices finitos, só faces de 3 ou 4 chaves
 * distintas que existem (a face quebrada cai SEM derrubar a malha), quads em
 * ciclo, vértice que nenhuma face usa cai, chaves em ordem. Idempotente.
 */
export function normalizeMesh(mesh: MoldaMesh): MoldaMesh {
  const vertices: Record<string, Vec3> = {}
  for (const key of sortedKeys(mesh.vertices)) {
    const v = mesh.vertices[key]
    if (v?.length !== 3 || !v.every((n) => Number.isFinite(n))) continue
    vertices[key] = [v[0], v[1], v[2]]
  }
  const faces: Record<MeshFaceKey, MeshFace> = {}
  const used = new Set<string>()
  for (const key of sortedKeys(mesh.faces) as MeshFaceKey[]) {
    const face = mesh.faces[key]
    if (!face || !Array.isArray(face.v)) continue
    const keys = face.v.filter((k, index, all) => k in vertices && all.indexOf(k) === index)
    if (keys.length < 3 || keys.length > 4 || keys.length !== face.v.length) continue
    const points = keys.map((k) => vertices[k] as Vec3)
    const order = orderQuad(points)
    const cycle = order.map((index) => keys[index] as string)
    // Face sem área (pontos colineares ou coincidentes depois do arredondamento) cai:
    // não desenha, não pinta, e ainda contaria no teto de triângulos. Depois do
    // `orderQuad`: a "gravata" tem área zero ANTES de ser desfeita.
    if (length(faceNormal(order.map((index) => points[index] as Vec3))) < 1e-9) continue
    faces[key] = { v: cycle }
    for (const k of cycle) used.add(k)
  }
  for (const key of Object.keys(vertices)) if (!used.has(key)) delete vertices[key]
  return { vertices, faces }
}

/** Cópia rasa dos dois mapas (ninguém muta um `Vec3` no lugar, mas a IDENTIDADE da malha importa). */
export function cloneMesh(mesh: MoldaMesh): MoldaMesh {
  const vertices: Record<string, Vec3> = {}
  for (const [key, v] of Object.entries(mesh.vertices)) vertices[key] = [v[0], v[1], v[2]]
  const faces: Record<MeshFaceKey, MeshFace> = {}
  for (const [key, face] of Object.entries(mesh.faces)) {
    faces[key as MeshFaceKey] = { v: [...face.v] }
  }
  return { vertices, faces }
}

export function translateMesh(mesh: MoldaMesh, delta: Vec3): MoldaMesh {
  const vertices: Record<string, Vec3> = {}
  for (const [key, v] of Object.entries(mesh.vertices)) vertices[key] = add(v, delta)
  return { vertices, faces: mesh.faces }
}

/** Reposiciona/escala os vértices para a caixa nova (a caixa antiga é `meshBox`). */
export function scaleMeshToBox(mesh: MoldaMesh, box: { from: Vec3; to: Vec3 }): MoldaMesh {
  const current = meshBox(mesh)
  if (!current) return mesh
  const vertices: Record<string, Vec3> = {}
  for (const [key, v] of Object.entries(mesh.vertices)) {
    const next: Vec3 = [0, 0, 0]
    for (let i = 0; i < 3; i += 1) {
      const oldSize = (current.to[i] as number) - (current.from[i] as number)
      const newSize = (box.to[i] as number) - (box.from[i] as number)
      const ratio = oldSize > 1e-9 ? ((v[i] as number) - (current.from[i] as number)) / oldSize : 0
      next[i] = (box.from[i] as number) + ratio * newSize
    }
    vertices[key] = next
  }
  return { vertices, faces: mesh.faces }
}

/** Arredonda os vértices à precisão dada (a do disco é `MOLDA_LIMITS.meshPrecision`). */
export function roundMesh(mesh: MoldaMesh, precision = MOLDA_LIMITS.meshPrecision): MoldaMesh {
  const vertices: Record<string, Vec3> = {}
  for (const [key, v] of Object.entries(mesh.vertices)) {
    vertices[key] = [
      Math.round(v[0] / precision) * precision,
      Math.round(v[1] / precision) * precision,
      Math.round(v[2] / precision) * precision,
    ]
  }
  return { vertices, faces: mesh.faces }
}

/**
 * O gêmeo do espelho: `x → -x` e cada ciclo INVERTIDO. Inverter mantém a face
 * CCW vista de fora depois do espelho e, começando pelo último ponto, a base da
 * pele do gêmeo é a da fonte com o `s` invertido, que é exatamente o que
 * `flipSkinH` (a pele espelhada que o gêmeo mostra) espera.
 */
export function mirrorMesh(mesh: MoldaMesh): MoldaMesh {
  const vertices: Record<string, Vec3> = {}
  for (const [key, v] of Object.entries(mesh.vertices)) vertices[key] = [-v[0], v[1], v[2]]
  const faces: Record<MeshFaceKey, MeshFace> = {}
  for (const [key, face] of Object.entries(mesh.faces)) {
    faces[key as MeshFaceKey] = { v: [...face.v].reverse() }
  }
  return { vertices, faces }
}

export function meshEquals(a: MoldaMesh | undefined, b: MoldaMesh | undefined): boolean {
  if (a === b) return true
  if (!a || !b) return false
  const va = Object.keys(a.vertices)
  const vb = Object.keys(b.vertices)
  if (va.length !== vb.length) return false
  for (const key of va) {
    const p = a.vertices[key]
    const q = b.vertices[key]
    if (!p || !q || p[0] !== q[0] || p[1] !== q[1] || p[2] !== q[2]) return false
  }
  const fa = Object.keys(a.faces) as MeshFaceKey[]
  const fb = Object.keys(b.faces)
  if (fa.length !== fb.length) return false
  for (const key of fa) {
    const p = a.faces[key]
    const q = b.faces[key]
    if (!p || !q || p.v.length !== q.v.length) return false
    for (let i = 0; i < p.v.length; i += 1) if (p.v[i] !== q.v[i]) return false
  }
  return true
}

export type MeshIssue =
  | { kind: 'overlap'; vertices: [string, string] }
  | { kind: 'non-planar'; face: MeshFaceKey }
  | { kind: 'concave'; face: MeshFaceKey }
  | { kind: 'flipped'; face: MeshFaceKey }

const OVERLAP_EPS = 1e-6
const PLANAR_EPS = 0.05

export type MeshFaceGeometryIssue = 'degenerate' | 'non-planar' | 'concave'

/**
 * Problema da forma de UMA face. Ferramentas que exigem uma superfície reta e
 * convexa usam a mesma régua de `meshIssues`, sem percorrer a malha inteira.
 */
export function faceGeometryIssue(
  mesh: MoldaMesh,
  face: MeshFaceKey,
): MeshFaceGeometryIssue | null {
  const points = faceVertices(mesh, face)
  if (!points || points.length < 3) return 'degenerate'
  const normal = faceNormal(points)
  if (length(normal) < 1e-9) return 'degenerate'
  if (points.length !== 4) return null
  const middle = faceCenter(points)
  const offPlane = Math.max(...points.map((point) => Math.abs(dot(sub(point, middle), normal))))
  if (offPlane > PLANAR_EPS) return 'non-planar'
  let sign = 0
  for (let i = 0; i < 4; i += 1) {
    const a = points[i] as Vec3
    const b = points[(i + 1) % 4] as Vec3
    const c = points[(i + 2) % 4] as Vec3
    const turn = dot(cross(sub(b, a), sub(c, b)), normal)
    if (Math.abs(turn) < 1e-9) return 'degenerate'
    if (sign === 0) sign = Math.sign(turn)
    else if (Math.sign(turn) !== sign) return 'concave'
  }
  return null
}

/**
 * O que pode dar errado numa malha editada à mão (consertar DEPOIS e avisar, em
 * vez de impedir): vértices sobrepostos, quad torto (fora do plano), quad côncavo
 * e face virada (percorre a aresta que divide com a vizinha no MESMO sentido dela;
 * regra local, sem depender do centro da malha).
 */
export function meshIssues(mesh: MoldaMesh): MeshIssue[] {
  const issues: MeshIssue[] = []
  const entries = Object.entries(mesh.vertices)
  for (let i = 0; i < entries.length; i += 1) {
    const [keyA, a] = entries[i] as [string, Vec3]
    for (let j = i + 1; j < entries.length; j += 1) {
      const [keyB, b] = entries[j] as [string, Vec3]
      if (length(sub(a, b)) <= OVERLAP_EPS) issues.push({ kind: 'overlap', vertices: [keyA, keyB] })
    }
  }
  // Quem percorre cada aresta, e em que sentido: numa malha coerente, duas vizinhas
  // percorrem a aresta que dividem em sentidos OPOSTOS.
  const traversals = new Map<string, Array<{ face: MeshFaceKey; forward: boolean }>>()
  const faces = Object.entries(mesh.faces) as Array<[MeshFaceKey, MeshFace]>
  for (const [key, face] of faces) {
    for (let i = 0; i < face.v.length; i += 1) {
      const a = face.v[i] as string
      const b = face.v[(i + 1) % face.v.length] as string
      const pair = a < b ? `${a} ${b}` : `${b} ${a}`
      const list = traversals.get(pair) ?? []
      list.push({ face: key, forward: a < b })
      traversals.set(pair, list)
    }
  }
  for (const [key, face] of faces) {
    const points = faceVertices(mesh, face)
    if (!points) continue
    const geometryIssue = faceGeometryIssue(mesh, key)
    if (geometryIssue === 'non-planar') issues.push({ kind: 'non-planar', face: key })
    else if (geometryIssue === 'concave') issues.push({ kind: 'concave', face: key })
    // Face virada: TODA aresta que ela divide com UMA vizinha (aresta de dobra, não
    // uma borda nem uma aba de três faces) é percorrida no mesmo sentido pelas duas.
    // A vizinha de uma face virada conflita numa aresta só, então não é apontada.
    // Regra LOCAL de propósito: a antiga, pelo centro da malha, acusava as faces
    // internas de um "L" ou de um "U" (normais corretas apontando para o centro).
    let shared = 0
    let conflicts = 0
    for (let i = 0; i < face.v.length; i += 1) {
      const a = face.v[i] as string
      const b = face.v[(i + 1) % face.v.length] as string
      const pair = a < b ? `${a} ${b}` : `${b} ${a}`
      const others = (traversals.get(pair) ?? []).filter((item) => item.face !== key)
      if (others.length !== 1) continue
      shared += 1
      if ((others[0] as { forward: boolean }).forward === a < b) conflicts += 1
    }
    if (shared > 0 && conflicts === shared) issues.push({ kind: 'flipped', face: key })
  }
  return issues
}

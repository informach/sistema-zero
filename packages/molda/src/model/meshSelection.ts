/**
 * A seleção dentro de uma malha é explícita e vive fora do asset. Guardar o
 * elemento escolhido evita a ambiguidade de reconstruir faces/arestas pela união
 * dos seus vértices (duas faces opostas de um cubo, por exemplo, cobrem os oito
 * vértices mas não significam que as outras quatro faces foram escolhidas).
 */
import type { MeshFaceKey, MoldaMesh, Vec3 } from '../core/model'
import { faceCenter, faceNormal, faceVertices, meshEdges } from './mesh'
import { add, length, normalize, scale } from './vec'

export type MeshEdge = [string, string]

export type MeshPick =
  | { kind: 'vertex'; key: string }
  | { kind: 'edge'; keys: MeshEdge }
  | { kind: 'face'; key: MeshFaceKey }

function canonicalPick(pick: MeshPick): MeshPick {
  if (pick.kind !== 'edge' || pick.keys[0] < pick.keys[1]) return pick
  return { kind: 'edge', keys: [pick.keys[1], pick.keys[0]] }
}

function pickKey(pick: MeshPick): string {
  if (pick.kind === 'edge') return `edge:${pick.keys[0]} ${pick.keys[1]}`
  return `${pick.kind}:${pick.key}`
}

/** Os vértices afetados por um elemento (somente os que existem). */
export function pickVertices(mesh: MoldaMesh, pick: MeshPick): string[] {
  switch (pick.kind) {
    case 'vertex':
      return pick.key in mesh.vertices ? [pick.key] : []
    case 'edge':
      return pick.keys.filter((key) => key in mesh.vertices)
    case 'face':
      return [...(mesh.faces[pick.key]?.v ?? [])].filter((key) => key in mesh.vertices)
  }
}

/** União dos vértices afetados pela seleção explícita. */
export function selectionVertices(mesh: MoldaMesh, selection: readonly MeshPick[]): string[] {
  return [...new Set(selection.flatMap((pick) => pickVertices(mesh, pick)))]
}

/**
 * Junta um toque à seleção. Sem "somar", a seleção vira exatamente o toque.
 * Com "somar", um segundo toque no mesmo elemento o remove. Seleções de modos
 * diferentes nunca são misturadas.
 */
export function mergeMeshSelection(
  current: readonly MeshPick[],
  picked: MeshPick | null,
  additive: boolean,
): MeshPick[] {
  if (!picked) return additive ? [...current] : []
  const canonical = canonicalPick(picked)
  if (!additive) return [canonical]
  const compatible = current.filter((item) => item.kind === canonical.kind).map(canonicalPick)
  const wanted = pickKey(canonical)
  const exists = compatible.some((item) => pickKey(item) === wanted)
  return exists ? compatible.filter((item) => pickKey(item) !== wanted) : [...compatible, canonical]
}

/** Só os elementos que ainda existem depois de uma operação/desfazer. */
export function pruneMeshSelection(mesh: MoldaMesh, selection: readonly MeshPick[]): MeshPick[] {
  let edges: Set<string> | null = null
  const seen = new Set<string>()
  const result: MeshPick[] = []
  for (const raw of selection) {
    const pick = canonicalPick(raw)
    let valid: boolean
    if (pick.kind === 'vertex') valid = pick.key in mesh.vertices
    else if (pick.kind === 'face') valid = pick.key in mesh.faces
    else {
      edges ??= new Set(meshEdges(mesh).map(([a, b]) => `${a} ${b}`))
      valid = edges.has(`${pick.keys[0]} ${pick.keys[1]}`)
    }
    const key = pickKey(pick)
    if (!valid || seen.has(key)) continue
    seen.add(key)
    result.push(pick)
  }
  return result
}

/** As arestas escolhidas, sem inferência pela seleção de vértices. */
export function selectedEdges(mesh: MoldaMesh, selection: readonly MeshPick[]): MeshEdge[] {
  return pruneMeshSelection(mesh, selection).flatMap((pick) =>
    pick.kind === 'edge' ? [pick.keys] : [],
  )
}

/** As faces escolhidas, sem inferência pela seleção de vértices. */
export function selectedFaces(mesh: MoldaMesh, selection: readonly MeshPick[]): MeshFaceKey[] {
  return pruneMeshSelection(mesh, selection).flatMap((pick) =>
    pick.kind === 'face' ? [pick.key] : [],
  )
}

/** O centro da seleção (onde a alça de mover fica); `null` sem vértice válido. */
export function selectionCenter(mesh: MoldaMesh, selection: readonly MeshPick[]): Vec3 | null {
  return verticesCenter(mesh, selectionVertices(mesh, selection))
}

/** Centro de uma lista já derivada de vértices (contrato interno do viewport). */
export function verticesCenter(mesh: MoldaMesh, vertices: readonly string[]): Vec3 | null {
  const points = vertices.flatMap((key) => {
    const point = mesh.vertices[key]
    return point ? [point] : []
  })
  return points.length > 0 ? faceCenter(points) : null
}

/**
 * Normal média das faces explicitamente escolhidas. Para arestas ou vértices,
 * usa as faces incidentes; `null` quando as normais se cancelam ou nada se aplica.
 */
export function selectionNormal(mesh: MoldaMesh, selection: readonly MeshPick[]): Vec3 | null {
  const explicitFaces = selectedFaces(mesh, selection)
  const explicitEdges = selectedEdges(mesh, selection)
  const vertices = new Set(selectionVertices(mesh, selection))
  const touching =
    explicitFaces.length > 0
      ? explicitFaces
      : explicitEdges.length > 0
        ? (Object.keys(mesh.faces) as MeshFaceKey[]).filter((key) => {
            const cycle = mesh.faces[key]?.v ?? []
            return explicitEdges.some(([a, b]) => {
              const at = cycle.indexOf(a)
              return (
                at >= 0 &&
                (cycle[(at + 1) % cycle.length] === b ||
                  cycle[(at + cycle.length - 1) % cycle.length] === b)
              )
            })
          })
        : (Object.keys(mesh.faces) as MeshFaceKey[]).filter((key) =>
            (mesh.faces[key]?.v ?? []).some((vertex) => vertices.has(vertex)),
          )
  let sum: Vec3 = [0, 0, 0]
  for (const key of touching) {
    const points = faceVertices(mesh, key)
    if (points) sum = add(sum, faceNormal(points))
  }
  if (length(sum) < 1e-9) return null
  return normalize(scale(sum, 1))
}

/**
 * A SELEÇÃO dentro de uma malha, pura e fora do asset (no `sessionStore`): os
 * VÉRTICES são a lista mestra; aresta selecionada = as duas pontas selecionadas;
 * face selecionada = todos os vértices dela selecionados. Um toque em Pontos,
 * Arestas ou Faces vira sempre uma lista de vértices (`pickVertices`), e as
 * ferramentas (mover, apagar, puxar) só precisam de UM caminho de transformação.
 */
import type { MeshFaceKey, MoldaMesh, Vec3 } from '../core/model'
import { faceCenter, faceNormal, faceVertices } from './mesh'
import { add, length, normalize, scale } from './vec'

export type MeshPick =
  | { kind: 'vertex'; key: string }
  | { kind: 'edge'; keys: [string, string] }
  | { kind: 'face'; key: MeshFaceKey }

/** Os vértices que um toque representa (só os que existem na malha). */
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

/**
 * Junta um toque à seleção. Sem "somar": a seleção vira o toque. Com "somar":
 * tocar algo já inteiramente selecionado o TIRA (o segundo toque desfaz o
 * primeiro), senão acrescenta. Vazio limpa (toque no nada).
 */
export function mergeMeshSelection(
  current: readonly string[],
  picked: readonly string[],
  additive: boolean,
): string[] {
  if (picked.length === 0) return additive ? [...current] : []
  if (!additive) return [...new Set(picked)]
  const set = new Set(current)
  const allSelected = picked.every((key) => set.has(key))
  if (allSelected) {
    for (const key of picked) set.delete(key)
  } else {
    for (const key of picked) set.add(key)
  }
  return [...set]
}

/** Só os vértices que ainda existem (uma operação pode ter apagado alguns). */
export function pruneMeshSelection(mesh: MoldaMesh, vertices: readonly string[]): string[] {
  return vertices.filter((key) => key in mesh.vertices)
}

export function selectedEdges(
  mesh: MoldaMesh,
  vertices: readonly string[],
): Array<[string, string]> {
  const set = new Set(vertices)
  const seen = new Set<string>()
  const edges: Array<[string, string]> = []
  for (const face of Object.values(mesh.faces)) {
    for (let i = 0; i < face.v.length; i += 1) {
      const a = face.v[i] as string
      const b = face.v[(i + 1) % face.v.length] as string
      if (!set.has(a) || !set.has(b)) continue
      const pair: [string, string] = a < b ? [a, b] : [b, a]
      const key = `${pair[0]} ${pair[1]}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push(pair)
    }
  }
  return edges
}

export function selectedFaces(mesh: MoldaMesh, vertices: readonly string[]): MeshFaceKey[] {
  const set = new Set(vertices)
  return (Object.keys(mesh.faces) as MeshFaceKey[]).filter((key) =>
    (mesh.faces[key]?.v ?? []).every((vertex) => set.has(vertex)),
  )
}

/** O centro da seleção (onde a alça de mover fica); `null` sem vértice válido. */
export function selectionCenter(mesh: MoldaMesh, vertices: readonly string[]): Vec3 | null {
  const points = vertices.flatMap((key) => {
    const v = mesh.vertices[key]
    return v ? [v] : []
  })
  return points.length > 0 ? faceCenter(points) : null
}

/**
 * A normal média das faces selecionadas (a alça alinha-se a ela); sem face
 * inteira selecionada, a média das normais das faces que TOCAM a seleção;
 * `null` quando nada se aplica (a alça fica no eixo do mundo).
 */
export function selectionNormal(mesh: MoldaMesh, vertices: readonly string[]): Vec3 | null {
  const whole = selectedFaces(mesh, vertices)
  const set = new Set(vertices)
  const touching =
    whole.length > 0
      ? whole
      : (Object.keys(mesh.faces) as MeshFaceKey[]).filter((key) =>
          (mesh.faces[key]?.v ?? []).some((vertex) => set.has(vertex)),
        )
  let sum: Vec3 = [0, 0, 0]
  for (const key of touching) {
    const points = faceVertices(mesh, key)
    if (points) sum = add(sum, faceNormal(points))
  }
  if (length(sum) < 1e-9) return null
  return normalize(scale(sum, 1))
}

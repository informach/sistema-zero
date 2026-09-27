/**
 * As OPERAÇÕES de edição de malha, puras (uma malha nova por chamada, nunca
 * mutação; `syncTwins` no fim, como em `partOps.ts`). Cada uma trabalha sobre
 * os elementos explicitamente selecionados e devolve o modelo
 * com a peça atualizada; `from`/`to` da peça acompanham a caixa dos vértices e as
 * peles cujas faces mudaram de tamanho são re-amostradas (a mesma régua do
 * `setPartBox`).
 */
import { MOLDA_LIMITS } from '../core/limits'
import type {
  FaceId,
  MeshFaceKey,
  MoldaMesh,
  MoldaModelAsset,
  MoldaPart,
  MoldaSkin,
  Vec3,
} from '../core/model'
import { isMeshFaceKey, meshBox, normalizeMesh, roundMesh } from './mesh'
import { type MeshPick, selectedEdges, selectedFaces } from './meshSelection'
import { faceSkinSize } from './shapes'
import { isSkinBlank, resampleSkin } from './skinOps'
import { reprojectSkin } from './skinReproject'
import { syncTwins } from './twins'

function findSourcePart(model: MoldaModelAsset, id: string): MoldaPart | null {
  const part = model.parts.find((item) => item.id === id)
  return part &&
    !part.mirrorOf &&
    !part.locked &&
    !part.hidden &&
    part.shape === 'mesh' &&
    part.mesh
    ? part
    : null
}

/**
 * Regrava a peça com a malha nova: caixa derivada, peles das faces que sumiram
 * descartadas e as demais re-amostradas para o tamanho novo das bases.
 */
export function withMesh(
  model: MoldaModelAsset,
  part: MoldaPart,
  mesh: MoldaMesh,
  /** Peles já decididas pela ferramenta (reprojetadas, espelhadas); ausente = as da peça. */
  skins: MoldaPart['faces'] = part.faces,
): MoldaModelAsset {
  const normalized = normalizeMesh(roundMesh(mesh))
  const box = meshBox(normalized)
  if (!box) return model
  const next: MoldaPart = { ...part, mesh: normalized, from: box.from, to: box.to }
  const faces: MoldaPart['faces'] = {}
  for (const [face, skin] of Object.entries(skins) as Array<[FaceId, MoldaPart['faces'][FaceId]]>) {
    if (!skin || !(face in normalized.faces)) continue
    const size = faceSkinSize(next, face, model.texelsPerUnit)
    if (!size) continue
    const resampled =
      skin.width === size.width && skin.height === size.height
        ? skin
        : resampleSkin(skin, size.width, size.height)
    if (!isSkinBlank(resampled)) faces[face] = resampled
  }
  next.faces = faces
  if (part.origin) {
    next.origin = [
      Math.min(Math.max(part.origin[0], box.from[0]), box.to[0]),
      Math.min(Math.max(part.origin[1], box.from[1]), box.to[1]),
      Math.min(Math.max(part.origin[2], box.from[2]), box.to[2]),
    ]
  }
  const parts = model.parts.map((item) => (item.id === part.id ? next : item))
  return syncTwins({ ...model, parts })
}

const GRID_MIN: Vec3 = [-MOLDA_LIMITS.gridHalf, 0, -MOLDA_LIMITS.gridHalf]
const GRID_MAX: Vec3 = [MOLDA_LIMITS.gridHalf, MOLDA_LIMITS.gridHeight, MOLDA_LIMITS.gridHalf]

/**
 * Arrasta os vértices escolhidos por um delta (coordenadas da CAIXA da peça),
 * arredondado ao encaixe e preso à grade e ao lado máximo da peça: a mesma régua
 * do mover a peça inteira (o delta encaixa, não a posição). Sem mudança devolve
 * o MESMO modelo (nada de entrada vazia no desfazer).
 */
export function moveMeshVertices(
  model: MoldaModelAsset,
  partId: string,
  vertices: readonly string[],
  delta: Vec3,
  snap: number,
): MoldaModelAsset {
  const part = findSourcePart(model, partId)
  if (!part?.mesh) return model
  const keys = vertices.filter((key) => key in (part.mesh as MoldaMesh).vertices)
  if (keys.length === 0) return model
  const step = snap > 0 ? snap : 1
  const snapped: Vec3 = [
    Math.round(delta[0] / step) * step,
    Math.round(delta[1] / step) * step,
    Math.round(delta[2] / step) * step,
  ]
  if (snapped.every((value) => value === 0)) return model
  const moved: Record<string, Vec3> = { ...part.mesh.vertices }
  for (const key of keys) {
    const v = part.mesh.vertices[key] as Vec3
    moved[key] = [v[0] + snapped[0], v[1] + snapped[1], v[2] + snapped[2]]
  }
  const nextMesh: MoldaMesh = { ...part.mesh, vertices: moved, faces: part.mesh.faces }
  const box = meshBox(nextMesh)
  if (!box) return model
  for (let i = 0; i < 3; i += 1) {
    const size = (box.to[i] as number) - (box.from[i] as number)
    if (size > MOLDA_LIMITS.maxPartSize) return model
    if ((box.from[i] as number) < (GRID_MIN[i] as number)) return model
    if ((box.to[i] as number) > (GRID_MAX[i] as number)) return model
  }
  // A pele das faces que mudaram de forma é REPROJETADA pelo ponto do mundo (o que
  // estava pintado fica onde estava). Re-amostrar por vizinho a cada commit, como o
  // `withMesh` faz por padrão, destruía um xadrez em dois toques de seta (ida e volta).
  const movedSet = new Set(keys)
  const skins: MoldaPart['faces'] = { ...part.faces }
  for (const [face, skin] of Object.entries(part.faces) as Array<[FaceId, MoldaSkin | undefined]>) {
    if (!skin || !isMeshFaceKey(face)) continue
    const cycle = part.mesh.faces[face]
    const movedCount = cycle ? cycle.v.filter((vertex) => movedSet.has(vertex)).length : 0
    // Face parada, ou face inteira que só transladou: a pele é a mesma (mesma referência).
    if (!cycle || movedCount === 0 || movedCount === cycle.v.length) continue
    const size = faceSkinSize({ ...part, mesh: nextMesh }, face, model.texelsPerUnit)
    const projected = size ? reprojectSkin(part.mesh, face, skin, nextMesh, face, size) : undefined
    if (projected) skins[face] = projected
    else delete skins[face]
  }
  return withMesh(model, part, nextMesh, skins)
}

export type DeleteMeshResult =
  | { kind: 'updated'; model: MoldaModelAsset }
  /** A malha ficaria sem face nem aresta de construção: quem chama apaga a peça. */
  | { kind: 'empty' }
  | { kind: 'unchanged' }

/**
 * Apaga a seleção. Pontos: os vértices e toda face que os usa. Arestas: as
 * faces que contêm alguma aresta de superfície selecionada; uma aresta de construção
 * apaga só a si mesma. Faces: as faces inteiramente selecionadas. Vértice órfão cai.
 */
export function deleteMeshSelection(
  model: MoldaModelAsset,
  partId: string,
  selection: readonly MeshPick[],
): DeleteMeshResult {
  const part = findSourcePart(model, partId)
  if (!part?.mesh) return { kind: 'unchanged' }
  const mesh = part.mesh
  const vertices = new Set(
    selection.flatMap((pick) =>
      pick.kind === 'vertex' && pick.key in mesh.vertices ? [pick.key] : [],
    ),
  )
  const edges = new Set(selectedEdges(mesh, selection).map(([a, b]) => `${a} ${b}`))
  const looseBefore = new Set(
    (mesh.looseEdges ?? []).map(([a, b]) => (a < b ? `${a} ${b}` : `${b} ${a}`)),
  )
  const faceKeys = new Set(selectedFaces(mesh, selection))
  if (vertices.size === 0 && edges.size === 0 && faceKeys.size === 0) {
    return { kind: 'unchanged' }
  }
  const faces: MoldaMesh['faces'] = {}
  for (const [key, face] of Object.entries(mesh.faces) as Array<
    [MeshFaceKey, MoldaMesh['faces'][MeshFaceKey]]
  >) {
    if (!face) continue
    let removed = faceKeys.has(key) || face.v.some((vertex) => vertices.has(vertex))
    if (!removed && edges.size > 0) {
      for (let i = 0; i < face.v.length && !removed; i += 1) {
        const a = face.v[i] as string
        const b = face.v[(i + 1) % face.v.length] as string
        const edge = a < b ? `${a} ${b}` : `${b} ${a}`
        if (edges.has(edge) && !looseBefore.has(edge)) removed = true
      }
    }
    if (!removed) faces[key] = face
  }
  const looseEdges = (mesh.looseEdges ?? []).filter(([a, b]) => {
    const key = a < b ? `${a} ${b}` : `${b} ${a}`
    return !vertices.has(a) && !vertices.has(b) && !edges.has(key)
  })
  const facesChanged = Object.keys(faces).length !== Object.keys(mesh.faces).length
  const looseChanged = looseEdges.length !== (mesh.looseEdges?.length ?? 0)
  if (!facesChanged && !looseChanged) return { kind: 'unchanged' }
  if (Object.keys(faces).length === 0 && looseEdges.length === 0) return { kind: 'empty' }
  const remaining: Record<string, Vec3> = {}
  for (const face of Object.values(faces)) {
    for (const key of face.v) {
      const v = mesh.vertices[key]
      if (v) remaining[key] = v
    }
  }
  for (const [a, b] of looseEdges) {
    const first = mesh.vertices[a]
    const second = mesh.vertices[b]
    if (first) remaining[a] = first
    if (second) remaining[b] = second
  }
  return {
    kind: 'updated',
    model: withMesh(model, part, { vertices: remaining, faces, looseEdges }),
  }
}

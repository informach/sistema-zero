/**
 * As OPERAÇÕES de edição de malha, puras (uma malha nova por chamada, nunca
 * mutação; `syncTwins` no fim, como em `partOps.ts`). Cada uma trabalha sobre
 * a lista de VÉRTICES selecionados (a lista mestra da seleção) e devolve o modelo
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
  Vec3,
} from '../core/model'
import { meshBox, normalizeMesh, roundMesh } from './mesh'
import { faceSkinSize } from './shapes'
import { isSkinBlank, resampleSkin } from './skinOps'
import { syncTwins } from './twins'

function findSourcePart(model: MoldaModelAsset, id: string): MoldaPart | null {
  const part = model.parts.find((item) => item.id === id)
  return part && !part.mirrorOf && part.shape === 'mesh' && part.mesh ? part : null
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
  const box = meshBox({ vertices: moved, faces: part.mesh.faces })
  if (!box) return model
  for (let i = 0; i < 3; i += 1) {
    const size = (box.to[i] as number) - (box.from[i] as number)
    if (size > MOLDA_LIMITS.maxPartSize) return model
    if ((box.from[i] as number) < (GRID_MIN[i] as number)) return model
    if ((box.to[i] as number) > (GRID_MAX[i] as number)) return model
  }
  return withMesh(model, part, { vertices: moved, faces: part.mesh.faces })
}

export type DeleteMeshResult =
  | { kind: 'updated'; model: MoldaModelAsset }
  /** A malha ficaria sem face nenhuma: quem chama decide apagar a peça. */
  | { kind: 'empty' }
  | { kind: 'unchanged' }

/**
 * Apaga a seleção. Pontos: os vértices e toda face que os usa. Arestas: as
 * faces que contêm alguma aresta selecionada (os vértices ficam se outra face os
 * usa). Faces: as faces inteiramente selecionadas. Vértice que fica sem face cai.
 */
export function deleteMeshSelection(
  model: MoldaModelAsset,
  partId: string,
  vertices: readonly string[],
  mode: 'vertex' | 'edge' | 'face',
): DeleteMeshResult {
  const part = findSourcePart(model, partId)
  if (!part?.mesh) return { kind: 'unchanged' }
  const mesh = part.mesh
  const set = new Set(vertices.filter((key) => key in mesh.vertices))
  if (set.size === 0) return { kind: 'unchanged' }
  const faces: MoldaMesh['faces'] = {}
  for (const [key, face] of Object.entries(mesh.faces) as Array<
    [MeshFaceKey, MoldaMesh['faces'][MeshFaceKey]]
  >) {
    if (!face) continue
    const selectedCount = face.v.filter((vertex) => set.has(vertex)).length
    let removed = false
    if (mode === 'vertex') removed = selectedCount > 0
    else if (mode === 'face') removed = selectedCount === face.v.length
    else {
      for (let i = 0; i < face.v.length && !removed; i += 1) {
        const a = face.v[i] as string
        const b = face.v[(i + 1) % face.v.length] as string
        if (set.has(a) && set.has(b)) removed = true
      }
    }
    if (!removed) faces[key] = face
  }
  if (Object.keys(faces).length === Object.keys(mesh.faces).length) return { kind: 'unchanged' }
  if (Object.keys(faces).length === 0) return { kind: 'empty' }
  const remaining: Record<string, Vec3> = {}
  for (const face of Object.values(faces)) {
    for (const key of face.v) {
      const v = mesh.vertices[key]
      if (v) remaining[key] = v
    }
  }
  return { kind: 'updated', model: withMesh(model, part, { vertices: remaining, faces }) }
}

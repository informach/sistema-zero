/**
 * A cor e o acabamento (Fosco, Brilhante, Metal) da PEÇA, e só dela.
 *
 * `patchSceneMaterial` muda o material, e o material pode ser dividido: pintar a porta de azul
 * pintaria de azul toda peça que usa o mesmo material. Aqui a mudança vale para todos os
 * materiais que a peça mostra (o dela e os das faces), e um material dividido é SEPARADO antes:
 * a cópia leva as mesmas imagens (nenhum pixel copiado) e só esta peça passa a apontar para ela.
 * Nada mudou = o mesmo documento, nenhum passo de desfazer.
 */
import { newId } from '../core/id'
import { resolvePaletteColors } from '../core/sanitize'
import { sceneAppearanceUsage } from './appearanceUsage'
import { allocateSceneId, finishSceneCommand } from './commandContext'
import type { MoldaSceneDocument, SceneGeometry, SceneMaterial } from './document'
import { readSceneMaterial } from './readDocument'
import * as v from './validation'

export interface ScenePieceAppearance {
  baseColor?: SceneMaterial['baseColor']
  roughness?: number
  metalness?: number
}

/** Os três acabamentos da criança; os números são os de sempre do painel de materiais. */
export const SCENE_FINISH_PRESETS = {
  matte: { roughness: 1, metalness: 0 },
  shiny: { roughness: 0.2, metalness: 0 },
  metal: { roughness: 0.35, metalness: 1 },
} as const satisfies Record<string, Required<Pick<ScenePieceAppearance, 'roughness' | 'metalness'>>>

export type SceneFinishPreset = keyof typeof SCENE_FINISH_PRESETS

/** O acabamento que o material mostra, quando é exatamente um dos três. */
export function sceneFinishOf(material: Pick<SceneMaterial, 'roughness' | 'metalness'>) {
  return (Object.keys(SCENE_FINISH_PRESETS) as SceneFinishPreset[]).find(
    (kind) =>
      SCENE_FINISH_PRESETS[kind].roughness === material.roughness &&
      SCENE_FINISH_PRESETS[kind].metalness === material.metalness,
  )
}

function sameAppearance(a: SceneMaterial, b: SceneMaterial) {
  const sameColor =
    a.baseColor.kind === 'palette'
      ? b.baseColor.kind === 'palette' && b.baseColor.index === a.baseColor.index
      : b.baseColor.kind === 'rgba' &&
        a.baseColor.value.every(
          (value, i) => b.baseColor.kind === 'rgba' && b.baseColor.value[i] === value,
        )
  return sameColor && a.roughness === b.roughness && a.metalness === b.metalness
}

function remapGeometry(geometry: SceneGeometry, forked: ReadonlyMap<string, SceneMaterial>) {
  const remap = <T extends { materialId?: string }>(face: T): T => {
    const copy = face.materialId === undefined ? undefined : forked.get(face.materialId)
    return copy ? { ...face, materialId: copy.id } : face
  }
  if (geometry.kind === 'mesh') {
    if (!Object.values(geometry.faces).some((face) => remap(face) !== face)) return geometry
    return {
      ...geometry,
      faces: Object.fromEntries(
        Object.entries(geometry.faces).map(([key, face]) => [key, remap(face)]),
      ),
    }
  }
  if (!Object.values(geometry.surfaces).some((face) => face && remap(face) !== face))
    return geometry
  return {
    ...geometry,
    surfaces: Object.fromEntries(
      Object.entries(geometry.surfaces).map(([key, face]) => [key, face && remap(face)]),
    ),
  }
}

export function patchScenePieceAppearance(
  document: MoldaSceneDocument,
  nodeId: string,
  patch: ScenePieceAppearance,
  nextId: () => string = newId,
): MoldaSceneDocument {
  v.record(patch, 'appearance', ['baseColor', 'roughness', 'metalness'])
  const usage = sceneAppearanceUsage(document)
  const node = usage.index.scene.nodes.get(nodeId)
  v.requireScene(node?.kind === 'mesh', 'node', 'Escolha uma peça.')
  v.requireScene(
    !usage.flags.get(nodeId)?.locked,
    `nodes.${nodeId}`,
    'Destrave a peça para fazer essa mudança.',
  )
  const paletteSize = resolvePaletteColors(document).length
  const allocate = allocateSceneId(document, nextId)
  const replaced = new Map<string, SceneMaterial>()
  const forked = new Map<string, SceneMaterial>()
  for (const id of usage.byNode.get(nodeId) ?? []) {
    const source = usage.index.materials.get(id)!
    const draft: SceneMaterial = { ...source }
    if (patch.baseColor !== undefined) draft.baseColor = patch.baseColor
    if (patch.roughness !== undefined) draft.roughness = patch.roughness
    if (patch.metalness !== undefined) draft.metalness = patch.metalness
    const next = readSceneMaterial(draft, 'material', paletteSize)
    if (sameAppearance(source, next)) continue
    const users = usage.materials.get(id) ?? []
    if (users.every((user) => user === nodeId)) replaced.set(id, next)
    else forked.set(id, { ...next, id: allocate() })
  }
  if (!replaced.size && !forked.size) return document
  let nodes = document.nodes
  let geometries = document.geometries
  if (forked.size) {
    const geometry = usage.index.geometries.get(node.geometryId)!
    let remapped = remapGeometry(geometry, forked)
    const shared =
      remapped !== geometry &&
      document.nodes.some(
        (other) => other.kind === 'mesh' && other.id !== nodeId && other.geometryId === geometry.id,
      )
    if (shared) remapped = { ...remapped, id: allocate() }
    nodes = document.nodes.map((other) =>
      other.id === nodeId
        ? {
            ...node,
            geometryId: remapped.id,
            materialId: forked.get(node.materialId)?.id ?? node.materialId,
          }
        : other,
    )
    if (remapped !== geometry)
      geometries = shared
        ? [...document.geometries, remapped]
        : document.geometries.map((entry) => (entry.id === geometry.id ? remapped : entry))
  }
  return finishSceneCommand({
    ...document,
    nodes,
    geometries,
    materials: [
      ...document.materials.map((material) => replaced.get(material.id) ?? material),
      ...forked.values(),
    ],
  })
}

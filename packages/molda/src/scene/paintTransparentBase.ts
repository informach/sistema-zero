import { newId } from '../core/id'
import { copySceneMaterialForNode, patchSceneMaterial } from './appearanceCommands'
import { sceneAppearanceUsage } from './appearanceUsage'
import type { MoldaSceneDocument } from './document'
import { resolveScenePaintTarget, type ScenePaintTarget } from './imagePaint'
import { SCENE_MATERIAL_IMAGE_KEYS } from './materialImages'
import { patchScenePieceAppearance } from './pieceAppearance'
import { requireScene } from './validation'

/** Give the selected piece a genuinely transparent backing while retaining editable paint. */
export function makeScenePaintBaseTransparent(
  document: MoldaSceneDocument,
  target: ScenePaintTarget,
  nextId: () => string = newId,
): { document: MoldaSceneDocument; target: ScenePaintTarget } {
  const resolved = resolveScenePaintTarget(document, target)
  requireScene(
    resolved.imageKind === 'color',
    'paint',
    'Escolha a pintura de cor para deixar a base transparente.',
  )
  const initial = sceneAppearanceUsage(document)
  const materialIds = [...(initial.byNode.get(target.nodeId) ?? [])]
  const transparent = materialIds.every((id) => {
    const material = initial.index.materials.get(id)!
    return (
      material.baseColor.kind === 'rgba' && material.baseColor.value[3] === 0 && !material.alphaMask
    )
  })
  if (transparent) return { document, target }

  let next = document
  let nextTarget = target
  for (const originalId of materialIds) {
    const usage = sceneAppearanceUsage(next)
    const material = usage.index.materials.get(originalId)!
    const sharedMaterial = (usage.materials.get(originalId) ?? []).some(
      (nodeId) => nodeId !== target.nodeId,
    )
    const sharedImage = SCENE_MATERIAL_IMAGE_KEYS.some((field) => {
      const imageId = material[field]
      return (
        imageId !== undefined &&
        next.materials.some(
          (other) =>
            other.id !== originalId &&
            SCENE_MATERIAL_IMAGE_KEYS.some((otherField) => other[otherField] === imageId),
        )
      )
    })
    if (!sharedMaterial && !sharedImage) continue
    next = copySceneMaterialForNode(next, target.nodeId, originalId, nextId)
    if (originalId === nextTarget.materialId) {
      const copied = next.materials.at(-1)!
      nextTarget = {
        ...nextTarget,
        materialId: copied.id,
        imageId: copied.colorImageId!,
      }
    }
  }
  next = patchScenePieceAppearance(
    next,
    target.nodeId,
    { baseColor: { kind: 'rgba', value: [0, 0, 0, 0] } },
    nextId,
  )
  for (const id of sceneAppearanceUsage(next).byNode.get(target.nodeId) ?? []) {
    if (next.materials.find((material) => material.id === id)?.alphaMask)
      next = patchSceneMaterial(next, id, { alphaMask: null })
  }
  resolveScenePaintTarget(next, nextTarget)
  return { document: next, target: nextTarget }
}

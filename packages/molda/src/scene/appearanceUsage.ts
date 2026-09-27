import type { MoldaSceneDocument, SceneGeometry } from './document'
import { indexSceneDocument } from './documentIndex'
import { evaluateSceneNodeFlags } from './evaluate'
import { sceneMaterialImageIds } from './materialImages'
import { requireScene } from './validation'

export function geometryMaterialIds(geometry: SceneGeometry): Set<string> {
  const bindings =
    geometry.kind === 'mesh' ? Object.values(geometry.faces) : Object.values(geometry.surfaces)
  return new Set(
    bindings.flatMap((face) => (face.materialId === undefined ? [] : [face.materialId])),
  )
}

/** Linear cross-resource reachability. Hidden and locked users still own shared paint. */
export function sceneAppearanceUsage(document: MoldaSceneDocument) {
  const index = indexSceneDocument(document)
  const flags = evaluateSceneNodeFlags(index.scene)
  const byGeometry = new Map([...index.geometries].map(([id, g]) => [id, geometryMaterialIds(g)]))
  const byNode = new Map<string, Set<string>>()
  const materials = new Map<string, string[]>()
  const images = new Map<string, Set<string>>()
  for (const node of document.nodes) {
    if (node.kind !== 'mesh') continue
    const used = new Set([node.materialId, ...(byGeometry.get(node.geometryId) ?? [])])
    byNode.set(node.id, used)
    for (const id of used) {
      const users = materials.get(id) ?? []
      users.push(node.id)
      materials.set(id, users)
      for (const image of sceneMaterialImageIds(index.materials.get(id)!)) {
        const users = images.get(image) ?? new Set<string>()
        users.add(node.id)
        images.set(image, users)
      }
    }
  }
  return { index, flags, byNode, materials, images }
}

export function requireEditableAppearance(
  usage: ReturnType<typeof sceneAppearanceUsage>,
  nodes: Iterable<string>,
) {
  for (const id of nodes)
    requireScene(
      !usage.flags.get(id)?.locked,
      'paint',
      'Essa pintura também pertence a uma peça travada. Faça uma cópia só para esta peça antes de editar.',
    )
}

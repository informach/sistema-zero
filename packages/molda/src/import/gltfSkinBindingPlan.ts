import { indexSceneNodes } from '../scene/graph'
import { affineInverse } from '../scene/matrix'
import { SCENE_SKIN_LIMITS } from '../scene/skin'
import type { GltfDocument } from './gltfDocument'
import type { GltfGeometrySource } from './gltfGeometries'
import type { GltfHierarchy } from './gltfHierarchy'
import { GltfInputError, requireGltf } from './gltfInput'
import type { GltfSelection } from './gltfSelection'

export interface GltfSkinBindingPlan {
  node: number
  nodeId: string
  skin: number
  primitives: Array<{ vertexIds: readonly string[]; layout: number }>
}

/** Sources/maps are from the same immutable conversion. Count output by binding, not unique mesh. */
export function planGltfSkinBindings(
  source: GltfDocument,
  selection: GltfSelection,
  hierarchy: GltfHierarchy,
  geometrySources: readonly GltfGeometrySource[],
) {
  const nodes = new Map(hierarchy.nodes.map((node) => [node.id, node])),
    geometries = new Map(geometrySources.map((geometry) => [geometry.geometryId, geometry])),
    bindings: GltfSkinBindingPlan[] = [],
    layouts = new Map<number, string>()
  requireGltf(
    geometries.size === geometrySources.length,
    'geometries',
    'Mapas de origem repetidos.',
  )
  let vertices = 0
  for (const instance of selection.instances) {
    if (instance.skin === null) continue
    const path = `nodes[${instance.node}].skin`,
      skin = source.skins[instance.skin]!,
      nodeId = hierarchy.meshNodeIds.get(instance.node),
      node = nodeId === undefined ? undefined : nodes.get(nodeId),
      geometry = node?.kind === 'mesh' ? geometries.get(node.geometryId) : undefined
    requireGltf(
      nodeId !== undefined && geometry?.meshIndex === instance.mesh,
      path,
      'A forma nativa não corresponde ao mapa de origem do vínculo.',
    )
    if (
      bindings.length === SCENE_SKIN_LIMITS.bindings ||
      skin.joints.length > SCENE_SKIN_LIMITS.joints
    )
      throw new GltfInputError(
        'budget',
        path,
        'Há vínculos ou juntas demais para o esqueleto nativo.',
      )
    const primitiveLayouts = source.skinWeights.meshes.get(instance.mesh)!
    requireGltf(
      geometry.primitives.length === primitiveLayouts.length,
      path,
      'O mapa das primitives não corresponde ao vínculo.',
    )
    const primitives: GltfSkinBindingPlan['primitives'] = []
    let count = 0
    geometry.primitives.forEach(({ vertexIds }, primitive) => {
      if (!vertexIds.length) return // Already reported as missing-position by geometry conversion.
      const layoutIndex = primitiveLayouts[primitive]!,
        layout = source.skinWeights.layouts[layoutIndex]!
      requireGltf(
        layout.vertices === vertexIds.length,
        path,
        'O mapa de vértices não corresponde aos pesos.',
      )
      count += vertexIds.length
      if (!layouts.has(layoutIndex))
        layouts.set(layoutIndex, `meshes[${instance.mesh}].primitives[${primitive}].attributes`)
      primitives.push({ vertexIds, layout: layoutIndex })
    })
    if (!count)
      throw new GltfInputError('unsupported', path, 'O vínculo não contém pontos editáveis.')
    vertices += count
    if (vertices > SCENE_SKIN_LIMITS.weightedVertices)
      throw new GltfInputError(
        'budget',
        path,
        'Os pontos vinculados ultrapassam o orçamento do Molda.',
      )
    bindings.push({ node: instance.node, nodeId, skin: instance.skin, primitives })
  }
  for (const [index, path] of layouts) {
    const layout = source.skinWeights.layouts[index]!
    if (layout.maximumInfluences > SCENE_SKIN_LIMITS.influences || layout.unweightedVertices)
      throw new GltfInputError(
        'unsupported',
        path,
        'Cada ponto precisa de uma a quatro influências positivas; nenhum osso será removido ou inventado.',
      )
  }
  // The native palette cancels meshWorld. Keep the original hierarchy, but require its inverse.
  const scene = indexSceneNodes(hierarchy.nodes)
  for (const binding of bindings) {
    if (!affineInverse(scene.worldMatrices.get(binding.nodeId)!))
      throw new GltfInputError(
        'unsupported',
        `nodes[${binding.node}].skin`,
        'A transformação da peça não permite calcular a pele com segurança.',
      )
    for (const joint of source.skins[binding.skin]!.joints) {
      const id = hierarchy.nodeIds.get(joint),
        node = id === undefined ? undefined : scene.nodes.get(id)
      requireGltf(
        node !== undefined && node.kind !== 'mesh',
        `skins[${binding.skin}].joints`,
        'O vínculo precisa dos apoios nativos corretos.',
      )
    }
  }
  return { bindings, layouts }
}

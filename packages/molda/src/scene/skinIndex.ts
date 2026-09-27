import type { ModelSceneNode, SceneGeometry } from './document'
import type { SceneIndex } from './graph'
import { affineInverse } from './matrix'
import { SCENE_SKIN_LIMITS, type SceneSkinBinding } from './skin'
import { requireScene, uniqueById } from './validation'

/** Typed command index: references/costs only, no repeated matrix/weight-value parsing or copies. */
export function indexSceneSkins(
  bindings: readonly SceneSkinBinding[],
  scene: SceneIndex<ModelSceneNode>,
  geometries: ReadonlyMap<string, SceneGeometry>,
) {
  const skins = uniqueById(bindings, 'skins'),
    skinsByNode = new Map<string, SceneSkinBinding>(),
    skinJointNodes = new Set<string>()
  requireScene(
    skins.size <= SCENE_SKIN_LIMITS.bindings,
    'skins',
    'Há vínculos demais nesta criação.',
  )
  let skinVertexCount = 0
  for (const skin of skins.values()) {
    const path = `skins.${skin.id}`,
      node = scene.nodes.get(skin.nodeId),
      geometry = node?.kind === 'mesh' ? geometries.get(node.geometryId) : undefined
    requireScene(
      geometry?.kind === 'mesh',
      path,
      'O vínculo precisa de uma malha com pontos editáveis.',
    )
    requireScene(!skinsByNode.has(skin.nodeId), path, 'Esta peça já tem um vínculo de esqueleto.')
    requireScene(
      affineInverse(scene.worldMatrices.get(skin.nodeId)!),
      path,
      'A pose da peça vinculada não pode ser invertida com segurança.',
    )
    skinsByNode.set(skin.nodeId, skin)
    const joints = new Set<string>()
    requireScene(
      skin.joints.length > 0 && skin.joints.length <= SCENE_SKIN_LIMITS.joints,
      path,
      'Ossos fora do orçamento.',
    )
    for (const joint of skin.joints) {
      const target = scene.nodes.get(joint.nodeId)
      requireScene(
        target && target.kind !== 'mesh',
        path,
        'Osso ausente ou de tipo incompatível. Desvincule a peça antes de remover seu osso.',
      )
      requireScene(!joints.has(joint.nodeId), path, 'Osso repetido no vínculo.')
      joints.add(joint.nodeId)
      skinJointNodes.add(joint.nodeId)
    }
    const vertices = Object.keys(skin.weights)
    skinVertexCount += vertices.length
    requireScene(
      skinVertexCount <= SCENE_SKIN_LIMITS.weightedVertices,
      path,
      'Os pontos vinculados ultrapassam o orçamento da criação.',
    )
    const geometryVertices = Object.keys(geometry.vertices)
    requireScene(
      vertices.length > 0 && vertices.length === geometryVertices.length,
      path,
      'Cada ponto da malha precisa de pesos. Desvincule a peça antes de mudar sua topologia.',
    )
    const aligned = vertices.every((id, i) => id === geometryVertices[i]),
      rows = Object.values(skin.weights)
    for (let i = 0; i < vertices.length; i++) {
      const vertexId = vertices[i]!
      requireScene(
        aligned || Object.hasOwn(geometry.vertices, vertexId),
        path,
        'Os pesos apontam para um ponto ausente.',
      )
      const influences = rows[i]!
      requireScene(
        influences.length > 0 && influences.length <= SCENE_SKIN_LIMITS.influences,
        path,
        'Influências fora do orçamento.',
      )
      for (const influence of influences)
        requireScene(
          joints.has(influence.jointId),
          path,
          'Os pesos apontam para um osso fora do vínculo.',
        )
    }
  }
  return { skins, skinsByNode, skinJointNodes, skinVertexCount }
}

import type { Vec3 } from '../core/model'
import type { MoldaSceneDocument } from './document'
import { indexSceneDocument } from './documentIndex'
import { evaluateSceneNodeFlags } from './evaluate'
import { affineInverse, transformPoint } from './matrix'
import { SCENE_SKIN_LIMITS, type SceneSkinInfluence } from './skin'
import * as v from './validation'

export interface SceneSkinSuggestionInput {
  nodeId: string
  jointIds: readonly string[]
  method: 'segments' | 'rigid'
}

/** Private owned task data: no images, faces, clips or live document references. */
export interface PreparedSceneSkinSuggestion {
  nodeId: string
  method: SceneSkinSuggestionInput['method']
  vertexIds: readonly string[]
  positions: Float64Array
  joints: ReadonlyArray<{ nodeId: string; parentId: string | null; position: Vec3 }>
}

export function prepareSceneSkinSuggestion(
  document: MoldaSceneDocument,
  input: SceneSkinSuggestionInput,
): PreparedSceneSkinSuggestion {
  v.record(input, 'suggestion', ['nodeId', 'jointIds', 'method'])
  const nodeId = v.id(input.nodeId, 'nodeId'),
    method = v.choice(input.method, ['segments', 'rigid'], 'method'),
    jointIds = v
      .list(input.jointIds, 'jointIds', SCENE_SKIN_LIMITS.joints)
      .map((id) => v.id(id, 'jointId')),
    chosen = new Set(jointIds),
    index = indexSceneDocument(document),
    node = index.scene.nodes.get(nodeId),
    geometry = node?.kind === 'mesh' ? index.geometries.get(node.geometryId) : null
  v.requireScene(geometry?.kind === 'mesh', 'nodeId', 'Escolha uma malha com pontos editáveis.')
  v.requireScene(
    !index.skinsByNode.has(nodeId),
    'nodeId',
    'Esta peça já tem pesos. Desvincule antes de criar outra sugestão.',
  )
  v.requireScene(
    !evaluateSceneNodeFlags(index.scene).get(nodeId)?.locked,
    'nodeId',
    'Destrave a peça para preparar seu vínculo.',
  )
  v.requireScene(
    chosen.size > 0 && chosen.size === jointIds.length,
    'jointIds',
    'Escolha ossos sem repetições.',
  )
  const world = index.scene.worldMatrices.get(nodeId)!
  v.requireScene(
    affineInverse(world),
    'nodeId',
    'A pose da peça não pode ser vinculada com segurança.',
  )
  const vertexIds = Object.keys(geometry.vertices)
  v.requireScene(
    vertexIds.length > 0 &&
      vertexIds.length + index.skinVertexCount <= SCENE_SKIN_LIMITS.weightedVertices &&
      index.skins.size < SCENE_SKIN_LIMITS.bindings,
    'vertices',
    'Os pontos vinculados ultrapassam o orçamento ou a malha está vazia.',
  )
  // ASCII IDs define ties, independent of checkbox order or the host locale.
  const joints = jointIds.sort().map((nodeId) => {
    const node = index.scene.nodes.get(nodeId),
      world = index.scene.worldMatrices.get(nodeId)
    v.requireScene(
      node && node.kind !== 'mesh' && world && affineInverse(world),
      'jointIds',
      'Escolha grupos ou pontos de apoio com poses que possam ser vinculadas.',
    )
    let parentId = node.parentId
    while (parentId !== null && !chosen.has(parentId))
      parentId = index.scene.nodes.get(parentId)!.parentId
    return { nodeId, parentId, position: transformPoint(world, [0, 0, 0]) }
  })
  const positions = new Float64Array(vertexIds.length * 3)
  for (const [i, id] of vertexIds.entries())
    positions.set(transformPoint(world, geometry.vertices[id]!), i * 3)
  v.requireScene(
    positions.every(Number.isFinite),
    'positions',
    'A posição dos pontos excede a precisão da sugestão.',
  )
  return { nodeId, method, vertexIds, positions, joints }
}

/** Nearest selected joint (rigid), or nearest selected parent-child segment with linear endpoint weights.
 * This is a geometric starting point, not anatomical/heat binding or a replacement for weight editing.
 * Every calculation is Double. Never run the bounded V×J search in a render loop.
 */
export function suggestSceneSkinWeights(prepared: PreparedSceneSkinSuggestion) {
  const { vertexIds, positions, joints, method } = prepared,
    byId = new Map(joints.map((joint) => [joint.nodeId, joint]))
  const segments =
    method === 'rigid'
      ? []
      : joints.flatMap((joint) => {
          const parent = joint.parentId === null ? undefined : byId.get(joint.parentId)
          if (!parent) return []
          const delta = joint.position.map((value, i) => value - parent.position[i]!) as Vec3,
            length = Math.hypot(...delta)
          v.requireScene(
            Number.isFinite(length),
            'joints',
            'A distância entre esses ossos excede a precisão da sugestão.',
          )
          return length === 0
            ? []
            : [
                {
                  from: parent,
                  to: joint,
                  length,
                  direction: delta.map((value) => value / length) as Vec3,
                },
              ]
        })
  let maximumInfluences = 0
  const weights = Object.fromEntries(
    vertexIds.map((vertexId, vertex) => {
      const x = positions[vertex * 3]!,
        y = positions[vertex * 3 + 1]!,
        z = positions[vertex * 3 + 2]!
      let distance = Infinity,
        fromId: string | undefined,
        toId: string | undefined,
        blend = 0
      for (const joint of joints) {
        const next = Math.hypot(x - joint.position[0], y - joint.position[1], z - joint.position[2])
        v.requireScene(
          Number.isFinite(next),
          'positions',
          'A distância dos pontos excede a precisão da sugestão.',
        )
        if (next < distance) {
          distance = next
          fromId = joint.nodeId
        }
      }
      for (const segment of segments) {
        const ox = x - segment.from.position[0],
          oy = y - segment.from.position[1],
          oz = z - segment.from.position[2],
          projection =
            ox * segment.direction[0] + oy * segment.direction[1] + oz * segment.direction[2]
        v.requireScene(
          Number.isFinite(projection),
          'positions',
          'A projeção dos pontos excede a precisão da sugestão.',
        )
        const t = Math.max(0, Math.min(1, projection / segment.length)),
          along = t * segment.length,
          next = Math.hypot(
            ox - segment.direction[0] * along,
            oy - segment.direction[1] * along,
            oz - segment.direction[2] * along,
          )
        v.requireScene(
          Number.isFinite(next),
          'positions',
          'A distância dos pontos excede a precisão da sugestão.',
        )
        if (next < distance) {
          distance = next
          fromId = segment.from.nodeId
          toId = segment.to.nodeId
          blend = t
        }
      }
      v.requireScene(fromId !== undefined, 'weights', 'Não há ossos disponíveis para esses pontos.')
      const influences: SceneSkinInfluence[] = [
        ...(blend < 1 ? [{ jointId: fromId, weight: 1 - blend }] : []),
        ...(toId !== undefined && blend > 0 ? [{ jointId: toId, weight: blend }] : []),
      ]
      v.requireScene(
        influences.every((influence) => Math.fround(influence.weight) > 0),
        'weights',
        'A sugestão gerou uma força pequena demais para o desenho. Experimente o vínculo rígido ou ajuste os ossos.',
      )
      maximumInfluences = Math.max(maximumInfluences, influences.length)
      return [vertexId, influences]
    }),
  )
  return {
    weights,
    stats: {
      vertices: vertexIds.length,
      joints: joints.length,
      segments: segments.length,
      maximumInfluences,
    },
  }
}

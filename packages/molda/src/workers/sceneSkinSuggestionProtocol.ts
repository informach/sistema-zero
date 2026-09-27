import type { Vec3 } from '../core/model'
import {
  SCENE_SKIN_LIMITS,
  SCENE_SKIN_WEIGHT_TOLERANCE,
  type SceneSkinInfluence,
} from '../scene/skin'
import type { PreparedSceneSkinSuggestion, suggestSceneSkinWeights } from '../scene/skinSuggestion'
import * as v from '../scene/validation'
import type { TaskReply } from './workerTask'

export interface SceneSkinSuggestionRequest {
  /** Includes document, node, revision and chosen-joint/method ownership. Never a persisted field. */
  sourceKey: string
  data: PreparedSceneSkinSuggestion
}
export type SceneSkinSuggestionResult = ReturnType<typeof suggestSceneSkinWeights>

export function readSceneSkinSuggestionRequest(raw: unknown): SceneSkinSuggestionRequest {
  const row = v.record(raw, 'request', ['sourceKey', 'data']),
    sourceKey = v.text(row.sourceKey, 'sourceKey', 512),
    data = v.record(row.data, 'data', ['nodeId', 'method', 'vertexIds', 'positions', 'joints']),
    nodeId = v.id(data.nodeId, 'nodeId'),
    method = v.choice(data.method, ['segments', 'rigid'], 'method'),
    vertexIds = v
      .list(data.vertexIds, 'vertexIds', SCENE_SKIN_LIMITS.weightedVertices)
      .map((id) => v.id(id, 'vertexId')),
    positions = data.positions
  v.requireScene(
    vertexIds.length > 0 && new Set(vertexIds).size === vertexIds.length,
    'vertices',
    'Pontos ausentes ou repetidos.',
  )
  v.requireScene(
    positions instanceof Float64Array &&
      positions.constructor === Float64Array &&
      positions.buffer instanceof ArrayBuffer &&
      positions.byteOffset === 0 &&
      positions.byteLength === positions.buffer.byteLength &&
      positions.length === vertexIds.length * 3 &&
      positions.every(Number.isFinite),
    'positions',
    'Posições incompletas ou sem precisão suficiente.',
  )
  const joints = v.list(data.joints, 'joints', SCENE_SKIN_LIMITS.joints).map((raw) => {
    const joint = v.record(raw, 'joint', ['nodeId', 'parentId', 'position'])
    return {
      nodeId: v.id(joint.nodeId, 'jointId'),
      parentId: joint.parentId === null ? null : v.id(joint.parentId, 'parentId'),
      position: v.tuple(joint.position, 3, 'position') as Vec3,
    }
  })
  v.requireScene(
    joints.length > 0 &&
      joints.every(
        (joint, i) => joint.nodeId !== nodeId && (i === 0 || joints[i - 1]!.nodeId < joint.nodeId),
      ),
    'joints',
    'Ossos precisam de identidades únicas e ordem estável.',
  )
  const byId = new Map(joints.map((joint) => [joint.nodeId, joint])),
    finished = new Set<string>()
  for (const joint of joints) {
    let current: string | null = joint.nodeId
    const path = new Set<string>()
    while (current !== null && !finished.has(current)) {
      const next = byId.get(current)
      v.requireScene(
        next && !path.has(current),
        'joints',
        'A ligação entre os ossos está incompleta ou em ciclo.',
      )
      path.add(current)
      current = next.parentId
    }
    for (const id of path) finished.add(id)
  }
  return { sourceKey, data: { nodeId, method, vertexIds, positions: positions.slice(), joints } }
}

/** Only derived two-slot weights/indices return from the worker; no scene data is transferred. */
export function sceneSkinSuggestionReply(
  request: SceneSkinSuggestionRequest,
  result: SceneSkinSuggestionResult,
) {
  v.requireScene(
    Object.keys(result.weights).length === request.data.vertexIds.length,
    'weights',
    'A sugestão não contém exatamente os pontos pedidos.',
  )
  const slots = request.data.vertexIds.length * 2,
    indices = new Uint16Array(slots),
    weights = new Float64Array(slots),
    jointIndex = new Map(request.data.joints.map((joint, i) => [joint.nodeId, i]))
  for (const [vertex, id] of request.data.vertexIds.entries()) {
    v.requireScene(
      Object.hasOwn(result.weights, id) &&
        result.weights[id]!.length > 0 &&
        result.weights[id]!.length <= 2,
      'weights',
      'Influências da sugestão inválidas.',
    )
    for (const [slot, influence] of result.weights[id]!.entries()) {
      const index = jointIndex.get(influence.jointId)
      v.requireScene(
        index !== undefined,
        'weights',
        'A sugestão aponta para um osso não escolhido.',
      )
      indices[vertex * 2 + slot] = index
      weights[vertex * 2 + slot] = influence.weight
    }
  }
  return {
    type: 'result' as const,
    sourceKey: request.sourceKey,
    nodeId: request.data.nodeId,
    indices,
    weights,
    segments: result.stats.segments,
  }
}

export function readSceneSkinSuggestionReply(
  raw: unknown,
  expected: SceneSkinSuggestionRequest,
): TaskReply<SceneSkinSuggestionResult, never> {
  const row = v.record(raw, 'reply'),
    type = v.choice(row.type, ['result', 'error'], 'type')
  v.requireScene(
    row.sourceKey === expected.sourceKey && row.nodeId === expected.data.nodeId,
    'reply',
    'Essa sugestão pertence a outra peça ou revisão.',
  )
  if (type === 'error') {
    v.record(row, 'reply', ['type', 'sourceKey', 'nodeId', 'message'])
    return { type, message: v.text(row.message, 'message', 512) }
  }
  v.record(row, 'reply', ['type', 'sourceKey', 'nodeId', 'indices', 'weights', 'segments'])
  const { indices, weights } = row,
    slots = expected.data.vertexIds.length * 2
  v.requireScene(
    indices instanceof Uint16Array &&
      indices.constructor === Uint16Array &&
      indices.buffer instanceof ArrayBuffer &&
      indices.byteOffset === 0 &&
      indices.byteLength === indices.buffer.byteLength &&
      indices.length === slots,
    'indices',
    'Índices de ossos incompletos.',
  )
  v.requireScene(
    weights instanceof Float64Array &&
      weights.constructor === Float64Array &&
      weights.buffer instanceof ArrayBuffer &&
      weights.byteOffset === 0 &&
      weights.byteLength === weights.buffer.byteLength &&
      weights.length === slots,
    'weights',
    'Pesos incompletos ou sem precisão suficiente.',
  )
  const byId = new Map(expected.data.joints.map((joint) => [joint.nodeId, joint])),
    segments =
      expected.data.method === 'rigid'
        ? 0
        : expected.data.joints.filter((joint) => {
            const parent = joint.parentId === null ? undefined : byId.get(joint.parentId)
            return parent && joint.position.some((value, i) => value !== parent.position[i])
          }).length
  v.requireScene(
    row.segments === segments,
    'segments',
    'O custo da sugestão não corresponde aos ossos escolhidos.',
  )
  let maximumInfluences = 0
  const result = Object.fromEntries(
    expected.data.vertexIds.map((id, vertex) => {
      const first = vertex * 2,
        second = first + 1,
        influences: SceneSkinInfluence[] = []
      v.requireScene(weights[first]! > 0, 'weights', 'Cada ponto precisa de uma força positiva.')
      for (const slot of [first, second]) {
        const weight = v.number(weights[slot], 'weight', 0, 1),
          joint = expected.data.joints[indices[slot]!]
        v.requireScene(
          joint && (weight > 0 || indices[slot] === 0),
          'indices',
          'Osso ausente ou espaço vazio inválido.',
        )
        if (weight === 0) continue
        v.requireScene(
          Math.fround(weight) > 0,
          'weights',
          'Um peso perderia seu osso na precisão de desenho.',
        )
        influences.push({ jointId: joint.nodeId, weight })
      }
      v.requireScene(
        expected.data.method !== 'rigid' || influences.length === 1,
        'weights',
        'O vínculo rígido precisa de um único osso por ponto.',
      )
      maximumInfluences = Math.max(maximumInfluences, influences.length)
      // IDs belong to the strictly read request; rows are already owned and value-checked.
      // Do not reparse/clone every row with the general authoring reader.
      v.requireScene(
        influences.length === 1 || influences[0]!.jointId !== influences[1]!.jointId,
        `weights.${id}[1]`,
        'O mesmo osso aparece duas vezes neste ponto.',
      )
      let total = 0
      for (const influence of influences) total += influence.weight
      v.requireScene(
        Math.abs(total - 1) <= SCENE_SKIN_WEIGHT_TOLERANCE,
        `weights.${id}`,
        'Os pesos deste ponto precisam somar um.',
      )
      return [id, influences]
    }),
  )
  return {
    type,
    result: {
      weights: result,
      stats: {
        vertices: expected.data.vertexIds.length,
        joints: expected.data.joints.length,
        segments,
        maximumInfluences,
      },
    },
  }
}

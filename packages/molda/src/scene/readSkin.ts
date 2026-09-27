import { type AffineMatrix, affineInverse, composeTransform } from './matrix'
import { SCENE_SKIN_LIMITS, SCENE_SKIN_WEIGHT_TOLERANCE, type SceneSkinBinding } from './skin'
import { readSceneSkinInfluences } from './skinWeights'
import * as v from './validation'

export function readNormalizedSceneSkinInfluences(raw: unknown, path: string) {
  const influences = readSceneSkinInfluences(raw, path)
  let total = 0
  for (const influence of influences) {
    v.requireScene(
      influence.weight <= 1,
      path,
      'Normalizar os pesos deve ser uma escolha explícita.',
    )
    total += influence.weight
  }
  v.requireScene(
    Math.abs(total - 1) <= SCENE_SKIN_WEIGHT_TOLERANCE,
    path,
    'Os pesos deste ponto precisam somar um.',
  )
  return influences
}

/** Structure/value reader only. References are checked by skinIndex after the scene is indexed. */
export function readSceneSkins(raw: unknown): SceneSkinBinding[] {
  const rows = v.list(raw, 'skins', SCENE_SKIN_LIMITS.bindings)
  let weightedVertices = 0
  const skins = rows.map((raw, i): SceneSkinBinding => {
    const path = `skins[${i}]`,
      row = v.record(raw, path, ['id', 'name', 'nodeId', 'joints', 'weights']),
      weightsRow = v.record(row.weights, `${path}.weights`),
      vertexIds = Object.keys(weightsRow)
    weightedVertices += vertexIds.length
    v.requireScene(
      weightedVertices <= SCENE_SKIN_LIMITS.weightedVertices,
      path,
      'Os pontos vinculados ultrapassam o orçamento da criação.',
    )
    v.requireScene(vertexIds.length > 0, path, 'Cada ponto da malha precisa de pesos.')
    const jointRows = v.list(row.joints, `${path}.joints`, SCENE_SKIN_LIMITS.joints),
      ids = new Set<string>()
    v.requireScene(jointRows.length > 0, path, 'Escolha pelo menos um osso.')
    const joints = jointRows.map((raw, j) => {
      const jointPath = `${path}.joints[${j}]`,
        joint = v.record(raw, jointPath, ['nodeId', 'inverseBindMatrix']),
        nodeId = v.id(joint.nodeId, `${jointPath}.nodeId`),
        matrix = v.tuple(
          joint.inverseBindMatrix,
          16,
          `${jointPath}.inverseBindMatrix`,
        ) as AffineMatrix
      v.requireScene(!ids.has(nodeId), jointPath, 'Osso repetido no vínculo.')
      ids.add(nodeId)
      composeTransform({ kind: 'affine', matrix })
      v.requireScene(
        affineInverse(matrix),
        jointPath,
        'A pose de vínculo não pode ser invertida com segurança.',
      )
      return { nodeId, inverseBindMatrix: matrix }
    })
    const weights = Object.fromEntries(
      vertexIds.map((id) => [
        v.id(id, `${path}.weights`),
        readNormalizedSceneSkinInfluences(weightsRow[id], `${path}.weights.${id}`),
      ]),
    )
    return {
      id: v.id(row.id, `${path}.id`),
      name: v.text(row.name, `${path}.name`),
      nodeId: v.id(row.nodeId, `${path}.nodeId`),
      joints,
      weights,
    }
  })
  v.uniqueById(skins, 'skins')
  return skins
}

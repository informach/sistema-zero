import { SCENE_SKIN_WEIGHT_TOLERANCE, type SceneSkinInfluence } from '../scene/skin'
import { normalizeSceneSkinWeights } from '../scene/skinWeights'
import type { GltfAccessor } from './gltfAccessors'
import { GltfInputError } from './gltfInput'
import type { GltfSkinWeightLayout } from './gltfSkinWeights'

export interface GltfNativeSkinWeights {
  joints: Uint16Array
  weights: Float64Array
  counts: Uint8Array
  normalizedVertices: number
  maximumSumError: number
}

/** Compile only selected/preflighted layouts, once per conversion; do not prune positive influences. */
export function compileGltfNativeSkinWeights(
  layout: GltfSkinWeightLayout,
  accessors: readonly GltfAccessor[],
  normalize: boolean,
  path: string,
): GltfNativeSkinWeights {
  const sets = layout.sets.map((set) => ({
      joints: accessors[set.joints]!.values,
      weights: accessors[set.weights]!.values,
    })),
    joints = new Uint16Array(layout.vertices * 4),
    weights = new Float64Array(layout.vertices * 4),
    counts = new Uint8Array(layout.vertices)
  let normalizedVertices = 0,
    maximumSumError = 0
  for (let vertex = 0; vertex < layout.vertices; vertex++) {
    const row: SceneSkinInfluence[] = []
    let sum = 0
    for (const set of sets)
      for (let component = 0; component < 4; component++) {
        const offset = vertex * 4 + component,
          weight = set.weights[offset]!
        if (weight === 0) continue
        row.push({ jointId: String(set.joints[offset]!), weight })
        sum += weight
      }
    const error = Math.abs(sum - 1),
      needsNormalization =
        error > SCENE_SKIN_WEIGHT_TOLERANCE || row.some((entry) => entry.weight > 1)
    if (needsNormalization && !normalize)
      throw new GltfInputError(
        'unsupported',
        path,
        `Os pesos do ponto ${vertex + 1} precisam de normalização explícita para o formato nativo.`,
      )
    const values = needsNormalization ? normalizeSceneSkinWeights(row) : row
    if (needsNormalization) {
      normalizedVertices++
      maximumSumError = Math.max(maximumSumError, error)
    }
    counts[vertex] = values.length
    for (const [slot, value] of values.entries()) {
      if (!(Math.fround(value.weight) > 0))
        throw new GltfInputError(
          'unsupported',
          path,
          `Normalizar o ponto ${vertex + 1} faria uma influência positiva desaparecer na precisão de desenho.`,
        )
      joints[vertex * 4 + slot] = Number(value.jointId)
      weights[vertex * 4 + slot] = value.weight
    }
  }
  return { joints, weights, counts, normalizedVertices, maximumSumError }
}

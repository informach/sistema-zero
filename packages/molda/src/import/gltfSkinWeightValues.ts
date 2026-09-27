import type { GltfAccessor } from './gltfAccessors'
import { requireGltf } from './gltfInput'
import type { GltfSkinWeightPlan } from './gltfSkinWeightPlan'

export interface GltfSkinWeightStats {
  maximumJoint: number
  maximumJointSet: number
  maximumInfluences: number
  /** Advisory for Float32 sums; quantized sums are a strict format requirement. */
  nonUnitVertices: number
  unweightedVertices: number
  /** Nonzero JOINTS in a zero-weight slot are permitted but discouraged by glTF. */
  nonZeroUnusedSlots: number
}

export function readGltfSkinWeightValues(
  plan: GltfSkinWeightPlan,
  accessors: readonly GltfAccessor[],
): GltfSkinWeightStats {
  const sets = plan.sets.map((set, i) => {
      const weights = accessors[set.weights]!
      return {
        joints: accessors[set.joints]!.values,
        weights: weights.values,
        jointPath: `${plan.path}.JOINTS_${i}`,
        weightPath: `${plan.path}.WEIGHTS_${i}`,
        quantization:
          weights.componentType === 5121 ? 255 : weights.componentType === 5123 ? 65535 : null,
      }
    }),
    quantized = sets.every((set) => set.quantization !== null),
    active = new Set<number>()
  const stats: GltfSkinWeightStats = {
    maximumJoint: 0,
    maximumJointSet: 0,
    maximumInfluences: 0,
    nonUnitVertices: 0,
    unweightedVertices: 0,
    nonZeroUnusedSlots: 0,
  }
  for (let vertex = 0; vertex < plan.vertices; vertex++) {
    active.clear()
    let sum = 0,
      integerSum = 0
    // Component-major order also matches the validator's Float32 accumulation.
    for (let slot = 0; slot < 4; slot++)
      for (let i = 0; i < sets.length; i++) {
        const set = sets[i]!,
          offset = vertex * 4 + slot,
          joint = set.joints[offset]!,
          weight = set.weights[offset]!
        if (joint > stats.maximumJoint) {
          stats.maximumJoint = joint
          stats.maximumJointSet = i
        }
        requireGltf(weight >= 0, set.weightPath, 'O peso de uma junta não pode ser negativo.')
        if (weight === 0) {
          if (joint !== 0) stats.nonZeroUnusedSlots++
          continue
        }
        requireGltf(
          !active.has(joint),
          set.jointPath,
          'Uma junta não pode ter dois pesos positivos no mesmo vértice.',
        )
        active.add(joint)
        if (quantized && set.quantization !== null) {
          // readGltfAccessors already normalized unsigned integers. Recover exact
          // numerators; 65535 is a common denominator because 65535 = 255 * 257.
          integerSum += Math.round(weight * set.quantization) * (65535 / set.quantization)
        } else sum = Math.fround(sum + weight)
      }
    if (quantized)
      requireGltf(
        integerSum === 65535,
        plan.path,
        'Os pesos inteiros normalizados precisam somar uma unidade exata.',
      )
    else if (Math.abs(sum - 1) > 2e-7 * active.size) stats.nonUnitVertices++
    if (active.size === 0) stats.unweightedVertices++
    stats.maximumInfluences = Math.max(stats.maximumInfluences, active.size)
  }
  return stats
}

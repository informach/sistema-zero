import { type AffineMatrix, affineInverse, identityMatrix } from '../scene/matrix'
import type { SceneSkinBinding, SceneSkinInfluence } from '../scene/skin'
import type { GltfDocument } from './gltfDocument'
import type { GltfGeometrySource } from './gltfGeometries'
import type { GltfHierarchy } from './gltfHierarchy'
import { GltfInputError, requireGltf } from './gltfInput'
import { gltfNativeName } from './gltfNativeName'
import { compileGltfNativeSkinWeights } from './gltfNativeSkinWeights'
import type { GltfSelection } from './gltfSelection'
import { planGltfSkinBindings } from './gltfSkinBindingPlan'

export type GltfSkinBindingIssue = {
  path: string
  bindingId: string
} & (
  | { code: 'name-generated' | 'name-shortened' }
  | { code: 'weights-normalized'; vertices: number; maximumSumError: number }
)

/** Native binding stage, not commit/clip conversion. Source/map/hierarchy must share one immutable input. */
export function convertGltfSkinBindings(
  source: GltfDocument,
  selection: GltfSelection,
  hierarchy: GltfHierarchy,
  geometrySources: readonly GltfGeometrySource[],
  options: { weights: 'preserve' | 'normalize' } = { weights: 'preserve' },
): { skins: SceneSkinBinding[]; issues: GltfSkinBindingIssue[] } {
  requireGltf(
    options.weights === 'preserve' || options.weights === 'normalize',
    'skin.weights',
    'Escolha preservar ou normalizar os pesos.',
  )
  const plan = planGltfSkinBindings(source, selection, hierarchy, geometrySources),
    matrices = new Map<number, AffineMatrix[]>(),
    issues: GltfSkinBindingIssue[] = []
  // Validate all required inverse-bind matrices before allocating weight templates or bindings.
  for (const binding of plan.bindings) {
    if (matrices.has(binding.skin)) continue
    const skin = source.skins[binding.skin]!,
      values =
        skin.inverseBindMatrices === null
          ? null
          : source.accessors[skin.inverseBindMatrices]!.values,
      rows: AffineMatrix[] = []
    for (let joint = 0; joint < skin.joints.length; joint++) {
      const matrix =
        values === null
          ? identityMatrix()
          : (Array.from(values.subarray(joint * 16, joint * 16 + 16)) as AffineMatrix)
      if (!affineInverse(matrix))
        throw new GltfInputError(
          'unsupported',
          `skins[${binding.skin}].inverseBindMatrices[${joint}]`,
          'A matriz de vínculo não pode ser invertida com segurança pelo Molda.',
        )
      rows.push(matrix)
    }
    matrices.set(binding.skin, rows)
  }
  const templates = new Map(
    [...plan.layouts].map(([index, path]) => [
      index,
      compileGltfNativeSkinWeights(
        source.skinWeights.layouts[index]!,
        source.accessors,
        options.weights === 'normalize',
        path,
      ),
    ]),
  )
  const skins = plan.bindings.map((binding): SceneSkinBinding => {
    const sourceSkin = source.skins[binding.skin]!,
      bindingId = `gltf_skin_${binding.node}`,
      path = `nodes[${binding.node}].skin`,
      { name, change } = gltfNativeName(sourceSkin.name, `Esqueleto ${binding.skin + 1}`),
      joints = sourceSkin.joints.map((node, index) => ({
        nodeId: hierarchy.nodeIds.get(node)!,
        inverseBindMatrix: [...matrices.get(binding.skin)![index]!] as AffineMatrix,
      })),
      weights: SceneSkinBinding['weights'] = {}
    if (change) issues.push({ code: change, path: `skins[${binding.skin}].name`, bindingId })
    let normalizedVertices = 0,
      maximumSumError = 0
    for (const primitive of binding.primitives) {
      const template = templates.get(primitive.layout)!
      normalizedVertices += template.normalizedVertices
      maximumSumError = Math.max(maximumSumError, template.maximumSumError)
      primitive.vertexIds.forEach((vertexId, vertex) => {
        const row: SceneSkinInfluence[] = []
        for (let slot = 0; slot < template.counts[vertex]!; slot++) {
          const offset = vertex * 4 + slot
          row.push({
            jointId: joints[template.joints[offset]!]!.nodeId,
            weight: template.weights[offset]!,
          })
        }
        weights[vertexId] = row
      })
    }
    if (normalizedVertices)
      issues.push({
        code: 'weights-normalized',
        path,
        bindingId,
        vertices: normalizedVertices,
        maximumSumError,
      })
    return { id: bindingId, name, nodeId: binding.nodeId, joints, weights }
  })
  return { skins, issues }
}

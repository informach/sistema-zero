import type { SceneMaterial } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import { BbmodelInputError, requireBbmodel } from './bbmodelInput'
import type { BbmodelNativeGeometryPlan } from './bbmodelNativeGeometryPlan'
import type { BbmodelNativeUvs } from './bbmodelNativeUvs'
import type { BbmodelSurfaceMetadata } from './bbmodelSurfaceMetadata'
import { type BbmodelVec4, bbmodelBoolean, bbmodelVec4 } from './bbmodelValues'
import { nativeImportName } from './nativeImportName'

export interface BbmodelNodeMaterialOptions {
  untextured?: 'reject' | 'uniform'
  /** Native sRGB RGBA, not source marker RGB; applies below future paint as well. */
  color?: BbmodelVec4
  doubleSided?: boolean
}
export type BbmodelNodeMaterialIssue = { node: number; path: string; targetId: string } & (
  | { code: 'name-generated' | 'name-shortened' }
  | {
      code: 'untextured-appearance-adapted'
      /** Original retained source faces, not native triangle count. */
      count: number
      markerColor: number | null
      color: BbmodelVec4
      doubleSided: boolean
    }
)

export function readBbmodelNodeMaterialOptions(value: BbmodelNodeMaterialOptions) {
  requireBbmodel(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha a aparência das peças sem pintura.',
  )
  for (const key of Object.keys(value))
    requireBbmodel(
      ['untextured', 'color', 'doubleSided'].includes(key),
      `options.${key}`,
      'Esta opção de aparência não é conhecida.',
    )
  const untextured = value.untextured === undefined ? 'reject' : value.untextured,
    color = bbmodelVec4(value.color === undefined ? [1, 1, 1, 1] : value.color, 'options.color'),
    doubleSided = bbmodelBoolean(value.doubleSided, 'options.doubleSided', true)
  requireBbmodel(
    untextured === 'reject' || untextured === 'uniform',
    'options.untextured',
    'Escolha como mostrar as superfícies sem pintura.',
  )
  for (const [axis, channel] of color.entries())
    requireBbmodel(
      channel >= 0 && channel <= 1,
      `options.color[${axis}]`,
      'Cada canal de cor deve ficar entre zero e um.',
    )
  return { untextured, color, doubleSided }
}

/**
 * Own default material per planned native mesh. Metadata/geometry/UV stages must match.
 * The source missing-texture marker shader is not a base color. Uniform native appearance is chosen,
 * not inferred from markerColor. No image/shading/render-order/seam approval or source schema reread.
 */
export function convertBbmodelNodeMaterials(
  metadata: readonly BbmodelSurfaceMetadata[],
  plans: readonly BbmodelNativeGeometryPlan[],
  uvs: readonly BbmodelNativeUvs[],
  options: BbmodelNodeMaterialOptions = {},
): {
  materials: SceneMaterial[]
  byNode: ReadonlyMap<number, string>
  issues: BbmodelNodeMaterialIssue[]
} {
  const policy = readBbmodelNodeMaterialOptions(options)
  if (plans.length > SCENE_LIMITS.geometries)
    throw new BbmodelInputError(
      'budget',
      'nodeMaterials',
      'Há peças demais para criar seus materiais.',
    )
  const byUvs = new Map(uvs.map((row) => [row.node, row])),
    issues: BbmodelNodeMaterialIssue[] = [],
    matched = plans.map((plan) => {
      const info = metadata[plan.node],
        uv = byUvs.get(plan.node)
      if (
        !info ||
        info.kind === 'group' ||
        info.kind === 'unresolved' ||
        info.node !== plan.node ||
        info.kind !== plan.kind ||
        info.sourcePath !== plan.sourcePath ||
        !uv ||
        uv.geometryId !== plan.geometryId
      )
        throw new Error('Mismatched bbmodel node material stages')
      return { plan, info, uv }
    })
  const materials = matched.map(({ plan, info, uv }): SceneMaterial => {
    const seen = new Set<number>()
    let untextured = 0
    for (const face of plan.faces) {
      if (seen.has(face.sourceFace)) continue
      seen.add(face.sourceFace)
      const mapped = uv.faces.get(face.sourceFace)
      if (!mapped) throw new Error('Missing bbmodel node material face binding')
      if (mapped.texture === null) untextured++
    }
    if (untextured && policy.untextured === 'reject')
      throw new BbmodelInputError(
        'unsupported',
        info.sourcePath,
        'Esta peça tem superfícies sem pintura. Escolha uma cor do Molda para substituir a aparência de marcador da origem.',
      )
    const id = `bbmodel_node_material_${plan.node}`,
      { name, change } = nativeImportName(info.name, `Cor da peça ${plan.node + 1}`)
    if (change)
      issues.push({ code: change, node: plan.node, path: `${info.sourcePath}.name`, targetId: id })
    if (untextured)
      issues.push({
        code: 'untextured-appearance-adapted',
        node: plan.node,
        path: info.sourcePath,
        targetId: id,
        count: untextured,
        markerColor: info.markerColor,
        color: [...policy.color],
        doubleSided: policy.doubleSided,
      })
    return {
      id,
      name,
      baseColor: { kind: 'rgba', value: [...policy.color] },
      roughness: 1,
      metalness: 0,
      doubleSided: policy.doubleSided,
    }
  })
  return {
    materials,
    byNode: new Map(plans.map((plan, i) => [plan.node, materials[i]!.id])),
    issues,
  }
}

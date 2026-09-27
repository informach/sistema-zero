import type { BbmodelAppearance } from './bbmodelAppearance'
import type { BbmodelFaceUvs } from './bbmodelFaceUvs'
import type { BbmodelGeometrySource } from './bbmodelGeometryTypes'
import { BbmodelInputError } from './bbmodelInput'
import type { BbmodelNativeGeometryPlan } from './bbmodelNativeGeometryPlan'
import type { BbmodelTextureBinding } from './bbmodelTextureBinding'
import { bbmodelUvDimensions } from './bbmodelUvDimensions'
import { type BbmodelVec2, bbmodelKeyPath } from './bbmodelValues'

export interface BbmodelNativeUvs {
  node: number
  geometryId: string
  /** Original face/corner indices; coordinates are local to ONE image frame, not its full sheet. */
  faces: ReadonlyMap<number, { texture: number | null; corners: BbmodelVec2[] }>
}
export interface BbmodelNormalizedUvIssue {
  code: 'outside-frame-uv' | 'uv-arithmetic-collapse' | 'sub-float32-uv'
  node: number
  path: string
  /** Affected original corners, counted once even when a face becomes two triangles. */
  count: number
}

/**
 * Private matching stages: normalize authorial UV without touching pixels, coordinates or source.
 * Texture materialization must supply a full static image or a frame-local flipbook/crop.
 * This does not approve sampler/wrap, shading, layers, frames or a complete native document.
 */
export function convertBbmodelNativeUvs(
  source: readonly BbmodelGeometrySource[],
  plans: readonly BbmodelNativeGeometryPlan[],
  authorial: readonly BbmodelFaceUvs[],
  bindings: readonly { node: number; faces: readonly BbmodelTextureBinding[] }[],
  appearance: BbmodelAppearance,
) {
  if (appearance.modelFormat !== 'free')
    throw new BbmodelInputError(
      'unsupported',
      'meta.model_format',
      'Este mapa UV precisa do formato genérico do Blockbench.',
    )
  const byNode = new Map(source.map((row) => [row.node, row])),
    byUv = new Map(authorial.map((row) => [row.node, row])),
    byBinding = new Map(bindings.map((row) => [row.node, row])),
    sizes = new Map<number | null, BbmodelVec2>(),
    issues: BbmodelNormalizedUvIssue[] = []
  // Match every stage before consuming corner values from any selected shape.
  const matched = plans.map((plan) => {
    const shape = byNode.get(plan.node),
      uv = byUv.get(plan.node),
      binding = byBinding.get(plan.node)
    if (
      !shape ||
      shape.kind === 'unresolved' ||
      shape.kind !== plan.kind ||
      !uv ||
      uv.geometryId !== plan.geometryId ||
      !binding
    )
      throw new Error('Mismatched bbmodel native UV stages')
    return { plan, shape, uv, binding }
  })
  const geometries = matched.map(({ plan, shape, uv, binding }): BbmodelNativeUvs => {
    const faces = new Map<number, { texture: number | null; corners: BbmodelVec2[] }>(),
      counts = new Map<BbmodelNormalizedUvIssue['code'], number>()
    const issue = (code: BbmodelNormalizedUvIssue['code']) =>
      counts.set(code, (counts.get(code) ?? 0) + 1)
    for (const planned of plan.faces) {
      if (faces.has(planned.sourceFace)) continue
      const face = shape.faces[planned.sourceFace],
        values = uv.faces.get(planned.sourceFace),
        bound = binding.faces[planned.sourceFace]
      if (!face || !values || !bound || (bound.kind !== 'texture' && bound.kind !== 'none'))
        throw new Error('Mismatched bbmodel retained UV face')
      const texture = bound.kind === 'texture' ? bound.texture : null,
        size = sizes.get(texture) ?? bbmodelUvDimensions(appearance, texture),
        path = bbmodelKeyPath(
          `${shape.sourcePath}.faces`,
          'direction' in face ? face.direction : face.id,
        )
      sizes.set(texture, size)
      const corners = values.map(([u, v], corner): BbmodelVec2 => {
        const normalizedU = u / size[0],
          normalizedV = v / size[1],
          result: BbmodelVec2 = [normalizedU, 1 - normalizedV]
        if (!result.every((value) => Number.isFinite(Math.fround(value)))) {
          const at =
            shape.kind === 'mesh'
              ? bbmodelKeyPath(
                  `${path}.uv`,
                  shape.vertexIds[shape.faces[planned.sourceFace]!.vertices[corner]!]!,
                )
              : `${path}.uv`
          throw new BbmodelInputError(
            'unsupported',
            at,
            'Este UV normalizado excede o intervalo de desenho; ele não foi recortado.',
          )
        }
        if (texture !== null && result.some((value) => value < 0 || value > 1))
          issue('outside-frame-uv')
        if ((u !== 0 && normalizedU === 0) || (v !== 0 && (normalizedV === 0 || result[1] === 1)))
          issue('uv-arithmetic-collapse')
        if (result.some((value) => value !== 0 && Math.fround(value) === 0)) issue('sub-float32-uv')
        return result
      })
      faces.set(planned.sourceFace, { texture, corners })
    }
    for (const [code, count] of counts)
      issues.push({ code, node: plan.node, path: shape.sourcePath, count })
    return { node: plan.node, geometryId: plan.geometryId, faces }
  })
  return { geometries, issues }
}

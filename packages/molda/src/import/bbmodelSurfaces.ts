import { SCENE_LIMITS } from '../scene/limits'
import { BbmodelInputError, requireBbmodel } from './bbmodelInput'
import type { BbmodelNativeGeometryPlan } from './bbmodelNativeGeometryPlan'
import type { BbmodelNativeUvs } from './bbmodelNativeUvs'
import type { BbmodelSurfaceMetadata } from './bbmodelSurfaceMetadata'
import { bbmodelKeyPath } from './bbmodelValues'

export interface BbmodelSurfaceOptions {
  /** Native per-triangle normals, not source quad/smooth/fixed-box normals. */
  normals?: 'reject' | 'molda-flat'
  renderOrder?: 'reject' | 'discard'
  /** Authored auto-unwrap labels, not UV corner discontinuities. */
  seamLabels?: 'reject' | 'discard'
  /** Inert in the supported free format; do not silently drop its authored value. */
  cubeShade?: 'reject' | 'discard'
  /** Keep coordinates; the native sampler clamps to the current image frame. */
  outsideFrameUvs?: 'reject' | 'clamp'
}
export type BbmodelSurfaceIssue = { node: number; path: string } & (
  | { code: 'native-flat-normals'; source: 'cube' | 'flat' | 'smooth'; count: number }
  | { code: 'render-order-discarded'; source: 'behind' | 'in_front' }
  | { code: 'seam-labels-discarded'; count: number }
  | { code: 'cube-shade-discarded'; source: false }
  | { code: 'outside-frame-uv-clamped'; count: number }
)

export function readBbmodelSurfaceOptions(value: BbmodelSurfaceOptions) {
  requireBbmodel(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha como adaptar as superfícies.',
  )
  for (const key of Object.keys(value))
    requireBbmodel(
      ['normals', 'renderOrder', 'seamLabels', 'cubeShade', 'outsideFrameUvs'].includes(key),
      `options.${key}`,
      'Esta opção de superfície não é conhecida.',
    )
  const normals = value.normals === undefined ? 'reject' : value.normals,
    renderOrder = value.renderOrder === undefined ? 'reject' : value.renderOrder,
    seamLabels = value.seamLabels === undefined ? 'reject' : value.seamLabels,
    cubeShade = value.cubeShade === undefined ? 'reject' : value.cubeShade,
    outsideFrameUvs = value.outsideFrameUvs === undefined ? 'reject' : value.outsideFrameUvs
  for (const [key, actual, allowed] of [
    ['normals', normals, 'molda-flat'],
    ['renderOrder', renderOrder, 'discard'],
    ['seamLabels', seamLabels, 'discard'],
    ['cubeShade', cubeShade, 'discard'],
    ['outsideFrameUvs', outsideFrameUvs, 'clamp'],
  ] as const)
    requireBbmodel(
      actual === 'reject' || actual === allowed,
      `options.${key}`,
      'Escolha uma adaptação de superfície conhecida.',
    )
  return { normals, renderOrder, seamLabels, cubeShade, outsideFrameUvs }
}

function unsupported(path: string, message: string): never {
  throw new BbmodelInputError('unsupported', path, message)
}

/**
 * Private matching metadata/topology/normalized-UV stages, before pixels or adoption.
 * Explicitly chooses native rendering; does not claim source-normal or sampler equivalence.
 * Does not mutate geometry/UV or approve remaining raw fields, materials, animation or layers.
 */
export function assessBbmodelSurfaces(
  metadata: readonly BbmodelSurfaceMetadata[],
  plans: readonly BbmodelNativeGeometryPlan[],
  uvs: readonly BbmodelNativeUvs[],
  options: BbmodelSurfaceOptions = {},
): { issues: BbmodelSurfaceIssue[] } {
  const policy = readBbmodelSurfaceOptions(options)
  if (plans.length > SCENE_LIMITS.geometries)
    throw new BbmodelInputError(
      'budget',
      'surfaces',
      'Há peças demais para adaptar suas superfícies.',
    )
  const byUv = new Map(uvs.map((row) => [row.node, row])),
    matched = plans.map((plan) => {
      const info = metadata[plan.node],
        uv = byUv.get(plan.node)
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
        throw new Error('Mismatched bbmodel surface stages')
      return { plan, info, uv }
    })
  // Unknown source labels are never authorized by choosing a known approximation.
  for (const { info } of matched) {
    if (info.kind !== 'mesh') continue
    if (info.shading !== 'flat' && info.shading !== 'smooth')
      unsupported(`${info.sourcePath}.shading`, 'Este tipo de sombreamento ainda não é conhecido.')
    if (!['default', 'behind', 'in_front'].includes(info.renderOrder))
      unsupported(`${info.sourcePath}.render_order`, 'Esta ordem de desenho ainda não é conhecida.')
    for (const [key, value] of info.seams)
      if (value !== 'join' && value !== 'divide')
        unsupported(
          bbmodelKeyPath(`${info.sourcePath}.seams`, key),
          'Esta indicação de costura ainda não é conhecida.',
        )
  }
  const issues: BbmodelSurfaceIssue[] = []
  for (const { plan, info, uv } of matched) {
    const path = info.sourcePath,
      node = info.node,
      originalFaces = new Set(plan.faces.map((face) => face.sourceFace))
    if (info.kind === 'cube' && !info.shade) {
      if (policy.cubeShade === 'reject')
        unsupported(
          `${path}.shade`,
          'O Molda não guarda esta marca de sombreamento do cubo. Escolha se deseja descartá-la.',
        )
      issues.push({ code: 'cube-shade-discarded', node, path: `${path}.shade`, source: false })
    }
    if (info.kind === 'mesh') {
      if (info.renderOrder === 'behind' || info.renderOrder === 'in_front') {
        if (policy.renderOrder === 'reject')
          unsupported(
            `${path}.render_order`,
            'Esta peça tem uma ordem de desenho especial. Escolha se deseja usar a ordem do Molda.',
          )
        issues.push({
          code: 'render-order-discarded',
          node,
          path: `${path}.render_order`,
          source: info.renderOrder,
        })
      }
      if (info.seams.size) {
        if (policy.seamLabels === 'reject')
          unsupported(
            `${path}.seams`,
            'O mapa UV será mantido, mas estas indicações para abrir novas costuras não têm equivalente no Molda. Escolha se deseja descartá-las.',
          )
        issues.push({
          code: 'seam-labels-discarded',
          node,
          path: `${path}.seams`,
          count: info.seams.size,
        })
      }
    }
    if (originalFaces.size || (info.kind === 'mesh' && info.shading === 'smooth')) {
      if (policy.normals === 'reject')
        unsupported(
          path,
          'Escolha o sombreamento por triângulo do Molda. Ele pode mudar a aparência de superfícies suaves, torcidas ou invertidas.',
        )
      issues.push({
        code: 'native-flat-normals',
        node,
        path,
        count: originalFaces.size,
        source: info.kind === 'cube' ? 'cube' : (info.shading as 'flat' | 'smooth'),
      })
    }
    let outsideCorners = 0
    for (const face of originalFaces) {
      const bound = uv.faces.get(face)
      if (!bound) throw new Error('Missing bbmodel surface face binding')
      if (bound.texture === null) continue
      for (const corner of bound.corners)
        if (corner.some((coordinate) => coordinate < 0 || coordinate > 1)) outsideCorners++
    }
    if (outsideCorners) {
      if (policy.outsideFrameUvs === 'reject')
        unsupported(
          path,
          'Há pintura fora do quadro da imagem. Escolha se deseja usar a borda do quadro no Molda, mantendo as coordenadas UV.',
        )
      issues.push({ code: 'outside-frame-uv-clamped', node, path, count: outsideCorners })
    }
  }
  return { issues }
}

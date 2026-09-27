import { type Quaternion, quaternionFromEulerRadians } from '../scene/matrix'
import type { BbmodelAnimationChannel } from './bbmodelAnimationKeyTypes'
import { BbmodelInputError, requireBbmodel } from './bbmodelInput'
import type { BbmodelTransform } from './bbmodelTransforms'
import { type BbmodelVec3, bbmodelNumber, bbmodelRadians } from './bbmodelValues'

export interface BbmodelAnimationPoseOptions {
  zeroScale?: 'reject' | 'preserve-zero' | 'source-minimum'
}
export type BbmodelLocalAnimationValue = {
  /** Values remain F64; these component indices would become zero in a local F32 upload. */
  underflowComponents: number[]
  /** Weighted scale components at zero, where the source applies its 0.00001 minimum. */
  zeroScaleComponents: number[]
} & (
  | { channel: 'translation' | 'scale'; value: BbmodelVec3 }
  | { channel: 'rotation'; value: Quaternion }
)

export function readBbmodelAnimationPoseOptions(value: BbmodelAnimationPoseOptions) {
  requireBbmodel(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha como converter as transformações dos movimentos.',
  )
  for (const key of Object.keys(value))
    requireBbmodel(
      key === 'zeroScale',
      `options.${key}`,
      'Esta opção de transformação não é conhecida.',
    )
  const zeroScale = value.zeroScale === undefined ? 'reject' : value.zeroScale
  requireBbmodel(
    zeroScale === 'reject' || zeroScale === 'preserve-zero' || zeroScale === 'source-minimum',
    'options.zeroScale',
    'Escolha se a escala zero deve ser mantida ou usar o mínimo do Blockbench.',
  )
  return { zeroScale }
}
function finite(value: number, path: string): number {
  if (!Number.isFinite(value))
    throw new BbmodelInputError('unsupported', path, 'Esta transformação excede a faixa numérica.')
  return value
}

/**
 * Standard group rest pose, a single clip and local Euler evaluation only. The caller must
 * resolve/approve the bone target and reject or separately handle global rotation, quaternion
 * interpolation, IK and stacked clips. This mapper does not approve those source flags.
 *
 * Outputs absolute local channel values for native space:'local', NOT local-delta. Source
 * points are already finite/validated and version-migrated. Options/base are captured once;
 * no parsing of blend_weight, time selection, source mutation or per-sample base conversion.
 * Local range checks do not prove animated parent/world/geometry bounds or adoption safety.
 */
export function prepareBbmodelLocalAnimationValues(
  base: BbmodelTransform,
  options: BbmodelAnimationPoseOptions = {},
  basePath = 'animation.base',
) {
  const policy = readBbmodelAnimationPoseOptions(options)
  if (
    base.order !== 'ZYX' ||
    base.rescaled ||
    base.local.scale.some((component) => component !== 1)
  )
    throw new BbmodelInputError(
      'unsupported',
      basePath,
      'Esta pose-base não corresponde à transformação padrão de um grupo.',
    )
  const translation: BbmodelVec3 = [...base.local.translation],
    angles: BbmodelVec3 = [
      bbmodelRadians(base.angles[0]),
      bbmodelRadians(base.angles[1]),
      bbmodelRadians(base.angles[2]),
    ]
  return function convert(
    channel: BbmodelAnimationChannel,
    point: BbmodelVec3,
    multiplier: number,
    path: string,
  ): BbmodelLocalAnimationValue {
    requireBbmodel(
      channel === 'position' || channel === 'rotation' || channel === 'scale',
      `${path}.channel`,
      'Este canal não é uma transformação local conhecida.',
    )
    const weight = bbmodelNumber(multiplier, `${path}.weight`)
    requireBbmodel(weight >= 0, `${path}.weight`, 'O peso do movimento não pode ser negativo.')
    const underflowComponents: number[] = [],
      zeroScaleComponents: number[] = []
    function checked<T extends BbmodelVec3 | Quaternion>(value: T): T {
      for (const [index, component] of value.entries()) {
        finite(component, `${path}.value[${index}]`)
        const local = Math.fround(component)
        if (!Number.isFinite(local))
          throw new BbmodelInputError(
            'unsupported',
            `${path}.value[${index}]`,
            'Este valor local é grande demais para desenhar no Molda.',
          )
        if (component !== 0 && local === 0) underflowComponents.push(index)
      }
      return value
    }
    if (channel === 'rotation') {
      // Add radian offsets to the original Euler components; do not multiply quaternions.
      const rotation: BbmodelVec3 = [
        finite(angles[0] + bbmodelRadians(point[0]) * weight, `${path}.rotation[0]`),
        finite(angles[1] + bbmodelRadians(point[1]) * weight, `${path}.rotation[1]`),
        finite(angles[2] + bbmodelRadians(point[2]) * weight, `${path}.rotation[2]`),
      ]
      return {
        channel: 'rotation',
        value: checked(quaternionFromEulerRadians(rotation, 'ZYX')),
        underflowComponents,
        zeroScaleComponents,
      }
    }
    function component(axis: 0 | 1 | 2): number {
      if (channel === 'position') return translation[axis] + point[axis] * weight
      // This order also exposes weighted values that round to zero, not only literal zero.
      const value = 1 + (point[axis] - 1) * weight
      if (value !== 0) return value
      if (policy.zeroScale === 'reject')
        throw new BbmodelInputError(
          'unsupported',
          `${path}.scale[${axis}]`,
          'Esta escala chega a zero. Escolha como converter esse instante antes de continuar.',
        )
      zeroScaleComponents.push(axis)
      return policy.zeroScale === 'source-minimum' ? 0.00001 : value
    }
    return {
      channel: channel === 'position' ? 'translation' : 'scale',
      value: checked([component(0), component(1), component(2)]),
      underflowComponents,
      zeroScaleComponents,
    }
  }
}

import { requireObj } from './objInput'

export interface ObjMaterialConversionOptions {
  /** MTL color maps do not portably define whether their alpha is an extra opacity mask. */
  colorAlpha: 'ignore' | 'multiply'
  /** Source tangent-space convention, BEFORE the OBJ-to-native V inversion. */
  normalY: 'positive' | 'negative'
  /** MTL has no portable face-culling field. */
  doubleSided: boolean
  /** Color defines the output grid. A differently sized opacity mask requires an explicit bake. */
  opacitySampling?: 'reject' | 'nearest'
}
export type ObjMaterialIssue = { path: string; targetId: string } & (
  | { code: 'name-generated' | 'name-shortened' | 'rgba16-to-rgba8' | 'color-factor-baked' }
  | { code: 'color-alpha-interpreted'; mode: ObjMaterialConversionOptions['colorAlpha'] }
  | {
      code: 'normal-y-interpreted'
      source: ObjMaterialConversionOptions['normalY']
      flipY: boolean
    }
  | { code: 'surface-sidedness-assumed'; doubleSided: boolean }
  | { code: 'opacity-resampled-nearest'; source: [number, number]; target: [number, number] }
)

export function readObjMaterialConversionOptions(value: ObjMaterialConversionOptions) {
  requireObj(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha como converter as imagens OBJ.',
  )
  for (const key of Object.keys(value))
    requireObj(
      key === 'colorAlpha' ||
        key === 'normalY' ||
        key === 'doubleSided' ||
        key === 'opacitySampling',
      `options.${key}`,
      'Esta opção de conversão não é conhecida.',
    )
  const { colorAlpha, normalY, doubleSided } = value,
    opacitySampling = value.opacitySampling === undefined ? 'reject' : value.opacitySampling
  requireObj(
    colorAlpha === 'ignore' || colorAlpha === 'multiply',
    'options.colorAlpha',
    'Escolha se o alpha da imagem de cor contribui à transparência.',
  )
  requireObj(
    normalY === 'positive' || normalY === 'negative',
    'options.normalY',
    'Escolha a orientação vertical das normais de origem.',
  )
  requireObj(
    typeof doubleSided === 'boolean',
    'options.doubleSided',
    'Escolha se as faces aparecem dos dois lados.',
  )
  requireObj(
    opacitySampling === 'reject' || opacitySampling === 'nearest',
    'options.opacitySampling',
    'Escolha como combinar máscaras de outra resolução.',
  )
  return { colorAlpha, normalY, doubleSided, opacitySampling }
}

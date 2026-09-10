import { linearUnitToSrgb, srgbUnitToLinear } from '../core/colorTransfer'
import {
  type MtlEffectiveProperties,
  type MtlRepeatedPropertyPolicy,
  selectMtlProperties,
} from './mtlEffectiveProperties'
import type { MtlMaterial, MtlProperty } from './mtlTypes'
import { ObjInputError, requireObj } from './objInput'

export interface MtlBaseOptions {
  /** MTL RGB has no portable color-space guarantee. The caller must select its interpretation. */
  rgbSpace: 'linear' | 'srgb'
  repeatedProperties?: MtlRepeatedPropertyPolicy
  opacityConflict?: 'reject' | 'd' | 'Tr'
  phongRoughness?: 'reject' | 'blender'
  /** Non-Lambert/Phong illumination models need an explicit approximation policy. */
  illumination?: 'reject' | 'pbr'
}
export type MtlBaseIssue =
  | { code: 'rgb-interpreted'; line: number; space: MtlBaseOptions['rgbSpace'] }
  | { code: 'property-redeclared'; line: number; slot: string; ignored: number }
  | { code: 'opacity-priority'; line: number; selected: 'd' | 'Tr'; omittedLine: number }
  | { code: 'phong-roughness-approximated'; line: number; method: 'blender' }
  | { code: 'illumination-adapted'; line: number; model: number }
  | { code: 'parameter-omitted'; line: number; keyword: MtlProperty['keyword'] }
  | {
      code: 'default-assumed'
      line: number
      field: 'diffuse' | 'opacity' | 'roughness' | 'metalness' | 'illumination'
    }
export interface MtlBasePlan {
  /** Straight alpha sRGB color for the native solid base; not a material under a converted texture yet. */
  baseColor: [number, number, number, number]
  /** Same RGB interpreted in linear light for the future texture-factor bake. */
  linearColor: [number, number, number]
  /** Solid values, or multipliers when the corresponding PBR surface map is retained. */
  roughness: number
  metalness: number
  propertyIndices: number[]
  /** Effective source indices only. Maps are neither interpreted nor approved by this scalar stage. */
  mapIndices: number[]
  issues: MtlBaseIssue[]
}
export function readMtlBaseOptions(value: MtlBaseOptions) {
  requireObj(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha uma interpretação de aparência MTL.',
  )
  for (const key of Object.keys(value))
    requireObj(
      key === 'rgbSpace' ||
        key === 'repeatedProperties' ||
        key === 'opacityConflict' ||
        key === 'phongRoughness' ||
        key === 'illumination',
      `options.${key}`,
      'Esta opção de aparência não é conhecida.',
    )
  const rgbSpace = value.rgbSpace,
    repeatedProperties =
      value.repeatedProperties === undefined ? 'reject' : value.repeatedProperties,
    opacityConflict = value.opacityConflict === undefined ? 'reject' : value.opacityConflict,
    phongRoughness = value.phongRoughness === undefined ? 'reject' : value.phongRoughness,
    illumination = value.illumination === undefined ? 'reject' : value.illumination
  requireObj(
    rgbSpace === 'linear' || rgbSpace === 'srgb',
    'options.rgbSpace',
    'Escolha se os valores RGB são lineares ou sRGB.',
  )
  requireObj(
    repeatedProperties === 'reject' ||
      repeatedProperties === 'first' ||
      repeatedProperties === 'last',
    'options.repeatedProperties',
    'Escolha como tratar propriedades repetidas.',
  )
  requireObj(
    opacityConflict === 'reject' || opacityConflict === 'd' || opacityConflict === 'Tr',
    'options.opacityConflict',
    'Escolha qual transparência usar quando d e Tr coexistem.',
  )
  requireObj(
    phongRoughness === 'reject' || phongRoughness === 'blender',
    'options.phongRoughness',
    'Escolha se permite a aproximação de brilho do Blender.',
  )
  requireObj(
    illumination === 'reject' || illumination === 'pbr',
    'options.illumination',
    'Escolha se permite adaptar outros modelos de iluminação para PBR.',
  )
  return { rgbSpace, repeatedProperties, opacityConflict, phongRoughness, illumination }
}

export interface MtlBaseMapContext {
  roughness: boolean
  metalness: boolean
}
function mapContext(value: MtlBaseMapContext): MtlBaseMapContext {
  requireObj(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'maps',
    'Informe os mapas PBR retidos.',
  )
  for (const key of Object.keys(value))
    requireObj(
      key === 'roughness' || key === 'metalness',
      `maps.${key}`,
      'Este papel de mapa não é conhecido na base escalar.',
    )
  const roughness = value.roughness,
    metalness = value.metalness
  requireObj(
    typeof roughness === 'boolean' && typeof metalness === 'boolean',
    'maps',
    'Os papéis de mapa precisam ser booleanos.',
  )
  return { roughness, metalness }
}
function unsupported(line: number, message: string): never {
  throw new ObjInputError('unsupported', `lines[${line}]`, message)
}
function unit(value: number, line: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 1)
    unsupported(line, 'Este valor não cabe no intervalo nativo de 0 a 1. Ele não foi recortado.')
  return value
}

/** One already-selected source declaration. No pixels, texture-option application, editor state or native document. */
export function planMtlBase(
  material: MtlMaterial,
  options: MtlBaseOptions,
  maps: MtlBaseMapContext = { roughness: false, metalness: false },
): MtlBasePlan {
  const policy = readMtlBaseOptions(options),
    context = mapContext(maps)
  return planSelectedMtlBase(
    material,
    selectMtlProperties(material, policy.repeatedProperties),
    policy,
    context,
  )
}

/** Internal composition: already selected indices and normalized policies from this immutable declaration. */
export function planSelectedMtlBase(
  material: MtlMaterial,
  effective: MtlEffectiveProperties,
  policy: ReturnType<typeof readMtlBaseOptions>,
  maps: MtlBaseMapContext,
): MtlBasePlan {
  const properties = new Map<MtlProperty['keyword'], MtlProperty>(),
    mapIndices: number[] = [],
    issues: MtlBaseIssue[] = effective.choices.map((choice) => ({
      code: 'property-redeclared',
      line: material.properties[choice.kept]!.line,
      slot: choice.slot,
      ignored: choice.ignored,
    }))
  for (const index of effective.indices) {
    const property = material.properties[index]!
    if (property.kind === 'map') mapIndices.push(index)
    else properties.set(property.keyword, property)
  }
  function assumed(field: Extract<MtlBaseIssue, { code: 'default-assumed' }>['field']) {
    issues.push({ code: 'default-assumed', line: material.line, field })
  }
  function scalar(keyword: 'Ns' | 'Pr' | 'Pm' | 'Tr') {
    const property = properties.get(keyword)
    if (property === undefined) return null
    if (property.kind !== 'scalar') throw new Error('Source scalar kind mismatch')
    return property
  }
  let baseRgb: [number, number, number] = [1, 1, 1],
    linearColor: [number, number, number] = [1, 1, 1]
  const diffuse = properties.get('Kd')
  if (!diffuse) assumed('diffuse')
  else {
    if (diffuse.kind !== 'color') throw new Error('Source diffuse kind mismatch')
    if (diffuse.value.space !== 'rgb')
      unsupported(
        diffuse.line,
        'Cores XYZ ou espectrais precisam de conversão própria; não serão tratadas como RGB.',
      )
    const rgb = diffuse.value.value.map((value) => unit(value, diffuse.line)),
      toSrgb = (value: number) => (policy.rgbSpace === 'linear' ? linearUnitToSrgb(value) : value),
      toLinear = (value: number) => (policy.rgbSpace === 'srgb' ? srgbUnitToLinear(value) : value)
    baseRgb = [toSrgb(rgb[0]!), toSrgb(rgb[1]!), toSrgb(rgb[2]!)]
    linearColor = [toLinear(rgb[0]!), toLinear(rgb[1]!), toLinear(rgb[2]!)]
    issues.push({ code: 'rgb-interpreted', line: diffuse.line, space: policy.rgbSpace })
  }
  let alpha = 1
  const dissolve = properties.get('d'),
    transparent = scalar('Tr')
  if (dissolve && dissolve.kind !== 'dissolve') throw new Error('Source dissolve kind mismatch')
  if (dissolve && transparent && policy.opacityConflict === 'reject')
    unsupported(transparent.line, 'd e Tr coexistem. Escolha qual definição de transparência usar.')
  const useTr = transparent !== null && (!dissolve || policy.opacityConflict === 'Tr')
  if (dissolve && transparent)
    issues.push({
      code: 'opacity-priority',
      line: useTr ? transparent.line : dissolve.line,
      selected: useTr ? 'Tr' : 'd',
      omittedLine: useTr ? dissolve.line : transparent.line,
    })
  if (useTr) alpha = 1 - unit(transparent.value, transparent.line)
  else if (dissolve) {
    if (dissolve.halo)
      unsupported(
        dissolve.line,
        'O halo depende da direção de visão; opacidade comum não preserva seu efeito.',
      )
    alpha = unit(dissolve.value, dissolve.line)
  } else assumed('opacity')

  const rough = scalar('Pr'),
    exponent = scalar('Ns'),
    metal = scalar('Pm')
  let roughness = 1,
    metalness = 0
  if (rough) {
    roughness = unit(rough.value, rough.line)
    if (exponent) issues.push({ code: 'parameter-omitted', line: exponent.line, keyword: 'Ns' })
  } else if (maps.roughness) {
    // A retained PBR roughness image does not inherit a legacy Phong exponent as a multiplier.
    assumed('roughness')
    if (exponent) issues.push({ code: 'parameter-omitted', line: exponent.line, keyword: 'Ns' })
  } else if (exponent) {
    if (policy.phongRoughness === 'reject')
      unsupported(
        exponent.line,
        'O brilho Phong precisa de uma aproximação explícita para rugosidade PBR.',
      )
    if (!Number.isFinite(exponent.value) || exponent.value < 0 || exponent.value > 1000)
      unsupported(
        exponent.line,
        'Esta aproximação de brilho só aceita Ns entre 0 e 1000, sem recorte.',
      )
    // Inverse of Blender's documented empirical Ns export, NOT an exact BRDF conversion.
    roughness = 1 - Math.sqrt(exponent.value / 1000)
    issues.push({ code: 'phong-roughness-approximated', line: exponent.line, method: 'blender' })
  } else assumed('roughness')
  if (metal) metalness = unit(metal.value, metal.line)
  else {
    metalness = maps.metalness ? 1 : 0
    assumed('metalness')
  }
  const illumination = properties.get('illum')
  if (illumination) {
    if (illumination.kind !== 'illumination') throw new Error('Source illumination kind mismatch')
    if (illumination.value !== 1 && illumination.value !== 2 && policy.illumination === 'reject')
      unsupported(
        illumination.line,
        'Este modelo de iluminação precisa de uma adaptação explícita para PBR.',
      )
    issues.push({
      code: 'illumination-adapted',
      line: illumination.line,
      model: illumination.value,
    })
  } else assumed('illumination')
  for (const property of properties.values())
    if (!['Kd', 'd', 'Tr', 'Pr', 'Pm', 'Ns', 'illum'].includes(property.keyword))
      issues.push({ code: 'parameter-omitted', line: property.line, keyword: property.keyword })
  return {
    baseColor: [baseRgb[0], baseRgb[1], baseRgb[2], alpha],
    linearColor,
    roughness,
    metalness,
    propertyIndices: [...effective.indices],
    mapIndices,
    issues,
  }
}

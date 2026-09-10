import type { SceneMaterial } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import type { BbmodelAppearance } from './bbmodelAppearance'
import { BBMODEL_INPUT_LIMITS, BbmodelInputError, requireBbmodel } from './bbmodelInput'
import { nativeImportName } from './nativeImportName'

export interface BbmodelTextureMaterialOptions {
  lighting?: 'reject' | 'molda-standard'
  autoSides?: 'reject' | 'front' | 'double'
  repeatWrap?: 'reject' | 'clamp'
  renderModes?: 'reject' | 'standard'
  pbrGroups?: 'reject' | 'texture-only'
}
export interface BbmodelTextureMaterialPlan {
  texture: number
  id: string
  name: string
  doubleSided: boolean
}
export type BbmodelTextureMaterialIssue = {
  texture: number
  path: string
  targetId: string
} & (
  | { code: 'texture-lighting-adapted' | 'name-generated' | 'name-shortened' }
  | { code: 'texture-sidedness-assumed'; doubleSided: boolean }
  | { code: 'texture-repeat-clamped' }
  | { code: 'texture-render-mode-adapted'; source: 'emissive' | 'additive' | 'layered' }
  | { code: 'pbr-group-texture-only'; group: number }
  | { code: 'pbr-channel-used-as-color'; source: 'normal' | 'height' | 'mer' }
)

function option<T extends string>(value: unknown, values: readonly T[], path: string): T {
  const chosen = value === undefined ? 'reject' : value
  requireBbmodel(
    values.some((entry) => entry === chosen),
    path,
    'Esta escolha de material não é conhecida.',
  )
  return chosen as T
}
export function readBbmodelTextureMaterialOptions(value: BbmodelTextureMaterialOptions) {
  requireBbmodel(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha como adaptar os materiais.',
  )
  for (const key of Object.keys(value))
    requireBbmodel(
      ['lighting', 'autoSides', 'repeatWrap', 'renderModes', 'pbrGroups'].includes(key),
      `options.${key}`,
      'Esta opção de material não é conhecida.',
    )
  return {
    lighting: option(value.lighting, ['reject', 'molda-standard'], 'options.lighting'),
    autoSides: option(value.autoSides, ['reject', 'front', 'double'], 'options.autoSides'),
    repeatWrap: option(value.repeatWrap, ['reject', 'clamp'], 'options.repeatWrap'),
    renderModes: option(value.renderModes, ['reject', 'standard'], 'options.renderModes'),
    pbrGroups: option(value.pbrGroups, ['reject', 'texture-only'], 'options.pbrGroups'),
  }
}
function unsupported(path: string, message: string): never {
  throw new BbmodelInputError('unsupported', path, message)
}
function budget(value: number, maximum: number): void {
  if (value > maximum)
    throw new BbmodelInputError('budget', 'textures', 'Há materiais demais para editar no Molda.')
}

/**
 * Flat texture interpretation, BEFORE resource selection/decode. No pixels or group material recipes.
 * Source textured preview is a custom shader, not native PBR: lighting/alpha/depth/color interpretation
 * requires explicit adaptation. Does not approve mesh shading, layers, frame-external UV or full source.
 */
export function planBbmodelTextureMaterials(
  appearance: BbmodelAppearance,
  textureIndices: readonly number[],
  options: BbmodelTextureMaterialOptions = {},
): { materials: BbmodelTextureMaterialPlan[]; issues: BbmodelTextureMaterialIssue[] } {
  const policy = readBbmodelTextureMaterialOptions(options)
  if (appearance.modelFormat !== 'free')
    unsupported('meta.model_format', 'Estes materiais precisam do formato genérico do Blockbench.')
  budget(textureIndices.length, BBMODEL_INPUT_LIMITS.textures)
  const selected = [...new Set(textureIndices)]
  budget(selected.length, SCENE_LIMITS.materials)
  const issues: BbmodelTextureMaterialIssue[] = []
  const materials = selected.map((index): BbmodelTextureMaterialPlan => {
    requireBbmodel(
      Number.isSafeInteger(index) && index >= 0 && index < appearance.textures.length,
      'textures',
      'A textura escolhida não existe.',
    )
    const texture = appearance.textures[index]!,
      path = `textures[${index}]`,
      id = `bbmodel_material_${index}`,
      at = { texture: index, targetId: id },
      mode = texture.renderMode,
      sides = texture.renderSides,
      channel = texture.pbrChannel,
      wrap = texture.wrapMode ?? 'limited'
    if (!['default', 'emissive', 'additive', 'layered'].includes(mode))
      unsupported(`${path}.render_mode`, 'Este modo de aparência ainda não é conhecido.')
    if (!['auto', 'front', 'double'].includes(sides))
      unsupported(`${path}.render_sides`, 'Este modo de mostrar os lados ainda não é conhecido.')
    if (!['limited', 'clamp', 'repeat'].includes(wrap))
      unsupported(`${path}.wrap_mode`, 'Este modo de repetir a textura ainda não é conhecido.')
    if (!['color', 'normal', 'height', 'mer'].includes(channel))
      unsupported(`${path}.pbr_channel`, 'Este canal de material ainda não é conhecido.')
    if (policy.lighting === 'reject')
      unsupported(
        'options.lighting',
        'Escolha adaptar a iluminação e a transparência à oficina do Molda.',
      )
    issues.push({ ...at, code: 'texture-lighting-adapted', path })
    if (mode !== 'default') {
      if (policy.renderModes === 'reject')
        unsupported(
          `${path}.render_mode`,
          'Esta textura usa um efeito especial. Escolha convertê-la em pintura comum.',
        )
      issues.push({
        ...at,
        code: 'texture-render-mode-adapted',
        path: `${path}.render_mode`,
        source: mode as 'emissive' | 'additive' | 'layered',
      })
    }
    if (wrap === 'repeat') {
      if (policy.repeatWrap === 'reject')
        unsupported(
          `${path}.wrap_mode`,
          'Esta textura se repete. Escolha usar as bordas da imagem sem repetição.',
        )
      issues.push({ ...at, code: 'texture-repeat-clamped', path: `${path}.wrap_mode` })
    }
    if (texture.group !== null && appearance.groups[texture.group]!.isMaterial) {
      if (policy.pbrGroups === 'reject')
        unsupported(
          `${path}.group`,
          'Esta textura faz parte de um material detalhado. Usar só sua imagem exige uma escolha.',
        )
      issues.push({
        ...at,
        code: 'pbr-group-texture-only',
        path: `${path}.group`,
        group: texture.group,
      })
    }
    if (channel !== 'color')
      issues.push({
        ...at,
        code: 'pbr-channel-used-as-color',
        path: `${path}.pbr_channel`,
        source: channel as 'normal' | 'height' | 'mer',
      })
    if (sides === 'auto' && policy.autoSides === 'reject')
      unsupported(
        `${path}.render_sides`,
        'A origem usa uma configuração da sessão. Escolha mostrar um lado ou os dois.',
      )
    const doubleSided = sides === 'double' || (sides === 'auto' && policy.autoSides === 'double'),
      { name, change } = nativeImportName(texture.name, `Material ${index + 1}`)
    if (sides === 'auto')
      issues.push({
        ...at,
        code: 'texture-sidedness-assumed',
        path: `${path}.render_sides`,
        doubleSided,
      })
    if (change) issues.push({ ...at, code: change, path: `${path}.name` })
    return { texture: index, id, name, doubleSided }
  })
  return { materials, issues }
}

/** Matching private material plans and image links from convertBbmodelImages; no image fallback. */
export function materializeBbmodelTextureMaterials(
  plans: readonly BbmodelTextureMaterialPlan[],
  imageLinks: ReadonlyMap<number, string>,
): { materials: SceneMaterial[]; byTexture: ReadonlyMap<number, string> } {
  budget(plans.length, SCENE_LIMITS.materials)
  const matched = plans.map((plan) => {
    const imageId = imageLinks.get(plan.texture)
    if (imageId === undefined) throw new Error('Missing bbmodel converted texture image')
    return { plan, imageId }
  })
  return {
    byTexture: new Map(plans.map((plan) => [plan.texture, plan.id])),
    materials: matched.map(({ plan, imageId }) => ({
      id: plan.id,
      name: plan.name,
      doubleSided: plan.doubleSided,
      // Native base lies UNDER paint. Opaque white would fill imported transparent texels.
      baseColor: { kind: 'rgba', value: [0, 0, 0, 0] },
      colorImageId: imageId,
      roughness: 1,
      metalness: 0,
    })),
  }
}

import type { BbmodelEnvelope } from './bbmodelEnvelope'
import {
  BBMODEL_INPUT_LIMITS,
  BbmodelInputError,
  bbmodelIdentifier,
  bbmodelList,
  bbmodelRecord,
  requireBbmodel,
} from './bbmodelInput'
import { bbmodelBoolean, bbmodelNumber } from './bbmodelValues'

export interface BbmodelTexture {
  uuid: string
  name: string | null
  group: number | null
  /** Cached declared pixel sizes, never an image allocation budget or proof of decoded dimensions. */
  width: number | null
  height: number | null
  /** Missing axis inherits project UV size later; never substitute cached pixel dimensions. */
  uvWidth: number | null
  uvHeight: number | null
  path: string | null
  relativePath: string | null
  embedded: string | null
  internal: boolean | null
  visible: boolean
  useAsDefault: boolean
  layersEnabled: boolean
  layers: readonly unknown[]
  renderMode: string
  renderSides: string
  wrapMode: string | null
  pbrChannel: string
  fileFormat: string
  fps: number | null
  frameTime: number | null
  frameOrderType: string
  frameOrder: string | null
  frameInterpolate: boolean
  source: Readonly<Record<string, unknown>>
}
export interface BbmodelTextureGroup {
  uuid: string
  name: string | null
  isMaterial: boolean
  materialConfig: Readonly<Record<string, unknown>> | null
  source: Readonly<Record<string, unknown>>
}
export interface BbmodelAppearance {
  modelFormat: string
  project: { uvWidth: number | null; uvHeight: number | null; boxUv: boolean | null }
  textures: BbmodelTexture[]
  groups: BbmodelTextureGroup[]
  byTextureUuid: ReadonlyMap<string, number>
  byGroupUuid: ReadonlyMap<string, number>
}

function optionalText(
  value: unknown,
  path: string,
  max: number = BBMODEL_INPUT_LIMITS.identifierChars,
): string | null {
  if (value === undefined) return null
  requireBbmodel(typeof value === 'string', path, 'Este campo precisa ser texto.')
  if (value.length > max)
    throw new BbmodelInputError('budget', path, 'Este texto é longo demais para abrir no Molda.')
  return value
}
function dimension(value: unknown, path: string, pixels: boolean): number | null {
  if (value === undefined) return null
  const result = bbmodelNumber(value, path)
  requireBbmodel(
    pixels ? Number.isSafeInteger(result) && result >= 0 : result > 0,
    path,
    pixels
      ? 'O tamanho declarado precisa ser um inteiro não negativo.'
      : 'O tamanho UV precisa ser positivo.',
  )
  return result
}
function optionalNumber(value: unknown, path: string): number | null {
  return value === undefined ? null : bbmodelNumber(value, path)
}
function unique(map: Map<string, number>, uuid: string, index: number, path: string): void {
  requireBbmodel(!map.has(uuid), path, 'Dois itens de aparência têm o mesmo identificador.')
  map.set(uuid, index)
}

/** Metadata only. No resource choice, path normalization, pixels, material recipes or animation execution. */
export function readBbmodelAppearance(envelope: BbmodelEnvelope): BbmodelAppearance {
  const source = envelope.json
  const textureRows = bbmodelList(source.textures, 'textures', BBMODEL_INPUT_LIMITS.textures)
  const groupRows = bbmodelList(
    source.texture_groups,
    'texture_groups',
    BBMODEL_INPUT_LIMITS.textureGroups,
  )
  let layers = 0,
    embeddedChars = 0
  // Budget every descriptor before reading numeric metadata or copying result records.
  const planned = Array.from(textureRows, (value, i) => {
    const path = `textures[${i}]`
    const row = bbmodelRecord(value, path)
    const list = bbmodelList(row.layers, `${path}.layers`, BBMODEL_INPUT_LIMITS.textureLayers)
    layers += list.length
    if (layers > BBMODEL_INPUT_LIMITS.textureLayers)
      throw new BbmodelInputError(
        'budget',
        'textures.layers',
        'Há camadas de textura demais neste arquivo.',
      )
    const embedded = optionalText(
      row.source,
      `${path}.source`,
      BBMODEL_INPUT_LIMITS.embeddedTextChars,
    )
    embeddedChars += embedded?.length ?? 0
    if (embeddedChars > BBMODEL_INPUT_LIMITS.embeddedTextChars)
      throw new BbmodelInputError(
        'budget',
        'textures.source',
        'As fontes de imagens embutidas são grandes demais.',
      )
    return { path, row, layers: list, embedded }
  })
  const meta = bbmodelRecord(source.meta, 'meta')
  const resolution =
    source.resolution === undefined ? null : bbmodelRecord(source.resolution, 'resolution')
  const project = {
    uvWidth: resolution === null ? null : dimension(resolution.width, 'resolution.width', false),
    uvHeight: resolution === null ? null : dimension(resolution.height, 'resolution.height', false),
    boxUv: meta.box_uv === undefined ? null : bbmodelBoolean(meta.box_uv, 'meta.box_uv', false),
  }
  const byGroupUuid = new Map<string, number>()
  const groups = Array.from(groupRows, (value, i): BbmodelTextureGroup => {
    const path = `texture_groups[${i}]`
    const row = bbmodelRecord(value, path)
    const uuid = bbmodelIdentifier(row.uuid, `${path}.uuid`)
    unique(byGroupUuid, uuid, i, `${path}.uuid`)
    return {
      uuid,
      name: optionalText(row.name, `${path}.name`),
      isMaterial: bbmodelBoolean(row.is_material, `${path}.is_material`, false),
      materialConfig:
        row.material_config === undefined
          ? null
          : bbmodelRecord(row.material_config, `${path}.material_config`),
      source: row,
    }
  })
  const byTextureUuid = new Map<string, number>()
  const textures = planned.map(({ path, row, layers, embedded }, i): BbmodelTexture => {
    const uuid = bbmodelIdentifier(row.uuid, `${path}.uuid`)
    unique(byTextureUuid, uuid, i, `${path}.uuid`)
    const groupId = optionalText(row.group, `${path}.group`)
    const group = groupId === null || groupId === '' ? null : byGroupUuid.get(groupId)
    requireBbmodel(
      group !== undefined,
      `${path}.group`,
      'A textura aponta para um grupo de aparência que não existe.',
    )
    return {
      uuid,
      group,
      embedded,
      name: optionalText(row.name, `${path}.name`),
      width: dimension(row.width, `${path}.width`, true),
      height: dimension(row.height, `${path}.height`, true),
      uvWidth: dimension(row.uv_width, `${path}.uv_width`, false),
      uvHeight: dimension(row.uv_height, `${path}.uv_height`, false),
      path: optionalText(row.path, `${path}.path`),
      relativePath: optionalText(row.relative_path, `${path}.relative_path`),
      internal:
        row.internal === undefined ? null : bbmodelBoolean(row.internal, `${path}.internal`, false),
      visible: bbmodelBoolean(row.visible, `${path}.visible`, true),
      useAsDefault: bbmodelBoolean(row.use_as_default, `${path}.use_as_default`, false),
      layersEnabled: bbmodelBoolean(row.layers_enabled, `${path}.layers_enabled`, false),
      layers,
      renderMode: optionalText(row.render_mode, `${path}.render_mode`) ?? 'default',
      renderSides: optionalText(row.render_sides, `${path}.render_sides`) ?? 'auto',
      wrapMode: optionalText(row.wrap_mode, `${path}.wrap_mode`),
      pbrChannel: optionalText(row.pbr_channel, `${path}.pbr_channel`) ?? 'color',
      fileFormat: optionalText(row.file_format, `${path}.file_format`) ?? 'png',
      fps: optionalNumber(row.fps, `${path}.fps`),
      frameTime: optionalNumber(row.frame_time, `${path}.frame_time`),
      frameOrderType: optionalText(row.frame_order_type, `${path}.frame_order_type`) ?? 'loop',
      frameOrder: optionalText(row.frame_order, `${path}.frame_order`),
      frameInterpolate: bbmodelBoolean(row.frame_interpolate, `${path}.frame_interpolate`, false),
      source: row,
    }
  })
  return {
    modelFormat: envelope.modelFormat,
    project,
    textures,
    groups,
    byTextureUuid,
    byGroupUuid,
  }
}

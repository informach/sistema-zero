import { SCENE_LIMITS } from '../scene/limits'
import type { BbmodelAppearance } from './bbmodelAppearance'
import { inspectBbmodelImageDataUri } from './bbmodelImageDataUri'
import type { BbmodelImageOptions } from './bbmodelImages'
import {
  BbmodelInputError,
  bbmodelIdentifier,
  bbmodelRecord,
  BBMODEL_INPUT_LIMITS as limits,
  requireBbmodel,
} from './bbmodelInput'
import type { BbmodelRemainderIssue } from './bbmodelRemainder'
import { bbmodelBoolean, bbmodelKeyPath, bbmodelNumber, bbmodelVec2 } from './bbmodelValues'
import type { ImportDataUri } from './importDataUri'

export interface BbmodelPaintLayer {
  path: string
  name: string
  visible: boolean
  /** Source percentage, before conversion to native opacity. */
  opacity: number
  offset: [number, number]
  scale: [number, number]
  blendMode: string
  width: number | null
  height: number | null
  dataUrl: string | null
  source: Readonly<Record<string, unknown>>
}
export interface BbmodelPaintLayerPlan {
  layers: ReadonlyMap<number, readonly BbmodelPaintLayer[]>
  resources: ReadonlyMap<string, { path: string; data: ImportDataUri }>
  resourceBytes: number
}

function text(value: unknown, path: string, fallback: string): string {
  if (value === undefined) return fallback
  requireBbmodel(typeof value === 'string', path, 'Este campo da camada precisa ser texto.')
  if (value.length > limits.identifierChars)
    throw new BbmodelInputError('budget', path, 'Este nome de camada é longo demais.')
  return value
}
function size(value: unknown, path: string): number | null {
  if (value === undefined) return null
  const number = bbmodelNumber(value, path)
  requireBbmodel(
    Number.isSafeInteger(number) && number >= 0,
    path,
    'O tamanho precisa ser inteiro e não negativo.',
  )
  return number
}

/** All active descriptor/text budgets precede numeric metadata. Inactive layers remain opaque. */
export function readBbmodelPaintLayers(
  appearance: BbmodelAppearance,
): ReadonlyMap<number, readonly BbmodelPaintLayer[]> {
  const headers: Array<{
    texture: number
    rows: Array<{ path: string; row: Record<string, unknown>; dataUrl: string | null }>
  }> = []
  let chars = appearance.textures.reduce(
      (sum, texture) => sum + (texture.embedded?.length ?? 0),
      0,
    ),
    count = 0
  for (const [texture, source] of appearance.textures.entries()) {
    if (!source.layersEnabled) continue
    count += source.layers.length
    if (count > limits.textureLayers)
      throw new BbmodelInputError(
        'budget',
        'textures.layers',
        'Há camadas de textura demais neste arquivo.',
      )
    headers.push({
      texture,
      rows: source.layers.map((raw, index) => {
        const path = `textures[${texture}].layers[${index}]`,
          row = bbmodelRecord(raw, path)
        const value = row.data_url
        requireBbmodel(
          value === undefined || typeof value === 'string',
          `${path}.data_url`,
          'A imagem da camada precisa ser texto.',
        )
        const dataUrl = value === undefined ? null : value
        chars += dataUrl?.length ?? 0
        if (chars > limits.embeddedTextChars)
          throw new BbmodelInputError(
            'budget',
            `${path}.data_url`,
            'As imagens embutidas e suas camadas ultrapassam o limite de texto.',
          )
        return { path, row, dataUrl }
      }),
    })
  }
  return new Map(
    headers.map(({ texture, rows }) => [
      texture,
      rows.map(({ path, row, dataUrl }): BbmodelPaintLayer => {
        const opacity =
          row.opacity === undefined ? 100 : bbmodelNumber(row.opacity, `${path}.opacity`)
        requireBbmodel(
          opacity >= 0 && opacity <= 100,
          `${path}.opacity`,
          'A força da camada precisa ficar entre 0 e 100.',
        )
        return {
          path,
          dataUrl,
          source: row,
          name: text(row.name, `${path}.name`, 'layer'),
          visible: bbmodelBoolean(row.visible, `${path}.visible`, true),
          opacity,
          offset: row.offset === undefined ? [0, 0] : bbmodelVec2(row.offset, `${path}.offset`),
          scale: row.scale === undefined ? [1, 1] : bbmodelVec2(row.scale, `${path}.scale`),
          blendMode: text(row.blend_mode, `${path}.blend_mode`, 'default'),
          width: size(row.width, `${path}.width`),
          height: size(row.height, `${path}.height`),
        }
      }),
    ]),
  )
}

const fields = new Set([
  'name',
  'visible',
  'opacity',
  'offset',
  'scale',
  'blend_mode',
  'width',
  'height',
  'data_url',
])
function unsupported(path: string, message: string): never {
  throw new BbmodelInputError('unsupported', path, message)
}

/** Selected, representable saved layers only. Never substitute the root bitmap or execute session data. */
export function planBbmodelPaintLayers(
  all: ReadonlyMap<number, readonly BbmodelPaintLayer[]>,
  indices: readonly number[],
  options: Required<BbmodelImageOptions>,
  unmapped: 'reject' | 'discard',
  onIssue: (issue: BbmodelRemainderIssue) => void,
): BbmodelPaintLayerPlan {
  const layers = new Map<number, readonly BbmodelPaintLayer[]>(),
    resources = new Map<string, { path: string; data: ImportDataUri }>()
  let resourceBytes = 0
  for (const texture of indices) {
    const rows = all.get(texture)
    if (!rows) continue
    const at = `textures[${texture}]`
    if (options.layers === 'reject')
      unsupported(
        `${at}.layers_enabled`,
        'Esta textura usa camadas. Escolha se deseja trazê-las como camadas editáveis do Molda.',
      )
    if (rows.length === 0)
      unsupported(
        `${at}.layers`,
        'Esta textura tem camadas ativas, mas não guarda nenhuma camada. Salve uma cópia completa no Blockbench.',
      )
    if (rows.length > SCENE_LIMITS.layersPerImage)
      throw new BbmodelInputError(
        'budget',
        `${at}.layers`,
        'Uma imagem pode ter até 32 camadas editáveis no Molda.',
      )
    layers.set(texture, rows)
  }
  // Count all selected layer headers before inspecting individual properties or Data URIs.
  for (const rows of layers.values())
    for (const layer of rows) {
      const { path, source } = layer
      if (Object.hasOwn(source, 'image_data') || Object.hasOwn(source, 'in_limbo'))
        unsupported(
          path,
          'Esta camada contém dados temporários de edição. Salve uma cópia do modelo antes de importar.',
        )
      if (layer.offset.some((value) => value !== 0))
        unsupported(
          `${path}.offset`,
          'Esta camada está deslocada. Por enquanto, importe camadas alinhadas à imagem inteira.',
        )
      if (layer.scale.some((value) => value !== 1))
        unsupported(
          `${path}.scale`,
          'Esta camada está esticada ou invertida. Por enquanto, importe camadas no tamanho original.',
        )
      if (layer.blendMode !== 'default')
        unsupported(
          `${path}.blend_mode`,
          'Esta camada usa uma mistura especial. Por enquanto, apenas a mistura normal mantém camadas editáveis.',
        )
      for (const key of Object.keys(source)) {
        if (fields.has(key)) continue
        bbmodelIdentifier(key, path)
        const location = bbmodelKeyPath(path, key)
        if (unmapped === 'reject')
          unsupported(
            location,
            'Este campo de camada ainda não é convertido. Escolha se deseja abrir uma cópia sem ele.',
          )
        onIssue({ code: 'unmapped-field-discarded', path: location })
      }
      if (!layer.dataUrl)
        unsupported(
          `${path}.data_url`,
          'Falta a imagem embutida desta camada. Salve uma cópia com as imagens no Blockbench.',
        )
      if (resources.has(layer.dataUrl)) continue
      const location = `${path}.data_url`,
        inspected = inspectBbmodelImageDataUri(layer.dataUrl, location)
      if (inspected.mimeType !== 'image/png')
        unsupported(location, 'A imagem de uma camada salva precisa ser PNG embutido.')
      resourceBytes += inspected.data.byteLength
      if (resources.size + 1 > limits.resources || resourceBytes > limits.fileBytes)
        throw new BbmodelInputError(
          'budget',
          location,
          'Os recursos das camadas ultrapassam o limite do Molda.',
        )
      resources.set(layer.dataUrl, { path: location, data: inspected.data })
    }
  return { layers, resources, resourceBytes }
}

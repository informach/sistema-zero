import { reverseRgbaRowsInPlace } from '../core/rgbaRows'
import type { SceneImage } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import type { BbmodelAppearance, BbmodelTexture } from './bbmodelAppearance'
import { BbmodelInputError, requireBbmodel } from './bbmodelInput'
import type { BbmodelRasters } from './bbmodelRasters'
import type { BbmodelTextureLayout } from './bbmodelTextureLayouts'
import { nativeImportName } from './nativeImportName'

export interface BbmodelImageOptions {
  rgba16?: 'reject' | 'round-to-rgba8'
  layers?: 'reject' | 'molda-layers'
}
export interface BbmodelImageIssue {
  code: 'rgba16-to-rgba8' | 'name-generated' | 'name-shortened' | 'inactive-texture-layers-omitted'
  texture: number
  path: string
  targetId: string
  /** Source layer descriptors, only for inactive-texture-layers-omitted. */
  count?: number
}

export function readBbmodelImageOptions(value: BbmodelImageOptions) {
  requireBbmodel(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha opções de imagem.',
  )
  for (const key of Object.keys(value))
    requireBbmodel(
      key === 'rgba16' || key === 'layers',
      `options.${key}`,
      'Esta opção de imagem não é conhecida.',
    )
  const rgba16 = value.rgba16 === undefined ? 'reject' : value.rgba16
  requireBbmodel(
    rgba16 === 'reject' || rgba16 === 'round-to-rgba8',
    'options.rgba16',
    'Escolha se permite converter os canais de 16 para 8 bits.',
  )
  const layers = value.layers === undefined ? 'reject' : value.layers
  requireBbmodel(
    layers === 'reject' || layers === 'molda-layers',
    'options.layers',
    'Escolha se deseja adaptar as camadas à pintura do Molda.',
  )
  return { rgba16, layers }
}
function budget(value: number, maximum: number): void {
  if (value > maximum)
    throw new BbmodelInputError(
      'budget',
      'textures',
      'As imagens ultrapassam o orçamento de edição do Molda.',
    )
}

/** Same flat-image gate can run before opening any resource; bitmap source is not layer composition. */
export function requireBbmodelFlatImage(texture: BbmodelTexture, index: number): void {
  if (texture.layersEnabled)
    throw new BbmodelInputError(
      'unsupported',
      `textures[${index}].layers_enabled`,
      'Esta textura usa camadas; o bitmap selecionado não substitui a composição dessas camadas.',
    )
}

/**
 * Selected flat bitmaps from matching private appearance/decoded/layout stages.
 * One independently editable image per source texture, even when raster bytes alias.
 * No layer flattening, transfer curve, premultiplication, alpha threshold, PBR or sampler approval.
 * Callers must also retain resource, layout and full appearance compatibility reports.
 */
export function convertBbmodelImages(
  appearance: BbmodelAppearance,
  decoded: BbmodelRasters,
  layouts: readonly BbmodelTextureLayout[],
  options: BbmodelImageOptions = {},
): {
  images: SceneImage[]
  byTexture: ReadonlyMap<number, string>
  pixelBytes: number
  issues: BbmodelImageIssue[]
} {
  const policy = readBbmodelImageOptions(options)
  if (appearance.modelFormat !== 'free')
    throw new BbmodelInputError(
      'unsupported',
      'meta.model_format',
      'Estas imagens precisam do formato genérico do Blockbench.',
    )
  budget(layouts.length, SCENE_LIMITS.images)
  const pixelBytes = layouts.reduce((sum, layout) => sum + layout.width * layout.height * 4, 0)
  budget(pixelBytes, SCENE_LIMITS.pixelBytes)
  const byTexture = new Map<number, string>(),
    issues: BbmodelImageIssue[] = []
  // Match EVERY stage and precision/layer policy before reading or copying ANY source pixel.
  const planned = layouts.map((layout) => {
    const index = layout.texture,
      texture = appearance.textures[index],
      raster = decoded.rasters[layout.raster],
      path = `textures[${index}]`
    if (
      !texture ||
      !raster ||
      byTexture.has(index) ||
      decoded.textures.get(index) !== layout.raster ||
      raster.width !== layout.width ||
      raster.height !== layout.height
    )
      throw new Error('Mismatched bbmodel image stages')
    requireBbmodelFlatImage(texture, index)
    if (raster.depth === 16 && policy.rgba16 === 'reject')
      throw new BbmodelInputError(
        'unsupported',
        path,
        'A imagem tem canais de 16 bits. Escolha a conversão para 8 bits para torná-la editável.',
      )
    const id = `bbmodel_image_${index}`,
      { name, change } = nativeImportName(texture.name, `Imagem ${index + 1}`)
    byTexture.set(index, id)
    if (change) issues.push({ code: change, texture: index, path: `${path}.name`, targetId: id })
    if (raster.depth === 16)
      issues.push({ code: 'rgba16-to-rgba8', texture: index, path, targetId: id })
    if (texture.layers.length)
      issues.push({
        code: 'inactive-texture-layers-omitted',
        texture: index,
        path: `${path}.layers`,
        targetId: id,
        count: texture.layers.length,
      })
    return { id, name, raster, layout }
  })
  const images = planned.map(({ id, name, raster, layout }): SceneImage => {
    // Uint8Array construction owns bytes even when a private raster is backed by a Node Buffer.
    const pixels =
      raster.depth === 8
        ? new Uint8Array(raster.rgba)
        : Uint8Array.from(raster.rgba, (sample) => Math.round(sample / 257))
    reverseRgbaRowsInPlace(pixels, layout.width, layout.height)
    return {
      id,
      name,
      width: layout.width,
      height: layout.height,
      encoding: 'rgba',
      layers: [{ id: `${id}_layer`, name: 'Imagem importada', visible: true, opacity: 1, pixels }],
      ...(layout.flipbook === null
        ? {}
        : {
            flipbook: { ...layout.flipbook, frames: [...layout.flipbook.frames] },
          }),
    }
  })
  return { images, byTexture, pixelBytes, issues }
}

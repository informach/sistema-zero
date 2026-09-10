import { reverseRgbaRowsInPlace } from '../core/rgbaRows'
import type { SceneImage } from '../scene/document'
import type { BbmodelAppearance } from './bbmodelAppearance'
import { type BbmodelImageOptions, convertBbmodelImages } from './bbmodelImages'
import type { BbmodelPaintLayerPlan } from './bbmodelPaintLayers'
import type { BbmodelPaintRasters } from './bbmodelPaintRasters'
import type { BbmodelTextureLayout } from './bbmodelTextureLayouts'
import { nativeImportName } from './nativeImportName'

export interface BbmodelPaintImageIssue {
  code: 'paint-layers-adapted'
  texture: number
  path: string
  targetId: string
  /** Root bitmap supplies dimensions, NEVER the paint pixels of this image. */
  rootBitmap: 'dimensions-only'
  composition: 'molda-source-over'
  layers: Array<{
    layer: number
    targetId: string
    sourceName: string
    nameChange: 'name-generated' | 'name-shortened' | null
    visible: boolean
    sourceOpacity: number
    declared: [number | null, number | null]
    actual: [number, number]
    rgba16: boolean
  }>
}

/** Matching preflighted private stages. No flattening, cropping or padding; every layer owns its RGBA bytes. */
export function convertBbmodelPaintImages(
  appearance: BbmodelAppearance,
  decoded: BbmodelPaintRasters,
  layouts: readonly BbmodelTextureLayout[],
  plan: BbmodelPaintLayerPlan,
  options: Required<BbmodelImageOptions>,
) {
  const flat = convertBbmodelImages(
      appearance,
      decoded,
      layouts.filter((layout) => !plan.layers.has(layout.texture)),
      options,
    ),
    byTexture = new Map(flat.byTexture),
    byId = new Map(flat.images.map((image) => [image.id, image])),
    issues: BbmodelPaintImageIssue[] = []
  let pixelBytes = flat.pixelBytes
  const images = layouts.map((layout): SceneImage => {
    const rows = plan.layers.get(layout.texture),
      id = `bbmodel_image_${layout.texture}`
    if (!rows) {
      const image = byId.get(id)
      if (!image) throw new Error('Missing bbmodel flat image')
      return image
    }
    const texture = appearance.textures[layout.texture]
    if (!texture || options.layers !== 'molda-layers')
      throw new Error('Mismatched bbmodel paint image stages')
    const { name, change } = nativeImportName(texture.name, `Imagem ${layout.texture + 1}`)
    if (change)
      flat.issues.push({
        code: change,
        texture: layout.texture,
        path: `textures[${layout.texture}].name`,
        targetId: id,
      })
    const details: BbmodelPaintImageIssue['layers'] = []
    const layers = rows.map((row, index) => {
      const rasterIndex = decoded.paint.get(row.dataUrl!)
      if (rasterIndex === undefined) throw new Error('Missing bbmodel paint pixels')
      const raster = decoded.rasters[rasterIndex]!,
        targetId = `${id}_layer_${index}`,
        layerName = nativeImportName(row.name, `Camada ${index + 1}`),
        pixels =
          raster.depth === 8
            ? new Uint8Array(raster.rgba)
            : Uint8Array.from(raster.rgba, (sample) => Math.round(sample / 257))
      reverseRgbaRowsInPlace(pixels, layout.width, layout.height)
      pixelBytes += pixels.byteLength
      details.push({
        layer: index,
        targetId,
        sourceName: row.name,
        nameChange: layerName.change,
        visible: row.visible,
        sourceOpacity: row.opacity,
        declared: [row.width, row.height],
        actual: [raster.width, raster.height],
        rgba16: raster.depth === 16,
      })
      return {
        id: targetId,
        name: layerName.name,
        visible: row.visible,
        opacity: row.opacity / 100,
        pixels,
      }
    })
    issues.push({
      code: 'paint-layers-adapted',
      texture: layout.texture,
      path: `textures[${layout.texture}].layers`,
      targetId: id,
      rootBitmap: 'dimensions-only',
      composition: 'molda-source-over',
      layers: details,
    })
    byTexture.set(layout.texture, id)
    return {
      id,
      name,
      width: layout.width,
      height: layout.height,
      encoding: 'rgba',
      layers,
      ...(layout.flipbook === null
        ? {}
        : { flipbook: { ...layout.flipbook, frames: [...layout.flipbook.frames] } }),
    }
  })
  return { images, byTexture, pixelBytes, issues: flat.issues, paintIssues: issues }
}

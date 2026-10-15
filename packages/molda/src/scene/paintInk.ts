import { hexToRgb, rgbToHex } from '../core/color'
import { resolvePaletteColors } from '../core/sanitize'
import type { Texel } from '../paint/skinPaint'
import { finishSceneCommand } from './commandContext'
import { compositeSceneImageRegion, scenePalette } from './composite'
import type { MoldaSceneDocument, SceneImage, SceneMaterial } from './document'
import { convertSceneImageRgba } from './imageOperations'
import type { ScenePaintColor, ScenePaintRgba } from './imagePaint'
import { sceneMaterialImageBase } from './materialImages'
import { addScenePaletteColor } from './paletteCommands'

/** Ink is a visual color. Palette indices belong to a document, never to a tool. */
export function sceneInkRgba(document: MoldaSceneDocument, color: ScenePaintColor): ScenePaintRgba {
  if (typeof color !== 'number') return [...color]
  if (color === 0) return [0, 0, 0, 0]
  return [...hexToRgb(resolvePaletteColors(document)[color] ?? '#78dc52'), 255]
}

/** Pure preparation: the caller commits this together with the first actual paint action. */
export function prepareSceneInk(
  document: MoldaSceneDocument,
  imageId: string,
  ink: ScenePaintColor,
) {
  const image = document.images.find((entry) => entry.id === imageId)!
  const rgba = sceneInkRgba(document, ink)
  if (image.encoding === 'rgba') return { document, color: rgba as ScenePaintColor }
  if (rgba[3] === 0) return { document, color: 0 as ScenePaintColor }
  if (rgba[3] === 255) {
    const entry = addScenePaletteColor(document, rgbToHex(rgba[0], rgba[1], rgba[2]))
    if (entry) return { document: entry.document, color: entry.index as ScenePaintColor }
  }
  const converted = convertSceneImageRgba(image, scenePalette(document))
  return {
    document: finishSceneCommand({
      ...document,
      images: document.images.map((entry) => (entry === image ? converted : entry)),
    }),
    color: rgba as ScenePaintColor,
  }
}

/** Visible authoring color, including lower layers and base; lighting is intentionally absent. */
export function sampleSceneInk(
  document: MoldaSceneDocument,
  material: SceneMaterial,
  image: SceneImage | undefined,
  point: Texel = [0, 0],
  kind: Parameters<typeof sceneMaterialImageBase>[2] = 'color',
): ScenePaintRgba {
  const palette = scenePalette(document)
  const base = sceneMaterialImageBase(material, palette, kind)
  if (!image) return base.map((value) => Math.round(value * 255)) as ScenePaintRgba
  const [x, y] = point
  const pixel = compositeSceneImageRegion(image, palette, base, { x0: x, y0: y, x1: x, y1: y })
  return [pixel[0]!, pixel[1]!, pixel[2]!, pixel[3]!]
}

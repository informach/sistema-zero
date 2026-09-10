import type { ScenePixelRegion } from './composite'
import type { SceneImage } from './document'
import { readImageRegion } from './imageRegion'
import { SCENE_LIMITS } from './limits'
import * as v from './validation'

/** Owned RGBA8 pixels, authorial row zero at V=0. No palette quantization or resizing. */
export interface SceneRgbaRaster {
  width: number
  height: number
  pixels: Uint8Array
}
export function validateSceneRgbaRaster(raw: unknown): SceneRgbaRaster {
  const row = v.record(raw, 'raster', ['width', 'height', 'pixels'])
  const width = v.number(row.width, 'width', 1, SCENE_LIMITS.imageSide, true)
  const height = v.number(row.height, 'height', 1, SCENE_LIMITS.imageSide, true)
  v.requireScene(
    row.pixels instanceof Uint8Array && row.pixels.byteLength === width * height * 4,
    'pixels',
    'Quantidade de pixels inválida.',
  )
  return { width, height, pixels: row.pixels }
}
export function sceneRasterFromCanvas(
  width: number,
  height: number,
  bytes: Uint8ClampedArray,
): SceneRgbaRaster {
  v.requireScene(bytes instanceof Uint8ClampedArray, 'pixels', 'Pixels RGBA esperados.')
  const source = validateSceneRgbaRaster({
    width,
    height,
    pixels: new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength),
  })
  const pixels = new Uint8Array(source.pixels.length)
  const stride = width * 4
  for (let row = 0; row < height; row++)
    pixels.set(
      source.pixels.subarray(row * stride, (row + 1) * stride),
      (height - row - 1) * stride,
    )
  return { width, height, pixels }
}
export function sceneRasterPreview(raster: SceneRgbaRaster, name: string): SceneImage {
  return {
    id: 'import-preview',
    name,
    width: raster.width,
    height: raster.height,
    encoding: 'rgba',
    layers: [
      { id: 'import-preview-layer', name, visible: true, opacity: 1, pixels: raster.pixels },
    ],
  }
}

/** Copy one authored layer, not the composite; selection bytes become an independent stamp. */
export function captureSceneLayerRaster(
  image: SceneImage,
  layerId: string,
  region: ScenePixelRegion,
): SceneRgbaRaster {
  v.requireScene(
    image.encoding === 'rgba',
    'image',
    'Converta a imagem para cores livres antes de copiar um carimbo.',
  )
  const layer = image.layers.find((entry) => entry.id === layerId)
  v.requireScene(layer, 'layer', 'Essa camada não existe mais.')
  const { x0, x1, y0, y1 } = readImageRegion(region, image)
  const width = x1 - x0 + 1,
    height = y1 - y0 + 1
  const pixels = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    const offset = ((y + y0) * image.width + x0) * 4
    pixels.set(layer.pixels.subarray(offset, offset + width * 4), y * width * 4)
  }
  return { width, height, pixels }
}

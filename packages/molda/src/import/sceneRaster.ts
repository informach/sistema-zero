import { sceneRasterFromCanvas } from '../scene/imageImport'
import { SCENE_LIMITS } from '../scene/limits'
import { decodeLocalRaster } from './decodeLocalRaster'
import { checkReferenceDimensions, ReferenceImageError } from './rasterHeader'

/** Browser decoding is color-managed. Preserve its RGBA bytes and dimensions, not compressed file metadata. */
export async function loadSceneRaster(file: File, signal: AbortSignal) {
  const decoded = await decodeLocalRaster(file, signal, (width, height) => {
    checkReferenceDimensions(width, height)
    if (width > SCENE_LIMITS.imageSide || height > SCENE_LIMITS.imageSide)
      throw new ReferenceImageError('size')
  })
  let canvas: HTMLCanvasElement | undefined
  try {
    signal.throwIfAborted()
    canvas = document.createElement('canvas')
    canvas.width = decoded.width
    canvas.height = decoded.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new ReferenceImageError('decode')
    context.drawImage(decoded.image, 0, 0)
    const data = context.getImageData(0, 0, decoded.width, decoded.height)
    const raster = sceneRasterFromCanvas(decoded.width, decoded.height, data.data)
    signal.throwIfAborted()
    return { name: decoded.name, raster }
  } catch (error) {
    if (signal.aborted) throw signal.reason
    throw error instanceof ReferenceImageError ? error : new ReferenceImageError('decode')
  } finally {
    decoded.dispose()
    if (canvas) canvas.width = canvas.height = 0
  }
}

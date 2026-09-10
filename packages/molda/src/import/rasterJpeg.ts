import { decode, type RawImageData } from 'jpeg-js'
import { SCENE_LIMITS } from '../scene/limits'
import { RASTER_INPUT_LIMITS, RasterInputError, requireRaster } from './rasterInput'
import { planRasterJpeg, type RasterJpegPlan } from './rasterJpegPlan'

export interface RasterJpegRaster {
  width: number
  height: number
  depth: 8
  rgba: Uint8Array
}

/** Consume only the private, unchanged source just checked by planRasterJpeg. */
export function decodeRasterJpegPlan(
  bytes: Uint8Array,
  plan: RasterJpegPlan,
  path: string,
): RasterJpegRaster {
  let result: RawImageData<Uint8Array>
  try {
    result = decode(bytes, {
      useTArray: true,
      formatAsRGBA: true,
      tolerantDecoding: false,
      colorTransform: plan.colorTransform,
      maxResolutionInMP: SCENE_LIMITS.imageSide ** 2 / 1e6,
      maxMemoryUsageInMB: RASTER_INPUT_LIMITS.jpegMemoryMiB,
    })
  } catch (error) {
    // jpeg-js 0.4.4 exposes no error codes. Keep this versioned adapter local;
    // never return partial pixels or replace an invalid image with a fallback.
    const budget =
      error instanceof Error && error.message.startsWith('maxMemoryUsageInMB limit exceeded')
    throw new RasterInputError(
      budget ? 'budget' : 'invalid',
      path,
      budget
        ? 'O JPEG ultrapassa o limite de memória do decoder.'
        : 'Não foi possível decodificar os pixels JPEG.',
      { cause: error },
    )
  }
  requireRaster(
    result.width === plan.width &&
      result.height === plan.height &&
      result.data.length === plan.width * plan.height * 4,
    path,
    'A saída JPEG difere do cabeçalho.',
  )
  return { width: plan.width, height: plan.height, depth: 8, rgba: result.data }
}

/** Pure synchronous decoder intended for the import worker, not the UI thread. */
export function decodeRasterJpeg(bytes: Uint8Array, path = 'image'): RasterJpegRaster {
  return decodeRasterJpegPlan(bytes, planRasterJpeg(bytes, path), path)
}

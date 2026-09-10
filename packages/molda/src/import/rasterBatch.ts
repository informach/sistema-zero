import { SCENE_LIMITS } from '../scene/limits'
import { RasterInputError, requireRaster } from './rasterInput'
import { decodeRasterJpegPlan } from './rasterJpeg'
import { planRasterJpeg, type RasterJpegPlan } from './rasterJpegPlan'
import { decodeRasterPngPlan, type RasterPixels } from './rasterPng'
import { planRasterPng, type RasterPngPlan } from './rasterPngPlan'

export interface RasterSource<K> {
  key: K
  path: string
  bytes: Uint8Array
  /** Absent hints impose no format. Every authored non-null hint must match the signature. */
  mimeTypes?: readonly (string | null)[]
}
export interface RasterBatch<K> {
  images: Map<K, number>
  /** Owned RGBA, shared read-only when multiple sources refer to the exact same byte interval. */
  rasters: RasterPixels[]
  pixelBytes: number
}
type RasterPlan = { bytes: Uint8Array; path: string } & (
  | { mime: 'image/png'; plan: RasterPngPlan }
  | { mime: 'image/jpeg'; plan: RasterJpegPlan }
)

function rasterMime(bytes: Uint8Array, path: string) {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  throw new RasterInputError('unsupported', path, 'A textura precisa ser PNG ou JPEG reconhecível.')
}

/**
 * Consume only private immutable import resources. Plan ALL unique images before decoding any
 * pixels, with no IO, async yield or plan publication between validation and consumption.
 * Importer-owned iterators provide validated keys/paths, preserving their format's error order.
 */
export function planRasterBatch<K extends string | number>(sources: Iterable<RasterSource<K>>) {
  const images = new Map<K, number>(),
    intervals = new Map<ArrayBufferLike, Map<string, number>>(),
    plans: RasterPlan[] = []
  let pixelBytes = 0,
    count = 0
  for (const source of sources) {
    if (++count > SCENE_LIMITS.images)
      throw new RasterInputError('budget', 'images', 'Há imagens selecionadas demais para o Molda.')
    if (images.has(source.key)) continue
    const { bytes, path } = source,
      mime = rasterMime(bytes, path)
    for (const declared of source.mimeTypes ?? [])
      requireRaster(
        declared === null || declared === mime,
        path,
        'O formato declarado não corresponde à imagem.',
      )
    const key = `${bytes.byteOffset}:${bytes.byteLength}`,
      bufferIntervals = intervals.get(bytes.buffer),
      existing = bufferIntervals?.get(key)
    if (existing !== undefined) {
      images.set(source.key, existing)
      continue
    }
    const entry: RasterPlan =
      mime === 'image/png'
        ? { mime, bytes, path, plan: planRasterPng(bytes, path) }
        : { mime, bytes, path, plan: planRasterJpeg(bytes, path) }
    const depth = entry.mime === 'image/png' && entry.plan.depth === 16 ? 2 : 1
    pixelBytes += entry.plan.width * entry.plan.height * 4 * depth
    if (pixelBytes > SCENE_LIMITS.pixelBytes)
      throw new RasterInputError('budget', path, 'Os pixels das texturas ultrapassam 32 MiB.')
    const raster = plans.length
    plans.push(entry)
    images.set(source.key, raster)
    if (bufferIntervals) bufferIntervals.set(key, raster)
    else intervals.set(bytes.buffer, new Map([[key, raster]]))
  }
  return { images, pixelBytes, plans }
}

/** Matching private immutable plan; no asynchronous gap, mutation or publication before consumption. */
export function decodeRasterBatchPlan<K extends string | number>(
  batch: ReturnType<typeof planRasterBatch<K>>,
): RasterBatch<K> {
  return {
    images: batch.images,
    pixelBytes: batch.pixelBytes,
    rasters: batch.plans.map((entry) =>
      entry.mime === 'image/png'
        ? decodeRasterPngPlan(entry.plan, entry.path)
        : decodeRasterJpegPlan(entry.bytes, entry.plan, entry.path),
    ),
  }
}

export function decodeRasterBatch<K extends string | number>(
  sources: Iterable<RasterSource<K>>,
): RasterBatch<K> {
  return decodeRasterBatchPlan(planRasterBatch(sources))
}

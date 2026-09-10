import { MOLDA_LIMITS } from '../core/limits'
import {
  checkReferenceDimensions,
  inspectReferenceRaster,
  ReferenceImageError,
} from './rasterHeader'

/** One decoder and object URL, owned by the caller after success; abort/failure releases both. */
export async function decodeLocalRaster(
  file: File,
  signal: AbortSignal,
  checkDimensions = checkReferenceDimensions,
) {
  signal.throwIfAborted()
  if (file.size > MOLDA_LIMITS.referenceFileBytes) throw new ReferenceImageError('size')
  const bytes = new Uint8Array(await file.arrayBuffer())
  signal.throwIfAborted()
  const header = inspectReferenceRaster(bytes)
  checkDimensions(header.width, header.height)
  const url = URL.createObjectURL(new Blob([bytes], { type: header.mime }))
  let image: HTMLImageElement | undefined
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    image?.removeAttribute('src')
    URL.revokeObjectURL(url)
  }
  signal.addEventListener('abort', dispose, { once: true })
  try {
    image = new Image()
    image.src = url
    await image.decode()
    signal.throwIfAborted()
    checkDimensions(image.naturalWidth, image.naturalHeight)
    // Native JPEG orientation may exchange the axes, but may not change pixel count.
    if (image.naturalWidth * image.naturalHeight !== header.width * header.height)
      throw new ReferenceImageError('decode')
    return {
      image,
      url,
      name: file.name.slice(0, 120),
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose,
    }
  } catch (error) {
    dispose()
    if (signal.aborted) throw signal.reason
    throw error instanceof ReferenceImageError ? error : new ReferenceImageError('decode')
  } finally {
    signal.removeEventListener('abort', dispose)
  }
}

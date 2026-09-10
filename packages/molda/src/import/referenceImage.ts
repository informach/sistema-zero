import { decodeLocalRaster } from './decodeLocalRaster'

export interface ReferenceImage {
  url: string
  name: string
  width: number
  height: number
  dispose(): void
}

/** Own one local URL until replacement/removal/unmount. No uploads, external URLs or document writes. */
export async function loadReferenceImage(file: File, signal: AbortSignal): Promise<ReferenceImage> {
  const { image, ...reference } = await decodeLocalRaster(file, signal)
  try {
    signal.throwIfAborted()
    return reference
  } catch (error) {
    reference.dispose()
    throw error
  } finally {
    image.removeAttribute('src')
  }
}

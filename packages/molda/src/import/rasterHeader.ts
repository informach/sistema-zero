import { MOLDA_LIMITS } from '../core/limits'

export type ReferenceImageFailure = 'size' | 'format' | 'animated' | 'decode'
export class ReferenceImageError extends Error {
  constructor(readonly reason: ReferenceImageFailure) {
    super(`Reference image: ${reason}`)
    this.name = 'ReferenceImageError'
  }
}
export interface RasterHeader {
  width: number
  height: number
  mime: 'image/png' | 'image/jpeg'
}

export function checkReferenceDimensions(width: number, height: number): void {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0)
    throw new ReferenceImageError('format')
  if (
    width > MOLDA_LIMITS.referenceImageSide ||
    height > MOLDA_LIMITS.referenceImageSide ||
    width * height > MOLDA_LIMITS.referenceImagePixels
  )
    throw new ReferenceImageError('size')
}

/** Bounds preflight, not a replacement for native decoding. Never trust file extension/MIME.
 * Layouts: W3C PNG §5/11.2.1/11.3.6 and ITU-T T.81 Annex B.2.2.
 */
export function inspectReferenceRaster(bytes: Uint8Array): RasterHeader {
  if (bytes.byteLength > MOLDA_LIMITS.referenceFileBytes) throw new ReferenceImageError('size')
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const invalid = () => {
    throw new ReferenceImageError('format')
  }
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value)) {
    if (bytes.length < 33 || data.getUint32(8) !== 13 || data.getUint32(12) !== 0x49484452)
      return invalid()
    const width = data.getUint32(16),
      height = data.getUint32(20)
    checkReferenceDimensions(width, height)
    let imageData = false
    for (let offset = 8; offset + 12 <= bytes.length; ) {
      const length = data.getUint32(offset),
        type = data.getUint32(offset + 4)
      const next = offset + length + 12
      if (next > bytes.length) return invalid()
      // Animated references must not create an unbounded background animation loop.
      if (type === 0x6163544c || type === 0x6663544c || type === 0x66644154)
        throw new ReferenceImageError('animated')
      if (type === 0x49484452 && offset !== 8) return invalid()
      if (type === 0x49444154) imageData = true
      if (type === 0x49454e44) {
        if (length !== 0 || !imageData || next !== bytes.length) return invalid()
        return { width, height, mime: 'image/png' }
      }
      offset = next
    }
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let offset = 2; offset + 4 <= bytes.length; ) {
      if (bytes[offset++] !== 0xff) return invalid()
      while (bytes[offset] === 0xff) offset++
      const marker = bytes[offset++]
      if (marker === undefined || marker === 0 || marker === 0xda || marker === 0xd9)
        return invalid()
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
      if (offset + 2 > bytes.length) return invalid()
      const length = data.getUint16(offset)
      if (length < 2 || offset + length > bytes.length) return invalid()
      // Baseline/extended/progressive Huffman JPEG supported by browser decoders.
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        if (length < 8) return invalid()
        const height = data.getUint16(offset + 3),
          width = data.getUint16(offset + 5)
        checkReferenceDimensions(width, height)
        return { width, height, mime: 'image/jpeg' }
      }
      offset += length
    }
  }
  return invalid()
}

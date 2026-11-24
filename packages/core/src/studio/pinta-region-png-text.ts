/** Encoded-file boundary only. No image surfaces, public recipe or runtime is activated. */

import type { PintaImageTargetLimits } from './pinta-image'
import { readPngDimensions } from './pinta-png-binary'
import { PINTA_REGION_IMAGE_MAX_JSON_BYTES } from './pinta-region-image'
import { PINTA_REGION_IMAGE_PNG_LIMITS } from './pinta-region-image-limits'
import { visitBoundedPintaZlib } from './pinta-region-zlib'

function invalid(cause?: unknown): never {
  throw new Error('Os dados desta imagem do Pinta estão estragados. O desenho foi mantido.', {
    cause,
  })
}

function decodeUtf8(decoder: TextDecoder, bytes: Uint8Array, stream = false): string {
  try {
    return decoder.decode(bytes, { stream })
  } catch (error) {
    invalid(error)
  }
}
function overBudget(): never {
  throw new Error(
    'Os dados desta imagem ultrapassam o limite deste ambiente. O desenho foi mantido.',
  )
}

/** zlib only, exact end of input and fatal UTF-8. The decoder receives an explicit
 * output buffer of at most 16 KiB (remaining budget + one byte near the limit).
 * No convenience inflator may allocate the complete expanded payload first.
 */
function inflateText(input: Uint8Array, maxBytes: number): string {
  const decoder = new TextDecoder('utf-8', { fatal: true }),
    parts: string[] = []
  visitBoundedPintaZlib(
    [input],
    maxBytes,
    (output) => parts.push(decodeUtf8(decoder, output, true)),
    invalid,
    overBudget,
  )
  parts.push(decodeUtf8(decoder, new Uint8Array()))
  return parts.join('')
}

/** Reads the documented Pinta iTXt envelope (empty language/translation, method 0).
 * Checks the whole static PNG's CRC/chunk/dimension limits before decompression.
 * Captures its own bytes. Does not validate IDAT pixels or interpret authorial JSON.
 */
export function readPintaPngText(
  source: Uint8Array,
  maxMetadataBytes = PINTA_REGION_IMAGE_MAX_JSON_BYTES,
  imageLimits: PintaImageTargetLimits = PINTA_REGION_IMAGE_PNG_LIMITS,
): { png: Uint8Array<ArrayBuffer>; text: string; width: number; height: number } {
  if (
    !Number.isSafeInteger(maxMetadataBytes) ||
    maxMetadataBytes < 0 ||
    maxMetadataBytes > PINTA_REGION_IMAGE_MAX_JSON_BYTES
  )
    overBudget()
  if (
    !(source instanceof Uint8Array) ||
    source.byteLength > PINTA_REGION_IMAGE_PNG_LIMITS.imageBytes
  )
    invalid()
  // Buffer.slice() aliases its input; use a plain owned array for every caller.
  const png = new Uint8Array(source.byteLength)
  png.set(source)
  const size = readPngDimensions(png, imageLimits)
  const view = new DataView(png.buffer)
  let payload: Uint8Array | undefined
  let compressed = false
  for (let at = 8; at + 12 <= png.length; ) {
    const length = view.getUint32(at),
      type = view.getUint32(at + 4),
      body = png.subarray(at + 8, at + 8 + length)
    if (
      type === 0x69545874 &&
      body.length >= 6 &&
      [112, 105, 110, 116, 97, 0].every((value, index) => body[index] === value)
    ) {
      if (
        payload !== undefined ||
        body.length < 10 ||
        (body[6] !== 0 && body[6] !== 1) ||
        body[7] !== 0 ||
        body[8] !== 0 ||
        body[9] !== 0
      )
        invalid()
      payload = body.subarray(10)
      compressed = body[6] === 1
    }
    at += length + 12
  }
  if (!payload) invalid()
  if (!compressed && payload.length > maxMetadataBytes) overBudget()
  const text = compressed
    ? inflateText(payload, maxMetadataBytes)
    : decodeUtf8(new TextDecoder('utf-8', { fatal: true }), payload)
  return { png, text, ...size }
}

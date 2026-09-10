import { RASTER_INPUT_LIMITS, RasterInputError, requireRaster } from './rasterInput'

/** Walk framing only. Entropy decoding belongs to the codec, never to this iterator. */
export function* rasterJpegMarkers(bytes: Uint8Array, path: string) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 2,
    count = 0
  while (offset < bytes.length) {
    if (++count > RASTER_INPUT_LIMITS.imageChunks)
      throw new RasterInputError('budget', path, 'A imagem JPEG tem segmentos demais.')
    requireRaster(bytes[offset] === 0xff, path, 'O marcador JPEG está incorreto.')
    while (bytes[offset] === 0xff) offset++
    const code = bytes[offset++]
    requireRaster(
      code !== undefined && code !== 0 && code !== 0xd8,
      path,
      'Marcador JPEG inválido.',
    )
    if (code === 0xd9) return
    requireRaster(code < 0xd0 || code > 0xd7, path, 'Restart JPEG fora de um scan.')
    if (code === 1)
      throw new RasterInputError('unsupported', path, 'JPEG aritmético não é suportado.')
    requireRaster(offset + 2 <= bytes.length, path, 'O segmento JPEG está incompleto.')
    const length = view.getUint16(offset),
      end = offset + length
    requireRaster(length >= 2 && end <= bytes.length, path, 'O comprimento JPEG é inválido.')
    yield { code, data: bytes.subarray(offset + 2, end) }
    offset = end
    if (code !== 0xda) continue
    // FF00 is a literal entropy byte; RST0–7 remain inside the scan. Fill FFs
    // before another marker are consumed by the outer loop, not entropy data.
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset++
        continue
      }
      const next = bytes[offset + 1]
      if (next === 0 || (next !== undefined && next >= 0xd0 && next <= 0xd7)) {
        offset += 2
        continue
      }
      break
    }
  }
  requireRaster(false, path, 'A imagem JPEG não tem marcador de fim.')
}

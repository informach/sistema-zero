import { Inflate } from 'pako'
import { requireRaster } from './rasterInput'

/** Fixed output blocks bound decompressor work between checks, including malicious expansion. */
export function inflateRasterPng(chunks: readonly Uint8Array[], byteLength: number, path: string) {
  const output = new Uint8Array(byteLength)
  const decoder = new Inflate({ windowBits: 15, chunkSize: 16 * 1024 })
  let offset = 0
  decoder.onData = (chunk) => {
    requireRaster(
      offset + chunk.length <= byteLength,
      path,
      'O PNG expande além das dimensões declaradas.',
    )
    output.set(chunk, offset)
    offset += chunk.length
  }
  for (const chunk of chunks) {
    if (decoder.ended) break // PNG permits unused trailing bytes in the final IDAT.
    requireRaster(decoder.push(chunk), path, 'Os dados comprimidos do PNG são inválidos.')
  }
  if (!decoder.ended)
    requireRaster(
      decoder.push(new Uint8Array(0), true),
      path,
      'Os dados comprimidos do PNG estão incompletos.',
    )
  requireRaster(
    decoder.err === 0 && offset === byteLength,
    path,
    'Os pixels PNG não correspondem às dimensões declaradas.',
  )
  return output
}

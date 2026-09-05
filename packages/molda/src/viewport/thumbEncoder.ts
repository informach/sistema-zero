import { MOLDA_LIMITS } from '../core/limits'

/** Converte o RGBA invertido do WebGL em JPEG dentro do teto persistido. */
export function encodeThumb(pixels: Uint8Array, size: number): string | null {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return null
  const image = context.createImageData(size, size)
  const row = size * 4
  for (let y = 0; y < size; y += 1) {
    const source = (size - 1 - y) * row
    image.data.set(pixels.subarray(source, source + row), y * row)
  }
  context.putImageData(image, 0, 0)
  for (const quality of [0.72, 0.5, 0.35]) {
    const url = canvas.toDataURL('image/jpeg', quality)
    if (url.length <= MOLDA_LIMITS.maxThumbChars) return url
  }
  return null
}

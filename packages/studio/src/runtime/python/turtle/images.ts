import { TURTLE_GRAPHICS_LIMITS } from './graphicsProtocol'

export interface TurtleImageSource {
  type: 'image/png' | 'image/gif'
  bytes: Uint8Array<ArrayBuffer>
  width: number
  height: number
}
export class TurtleImageError extends Error {}
function fail(): never {
  throw new TurtleImageError('Imagem Turtle inválida ou acima do limite de resolução.')
}
function dimensions(width: number, height: number) {
  if (
    !width ||
    !height ||
    width * height > TURTLE_GRAPHICS_LIMITS.imagePixels ||
    width > 4096 ||
    height > 4096
  )
    fail()
}

/** Validate dimensions before invoking the native decoder; GIF is frozen at its first frame. */
export function readTurtleImage(input: unknown): TurtleImageSource {
  if (
    !(input instanceof Uint8Array) ||
    !(input.buffer instanceof ArrayBuffer) ||
    input.byteLength > TURTLE_GRAPHICS_LIMITS.imageBytes ||
    input.byteLength < 13
  )
    fail()
  const bytes = input as Uint8Array<ArrayBuffer>
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) {
    if (bytes.length < 33 || view.getUint32(8) !== 13 || view.getUint32(12) !== 0x49484452) fail()
    const width = view.getUint32(16)
    const height = view.getUint32(20)
    dimensions(width, height)
    return { type: 'image/png', bytes, width, height }
  }
  const signature = String.fromCharCode(...bytes.subarray(0, 6))
  if (signature !== 'GIF87a' && signature !== 'GIF89a') fail()
  const width = view.getUint16(6, true)
  const height = view.getUint16(8, true)
  dimensions(width, height)
  let cursor = 13
  const tableBytes = (packed: number) => (packed & 0x80 ? 3 * 2 ** ((packed & 7) + 1) : 0)
  cursor += tableBytes(bytes[10]!)
  const skipBlocks = () => {
    while (cursor < bytes.length) {
      const length = bytes[cursor++]!
      if (!length) return
      cursor += length
    }
    fail()
  }
  while (cursor < bytes.length) {
    const type = bytes[cursor++]
    if (type === 0x21) {
      cursor++ // Extension label; the following data is a chain of bounded blocks.
      skipBlocks()
    } else if (type === 0x2c) {
      if (cursor + 9 > bytes.length) fail()
      const left = view.getUint16(cursor, true)
      const top = view.getUint16(cursor + 2, true)
      const frameWidth = view.getUint16(cursor + 4, true)
      const frameHeight = view.getUint16(cursor + 6, true)
      dimensions(frameWidth, frameHeight)
      if (left + frameWidth > width || top + frameHeight > height) fail()
      const packed = bytes[cursor + 8]!
      cursor += 9 + tableBytes(packed)
      if (cursor >= bytes.length || bytes[cursor]! < 2 || bytes[cursor]! > 8) fail()
      cursor++ // LZW minimum code size.
      skipBlocks()
      const firstFrame = new Uint8Array(cursor + 1)
      firstFrame.set(bytes.subarray(0, cursor))
      firstFrame[cursor] = 0x3b
      return { type: 'image/gif', bytes: firstFrame, width, height }
    } else fail()
  }
  return fail()
}

export async function decodeTurtleImage(source: TurtleImageSource): Promise<ImageBitmap> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(new Blob([source.bytes], { type: source.type }), {
      imageOrientation: 'none',
    })
  } catch {
    throw new TurtleImageError('Não foi possível decodificar a imagem Turtle.')
  }
  if (bitmap.width !== source.width || bitmap.height !== source.height) {
    bitmap.close()
    throw new TurtleImageError('O tamanho da imagem difere do cabeçalho validado.')
  }
  return bitmap
}

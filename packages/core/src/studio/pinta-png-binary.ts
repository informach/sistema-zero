import { assertPintaImageDimensions, type PintaImageTargetLimits } from './pinta-image'

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  return crc >>> 0
})

/** CRC-32 do PNG (ISO 3309), sobre `bytes[start, end)`. */
export function pngCrc32(bytes: Uint8Array, start = 0, end = bytes.length): number {
  let crc = 0xffffffff
  for (let index = start; index < end; index++)
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[index]!) & 0xff]!
  return (crc ^ 0xffffffff) >>> 0
}

/** Only PNG raster references are allowed by Pinta's vector model. No URL/other MIME fallback. */
export function pngBytes(dataUrl: string, limits: PintaImageTargetLimits): Uint8Array<ArrayBuffer> {
  return readPngDataUrl(dataUrl, limits).bytes
}

export function readPngDataUrl(
  dataUrl: string,
  limits: PintaImageTargetLimits,
): {
  bytes: Uint8Array<ArrayBuffer>
  width: number
  height: number
} {
  const prefix = 'data:image/png;base64,'
  if (!dataUrl.startsWith(prefix) || dataUrl.length > limits.dataUrlChars)
    throw new Error('A imagem PNG é inválida ou ultrapassa o limite do projeto.')
  const encoded = dataUrl.slice(prefix.length)
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded) ||
    (encoded.length / 4) * 3 - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0) >
      limits.imageBytes
  )
    throw new Error('Os bytes da imagem PNG ultrapassam o limite ou são inválidos.')
  const binary = atob(encoded)
  if (btoa(binary) !== encoded) throw new Error('Codificação PNG inválida.')
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return { bytes, ...readPngDimensions(bytes, limits) }
}

export function readPngDimensions(
  bytes: Uint8Array,
  limits: PintaImageTargetLimits,
): { width: number; height: number } {
  if (
    bytes.length < 45 ||
    bytes.length > limits.imageBytes ||
    ![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
  )
    throw new Error('Arquivo PNG inválido.')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(8) !== 13 || view.getUint32(12) !== 0x49484452)
    throw new Error('Cabeçalho PNG inválido.')
  const width = view.getUint32(16),
    height = view.getUint32(20)
  assertPintaImageDimensions(width, height, limits)
  let cursor = 8,
    imageData = false,
    ended = false
  while (cursor + 12 <= bytes.length) {
    const length = view.getUint32(cursor)
    if (length > bytes.length - cursor - 12) throw new Error('Arquivo PNG truncado.')
    const type = String.fromCharCode(...bytes.subarray(cursor + 4, cursor + 8))
    if (
      !/^[A-Za-z]{4}$/.test(type) ||
      type === 'acTL' ||
      type === 'fcTL' ||
      type === 'fdAT' ||
      (cursor !== 8 && type === 'IHDR') ||
      (type[0] === type[0]?.toUpperCase() && !['IHDR', 'PLTE', 'IDAT', 'IEND'].includes(type))
    )
      throw new Error('Use um PNG estático válido.')
    if (pngCrc32(bytes, cursor + 4, cursor + 8 + length) !== view.getUint32(cursor + 8 + length))
      throw new Error('Integridade PNG inválida.')
    if (type === 'IDAT') imageData = true
    cursor += length + 12
    if (type === 'IEND') {
      if (length !== 0 || !imageData || cursor !== bytes.length)
        throw new Error('Fim PNG inválido.')
      ended = true
      break
    }
  }
  if (!ended) throw new Error('Arquivo PNG incompleto.')
  return { width, height }
}

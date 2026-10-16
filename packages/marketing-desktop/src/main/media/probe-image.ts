import type { AssetManifest } from '@sistemazero/marketing-contracts'
import sharp from 'sharp'
import { readImageInput } from './image-input'
import { probeVideo } from './probe-video'

function validateContainer(bytes: Buffer, mime: string) {
  const size = bytes.length,
    header = bytes.subarray(0, 12),
    tail = bytes.subarray(-12)
  if (size < 12) throw new Error('Imagem incompleta')
  if (mime === 'image/png') {
    if (!header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
      throw new Error('Assinatura PNG inválida')
    let offset = 8,
      ended = false,
      chunks = 0
    while (offset + 12 <= size && ++chunks <= 100000) {
      const chunk = bytes.subarray(offset, offset + 8)
      const length = chunk.readUInt32BE(0),
        type = chunk.toString('ascii', 4, 8)
      offset += length + 12
      if (offset > size) break
      if (type === 'IEND') {
        ended = length === 0 && offset === size
        break
      }
    }
    if (!ended) throw new Error('O PNG está incompleto ou contém dados além do fim da imagem')
  } else if (mime === 'image/jpeg' && (tail[10] !== 255 || tail[11] !== 217))
    throw new Error('O JPEG não tem marcador de fim válido')
  else if (
    mime === 'image/webp' &&
    (header.toString('ascii', 0, 4) !== 'RIFF' ||
      header.toString('ascii', 8, 12) !== 'WEBP' ||
      header.readUInt32LE(4) + 8 !== size)
  )
    throw new Error('O WebP está incompleto')
}

export type MediaMetadata = Pick<
  AssetManifest,
  | 'width'
  | 'height'
  | 'durationMs'
  | 'codec'
  | 'rotation'
  | 'hasAudio'
  | 'frameRate'
  | 'colorSpace'
  | 'colorTransfer'
>
/** Decode untrusted pixels, rather than trusting the extension or the image header alone. */
export async function probeImage(file: string, mime: string): Promise<MediaMetadata> {
  const bytes = await readImageInput(file)
  const image = sharp(bytes, { failOn: 'warning', limitInputPixels: 40_000_000, pages: 1 })
  const metadata = await image.metadata()
  const expected: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/webp': 'webp',
  }
  if (!expected[mime] || metadata.format !== expected[mime])
    throw new Error('O conteúdo da imagem não corresponde ao tipo declarado')
  validateContainer(bytes, mime)
  if ((metadata.pages ?? 1) !== 1)
    throw new Error('Imagem animada requer importação como vídeo; o original foi preservado')
  await image.stats()
  // Width/height describe encoded pixels; rotation preserves EXIF presentation separately.
  // Reflected orientations need a normalized derivative, never silent mutation of the original.
  if ([2, 4, 5, 7].includes(metadata.orientation ?? 1))
    throw new Error(
      'Esta imagem usa espelhamento EXIF. Exporte uma cópia normalizada para a montagem',
    )
  return {
    width: metadata.width,
    height: metadata.height,
    codec: metadata.format,
    rotation:
      metadata.orientation === 3
        ? 180
        : metadata.orientation === 6
          ? 90
          : metadata.orientation === 8
            ? 270
            : 0,
    durationMs: null,
  }
}

export async function mediaMetadata(
  file: string,
  mime: string,
  signal: AbortSignal = AbortSignal.timeout(120000),
): Promise<MediaMetadata> {
  if (mime.startsWith('image/')) return probeImage(file, mime)
  if (mime.startsWith('video/') || mime.startsWith('audio/')) return probeVideo(file, mime, signal)
  return { width: null, height: null, durationMs: null, codec: null, rotation: null }
}

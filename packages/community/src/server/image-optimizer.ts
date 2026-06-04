import 'server-only'
import sharp from 'sharp'

/** Presets do community: avatar quadrado (512×512 cover). Espelha o admin. */
export type ImagePreset = 'avatar'

interface PresetConfig {
  width: number
  height?: number
  fit: 'cover' | 'inside'
  quality: number
}

const PRESETS: Record<ImagePreset, PresetConfig> = {
  avatar: { width: 512, height: 512, fit: 'cover', quality: 82 },
}

export interface OptimizeImageResult {
  buffer: Buffer
  contentType: 'image/webp'
  extension: 'webp'
  width: number
  height: number
  sizeBytes: number
}

/** Normaliza qualquer imagem aceita p/ WebP no preset (rotação EXIF aplicada). */
export async function optimizeImage(
  input: Buffer | ArrayBuffer | Uint8Array,
  preset: ImagePreset,
): Promise<OptimizeImageResult> {
  const cfg = PRESETS[preset]
  const source = Buffer.isBuffer(input)
    ? input
    : input instanceof ArrayBuffer
      ? Buffer.from(input)
      : Buffer.from(input.buffer, input.byteOffset, input.byteLength)

  const { data, info } = await sharp(source, { failOn: 'error' })
    .rotate()
    .resize({ width: cfg.width, height: cfg.height, fit: cfg.fit, withoutEnlargement: true })
    .webp({ quality: cfg.quality, effort: 4 })
    .toBuffer({ resolveWithObject: true })

  return {
    buffer: data,
    contentType: 'image/webp',
    extension: 'webp',
    width: info.width,
    height: info.height,
    sizeBytes: info.size,
  }
}

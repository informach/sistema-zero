import 'server-only'
import sharp from 'sharp'

/**
 * Presets do community: `avatar` (512×512 cover) e `ugc` (anexo da comunidade —
 * preserva a proporção, teto de 1600px, sem ampliar). Espelha o admin.
 */
export type ImagePreset = 'avatar' | 'ugc'

interface PresetConfig {
  width: number
  height?: number
  fit: 'cover' | 'inside'
  quality: number
}

const PRESETS: Record<ImagePreset, PresetConfig> = {
  avatar: { width: 512, height: 512, fit: 'cover', quality: 82 },
  ugc: { width: 1600, fit: 'inside', quality: 80 },
}

// Anti "image bomb": uma imagem 0.1MB pode declarar 100k×100k px e estourar a RAM
// do sharp na decodificação. ~50MP cobre fotos legítimas e barra o ataque.
const MAX_INPUT_PIXELS = 50_000_000

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

  const { data, info } = await sharp(source, {
    failOn: 'error',
    limitInputPixels: MAX_INPUT_PIXELS,
  })
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

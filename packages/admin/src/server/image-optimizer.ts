import 'server-only'
import sharp from 'sharp'

/** Presets: capa de curso (16:9 cover) e imagem de bloco (limita a largura). */
export type ImagePreset = 'course-thumb' | 'block-image'

interface PresetConfig {
  width: number
  height?: number
  fit: 'cover' | 'inside'
  quality: number
}

const PRESETS: Record<ImagePreset, PresetConfig> = {
  'course-thumb': { width: 1280, height: 720, fit: 'cover', quality: 82 },
  'block-image': { width: 1600, fit: 'inside', quality: 82 },
}

// Teto anti-bomba de descompressão (≈50MP, igual ao member-shell). A rota limita o
// ARQUIVO a 5MB, mas o sharp decodifica o bitmap CRU antes do resize — um PNG/WebP
// muito comprimido declarando dimensões enormes alocaria ~1GB e derrubaria a réplica
// única do painel (o default do sharp é 268MP). Decodificar acima disso → erro.
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

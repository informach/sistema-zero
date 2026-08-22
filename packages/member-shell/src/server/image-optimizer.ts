import 'server-only'
import sharp from 'sharp'
import { UGC_ANIMATED_IMAGE_MIME } from '../lib/hub-attachments'

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

export interface OptimizeGifResult {
  buffer: Buffer
  contentType: 'image/gif'
  extension: 'gif'
  width: number
  /** Altura de UM quadro (o sharp empilha os quadros numa tira vertical). */
  height: number
  frames: number
  sizeBytes: number
}

/** Quadros de um GIF animado — acima disso é bomba, não desenho de criança. */
const MAX_GIF_FRAMES = 300

/**
 * O arquivo que chegou não serve — culpa da ENTRADA, não do servidor.
 *
 * Existe para a rota poder responder **400 com um recado legível** em vez de
 * 500: um GIF ilegível ou com quadros demais não é falha nossa, e caindo no
 * `mediaErrorResponse` ele vira "Falha na operação de mídia." (mensagem interna
 * escondida em produção) e ainda **acorda o Sentry** para algo que a criança
 * resolve trocando o arquivo.
 */
export class UnsupportedImageError extends Error {
  readonly code = 'UNSUPPORTED_IMAGE'
}

/**
 * GIF animado → GIF animado, re-encodado (o mesmo endurecimento do WebP: o
 * arquivo que vai ao R2 é o que o sharp EMITIU, nunca os bytes de quem enviou).
 *
 * Existe separado do `optimizeImage` porque o caminho normal encoda WebP, e
 * WebP a partir de um GIF pega só o primeiro quadro: a animação sumiria em
 * silêncio, com toast de sucesso. Foi por isso que o GIF ficou fora do upload
 * até agora — é o desenho animado do Pinta que trouxe a necessidade.
 *
 * ⚠️ `limitInputPixels` limita UM quadro (largura × `pageHeight`), não o TOTAL:
 * muitos quadros pequenos somariam um decode enorme na réplica ÚNICA. Por isso
 * o teto de quadros E o teto do total, iguais aos da marca d'água.
 */
export async function optimizeAnimatedGif(
  input: Buffer | ArrayBuffer | Uint8Array,
): Promise<OptimizeGifResult> {
  const source = Buffer.isBuffer(input)
    ? input
    : input instanceof ArrayBuffer
      ? Buffer.from(input)
      : Buffer.from(input.buffer, input.byteOffset, input.byteLength)

  // Ler o cabeçalho já é parte da VALIDAÇÃO: arquivo que o sharp não decodifica
  // (corrompido, ou só com extensão de GIF) é entrada ruim, não erro de servidor.
  let probe: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>
  try {
    probe = await sharp(source, {
      failOn: 'error',
      animated: true,
      limitInputPixels: MAX_INPUT_PIXELS,
    }).metadata()
  } catch {
    throw new UnsupportedImageError('Não consegui ler esse GIF. Tente enviar de novo.')
  }
  if (probe.format !== 'gif') {
    throw new UnsupportedImageError('Esse arquivo não é um GIF de verdade.')
  }
  const frameWidth = probe.width ?? 0
  const frameHeight = probe.pageHeight ?? probe.height ?? 0
  const pages = probe.pages ?? 1
  if (!frameWidth || !frameHeight) {
    throw new UnsupportedImageError('Não consegui ler o tamanho desse GIF.')
  }
  if (pages > MAX_GIF_FRAMES) {
    throw new UnsupportedImageError(`Esse GIF tem quadros demais (o limite é ${MAX_GIF_FRAMES}).`)
  }
  if (frameWidth * frameHeight * pages > MAX_INPUT_PIXELS) {
    throw new UnsupportedImageError('Esse GIF é grande demais para a comunidade.')
  }

  const cfg = PRESETS.ugc
  const { data, info } = await sharp(source, {
    failOn: 'error',
    animated: true,
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    // Sem `.rotate()`: EXIF não existe em GIF, e o auto-rotate no modo animado
    // giraria a TIRA inteira de quadros como se fosse uma imagem só.
    .resize({ width: cfg.width, fit: 'inside', withoutEnlargement: true })
    .gif()
    .toBuffer({ resolveWithObject: true })

  return {
    buffer: data,
    contentType: 'image/gif',
    extension: 'gif',
    width: info.width,
    height: info.pageHeight ?? info.height,
    frames: pages,
    sizeBytes: info.size,
  }
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

/**
 * O otimizador que ESTE mime exige, para o anexo de imagem do hub.
 *
 * ⭐ A escolha mora aqui, e não na rota, porque ela é a regra que a feature
 * inteira existe para garantir: **GIF preserva os quadros, o resto vira WebP.**
 * Solta dentro do handler (que precisa de sessão, R2 e do hub para rodar) ela
 * ficava sem teste nenhum, e apagar o ramo por engano não quebraria nada — o
 * arquivo subiria certinho e só não animaria, que é justamente o defeito
 * silencioso que motivou este caminho.
 */
export async function optimizeUgcImage(
  input: Buffer | ArrayBuffer | Uint8Array,
  mime: string,
): Promise<OptimizeImageResult | OptimizeGifResult> {
  return UGC_ANIMATED_IMAGE_MIME.has(mime)
    ? optimizeAnimatedGif(input)
    : optimizeImage(input, 'ugc')
}

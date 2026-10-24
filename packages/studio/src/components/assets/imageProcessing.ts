import { PROJECT_ASSET_LIMITS } from '#core'

/** Imagens raster são comprimidas; SVGs continuam vetoriais ao entrar no Estúdio. */
export interface ProcessedImage {
  dataUrl: string
  width: number
  height: number
}

const DEFAULT_MAX_DIM = 512
/** Below this the drawing stops being recognisable: refuse instead of shrinking further. */
const MIN_STEP_DIM = 64

/** The size caps of the destination project (JavaScript by default, Python passes its own). */
export interface AssetUploadLimits {
  maxAssetDataUrlChars: number
  maxAudioDataUrlChars: number
}

export async function fileToAssetDataUrl(
  file: File,
  maxDim = DEFAULT_MAX_DIM,
  /** `png`: the destination cannot open WebP (Pygame Zero finds png/gif/jpg/bmp/svg). */
  format: 'compact' | 'png' = 'compact',
  /**
   * Python projects: their own size caps, and an image over the cap shrinks step by step
   * before it is refused (a PNG has no quality knob to turn down).
   */
  python?: { limits: AssetUploadLimits },
): Promise<ProcessedImage> {
  const maxChars = (python?.limits ?? PROJECT_ASSET_LIMITS).maxAssetDataUrlChars
  const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
  if (!file.type.startsWith('image/') && !isSvg) {
    throw new Error('Selecione um arquivo de imagem.')
  }
  const sourceUrl = await readAsDataUrl(file)
  const comma = sourceUrl.indexOf(',')
  if (comma < 0) throw new Error('Não foi possível ler a imagem.')
  const imageUrl = isSvg ? `data:image/svg+xml;base64,${sourceUrl.slice(comma + 1)}` : sourceUrl
  if (isSvg && imageUrl.length > maxChars) {
    throw new Error('O SVG é grande demais para o projeto. Simplifique o desenho no Pinta.')
  }
  const img = await loadImage(imageUrl)
  const w0 = img.naturalWidth || img.width
  const h0 = img.naturalHeight || img.height
  if (!w0 || !h0) throw new Error('Não foi possível ler a imagem.')

  if (isSvg) {
    return { dataUrl: imageUrl, width: w0, height: h0 }
  }

  for (let dim = maxDim; ; dim = Math.floor(dim * 0.75)) {
    const encoded = encodeRaster(img, w0, h0, dim, format, maxChars)
    if (encoded.dataUrl.length <= maxChars) return encoded
    if (!python || Math.floor(dim * 0.75) < MIN_STEP_DIM || Math.max(w0, h0) <= MIN_STEP_DIM) break
  }
  throw new Error('A imagem continua grande demais após reduzir. Tente uma imagem menor.')
}

function encodeRaster(
  img: HTMLImageElement,
  w0: number,
  h0: number,
  maxDim: number,
  format: 'compact' | 'png',
  maxChars: number,
): ProcessedImage {
  const scale = Math.min(1, maxDim / Math.max(w0, h0))
  const width = Math.max(1, Math.round(w0 * scale))
  const height = Math.max(1, Math.round(h0 * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível neste navegador.')
  ctx.drawImage(img, 0, 0, width, height)

  let dataUrl = ''
  if (format === 'compact') {
    try {
      dataUrl = canvas.toDataURL('image/webp', 0.85)
    } catch {
      // canvas pode lançar se a imagem "tingiu" (cross-origin) — improvável p/ upload local.
    }
  }
  if (!dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/png')
  }
  // Acima do teto: tenta WebP em qualidade menor antes de desistir.
  if (format === 'compact' && dataUrl.length > maxChars) {
    try {
      const retry = canvas.toDataURL('image/webp', 0.6)
      if (retry.startsWith('data:image/webp') && retry.length < dataUrl.length) dataUrl = retry
    } catch {}
  }
  return { dataUrl, width, height }
}

/**
 * Lê um arquivo de ÁUDIO (mp3/wav/ogg…) como `data:audio/...;base64,...` SEM
 * recodificar (áudio não rasteriza no canvas): só valida o tipo e o teto. Um som
 * grande demais falha com mensagem gentil (não há downscale como na imagem).
 */
export async function fileToAudioAssetDataUrl(
  file: File,
  limits: AssetUploadLimits = PROJECT_ASSET_LIMITS,
): Promise<{ dataUrl: string }> {
  if (!file.type.startsWith('audio/')) {
    throw new Error('Selecione um arquivo de som (mp3, wav, ogg…).')
  }
  const dataUrl = await readAsDataUrl(file)
  if (!dataUrl.startsWith('data:audio/')) {
    throw new Error('Som inválido ou em formato não suportado.')
  }
  if (dataUrl.length > limits.maxAudioDataUrlChars) {
    // ⚠️ A mensagem NOMEIA o wav: ele ocupa ~10× o de um mp3 pelo mesmo som, e é
    // o motivo real de 9 em 10 recusas — dizer só "grande demais" deixava a
    // criança achando que o som era longo, quando o problema era o formato.
    const ehWav = file.type.includes('wav')
    throw new Error(
      ehWav
        ? 'Esse wav é pesado demais (cabe só uns 30 segundos). Converta para mp3: o mesmo som fica bem menor.'
        : 'O som é grande demais. Tente um arquivo mais curto ou converta para mp3.',
    )
  }
  return { dataUrl }
}

/**
 * Lê um binário 3D (modelo `.glb` / céu `.hdr`) como `data:` URL com o MIME
 * FORÇADO pela extensão: o FileReader devolve `application/octet-stream` para
 * `.glb`, e a validação do core exige o MIME canônico do tipo
 * (`data:model/gltf-binary` / `data:image/vnd.radiance`). A assinatura binária
 * é conferida na entrada do store (`isValidAssetDataUrl` cruza extensão × MIME
 * × bytes), então um arquivo renomeado falha lá com mensagem legível.
 */
export async function fileTo3DAssetDataUrl(file: File): Promise<{
  dataUrl: string
  kind: 'model3d' | 'environment3d'
  fileName: string
}> {
  const lower = file.name.toLowerCase()
  const kind = lower.endsWith('.glb')
    ? ('model3d' as const)
    : lower.endsWith('.hdr')
      ? ('environment3d' as const)
      : null
  if (!kind) throw new Error('Selecione um modelo .glb ou um céu .hdr.')
  const raw = await readAsDataUrl(file)
  const comma = raw.indexOf(',')
  if (comma < 0) throw new Error('Falha ao ler o arquivo.')
  const mime = kind === 'model3d' ? 'data:model/gltf-binary' : 'data:image/vnd.radiance'
  const dataUrl = `${mime};base64,${raw.slice(comma + 1)}`
  if (dataUrl.length > PROJECT_ASSET_LIMITS.maxModel3DDataUrlChars) {
    throw new Error('O arquivo 3D é grande demais (teto ~5 MB). Exporte um modelo mais leve.')
  }
  return { dataUrl, kind, fileName: file.name }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Imagem inválida ou em formato não suportado.'))
    img.src = url
  })
}

import { PROJECT_ASSET_LIMITS } from '#core'

/**
 * Reduz + comprime uma imagem enviada pelo aluno via CANVAS (browser, sem `sharp`):
 * encolhe para caber numa dimensão máxima e exporta em WebP (cai para PNG se o
 * browser não suportar WebP no canvas). Mantém o asset pequeno o bastante para o
 * orçamento do projeto (mitiga inchaço do save/quota do IndexedDB). Browser-only.
 */
export interface ProcessedImage {
  dataUrl: string
  width: number
  height: number
}

const DEFAULT_MAX_DIM = 512

export async function fileToAssetDataUrl(
  file: File,
  maxDim = DEFAULT_MAX_DIM,
): Promise<ProcessedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem.')
  }
  const sourceUrl = await readAsDataUrl(file)
  const img = await loadImage(sourceUrl)
  const w0 = img.naturalWidth || img.width
  const h0 = img.naturalHeight || img.height
  if (!w0 || !h0) throw new Error('Não foi possível ler a imagem.')

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
  try {
    dataUrl = canvas.toDataURL('image/webp', 0.85)
  } catch {
    // canvas pode lançar se a imagem "tingiu" (cross-origin) — improvável p/ upload local.
  }
  if (!dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/png')
  }
  // Acima do teto: tenta WebP em qualidade menor antes de desistir.
  if (dataUrl.length > PROJECT_ASSET_LIMITS.maxAssetDataUrlChars) {
    try {
      const retry = canvas.toDataURL('image/webp', 0.6)
      if (retry.startsWith('data:image/webp') && retry.length < dataUrl.length) dataUrl = retry
    } catch {}
  }
  if (dataUrl.length > PROJECT_ASSET_LIMITS.maxAssetDataUrlChars) {
    throw new Error('A imagem continua grande demais após reduzir. Tente uma imagem menor.')
  }
  return { dataUrl, width, height }
}

/**
 * Lê um arquivo de ÁUDIO (mp3/wav/ogg…) como `data:audio/...;base64,...` SEM
 * recodificar (áudio não rasteriza no canvas): só valida o tipo e o teto. Um som
 * grande demais falha com mensagem gentil (não há downscale como na imagem).
 */
export async function fileToAudioAssetDataUrl(file: File): Promise<{ dataUrl: string }> {
  if (!file.type.startsWith('audio/')) {
    throw new Error('Selecione um arquivo de som (mp3, wav, ogg…).')
  }
  const dataUrl = await readAsDataUrl(file)
  if (!dataUrl.startsWith('data:audio/')) {
    throw new Error('Som inválido ou em formato não suportado.')
  }
  if (dataUrl.length > PROJECT_ASSET_LIMITS.maxAudioDataUrlChars) {
    throw new Error('O som é grande demais. Tente um arquivo mais curto ou mais leve.')
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

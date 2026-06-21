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

/**
 * Vetorial → PNG por rasterização (Image + canvas, async): o caminho do export
 * PNG e da ponte "Usar no Estúdio" (o ProjectAsset do Studio é imagem). O SVG
 * vira Blob URL (NUNCA `fetch('data:')` — CSP) e é desenhado num canvas.
 * `null` em ambiente sem canvas/Image (happy-dom) ou SVG irrenderizável.
 */
import { vectorToPortableSvg } from './portableSvg'
import type { VectorDoc } from './svg'

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('SVG irrenderizável'))
    img.src = url
  })
}

/**
 * Rasteriza uma STRING SVG num PNG data URL de `width×height` (× scale).
 * Para vetor, o upscale é re-render (sem perda) — nada de nearest-neighbor.
 */
export async function svgToPngDataUrl(
  svg: string,
  width: number,
  height: number,
  scale = 1,
): Promise<string | null> {
  if (typeof Image === 'undefined') return null
  // Guarda de ambiente ANTES do Image: no happy-dom o contexto 2D é null e o
  // load do Image nunca dispara (a promise ficaria pendurada p/ sempre).
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(Math.round(width * scale), 1)
  canvas.height = Math.max(Math.round(height * scale), 1)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = await loadImage(url)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/png')
    // Canvas acima do teto do device: toDataURL devolve "data:," SEM lançar —
    // sem esta guarda a criança baixaria um PNG vazio com toast de sucesso.
    return dataUrl.startsWith('data:image/png') ? dataUrl : null
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function vectorPngDataUrl(doc: VectorDoc, scale = 1): Promise<string | null> {
  return svgToPngDataUrl(await vectorToPortableSvg(doc), doc.width, doc.height, scale)
}

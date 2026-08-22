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
 * Rasteriza uma STRING SVG num canvas de `width×height` (× scale) já desenhado.
 * `null` em ambiente sem canvas/Image (happy-dom) ou SVG irrenderizável.
 *
 * O canvas NÃO fica manchado (o SVG vai por Blob URL, mesma origem, e o
 * `portableSvg` embute as fontes em vez de buscá-las), então quem chama pode
 * tanto `toDataURL` quanto `getImageData` — é o que o GIF do vetorial precisa.
 */
export async function svgToCanvas(
  svg: string,
  width: number,
  height: number,
  scale = 1,
): Promise<HTMLCanvasElement | null> {
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
    return canvas
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
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
  const canvas = await svgToCanvas(svg, width, height, scale)
  if (!canvas) return null
  try {
    const dataUrl = canvas.toDataURL('image/png')
    // Canvas acima do teto do device: toDataURL devolve "data:," SEM lançar —
    // sem esta guarda a criança baixaria um PNG vazio com toast de sucesso.
    return dataUrl.startsWith('data:image/png') ? dataUrl : null
  } catch {
    // ⚠️ O try aqui NÃO é decorativo: `toDataURL` LANÇA em canvas manchado, e
    // esta função é o funil de TODO export vetorial (folha, tileset, mapa,
    // miniatura da biblioteca do Estúdio). Quem chama espera `null` para cair no
    // recado gentil; deixar a exceção subir viraria tela vermelha em alguns
    // deles. (Estava coberto antes de o `svgToCanvas` ser extraído daqui.)
    return null
  }
}

export async function vectorPngDataUrl(doc: VectorDoc, scale = 1): Promise<string | null> {
  return svgToPngDataUrl(await vectorToPortableSvg(doc), doc.width, doc.height, scale)
}

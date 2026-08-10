/**
 * Decodificação de um arquivo de imagem → RGBA (só browser). Separada do núcleo
 * PURO (`quantize.ts`) de propósito: canvas/createImageBitmap não existem no
 * happy-dom, então aqui devolvemos `null` sem pendurar promise (o `ctx` é
 * capturado ANTES de decodificar — mesma regra do resto do Pinta).
 */
import type { RGBAImage } from './quantize'

const MAX_SOURCE = 2048
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/** `accept` do `<input type=file>`. */
export const IMPORT_ACCEPT = ACCEPTED_TYPES.join(',')

export async function decodeImageFile(file: File): Promise<RGBAImage | null> {
  if (!ACCEPTED_TYPES.includes(file.type)) return null
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  // happy-dom: sem canvas 2D / sem createImageBitmap → aborta limpo.
  if (!ctx || typeof createImageBitmap === 'undefined') return null
  let source: ImageBitmap | null = null
  try {
    source = await createImageBitmap(file)
    let width = source.width
    let height = source.height
    // Cap de origem (não alocar RGBA gigante): encolhe proporcional.
    if (width > MAX_SOURCE || height > MAX_SOURCE) {
      const scale = MAX_SOURCE / Math.max(width, height)
      width = Math.max(1, Math.round(width * scale))
      height = Math.max(1, Math.round(height * scale))
    }
    canvas.width = width
    canvas.height = height
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(source, 0, 0, width, height)
    const imageData = ctx.getImageData(0, 0, width, height)
    return { data: imageData.data, width, height }
  } catch {
    return null
  } finally {
    source?.close?.()
  }
}

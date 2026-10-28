/**
 * A tela com MOLDE (28/10/2026): o cenário de pixel que o host pede com o contorno de cada face
 * (a planificação de um objeto do Arquipélago). Pura, sem React e sem armazenamento.
 *
 * Duas camadas: a de baixo ("Molde", trancada) com os contornos e a de cima ("Pintura") vazia,
 * que é a ativa ao abrir (o editor edita a de cima quando nada foi escolhido). A criança pinta por
 * cima do molde, pode esconder a camada dele e, destrancando, até apagá-la.
 */
import { DEFAULT_PALETTE_ID, TRANSPARENT_INDEX } from './palette'
import {
  createBitmap,
  createPixelBackgroundAsset,
  PINTA_LIMITS,
  type PintaAsset,
  type PintaBitmap,
  type PixelBackgroundAsset,
} from './project'
import type { PintaGuideRect, PintaInitialCanvas } from './types'

/** Os nomes das duas camadas (texto de tela). */
export const GUIDED_LAYER_NAMES = { guide: 'Molde', paint: 'Pintura' } as const

/** Cores na paleta Arcade: o contorno discreto (11, lilás acinzentado) e a face marcada (3, rosa). */
export const GUIDE_INDEX = 11
export const MARKED_INDEX = 3

/** Uma tela que cabe no Pinta (dimensões inteiras de 1 a 512, retângulos dentro dela). */
export function isValidInitialCanvas(canvas: PintaInitialCanvas): boolean {
  const lado = (v: number) => Number.isInteger(v) && v >= 1 && v <= PINTA_LIMITS.maxBitmapSize
  if (!lado(canvas.width) || !lado(canvas.height)) return false
  return canvas.guide.every(
    (r) =>
      Number.isInteger(r.x) &&
      Number.isInteger(r.y) &&
      Number.isInteger(r.width) &&
      Number.isInteger(r.height) &&
      r.x >= 0 &&
      r.y >= 0 &&
      r.width >= 1 &&
      r.height >= 1 &&
      r.x + r.width <= canvas.width &&
      r.y + r.height <= canvas.height,
  )
}

function outline(bitmap: PintaBitmap, rect: PintaGuideRect, index: number): void {
  const { width } = bitmap
  const x1 = rect.x + rect.width - 1
  const y1 = rect.y + rect.height - 1
  for (let x = rect.x; x <= x1; x += 1) {
    bitmap.data[rect.y * width + x] = index
    bitmap.data[y1 * width + x] = index
  }
  for (let y = rect.y; y <= y1; y += 1) {
    bitmap.data[y * width + rect.x] = index
    bitmap.data[y * width + x1] = index
  }
}

/** O bitmap do molde: o contorno de cada face; a marcada por último, para o rosa vencer na divisa. */
export function guideBitmap(canvas: PintaInitialCanvas): PintaBitmap {
  const bitmap = createBitmap(canvas.width, canvas.height)
  bitmap.data.fill(TRANSPARENT_INDEX)
  for (const rect of canvas.guide) if (!rect.marked) outline(bitmap, rect, GUIDE_INDEX)
  for (const rect of canvas.guide) if (rect.marked) outline(bitmap, rect, MARKED_INDEX)
  return bitmap
}

/** O desenho novo da tela com molde (a galeria dá o nome final e guarda). */
export function createGuidedBackgroundAsset(
  canvas: PintaInitialCanvas,
  now?: number,
): PixelBackgroundAsset {
  const base = createPixelBackgroundAsset({
    name: canvas.name,
    width: canvas.width,
    height: canvas.height,
    paletteId: DEFAULT_PALETTE_ID,
    ...(now !== undefined ? { now } : {}),
  })
  const [paint] = base.layers
  const paintCel = base.cels[0]
  if (!paint || !paintCel) return base
  return {
    ...base,
    layers: [
      { id: `${paint.id}-molde`, name: GUIDED_LAYER_NAMES.guide, visible: true, locked: true },
      { ...paint, name: GUIDED_LAYER_NAMES.paint },
    ],
    cels: [guideBitmap(canvas), paintCel],
  }
}

/** O desenho desta tela que já existe na galeria (mesmo nome, cenário de pixel do mesmo tamanho). */
export function findInitialCanvasAsset(
  assets: readonly PintaAsset[],
  canvas: PintaInitialCanvas,
): PintaAsset | null {
  // O nome com sufixo também conta (`molde-geladeira-2`): quando o nome puro já era de outro
  // desenho, a galeria criou este com sufixo, e da próxima vez ele tem que ser achado.
  const doMolde = (name: string) =>
    name === canvas.name ||
    (name.startsWith(`${canvas.name}-`) && /^\d+$/.test(name.slice(canvas.name.length + 1)))
  return (
    assets.find((asset) => {
      if (!doMolde(asset.name) || asset.kind !== 'pixel-background') return false
      const cel = asset.cels[0]
      return cel?.width === canvas.width && cel.height === canvas.height
    }) ?? null
  )
}

/**
 * Extrai as cores de uma IMAGEM DE PALETA (print de site de cores, moodboard)
 * já no formato da `customPalette` embutida: 16 posições, `[0] = ''`
 * (transparente), cores por FREQUÊNCIA (a mais presente primeiro) e sobras
 * `''` no fim quando a imagem tem menos de 15 cores.
 *
 * Usa o `quantizeFrames` neutro (median-cut), compartilhado com o GIF. O
 * caminho é sem perda para até 15 cores distintas, então as cores do print
 * entram exatas.
 */
import { PALETTE_SIZE, TRANSPARENT_INDEX } from '../core/palette'
import type { PintaBitmap } from '../core/project'
import { quantizeFrames, type Rgb } from '../core/quantizeFrames'
import type { RGBAImage } from './quantize'

function rgbToHex([r, g, b]: Rgb): string {
  const hex = (value: number) => value.toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

export interface PhotoQuantizeResult {
  bitmap: PintaBitmap
  /** 16 posições no formato da `customPalette`: `[0] = ''`, sobras `''` no fim. */
  colors: string[]
}

/**
 * "Trazer uma foto": RGBA → bitmap INDEXADO + a paleta PRÓPRIA da foto (até 15
 * cores + transparente), pronta para virar a `customPalette` do desenho — o
 * caminho que mantém a criação dentro do teto de 16 cores (antes a foto nascia
 * `arcade` + até 48 extras e a paleta estourava sozinha).
 *
 * ⭐ Índice ↔ slot casam POR CONSTRUÇÃO: o `QuantizeResult` devolve os índices
 * e a paleta na MESMA ordem (posição 0 = transparente), então o bitmap sai
 * pronto, sem passe de vizinho-mais-próximo — e no caminho sem perda (≤15
 * cores distintas) cada pixel fica com a SUA cor exata. Reordenar por
 * frequência (como o `paletteColorsFromImage` acima faz) exigiria remapear o
 * bitmap sem ganho visível.
 */
export function quantizeToPhotoPalette(image: RGBAImage): PhotoQuantizeResult {
  const data =
    image.data instanceof Uint8ClampedArray ? image.data : Uint8ClampedArray.from(image.data)
  const result = quantizeFrames([data], PALETTE_SIZE, {
    width: image.width,
    dither: false,
  })
  const colors = Array.from({ length: PALETTE_SIZE }, () => '')
  for (const [index, rgb] of result.palette.entries()) {
    if (index === TRANSPARENT_INDEX || index >= PALETTE_SIZE) continue
    colors[index] = rgbToHex(rgb)
  }
  return {
    bitmap: {
      width: image.width,
      height: image.height,
      data: result.frames[0] ?? new Uint8Array(image.width * image.height),
    },
    colors,
  }
}

export function paletteColorsFromImage(image: RGBAImage): string[] {
  // O tipo do decoder admite array cru; o quantizador pede o typed array.
  const data =
    image.data instanceof Uint8ClampedArray ? image.data : Uint8ClampedArray.from(image.data)
  const result = quantizeFrames([data], PALETTE_SIZE, {
    width: image.width,
    dither: false,
  })
  // Frequência = contagem dos índices no único quadro (pixel transparente não
  // conta — o limiar de alfa do quantizador já o mandou para o índice 0).
  const counts = new Map<number, number>()
  const frame = result.frames[0]
  if (frame) {
    for (const index of frame) {
      if (index === TRANSPARENT_INDEX) continue
      counts.set(index, (counts.get(index) ?? 0) + 1)
    }
  }
  const seen = new Set<string>()
  const ordered: string[] = []
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])
  for (const [index] of entries) {
    const rgb = result.palette[index]
    if (!rgb) continue
    const hexColor = rgbToHex(rgb)
    if (seen.has(hexColor)) continue
    seen.add(hexColor)
    ordered.push(hexColor)
  }
  const colors = Array.from({ length: PALETTE_SIZE }, () => '')
  for (const [i, hexColor] of ordered.slice(0, PALETTE_SIZE - 1).entries()) {
    colors[i + 1] = hexColor
  }
  return colors
}

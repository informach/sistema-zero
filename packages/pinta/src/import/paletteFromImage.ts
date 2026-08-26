/**
 * Extrai as cores de uma IMAGEM DE PALETA (print de site de cores, moodboard)
 * já no formato da `customPalette` embutida: 16 posições, `[0] = ''`
 * (transparente), cores por FREQUÊNCIA (a mais presente primeiro) e sobras
 * `''` no fim quando a imagem tem menos de 15 cores.
 *
 * ⚠️ Usa o `quantizeFrames` do EXPORT (median-cut do GIF), NUNCA o
 * `quantizeToIndexed` de `import/quantize.ts`: aquele posteriza em 4 bits por
 * canal e um print de paleta sairia com as cores ERRADAS (branco #ffffff vira
 * #f8f8f8). O caminho do GIF é SEM PERDA para até 15 cores distintas — as
 * cores do print entram EXATAS.
 */
import { PALETTE_SIZE, TRANSPARENT_INDEX } from '../core/palette'
import { quantizeFrames, type Rgb } from '../export/quantize'
import type { RGBAImage } from './quantize'

function rgbToHex([r, g, b]: Rgb): string {
  const hex = (value: number) => value.toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
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

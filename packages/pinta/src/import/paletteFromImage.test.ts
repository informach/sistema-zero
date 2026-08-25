import { describe, expect, it } from 'bun:test'
import { PALETTE_SIZE } from '../core/palette'
import { sanitizePintaAsset } from '../core/project'
import { createPixelSpriteAsset } from '../core/projectConfig'
import { paletteColorsFromImage } from './paletteFromImage'
import type { RGBAImage } from './quantize'

/** Imagem RGBA onde cada entrada [hex, count] pinta `count` pixels chapados. */
function imageOf(entries: Array<[string, number]>, alpha = 255): RGBAImage {
  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  const data = new Uint8ClampedArray(total * 4)
  let offset = 0
  for (const [hexColor, count] of entries) {
    const r = Number.parseInt(hexColor.slice(1, 3), 16)
    const g = Number.parseInt(hexColor.slice(3, 5), 16)
    const b = Number.parseInt(hexColor.slice(5, 7), 16)
    for (let i = 0; i < count; i += 1) {
      data[offset] = r
      data[offset + 1] = g
      data[offset + 2] = b
      data[offset + 3] = alpha
      offset += 4
    }
  }
  return { width: total, height: 1, data }
}

describe('paletteColorsFromImage — print de paleta vira customPalette', () => {
  it('imagem chapada: cores EXATAS, por frequência, sobras vazias no FIM', () => {
    const colors = paletteColorsFromImage(
      imageOf([
        ['#123456', 3],
        ['#ff8800', 10],
        ['#00aa55', 6],
      ]),
    )
    expect(colors).toHaveLength(PALETTE_SIZE)
    expect(colors[0]).toBe('')
    // Frequência decide a ordem, não a ordem dos pixels.
    expect(colors.slice(1, 4)).toEqual(['#ff8800', '#00aa55', '#123456'])
    expect(colors.slice(4)).toEqual(Array.from({ length: 12 }, () => ''))
  })

  it('print com 15 cores distintas sai SEM PERDA (todas exatas)', () => {
    const entries = Array.from({ length: 15 }, (_, i): [string, number] => [
      `#${(i * 17).toString(16).padStart(2, '0')}10${(255 - i * 17).toString(16).padStart(2, '0')}`,
      i + 1,
    ])
    const colors = paletteColorsFromImage(imageOf(entries))
    const painted = colors.filter((c) => c !== '')
    expect(painted).toHaveLength(15)
    // Toda cor de entrada está lá, byte a byte.
    for (const [hexColor] of entries) {
      expect(painted).toContain(hexColor)
    }
    // A mais frequente (última da lista, count 15) vem primeiro.
    expect(colors[1]).toBe(entries[14]?.[0])
  })

  it('mais de 15 cores: aproxima e ainda enche as 15 posições', () => {
    const entries = Array.from({ length: 40 }, (_, i): [string, number] => [
      `#${(i * 6).toString(16).padStart(2, '0')}${(i * 5).toString(16).padStart(2, '0')}${(i * 4)
        .toString(16)
        .padStart(2, '0')}`,
      2,
    ])
    const colors = paletteColorsFromImage(imageOf(entries))
    expect(colors.filter((c) => c !== '')).toHaveLength(15)
  })

  it('pixel transparente não vira cor', () => {
    const colors = paletteColorsFromImage(imageOf([['#ff0000', 8]], 0))
    expect(colors.every((c) => c === '')).toBe(true)
  })

  it('o resultado alimenta o sanitize como customPalette válida', () => {
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const colors = paletteColorsFromImage(imageOf([['#ff8800', 4]]))
    const out = sanitizePintaAsset({
      ...sprite,
      paletteId: 'custom',
      customPalette: { name: 'Do print', colors },
    })
    if (out?.kind !== 'pixel-sprite' || !out.customPalette) throw new Error('custom esperado')
    expect(out.customPalette.colors).toEqual(colors)
  })
})

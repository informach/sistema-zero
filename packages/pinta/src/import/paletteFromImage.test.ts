import { describe, expect, it } from 'bun:test'
import { PALETTE_SIZE } from '../core/palette'
import { sanitizePintaAsset } from '../core/project'
import { createPixelSpriteAsset } from '../core/projectConfig'
import { paletteColorsFromImage, quantizeToPhotoPalette } from './paletteFromImage'
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

describe('quantizeToPhotoPalette — a foto vira bitmap + paleta PRÓPRIA (teto 16)', () => {
  it('foto chapada de 2 cores: cores EXATAS e índice ↔ slot casando pixel a pixel', () => {
    const image = imageOf([
      ['#ff8800', 3],
      ['#123456', 5],
    ])
    const { bitmap, colors } = quantizeToPhotoPalette(image)
    expect(colors).toHaveLength(PALETTE_SIZE)
    expect(colors[0]).toBe('')
    expect(colors.filter(Boolean).sort()).toEqual(['#123456', '#ff8800'])
    expect(bitmap.width).toBe(8)
    expect(bitmap.height).toBe(1)
    // Cada pixel aponta para o slot da SUA cor (caminho sem perda).
    const expected = [
      ...Array.from({ length: 3 }, () => '#ff8800'),
      ...Array.from({ length: 5 }, () => '#123456'),
    ]
    for (const [i, hexColor] of expected.entries()) {
      const index = bitmap.data[i] ?? 0
      expect(index).toBeGreaterThan(0)
      expect(colors[index]).toBe(hexColor)
    }
  })

  it('foto com mais de 15 cores: no máximo 15 slots pintados e todo índice cabe na paleta', () => {
    const entries = Array.from({ length: 40 }, (_, i): [string, number] => [
      `#${(i * 6).toString(16).padStart(2, '0')}${(i * 5).toString(16).padStart(2, '0')}${(i * 4)
        .toString(16)
        .padStart(2, '0')}`,
      2,
    ])
    const { bitmap, colors } = quantizeToPhotoPalette(imageOf(entries))
    expect(colors.filter(Boolean).length).toBeLessThanOrEqual(15)
    expect(colors.filter(Boolean).length).toBeGreaterThan(0)
    for (const index of bitmap.data) {
      // Pixel opaco nunca sai transparente nem aponta fora das 16 posições.
      expect(index).toBeGreaterThan(0)
      expect(index).toBeLessThan(PALETTE_SIZE)
      expect(colors[index]).not.toBe('')
    }
  })

  it('foto 100% transparente: nenhuma cor e bitmap todo 0 (o chamador cai em arcade)', () => {
    const { bitmap, colors } = quantizeToPhotoPalette(imageOf([['#ff0000', 6]], 0))
    expect(colors.every((c) => c === '')).toBe(true)
    expect([...bitmap.data].every((index) => index === 0)).toBe(true)
  })

  it('o limiar de alfa é 128 (contrato do ALPHA_THRESHOLD do export): 127 some, 128 pinta', () => {
    // O import herdou o limiar do quantizador do GIF — quem mexer lá muda a
    // silhueta de PNG semi-transparente do "Trazer uma foto"; a fronteira trava.
    const merged: RGBAImage = {
      width: 4,
      height: 1,
      // Mesmo verde em 4 alfas: 255, 128 (no limiar, pinta), 127 (some), 0.
      data: Uint8ClampedArray.from([
        0, 170, 85, 255, 0, 170, 85, 128, 0, 170, 85, 127, 0, 170, 85, 0,
      ]),
    }
    const { bitmap, colors } = quantizeToPhotoPalette(merged)
    expect(bitmap.data[0]).toBeGreaterThan(0)
    expect(bitmap.data[1]).toBeGreaterThan(0)
    expect(bitmap.data[2]).toBe(0)
    expect(bitmap.data[3]).toBe(0)
    expect(colors.filter(Boolean)).toEqual(['#00aa55'])
  })

  it('o desenho importado passa no sanitize com a paleta embutida (round-trip)', () => {
    const sprite = createPixelSpriteAsset({ name: 'foto', frameSize: 8 })
    const { colors } = quantizeToPhotoPalette(imageOf([['#ff8800', 4]]))
    const out = sanitizePintaAsset(
      structuredClone({
        ...sprite,
        paletteId: 'custom',
        customPalette: { name: 'Cores da foto', colors },
      }),
    )
    if (out?.kind !== 'pixel-sprite' || !out.customPalette) throw new Error('custom esperado')
    expect(out.paletteId).toBe('custom')
    expect(out.customPalette.colors).toEqual(colors)
  })
})

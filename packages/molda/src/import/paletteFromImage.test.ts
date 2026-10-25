import { expect, test } from 'bun:test'
import { MAX_CUSTOM_PALETTE_SIZE } from '../core/palette'
import { paletteFromRgba } from './paletteFromImage'

function image(colors: string[], alpha = 255): Uint8ClampedArray {
  return Uint8ClampedArray.from(
    colors.flatMap((hex) => [
      Number.parseInt(hex.slice(1, 3), 16),
      Number.parseInt(hex.slice(3, 5), 16),
      Number.parseInt(hex.slice(5, 7), 16),
      alpha,
    ]),
  )
}

test('imagem com 32 cores preserva cada hex exato e o índice reservado', () => {
  const source = Array.from(
    { length: 32 },
    (_, i) => `#${i.toString(16).padStart(2, '0')}a0${(255 - i).toString(16).padStart(2, '0')}`,
  )
  const colors = paletteFromRgba(image(source))
  expect(colors).toHaveLength(MAX_CUSTOM_PALETTE_SIZE)
  expect(colors[0]).toBe('')
  expect(colors.slice(1).sort()).toEqual(source.sort())
})

test('mais de 32 cores vira uma paleta limitada; transparência não ocupa cor', () => {
  const source = Array.from(
    { length: 80 },
    (_, i) =>
      `#${(i * 3).toString(16).padStart(2, '0')}${(i * 2).toString(16).padStart(2, '0')}${i.toString(16).padStart(2, '0')}`,
  )
  const colors = paletteFromRgba(image(source))
  expect(colors.filter(Boolean).length).toBeGreaterThan(0)
  expect(colors.filter(Boolean).length).toBeLessThanOrEqual(32)
  expect(paletteFromRgba(image(['#ff0000'], 0)).every((color) => color === '')).toBe(true)
})

test('33 tons próximos ainda usam os 32 espaços da paleta', () => {
  const source = Array.from({ length: 33 }, (_, i) => `#${i.toString(16).padStart(2, '0')}1010`)
  expect(paletteFromRgba(image(source)).filter(Boolean)).toHaveLength(32)
})

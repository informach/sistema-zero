import { expect, test } from 'bun:test'
import { pgzeroSvgSize } from './svgSize'

// Expected sizes measured with pygame-ce 2.5.8 (pygame.image.load(...).get_size()).
test('SVG sizes follow pygame-ce: units, rounding up and a missing side from the viewBox', () => {
  const cases: [string, [number, number]][] = [
    [
      '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="64" height="40.2"></svg>',
      [64, 41],
    ],
    ['<svg viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg"></svg>', [120, 60]],
    ['<svg width="30" viewBox="0 0 120 60"></svg>', [30, 60]],
    ["<svg width='1in' height='72pt'></svg>", [96, 96]],
    ['<svg height="20" viewBox="0 0 120 60"></svg>', [120, 20]],
    ['<svg width="12.2mm" height="3cm"></svg>', [47, 114]],
  ]
  for (const [text, [width, height]] of cases)
    expect(pgzeroSvgSize(text)).toEqual({ width, height })
})

test('an SVG without a usable size is refused, never guessed', () => {
  expect(pgzeroSvgSize('<svg width="100%" height="100%"></svg>')).toBeNull()
  expect(pgzeroSvgSize('<svg></svg>')).toBeNull()
  expect(pgzeroSvgSize('not an svg')).toBeNull()
})

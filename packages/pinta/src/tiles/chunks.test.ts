import { expect, it } from 'bun:test'
import { createCanvas } from '@napi-rs/canvas'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, makeCell } from './cell'
import { cellMatrix, drawCellImage, visibleChunks } from './chunks'

it('recorta por blocos de 32 sem visitar o resto do mapa', () => {
  expect(visibleChunks({ x: 520, y: 0, width: 100, height: 100 }, 16, 256, 256)).toEqual([
    { col: 1, row: 0 },
  ])
  expect(visibleChunks({ x: 4080, y: 4080, width: 100, height: 100 }, 16, 256, 256)).toEqual([
    { col: 7, row: 7 },
  ])
  expect(visibleChunks({ x: -100, y: -100, width: 50, height: 50 }, 16, 256, 256)).toEqual([])
})
it('os oito giros Tiled dão oito imagens distintas sem mudar a peça', () => {
  const sheet = createCanvas(2, 2),
    s = sheet.getContext('2d')
  for (const [i, color] of ['red', 'green', 'blue', 'white'].entries()) {
    s.fillStyle = color
    s.fillRect(i % 2, Math.floor(i / 2), 1, 1)
  }
  const variants = new Set<string>()
  for (const flags of [
    0,
    CELL_FLIP_H,
    CELL_FLIP_V,
    CELL_FLIP_H | CELL_FLIP_V,
    CELL_FLIP_D,
    CELL_FLIP_D | CELL_FLIP_H,
    CELL_FLIP_D | CELL_FLIP_V,
    CELL_FLIP_D | CELL_FLIP_H | CELL_FLIP_V,
  ]) {
    const canvas = createCanvas(2, 2),
      ctx = canvas.getContext('2d')
    drawCellImage(
      ctx as unknown as CanvasRenderingContext2D,
      sheet as unknown as CanvasImageSource,
      2,
      2,
      makeCell(0, flags),
      0,
      0,
      2,
    )
    variants.add(Array.from(ctx.getImageData(0, 0, 2, 2).data).join(','))
  }
  expect(variants.size).toBe(8)
  expect(cellMatrix(CELL_FLIP_D | CELL_FLIP_H)).toEqual([0, 1, -1, 0])
})

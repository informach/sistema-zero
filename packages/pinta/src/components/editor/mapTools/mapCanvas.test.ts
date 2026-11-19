import { expect, it } from 'bun:test'
import { mapCanvasViewport } from './mapCanvas'

it('at the end of scrolling the canvas covers the last pixel of paper without exceeding the viewport', () => {
  const stage = {
    clientWidth: 1000,
    clientHeight: 600,
    scrollLeft: 2048 + 16 - 1000,
    scrollTop: 1536 + 16 - 600,
  }
  const view = mapCanvasViewport(2048, 1536, stage)
  expect(view.x + view.width).toBe(2048)
  expect(view.y + view.height).toBe(1536)
  expect(view.width).toBeLessThanOrEqual(stage.clientWidth)
  expect(view.height).toBeLessThanOrEqual(stage.clientHeight)
})
it('small paper remains whole and at its original position', () => {
  expect(
    mapCanvasViewport(192, 128, {
      clientWidth: 1000,
      clientHeight: 600,
      scrollLeft: 0,
      scrollTop: 0,
    }),
  ).toEqual({ x: 0, y: 0, width: 192, height: 128 })
})

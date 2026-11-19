import { expect, it } from 'bun:test'
import { pointOnMap } from './mapViewport'

const box = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
})
const options = {
  paper: box(20, 40, 192, 160),
  stage: box(0, 0, 300, 300),
  viewport: { width: 300, height: 300 },
  cols: 4,
  rows: 3,
  tileSize: 16,
  pad: 1,
}
it('usa o papel e desconta o anel uma vez, com zoom e rolagem', () => {
  expect(pointOnMap({ x: 132, y: 104 }, options)).toEqual({ x: 40, y: 16 })
  expect(pointOnMap({ x: 21, y: 80 }, options)).toBeNull()
  expect(pointOnMap({ x: 132, y: 104 }, { ...options, stage: box(140, 0, 160, 300) })).toBeNull()
})
it('recusa o papel fora da janela mesmo quando ainda tem caixa de layout', () => {
  expect(
    pointOnMap(
      { x: 432, y: 104 },
      { ...options, paper: box(320, 40, 192, 160), stage: box(300, 0, 300, 300) },
    ),
  ).toBeNull()
  expect(
    pointOnMap(
      { x: 50, y: -20 },
      { ...options, paper: box(20, -100, 192, 160), stage: box(0, -100, 300, 300) },
    ),
  ).toBeNull()
})

import { expect, it } from 'bun:test'
import { mapCellFromCanvas, mapPointFromPaper, mapPointToPaper, pointOnMap } from './mapViewport'

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

it('a origem lógica assinada não muda o papel, seu anel ou o recorte da janela', () => {
  const signed = { ...options, origin: { col: -20, row: -30 } }
  expect(pointOnMap({ x: 132, y: 104 }, signed)).toEqual({ x: -280, y: -464 })
  expect(pointOnMap({ x: 21, y: 80 }, signed)).toBeNull()
  expect(pointOnMap({ x: 180, y: 104 }, signed)).toBeNull()
  expect(pointOnMap({ x: 132, y: 104 }, { ...signed, origin: { col: 20, row: 30 } })).toEqual({
    x: 360,
    y: 496,
  })
})

it('coordenadas e caixas não finitas não se tornam uma posição autoral', () => {
  expect(pointOnMap({ x: NaN, y: 104 }, options)).toBeNull()
  expect(
    pointOnMap({ x: 132, y: 104 }, { ...options, paper: { ...options.paper, width: Infinity } }),
  ).toBeNull()
})

it('papel e mundo têm conversões inversas com origem, anel e posição fracionária', () => {
  const geometry = { ...options, origin: { col: -20, row: -30 }, cellPx: 32 }
  expect(mapPointToPaper({ x: -280, y: -464 }, geometry)).toEqual({ x: 112, y: 64 })
  expect(mapPointFromPaper({ x: 132, y: 104 }, geometry)).toEqual({ x: -280, y: -464 })
  expect(
    mapCellFromCanvas(
      { x: 100, y: 100 },
      {
        ...geometry,
        canvas: { left: 20, top: 40 },
        viewport: { x: 80, y: 56 },
        layerOffset: { x: 0.5, y: -0.25 },
      },
    ),
  ).toEqual({ col: -17, row: -28 })
})

it('a transformação inversa conserva precisão em origens grandes e diferentes zooms', () => {
  for (const col of [-4096, -65, 0, 64, 4096])
    for (const cellPx of [4, 8, 16, 32])
      for (const pad of [0, 1]) {
        const geometry = {
            cols: 64,
            rows: 64,
            tileSize: 16,
            pad,
            origin: { col, row: col },
            cellPx,
          },
          original = { x: col * 16 + 10.25, y: col * 16 + 90.5 },
          at = mapPointToPaper(original, geometry),
          actual = mapPointFromPaper(
            { x: at.x + 20, y: at.y + 40 },
            { ...geometry, paper: box(20, 40, (64 + pad * 2) * cellPx, (64 + pad * 2) * cellPx) },
          )
        expect(actual?.x).toBeCloseTo(original.x, 8)
        expect(actual?.y).toBeCloseTo(original.y, 8)
      }
})

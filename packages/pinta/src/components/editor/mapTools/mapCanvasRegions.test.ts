import { expect, test } from 'bun:test'
import { createCanvas } from '@napi-rs/canvas'
import {
  makeRegionRenderFixture,
  translatedRegionRenderMap,
} from '../../../../scripts/homologacao/regionRendering'
import { createTilemapAsset } from '../../../core/project'
import { TileChunkCache } from '../../../tiles/chunks'
import type { AuthorMap } from '../../../tiles/mapCellEdits'
import { expandRegionMap, prepareMapRegions } from '../../../tiles/regionMap'
import { paintMapCanvas } from './mapCanvas'

const makeCanvas = (width: number, height: number) =>
  Object.assign(createCanvas(width, height), {
    style: { transform: '' },
  }) as unknown as HTMLCanvasElement

test('a grade de um mundo extenso visita somente linhas que podem atingir o canvas', () => {
  const p = prepareMapRegions(
    createTilemapAsset({ name: 'mundo', tilesetId: 'tiles', cols: 2, rows: 2 }),
  )
  if (!p.ok) throw Error(p.reason)
  const e = expandRegionMap(p.map, { col: -100, row: -100, cols: 10000, rows: 10000 })
  if (!e.ok) throw Error(e.reason)
  const before = structuredClone(e.map)
  for (const cellPx of [0.5, 4, 16, 32]) {
    const canvas = makeCanvas(1, 1),
      context = canvas.getContext('2d')!,
      original = context.moveTo.bind(context),
      cache = new TileChunkCache()
    let moves = 0
    context.moveTo = (x, y) => {
      moves++
      original(x, y)
    }
    paintMapCanvas({
      canvas,
      map: e.map,
      cache,
      tileSize: 16,
      cellPx,
      pad: 1,
      time: 0,
      stage: {
        clientWidth: 180,
        clientHeight: 128,
        scrollLeft: 2511,
        scrollTop: 2033,
      } as HTMLElement,
      tilesetById: new Map(),
      sheetOf: () => null,
      showCollision: false,
    })
    expect(moves).toBeLessThanOrEqual(
      Math.ceil((180 + 2) / cellPx) + Math.ceil((128 + 2) / cellPx) + 2,
    )
    expect(e.map).toEqual(before)
    cache.clear()
  }
})
function render(
  map: AuthorMap,
  data: ReturnType<typeof makeRegionRenderFixture>,
  collision: boolean,
) {
  const canvas = makeCanvas(1, 1),
    cache = new TileChunkCache(32 * 1024 * 1024, () => makeCanvas(1, 1)),
    viewport = paintMapCanvas({
      canvas,
      map,
      cache,
      tileSize: 16,
      cellPx: 16,
      pad: 1,
      time: 100,
      stage: { clientWidth: 180, clientHeight: 128, scrollLeft: 88, scrollTop: 64 } as HTMLElement,
      tilesetById: new Map([[data.tileset.id, data.tileset]]),
      sheetOf: () => data.sheet,
      showCollision: collision,
    })
  const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
  expect(viewport).toEqual({ x: 80, y: 56, width: 180, height: 128 })
  expect(canvas.style.transform).toBe('translate(80px, 56px)')
  expect(cache.usedBytes).toBeLessThanOrEqual(32 * 1024 * 1024)
  cache.clear()
  return pixels
}

for (const origin of [-4096, -64, 64, 4096])
  for (const collision of [false, true])
    test(`canvas da oficina conserva pixels densos na origem ${origin}, colisão=${collision}`, () => {
      const data = makeRegionRenderFixture(makeCanvas),
        map = translatedRegionRenderMap(data.map, origin, origin),
        before = structuredClone(map)
      data.tileset.solid = [false, true, false, false]
      data.tileset.platform = [false, false, true, false]
      const expected = render(data.map, data, collision),
        actual = render(map, data, collision)
      expect(expected.some((value, i) => i % 4 === 3 && value > 0)).toBe(true)
      expect(actual.findIndex((value, i) => value !== expected[i])).toBe(-1)
      expect(map).toEqual(before)
    })

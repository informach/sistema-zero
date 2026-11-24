/** QA-only exact RGBA probe of clipping/antialiasing at paper and viewport edges. */
import { paintMapCanvas } from '../src/components/editor/mapTools/mapCanvas'
import { createTilemapAsset } from '../src/core/project'
import { TileChunkCache } from '../src/tiles/chunks'
import { expandRegionMap, prepareMapRegions } from '../src/tiles/regionMap'

export async function runGridEdgeProbe() {
  const dense = createTilemapAsset({ name: 'grade', tilesetId: 'tiles', cols: 256, rows: 256 }),
    p = prepareMapRegions(dense)
  if (!p.ok) throw Error(p.reason)
  const e = expandRegionMap(p.map, { col: -100, row: -100, cols: 10000, rows: 10000 })
  if (!e.ok) throw Error(e.reason)
  const cases = []
  for (const map of [dense, e.map])
    for (const cellPx of [0.5, 1.25, 4, 16, 31.5])
      for (const pad of [0, 1])
        for (const scroll of [0, 1, 2, 17, 1234, Number.MAX_SAFE_INTEGER]) {
          const canvas = document.createElement('canvas'),
            stage = document.createElement('div'),
            paper = document.createElement('div'),
            cache = new TileChunkCache()
          stage.style.cssText =
            'position:absolute;left:-12000px;width:128px;height:96px;overflow:scroll;scrollbar-width:none'
          paper.style.width = `${(map.cols + 2 * pad) * cellPx + 16}px`
          paper.style.height = `${(map.rows + 2 * pad) * cellPx + 16}px`
          stage.append(paper)
          document.body.append(stage)
          stage.scrollLeft = scroll
          stage.scrollTop = scroll
          const ctx = canvas.getContext('2d')!,
            moveTo = ctx.moveTo.bind(ctx)
          let moves = 0
          ctx.moveTo = (x, y) => {
            moves++
            moveTo(x, y)
          }
          try {
            const viewport = paintMapCanvas({
                canvas,
                stage,
                map,
                pad,
                cellPx,
                tileSize: 16,
                cache,
                time: 100,
                showCollision: false,
                tilesetById: new Map(),
                sheetOf: () => null,
              }),
              pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data,
              digest = new Uint8Array(
                await crypto.subtle.digest('SHA-256', Uint8Array.from(pixels)),
              )
            cases.push({
              regional: 'origin' in map,
              cellPx,
              pad,
              scroll,
              viewport,
              width: canvas.width,
              height: canvas.height,
              moves,
              sha256: [...digest].map((x) => x.toString(16).padStart(2, '0')).join(''),
            })
          } finally {
            stage.remove()
            cache.clear()
          }
        }
  return cases
}

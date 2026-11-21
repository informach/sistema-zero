/** QA-only frame lab. Preparation/IO and image readback are outside submission timing. */
import { paintMapCanvas } from '../src/components/editor/mapTools/mapCanvas'
import { createTilemapAsset, type TilemapAsset } from '../src/core/project'
import { TileChunkCache } from '../src/tiles/chunks'
import type { AuthorMap } from '../src/tiles/mapCellEdits'
import { mapAllocatedCellCount } from '../src/tiles/mapCells'
import { editRegionMapCells, expandRegionMap, prepareMapRegions } from '../src/tiles/regionMap'
import { makeRegionRenderFixture } from './homologacao/regionRendering'

const canvasOf = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}
let active: ReturnType<typeof fixture> | null = null
function fixture(kind: 'sparse' | 'dense') {
  const data = makeRegionRenderFixture(canvasOf)
  let map: AuthorMap
  if (kind === 'sparse') {
    const p = prepareMapRegions(
      createTilemapAsset({ name: 'mundo', tilesetId: data.tileset.id, cols: 2, rows: 2 }),
    )
    if (!p.ok) throw Error(p.reason)
    const e = expandRegionMap(p.map, { col: -100, row: -100, cols: 10000, rows: 10000 })
    if (!e.ok) throw Error(e.reason)
    const d = editRegionMapCells(e.map, e.map.layers[0]!.id, [
      { col: -100, row: -100, cell: 0 },
      { col: 9899, row: 9899, cell: 1 },
    ])
    if (!d.ok) throw Error(d.reason)
    map = d.map
  } else {
    const seed = createTilemapAsset({
      name: 'cheio',
      tilesetId: data.tileset.id,
      cols: 256,
      rows: 256,
    })
    const dense: TilemapAsset = {
      ...seed,
      layers: Array.from({ length: 32 }, (_, index) => ({
        id: `layer-${index}`,
        name: `camada-${index}`,
        visible: true,
        opacity: index % 2 ? 0.75 : 1,
        cells: Int16Array.from({ length: 256 * 256 }, (_, i) => (i + index) % 4),
      })),
    }
    map = dense
  }
  const stage = document.createElement('div'),
    paper = document.createElement('div'),
    canvas = canvasOf(1, 1),
    cache = new TileChunkCache()
  stage.style.cssText =
    'position:absolute;left:-12000px;width:1024px;height:768px;overflow:scroll;scrollbar-width:none'
  paper.style.width = `${map.cols * 16 + 16}px`
  paper.style.height = `${map.rows * 16 + 16}px`
  stage.append(paper)
  document.body.append(stage)
  stage.scrollLeft = 8
  stage.scrollTop = 8
  const context = canvas.getContext('2d')!
  const frame = () => {
    paintMapCanvas({
      canvas,
      stage,
      map,
      pad: 0,
      cellPx: 16,
      tileSize: 16,
      cache,
      tilesetById: new Map([[data.tileset.id, data.tileset]]),
      sheetOf: () => data.sheet,
      time: 100,
      showCollision: false,
    })
  }
  return {
    canvas,
    context,
    frame,
    stage,
    cache,
    kind,
    allocatedCellBytes: mapAllocatedCellCount(map) * 2,
    layers: map.layers.length,
    logicalCells: map.cols * map.rows,
  }
}
export function prepareGridBench(kind: 'sparse' | 'dense') {
  disposeGridBench()
  active = fixture(kind)
  return {
    kind,
    layers: active.layers,
    logicalCells: active.logicalCells,
    allocatedCellBytes: active.allocatedCellBytes,
  }
}
export function sampleGridFrames(count: number) {
  if (!active || !Number.isSafeInteger(count) || count < 1 || count > 2000)
    throw Error('Amostragem inválida')
  const times = []
  for (let i = 0; i < count; i++) {
    const at = performance.now()
    active.frame()
    times.push(performance.now() - at)
  }
  return {
    times,
    cacheBytes: active.cache.usedBytes,
    width: active.canvas.width,
    height: active.canvas.height,
  }
}
/** Count commands in a separate pass; do not instrument timed/profiled rendering. */
export function countGridMoves() {
  if (!active) throw Error('Lab ausente')
  const { context, frame } = active,
    original = context.moveTo
  let moves = 0
  context.moveTo = function (x, y) {
    moves++
    original.call(this, x, y)
  }
  try {
    frame()
    return moves
  } finally {
    context.moveTo = original
  }
}
export async function gridPixels() {
  if (!active) throw Error('Lab ausente')
  const pixels = active.context.getImageData(0, 0, active.canvas.width, active.canvas.height).data,
    digest = new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(pixels)))
  return {
    sha256: [...digest].map((x) => x.toString(16).padStart(2, '0')).join(''),
    painted: pixels.reduce((n, v, i) => n + (i % 4 === 3 && v > 0 ? 1 : 0), 0),
  }
}
export function disposeGridBench() {
  if (active) {
    active.stage.remove()
    active.cache.clear()
    active = null
  }
}

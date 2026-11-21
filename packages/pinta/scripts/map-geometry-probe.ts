/** QA-only: actual office canvas and coordinate/placement consumers, without public format changes. */
import { paintMapCanvas } from '../src/components/editor/mapTools/mapCanvas'
import { pointOnMap } from '../src/components/editor/mapTools/mapViewport'
import { createPixelSpriteAsset, createTilemapAsset } from '../src/core/project'
import { normalizeCellRect } from '../src/tiles/cellGeometry'
import { TileChunkCache } from '../src/tiles/chunks'
import { libraryPlacement } from '../src/tiles/libraryPlacement'
import type { AuthorMap } from '../src/tiles/mapCellEdits'
import { mapAllocatedCellCount } from '../src/tiles/mapCells'
import { editRegionMapCells, expandRegionMap, prepareMapRegions } from '../src/tiles/regionMap'
import { createMapSet } from '../src/tiles/sets'
import {
  alignedDenseRenderReference,
  makeRegionRenderFixture,
  translatedRegionRenderMap,
} from './homologacao/regionRendering'

const canvasOf = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}
const fixture = () => {
  const data = makeRegionRenderFixture(canvasOf)
  data.tileset.solid = [false, true, false, false]
  data.tileset.platform = [false, false, true, false]
  return data
}
async function hash(bytes: ArrayBufferView | string) {
  const input =
    typeof bytes === 'string'
      ? new TextEncoder().encode(bytes)
      : Uint8Array.from(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength))
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', input)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}
async function paint(
  data: ReturnType<typeof fixture>,
  map: AuthorMap,
  cellPx: number,
  pad: number,
  collision: boolean,
  scroll = { x: 32, y: 32 },
  capture = false,
) {
  const stage = document.createElement('div'),
    spacer = document.createElement('div'),
    canvas = canvasOf(1, 1),
    cache = new TileChunkCache()
  stage.style.cssText =
    'position:absolute;left:-10000px;width:160px;height:128px;overflow:scroll;scrollbar-width:none'
  spacer.style.width = `${(map.cols + 2 * pad) * cellPx + 16}px`
  spacer.style.height = `${(map.rows + 2 * pad) * cellPx + 16}px`
  stage.append(spacer)
  document.body.append(stage)
  stage.scrollLeft = scroll.x + 8
  stage.scrollTop = scroll.y + 8
  let gridMoves = 0
  const ctx = canvas.getContext('2d')!,
    moveTo = ctx.moveTo.bind(ctx)
  ctx.moveTo = (x, y) => {
    gridMoves++
    moveTo(x, y)
  }
  try {
    const viewport = paintMapCanvas({
        canvas,
        stage,
        map,
        cellPx,
        pad,
        tileSize: 16,
        cache,
        tilesetById: new Map([[data.tileset.id, data.tileset]]),
        sheetOf: () => data.sheet,
        time: 100,
        showCollision: collision,
      }),
      pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    return {
      hash: await hash(pixels),
      width: canvas.width,
      height: canvas.height,
      viewport,
      cacheBytes: cache.usedBytes,
      gridMoves,
      painted: pixels.reduce((n, value, i) => n + (i % 4 === 3 && value > 0 ? 1 : 0), 0),
      preview: capture ? canvas.toDataURL() : undefined,
    }
  } finally {
    stage.remove()
    cache.clear()
  }
}

export async function runMapGeometryLegacyProbe() {
  const data = fixture(),
    images = []
  for (const cellPx of [4, 8, 16, 32])
    for (const pad of [0, 1])
      for (const collision of [false, true])
        for (const scroll of [
          { x: 0, y: 0 },
          { x: 80, y: 56 },
        ])
          images.push({
            cellPx,
            pad,
            collision,
            scroll,
            image: await paint(data, data.map, cellPx, pad, collision, scroll),
          })
  const map = {
      ...data.map,
      layers: [
        ...data.map.layers,
        {
          id: 'objects',
          kind: 'objects' as const,
          name: 'Objetos',
          visible: true,
          parentId: 'group',
          offsetX: 11.25,
          offsetY: -3.5,
          objects: [],
        },
      ],
    },
    art = { ...createPixelSpriteAsset({ name: 'arvore', frameSize: 16 }), id: 'drawing' },
    set = {
      ...createMapSet(
        createTilemapAsset({ name: 'casa', tilesetId: data.tileset.id, cols: 2, rows: 2 }),
        { col: 0, row: 0, cols: 2, rows: 2 },
        16,
        'casa',
      ),
      id: 'set',
    },
    placements = []
  for (const source of [art, set])
    for (const snap of [false, true])
      for (const x of [-100, 0, 8, 16.5, 120, 9999]) {
        const result = libraryPlacement(map, 'objects', source, 16, { x, y: x / 2 }, snap)
        placements.push({
          source: source.id,
          snap,
          x,
          result: result ? { ...result, object: { ...result.object, id: 'new-object' } } : null,
        })
      }
  const box = (left: number, top: number, width: number, height: number) => ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
    }),
    options = {
      paper: box(20, 40, 192, 160),
      stage: box(0, 0, 300, 300),
      viewport: { width: 300, height: 300 },
      cols: 4,
      rows: 3,
      tileSize: 16,
      pad: 1,
    },
    points = []
  for (let x = 0; x <= 240; x += 0.5) points.push(pointOnMap({ x, y: 104 }, options))
  const selections = []
  for (let col = -2; col < 7; col++)
    selections.push(normalizeCellRect({ col, row: -1 }, { col: 2, row: 3 }, 4, 4))
  return { images, placements, points, selections }
}

export async function runMapGeometryRegionProbe() {
  const data = fixture(),
    cases = []
  let preview: string | undefined
  for (const origin of [-64, -65, 4096]) {
    const map = translatedRegionRenderMap(data.map, origin, origin),
      reference = alignedDenseRenderReference(data.map, origin, origin)
    for (const cellPx of [4, 8, 16, 32])
      for (const pad of [0, 1])
        for (const collision of [false, true]) {
          const expected = await paint(data, reference.map, cellPx, pad, collision, {
              x: reference.origin.col * cellPx + 32,
              y: reference.origin.row * cellPx + 32,
            }),
            actual = await paint(data, map, cellPx, pad, collision, { x: 32, y: 32 }, !preview)
          preview ??= actual.preview
          cases.push({
            origin,
            cellPx,
            pad,
            collision,
            expected: expected.hash,
            actual: actual.hash,
            cacheBytes: actual.cacheBytes,
            painted: actual.painted,
          })
        }
  }
  const seed = prepareMapRegions(
    createTilemapAsset({ name: 'mundo', tilesetId: data.tileset.id, cols: 2, rows: 2 }),
  )
  if (!seed.ok) throw Error(seed.reason)
  const expanded = expandRegionMap(seed.map, { col: -100, row: -100, cols: 10000, rows: 10000 })
  if (!expanded.ok) throw Error(expanded.reason)
  const layer = expanded.map.layers[0]!,
    edited = editRegionMapCells(expanded.map, layer.id, [
      { col: -100, row: -100, cell: 0 },
      { col: 9899, row: 9899, cell: 1 },
    ])
  if (!edited.ok) throw Error(edited.reason)
  const world = await paint(data, edited.map, 16, 0, false, { x: 0, y: 0 })
  return {
    cases,
    preview,
    world: {
      ...world,
      logicalCells: edited.map.cols * edited.map.rows,
      allocatedCellBytes: mapAllocatedCellCount(edited.map) * Int16Array.BYTES_PER_ELEMENT,
    },
  }
}

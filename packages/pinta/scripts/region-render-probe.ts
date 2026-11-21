import { isTileLayer, type RegionTilemapAsset, type TilemapAsset } from '../src/core/project'
import { paintTilemapLayers, TileChunkCache, visibleLayerChunks } from '../src/tiles/chunks'
import { mapCellBounds } from '../src/tiles/mapCells'
import { editRegionMapCells } from '../src/tiles/regionMap'
import {
  alignedDenseRenderReference,
  integerPixelRenderFixture,
  makeRegionRenderFixture,
  translatedRegionRenderMap,
} from './homologacao/regionRendering'

function canvasOf(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}
type Fixture = ReturnType<typeof makeRegionRenderFixture>

async function paint(
  data: Fixture,
  map: TilemapAsset | RegionTilemapAsset,
  scale: number,
  time: number,
  budget: number,
  contentOrigin: { col: number; row: number } = mapCellBounds(map),
  capture = false,
) {
  const canvas = canvasOf(256, 192),
    ctx = canvas.getContext('2d')!,
    cache = new TileChunkCache(budget),
    origin = contentOrigin
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#183442'
  ctx.fillRect(0, 0, 256, 192)
  ctx.translate(-16 - origin.col * 16 * scale, -12 - origin.row * 16 * scale)
  paintTilemapLayers(
    ctx,
    map,
    new Map([[data.tileset.id, data.tileset]]),
    () => data.sheet,
    cache,
    {
      x: origin.col * 16 + 16 / scale,
      y: origin.row * 16 + 12 / scale,
      width: 256 / scale,
      height: 192 / scale,
    },
    scale,
    time,
  )
  const pixels = ctx.getImageData(0, 0, 256, 192).data,
    digest = await crypto.subtle.digest('SHA-256', pixels),
    result = {
      pixels,
      sha256: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
        '',
      ),
      cacheBytes: cache.usedBytes,
      rebuilds: cache.rebuilds,
      pressureBytes: cache.workingSetBytes,
      preview: capture ? canvas.toDataURL('image/png') : undefined,
    }
  cache.clear()
  canvas.width = canvas.height = 1
  return result
}

function difference(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  let first = -1,
    count = 0,
    max = 0
  for (let i = 0; i < a.length; i++)
    if (a[i] !== b[i]) {
      if (first < 0) first = i
      count++
      max = Math.max(max, Math.abs(a[i]! - b[i]!))
    }
  const pixel = Math.floor(first / 4) * 4
  return {
    first,
    count,
    max,
    actual: first < 0 ? [] : Array.from(a.slice(pixel, pixel + 4)),
    reference: first < 0 ? [] : Array.from(b.slice(pixel, pixel + 4)),
  }
}

/** QA isolates the existing dense direct path, including with an archived renderer. */
export async function runDensePressureRenderProbe(
  variant: 'original' | 'opaque' | 'layer-opaque' | 'both' | 'normalized' | 'readback' = 'original',
) {
  const data = integerPixelRenderFixture(makeRegionRenderFixture(canvasOf)),
    cases = []
  if (variant === 'layer-opaque' || variant === 'both')
    data.map = { ...data.map, layers: data.map.layers.map((layer) => ({ ...layer, opacity: 1 })) }
  if (variant === 'opaque' || variant === 'both') {
    const ctx = data.sheet.getContext('2d')!
    for (let tile = 0; tile < 4; tile++)
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          ctx.fillStyle = `rgb(${tile * 63},${x * 16},${y * 16})`
          ctx.fillRect(tile * 16 + x, y, 1, 1)
        }
  }
  if (variant === 'normalized') {
    const sheet = canvasOf(data.sheet.width, data.sheet.height)
    sheet.getContext('2d')!.drawImage(data.sheet, 0, 0)
    data.sheet.width = data.sheet.height = 1
    data.sheet = sheet
  }
  if (variant === 'readback') {
    const ctx = data.sheet.getContext('2d')!,
      pixels = ctx.getImageData(0, 0, data.sheet.width, data.sheet.height)
    ctx.putImageData(pixels, 0, 0)
  }
  for (const scale of [0.25, 0.5, 1, 2]) {
    const reference = await paint(
        data,
        data.map,
        scale,
        100,
        32 * 1024 * 1024,
        undefined,
        scale === 1,
      ),
      actual = await paint(data, data.map, scale, 100, 1, undefined, scale === 1)
    cases.push({
      scale,
      reference: reference.sha256,
      actual: actual.sha256,
      difference: difference(actual.pixels, reference.pixels),
      rebuilds: actual.rebuilds,
      preview: actual.preview,
      referencePreview: reference.preview,
    })
  }
  data.sheet.width = data.sheet.height = 1
  return cases
}

/** Real canvas comparison, isolated from the workshop and its still-dense public format. */
export async function runRegionRenderProbe() {
  const data = makeRegionRenderFixture(canvasOf),
    cases = []
  let preview = ''
  for (const [col, row] of [
    [-64, -64],
    [-65, -66],
  ] as const) {
    const map = translatedRegionRenderMap(data.map, col, row),
      dense = alignedDenseRenderReference(data.map, col, row)
    for (const scale of [0.25, 0.5, 1, 2])
      for (const time of [0, 100, 250]) {
        const reference = await paint(data, dense.map, scale, time, 32 * 1024 * 1024, dense.origin),
          actual = await paint(
            data,
            map,
            scale,
            time,
            32 * 1024 * 1024,
            undefined,
            col === -65 && scale === 0.5 && time === 100,
          )
        if (actual.preview) preview = actual.preview
        cases.push({
          col,
          row,
          scale,
          time,
          pressure: false,
          difference: difference(actual.pixels, reference.pixels),
          reference: reference.sha256,
          actual: actual.sha256,
          cacheBytes: actual.cacheBytes,
          rebuilds: actual.rebuilds,
          pressureBytes: actual.pressureBytes,
        })
      }
  }
  // Integer destinations admit the direct path; transformed/downsampled cases above keep chunks.
  const aligned = integerPixelRenderFixture(data)
  for (const [col, row] of [
    [-64, -64],
    [-65, -66],
  ] as const) {
    const map = translatedRegionRenderMap(aligned.map, col, row),
      dense = alignedDenseRenderReference(aligned.map, col, row)
    for (const scale of [0.25, 0.5, 1, 2]) {
      // Storage parity compares the same renderer mode. Cross-mode alpha precision is isolated above.
      const reference = await paint(aligned, dense.map, scale, 100, 1, dense.origin),
        actual = await paint(aligned, map, scale, 100, 1)
      cases.push({
        col,
        row,
        scale,
        time: 100,
        pressure: true,
        difference: difference(actual.pixels, reference.pixels),
        reference: reference.sha256,
        actual: actual.sha256,
        cacheBytes: actual.cacheBytes,
        rebuilds: actual.rebuilds,
        pressureBytes: actual.pressureBytes,
      })
    }
  }
  const prepared = translatedRegionRenderMap(data.map, -65, -66),
    world: RegionTilemapAsset = {
      ...prepared,
      origin: { col: -100, row: -100 },
      cols: 10000,
      rows: 10000,
      layers: prepared.layers.map((layer) =>
        isTileLayer(layer) ? { ...layer, cells: { ...layer.cells, chunks: [] } } : layer,
      ),
    },
    changed = editRegionMapCells(world, 'layer-0', [
      { col: -50, row: -40, cell: 0 },
      { col: 9000, row: 9000, cell: 1 },
    ])
  if (!changed.ok) throw Error(changed.reason)
  const tilesets = new Map([[data.tileset.id, data.tileset]]),
    whole = visibleLayerChunks(changed.map, tilesets, {
      x: -1600,
      y: -1600,
      width: 160000,
      height: 160000,
    }),
    negative = visibleLayerChunks(changed.map, tilesets, {
      x: -820,
      y: -660,
      width: 64,
      height: 64,
    })
  const sparse = {
    logicalCells: world.cols * world.rows,
    wholeChunks: whole.flatMap((layer) => layer.chunks),
    negativeChunks: negative.flatMap((layer) => layer.chunks),
    indexBytes: changed.map.layers
      .filter(isTileLayer)
      .reduce(
        (sum, layer) =>
          sum + layer.cells.chunks.reduce((total, chunk) => total + chunk.cells.byteLength, 0),
        0,
      ),
  }
  data.sheet.width = data.sheet.height = 1
  return { cases, sparse, preview }
}

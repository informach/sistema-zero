import { resolveAssetPalette } from '../../packages/pinta/src/core/project'
import {
  createPixelBackgroundAsset,
  createTilemapAsset,
  createVectorTilesetAsset,
} from '../../packages/pinta/src/core/projectConfig'
import { bitmapToPngDataUrl } from '../../packages/pinta/src/export/png'
import { vectorTilemapPngDataUrl } from '../../packages/pinta/src/tiles/renderVectorTilemap'
import type { VectorShape } from '../../packages/pinta/src/vector/model'
import { vectorPngDataUrl } from '../../packages/pinta/src/vector/rasterize'
import { materializeVectorMap } from './pinta-tiles'
import './pinta-differential'

function rect(id: string, x: number, y: number, w: number, h: number, fill: string): VectorShape {
  return { type: 'rect', id, x, y, w, h, rx: 0, fill, stroke: null, opacity: 1, rotation: 0 }
}

async function inspectPng(dataUrl: string | null) {
  if (!dataUrl?.startsWith('data:image/png;base64,')) throw new Error('Pinta did not produce a PNG')
  const bytes = Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(',') + 1)), (c) =>
    c.charCodeAt(0),
  )
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.drawImage(bitmap, 0, 0)
    const pixel = (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data]
    return {
      dataUrl,
      bytes: bytes.byteLength,
      width: bitmap.width,
      height: bitmap.height,
      origin: pixel(1, 1),
      bottom: pixel(1, bitmap.height - 2),
      secondTile: pixel(17, 1),
    }
  } finally {
    bitmap.close()
  }
}

export async function qualifyPinta(repetitions = 30, method: 'svg' | 'tiles' = 'tiles') {
  if (!Number.isSafeInteger(repetitions) || repetitions < 1 || repetitions > 30)
    throw new Error('Invalid repetitions')
  const progress = (phase: string, data: Record<string, unknown> = {}) =>
    console.log(`PINTA_PROGRESS ${JSON.stringify({ phase, at: performance.now(), ...data })}`)
  progress('raster-start')
  const pixel = createPixelBackgroundAsset({ name: 'pixel-canary', width: 512, height: 512 })
  const bitmap = pixel.cels[0]
  if (!bitmap) throw new Error('Missing pixel fixture')
  bitmap.data.fill(1, 0, 512 * 256)
  const raster = await inspectPng(bitmapToPngDataUrl(bitmap, resolveAssetPalette(pixel)))
  progress('raster-complete', { width: raster.width, height: raster.height })
  const frame = await inspectPng(
    await vectorPngDataUrl({
      width: 128,
      height: 64,
      shapes: [rect('frame', 0, 0, 64, 32, '#ff0000')],
    }),
  )
  progress('frame-complete', { width: frame.width, height: frame.height })
  const tileset = createVectorTilesetAsset({ name: 'vector-tiles', tileSize: 16 })
  // 64 vector rectangles per tile, 16,384 cells, exported at the actual 2048²
  // resolution. This must not reuse the existing <=512px Studio thumbnail.
  tileset.tiles = ['#ff0000', '#0000ff'].map((fill, tile) =>
    Array.from({ length: 64 }, (_, index) =>
      rect(`tile-${tile}-${index}`, (index % 8) * 2, Math.floor(index / 8) * 2, 2, 2, fill),
    ),
  )
  const map = createTilemapAsset({
    name: 'map-canary',
    tilesetId: tileset.id,
    cols: 128,
    rows: 128,
  })
  const layer = map.layers[0]
  if (!layer) throw new Error('Missing map layer')
  layer.cells = Int16Array.from({ length: 128 * 128 }, (_, i) => i % 2)
  const samples: number[] = []
  const frames: number[] = []
  let last: number | undefined
  let active = true
  function tick(now: number) {
    if (last !== undefined) frames.push(now - last)
    last = now
    if (active) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  let exported: Awaited<ReturnType<typeof inspectPng>> | undefined
  try {
    for (let i = 0; i < repetitions; i++) {
      progress('map-start', { index: i })
      const began = performance.now()
      const result =
        method === 'svg'
          ? await vectorTilemapPngDataUrl(map, tileset, 1)
          : await materializeVectorMap(map, tileset)
      samples.push(performance.now() - began)
      progress('map-complete', { index: i, elapsedMs: samples.at(-1) })
      if (i === 0 || i === repetitions - 1) exported = await inspectPng(result)
      // Measure subsequent input/paint opportunity after every conversion.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
  } finally {
    active = false
  }
  if (!exported) throw new Error('Missing map PNG')
  const cancellation: { phase: string; elapsedMs: number; acknowledgedRows: number }[] = []
  for (let i = 0; i < 30; i++) {
    await globalThis.pintaL0CancellationBoundary?.('start')
    const controller = new AbortController()
    let stoppedAt = 0
    let acknowledgedRows = 0
    try {
      await materializeVectorMap(map, tileset, {
        signal: controller.signal,
        onProgress(rows) {
          if (!controller.signal.aborted) {
            acknowledgedRows = rows
            stoppedAt = performance.now()
            controller.abort()
          }
        },
      })
      throw new Error('Cancelled conversion unexpectedly completed')
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'AbortError' || acknowledgedRows === 0)
        throw error
      cancellation.push({
        phase: 'worker-compositing',
        elapsedMs: performance.now() - stoppedAt,
        acknowledgedRows,
      })
    }
    await globalThis.pintaL0CancellationBoundary?.('end')
  }
  return {
    cancellation,
    phases: performance
      .getEntriesByType('measure')
      .filter((entry) => entry.name.startsWith('pinta-'))
      .map(({ name, duration }) => ({ name, duration })),
    raster,
    frame,
    map: exported,
    samples,
    frames,
    fixture: { cells: 16384, shapesPerTile: 64, width: 2048, height: 2048, scale: 1 },
  }
}

declare global {
  var pintaL0: typeof qualifyPinta
  var pintaL0CancellationBoundary: ((phase: 'start' | 'end') => Promise<void>) | undefined
}
globalThis.pintaL0 = qualifyPinta

import {
  createTilemapAsset,
  createVectorTilesetAsset,
} from '../../packages/pinta/src/core/projectConfig'
import { vectorTilemapPngDataUrl } from '../../packages/pinta/src/tiles/renderVectorTilemap'
import type { VectorShape } from '../../packages/pinta/src/vector/model'
import { materializeVectorMap } from './pinta-tiles'

function rect(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  extra: Partial<Extract<VectorShape, { type: 'rect' }>> = {},
): VectorShape {
  return {
    type: 'rect',
    id,
    x,
    y,
    w,
    h,
    rx: 0,
    fill: '#ff0000',
    stroke: null,
    opacity: 1,
    rotation: 0,
    ...extra,
  }
}
async function pixels(url: string | null) {
  if (!url) throw new Error('PNG unavailable')
  const blob = await (await fetch(url)).blob()
  const image = await createImageBitmap(blob)
  try {
    const canvas = new OffscreenCanvas(image.width, image.height)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.drawImage(image, 0, 0)
    return ctx.getImageData(0, 0, image.width, image.height).data
  } finally {
    image.close()
  }
}
export async function qualifyPintaDifferential() {
  const fixtures: { name: string; tiles: VectorShape[][] }[] = [
    {
      name: 'transparent-overlap',
      tiles: [
        [
          rect('a', 2, 3, 17, 15, { opacity: 0.3 }),
          rect('b', 8, 9, 16, 18, { opacity: 0.65, fill: '#0000ff' }),
        ],
        [rect('c', 4, 5, 15, 11, { fill: '#00ff00', rotation: 23 })],
      ],
    },
    {
      name: 'clipping-strokes-rotation',
      tiles: [
        [rect('a', -5, -7, 30, 25, { rotation: 38, stroke: { color: '#0000ff', width: 3 } })],
        [rect('b', 20, 22, 29, 20, { rx: 7, stroke: { color: '#00ff00', width: 5 } })],
      ],
    },
    {
      name: 'repeated-gradient-ids',
      tiles: [
        [
          rect('same-id', 1, 2, 29, 25, {
            fill: { type: 'linear', from: '#ff0000', to: '#0000ff', angle: 33 },
          }),
        ],
        [
          rect('same-id', 3, 1, 24, 30, {
            fill: { type: 'radial', from: '#00ff00', to: '#ff00ff', angle: 0 },
            opacity: 0.8,
          }),
        ],
      ],
    },
    {
      name: 'mask-and-hidden',
      tiles: [
        [
          rect('mask', 4, 6, 18, 15, { rotation: 17 }),
          rect('fill', -2, 0, 40, 30, { maskId: 'mask', fill: '#0000ff' }),
          rect('hidden', 0, 0, 32, 32, { hidden: true }),
        ],
        [
          rect('mask', 2, 3, 20, 18, { rx: 5 }),
          rect('fill', 0, 0, 32, 32, { maskId: 'mask', fill: '#00ff00' }),
        ],
      ],
    },
  ]
  const evidence: {
    name: string
    components: number
    differingComponents: number
    maximumDifference: number
  }[] = []
  for (const fixture of fixtures) {
    const tileset = createVectorTilesetAsset({ name: fixture.name, tileSize: 32 })
    tileset.tiles = fixture.tiles
    const map = createTilemapAsset({ name: fixture.name, tilesetId: tileset.id, cols: 4, rows: 4 })
    const first = map.layers[0]
    if (!first) throw new Error('Missing layer')
    first.cells = Int16Array.from({ length: 16 }, (_, index) => index % 2)
    map.layers.push({
      ...first,
      id: 'top',
      cells: Int16Array.from({ length: 16 }, (_, index) => (index % 3 === 0 ? 1 : -1)),
    })
    map.layers.push({
      ...first,
      id: 'hidden-layer',
      visible: false,
      cells: new Int16Array(16).fill(0),
    })
    const original = await pixels(await vectorTilemapPngDataUrl(map, tileset, 1))
    const candidate = await pixels(await materializeVectorMap(map, tileset))
    if (original.length !== candidate.length) throw new Error('Dimensions changed')
    let differingComponents = 0
    let maximumDifference = 0
    for (let i = 0; i < original.length; i++) {
      const difference = Math.abs((original[i] ?? 0) - (candidate[i] ?? 0))
      if (difference > 0) differingComponents++
      maximumDifference = Math.max(maximumDifference, difference)
    }
    evidence.push({
      name: fixture.name,
      components: original.length,
      differingComponents,
      maximumDifference,
    })
  }
  return evidence
}

declare global {
  var pintaDifferentialL0: typeof qualifyPintaDifferential
}
globalThis.pintaDifferentialL0 = qualifyPintaDifferential

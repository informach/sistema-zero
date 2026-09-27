import { expect, test } from 'bun:test'
import { makeTexture } from '../testing/fixtures'
import { paintTextureShape } from '../texture/shapes'
import type { SceneImage } from './document'
import { fillSceneImage } from './imageOperations'
import { paintSceneImageSegment } from './imagePaint'
import {
  paintSceneImageShape,
  readSceneShapeOperation,
  type SceneShapeOperation,
} from './imageShapes'

const image = (encoding: SceneImage['encoding'] = 'indexed'): SceneImage => ({
  id: 'image',
  name: 'Imagem',
  width: 7,
  height: 5,
  encoding,
  layers: [
    {
      id: 'layer',
      name: 'Camada',
      opacity: 0.4,
      visible: true,
      pixels: new Uint8Array(35 * (encoding === 'rgba' ? 4 : 1)),
    },
  ],
})

test.each([
  'line',
  'rectangle',
  'ellipse',
] as const)('native %s uses the same inclusive raster as legacy without changing either source', (shape) => {
  const texture = makeTexture({ seamless: false })
  texture.bitmap.data.fill(0)
  const native = {
    ...image(),
    width: 16,
    height: 16,
    layers: [{ ...image().layers[0]!, pixels: new Uint8Array(256) }],
  }
  for (const filled of [false, true])
    for (const brush of [1, 2, 3] as const) {
      const operation: SceneShapeOperation = {
        kind: 'shape',
        layerId: 'layer',
        shape,
        from: [2, 3],
        to: [8, 10],
        color: 2,
        brush,
        filled,
      }
      const result = paintSceneImageShape(native, operation, 16)
      expect(result.layers[0]!.pixels).toEqual(
        paintTextureShape(texture, { ...operation, color: 2 }).bitmap.data,
      )
      expect(result.layers[0]!.opacity).toBe(0.4)
    }
  expect(native.layers[0]!.pixels.some(Boolean)).toBe(false)
  expect(texture.bitmap.data.some(Boolean)).toBe(false)
})

test.each([
  'indexed',
  'rgba',
] as const)('%s rectangular selection clips pencil, thick shapes and connected fill without cropping pixels', (encoding) => {
  const source = image(encoding),
    region = { x0: 2, y0: 1, x1: 4, y1: 3 }
  const color = encoding === 'indexed' ? 2 : ([17, 33, 65, 128] as [number, number, number, number])
  const common = { color, region }
  const results = [
    paintSceneImageSegment(source, 'layer', { ...common, from: [0, 2], to: [6, 2], brush: 3 }, 16),
    paintSceneImageShape(
      source,
      {
        kind: 'shape',
        ...common,
        layerId: 'layer',
        shape: 'rectangle',
        from: [0, 0],
        to: [6, 4],
        brush: 3,
        filled: true,
      },
      16,
    ),
    fillSceneImage(
      source,
      { kind: 'fill', ...common, layerId: 'layer', point: [3, 2], tolerance: 0 },
      16,
    ),
  ]
  const bytes = typeof color === 'number' ? [color] : color
  for (const result of results) {
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 7; x++) {
        const inside = x >= 2 && x <= 4 && y >= 1 && y <= 3
        expect([
          ...result.layers[0]!.pixels.slice(
            (y * 7 + x) * bytes.length,
            (y * 7 + x + 1) * bytes.length,
          ),
        ]).toEqual(inside ? bytes : bytes.map(() => 0))
      }
    expect(result.width).toBe(7)
    expect(result.height).toBe(5)
  }
  expect(
    fillSceneImage(
      source,
      { kind: 'fill', ...common, layerId: 'layer', point: [0, 0], tolerance: 0 },
      16,
    ),
  ).toBe(source)
})

test('shape reader rejects outside points, invalid bounds and unknown settings before traversing the raster', () => {
  const source = image()
  const op = {
    kind: 'shape',
    layerId: 'layer',
    shape: 'ellipse',
    from: [0, 0],
    to: [6, 4],
    brush: 1,
    filled: true,
    color: 2,
  }
  for (const patch of [
    { from: [7, 0] },
    { to: [0, 5] },
    { from: [NaN, 0] },
    { brush: 4 },
    { extra: true },
    { region: { x0: 3, x1: 2, y0: 0, y1: 1 } },
  ])
    expect(() => readSceneShapeOperation({ ...op, ...patch }, source, 16)).toThrow()
})

import { expect, test } from 'bun:test'
import type { SceneImage } from './document'
import { sceneLayerColor } from './imageColor'
import { captureSceneLayerRaster } from './imageImport'
import {
  paintSceneImageStamp,
  readSceneStampOperation,
  type SceneStampOperation,
  sceneStampBounds,
  sceneStampSize,
} from './imageStamp'

function fixture(): SceneImage {
  return {
    id: 'image',
    name: 'Imagem',
    width: 9,
    height: 9,
    encoding: 'rgba',
    layers: [
      {
        id: 'layer',
        name: 'Camada',
        opacity: 0.4,
        visible: true,
        pixels: new Uint8Array(9 * 9 * 4),
      },
      {
        id: 'other',
        name: 'Outra',
        opacity: 1,
        visible: true,
        pixels: new Uint8Array(9 * 9 * 4).fill(127),
      },
    ],
  }
}
function operation(): SceneStampOperation {
  return {
    kind: 'stamp',
    layerId: 'layer',
    point: [4, 4],
    scale: 1,
    turns: 0,
    flipX: false,
    flipY: false,
    raster: {
      width: 2,
      height: 3,
      pixels: new Uint8Array([1, 2, 3, 4, 5, 6].flatMap((n) => [n, 0, 0, 255])),
    },
  }
}
test('stamp rotates rectangular pixels clockwise before screen-axis flips, replicating integer blocks without interpolation', () => {
  const source = fixture(),
    before = structuredClone(source)
  const matrices = [
    [
      [1, 2],
      [3, 4],
      [5, 6],
    ],
    [
      [2, 4, 6],
      [1, 3, 5],
    ],
    [
      [6, 5],
      [4, 3],
      [2, 1],
    ],
    [
      [5, 3, 1],
      [6, 4, 2],
    ],
  ]
  for (const turns of [0, 1, 2, 3] as const)
    for (const flipX of [false, true])
      for (const flipY of [false, true])
        for (const scale of [1, 2]) {
          const op = { ...operation(), turns, flipX, flipY, scale }
          const expected = matrices[turns]!.map((row) => (flipX ? [...row].reverse() : row))
          if (flipY) expected.reverse()
          const result = paintSceneImageStamp(source, op)
          const size = sceneStampSize(op.raster, op),
            bounds = sceneStampBounds(op.point, size)
          for (let y = 0; y < 9; y++)
            for (let x = 0; x < 9; x++) {
              const inside = x >= bounds.x0 && x <= bounds.x1 && y >= bounds.y0 && y <= bounds.y1
              const value = inside
                ? expected[Math.floor((y - bounds.y0) / scale)]![
                    Math.floor((x - bounds.x0) / scale)
                  ]!
                : 0
              expect(sceneLayerColor(result, 'layer', [x, y])).toEqual([
                value,
                0,
                0,
                inside ? 255 : 0,
              ])
            }
          expect(result.layers[1]).toBe(source.layers[1])
          expect(result.layers[0]!.opacity).toBe(0.4)
          expect(paintSceneImageStamp(result, op)).toBe(result)
        }
  expect(source).toEqual(before)
})

test('stamp blends alpha once in the layer, ignores transparent source pixels, and clips large stamps without allocating a scaled image', () => {
  const source = fixture()
  source.layers[0]!.pixels.set([0, 0, 255, 128], (4 * 9 + 4) * 4)
  const op = {
    ...operation(),
    raster: { width: 1, height: 1, pixels: new Uint8Array([255, 0, 0, 128]) },
  }
  const result = paintSceneImageStamp(source, op)
  expect(sceneLayerColor(result, 'layer', [4, 4])).toEqual([170, 0, 85, 192])
  expect(sceneLayerColor(source, 'layer', [4, 4])).toEqual([0, 0, 255, 128])
  expect(
    paintSceneImageStamp(source, {
      ...op,
      raster: { ...op.raster, pixels: new Uint8Array([255, 0, 0, 0]) },
    }),
  ).toBe(source)
  const large = {
    ...op,
    scale: 4,
    point: [0, 0] as [number, number],
    raster: { width: 1024, height: 1024, pixels: new Uint8Array(1024 * 1024 * 4).fill(255) },
    region: { x0: 1, y0: 1, x1: 2, y1: 2 },
  }
  const clipped = paintSceneImageStamp(fixture(), large)
  for (let y = 0; y < 9; y++)
    for (let x = 0; x < 9; x++)
      expect(sceneLayerColor(clipped, 'layer', [x, y])).toEqual(
        x >= 1 && x <= 2 && y >= 1 && y <= 2 ? [255, 255, 255, 255] : [0, 0, 0, 0],
      )
  expect(paintSceneImageStamp(source, { ...op, region: { x0: 0, y0: 0, x1: 1, y1: 1 } })).toBe(
    source,
  )
})

test('stamp reader owns its raster and settings and rejects malformed operations before allocating output', () => {
  const source = fixture(),
    raw = operation()
  const parsed = readSceneStampOperation(raw, source)
  raw.point[0] = 0
  raw.raster.pixels.fill(0)
  expect(parsed).toEqual(operation())
  for (const patch of [
    { scale: 0 },
    { scale: 4.5 },
    { turns: 4 },
    { flipX: 1 },
    { point: [9, 0] },
    { layerId: 'missing' },
    { raster: { ...operation().raster, pixels: new Uint8Array(4) } },
    { region: { x0: -1, x1: 3, y0: 0, y1: 1 } },
    { extra: true },
  ])
    expect(() => readSceneStampOperation({ ...operation(), ...patch }, source)).toThrow()
  expect(() => readSceneStampOperation(operation(), { ...source, encoding: 'indexed' })).toThrow()
})

test('capturing a rectangular stamp preserves the chosen layer and alpha independently from source and other layers', () => {
  const source = fixture()
  source.layers[0]!.pixels.set([17, 33, 65, 128], (3 * 9 + 2) * 4)
  const raster = captureSceneLayerRaster(source, 'layer', { x0: 2, y0: 3, x1: 3, y1: 5 })
  expect(raster).toMatchObject({ width: 2, height: 3 })
  expect(raster.pixels.slice(0, 4)).toEqual(new Uint8Array([17, 33, 65, 128]))
  expect(raster.pixels.slice(4).some(Boolean)).toBe(false)
  source.layers[0]!.pixels.fill(0)
  expect(raster.pixels[0]).toBe(17)
  expect(() =>
    captureSceneLayerRaster({ ...source, encoding: 'indexed' }, 'layer', {
      x0: 0,
      y0: 0,
      x1: 1,
      y1: 1,
    }),
  ).toThrow()
})

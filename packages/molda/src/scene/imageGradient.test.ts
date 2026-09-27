import { expect, test } from 'bun:test'
import type { SceneImage } from './document'
import { sceneLayerColor } from './imageColor'
import {
  paintSceneImageGradient,
  readSceneGradientOperation,
  type SceneGradientOperation,
} from './imageGradient'

function fixture(): SceneImage {
  return {
    id: 'image',
    name: 'Imagem',
    width: 5,
    height: 3,
    encoding: 'rgba',
    layers: [
      { id: 'layer', name: 'Camada', visible: true, opacity: 0.4, pixels: new Uint8Array(60) },
      {
        id: 'other',
        name: 'Outra camada',
        visible: true,
        opacity: 1,
        pixels: new Uint8Array(60).fill(127),
      },
    ],
  }
}
const operation: SceneGradientOperation = {
  kind: 'gradient',
  layerId: 'layer',
  from: [1, 1],
  to: [3, 1],
  color: [255, 0, 0, 255],
  endColor: [0, 0, 255, 255],
}

test('gradient clamps its projection, preserves exact endpoints and copies only the changed layer', () => {
  const source = fixture(),
    before = structuredClone(source)
  const result = paintSceneImageGradient(source, operation)
  for (let y = 0; y < 3; y++)
    expect(Array.from({ length: 5 }, (_, x) => sceneLayerColor(result, 'layer', [x, y]))).toEqual([
      [255, 0, 0, 255],
      [255, 0, 0, 255],
      [128, 0, 128, 255],
      [0, 0, 255, 255],
      [0, 0, 255, 255],
    ])
  expect(result.layers[0]!.opacity).toBe(0.4)
  expect(result.layers[1]).toBe(source.layers[1])
  expect(source).toEqual(before)
  expect(paintSceneImageGradient(result, operation)).toBe(result)
  expect(
    paintSceneImageGradient(source, {
      ...operation,
      from: operation.to,
      to: operation.from,
      color: operation.endColor,
      endColor: operation.color,
    }),
  ).toEqual(result)
})

test('gradient interpolates premultiplied alpha without leaking transparent RGB and clips to selection', () => {
  const source = fixture()
  const result = paintSceneImageGradient(source, {
    ...operation,
    endColor: [0, 0, 255, 0],
    region: { x0: 1, y0: 1, x1: 3, y1: 1 },
  })
  expect(sceneLayerColor(result, 'layer', [1, 1])).toEqual([255, 0, 0, 255])
  expect(sceneLayerColor(result, 'layer', [2, 1])).toEqual([255, 0, 0, 128])
  expect(sceneLayerColor(result, 'layer', [3, 1])).toEqual([0, 0, 255, 0])
  for (let y = 0; y < 3; y++)
    for (let x = 0; x < 5; x++)
      if (y !== 1 || x < 1 || x > 3)
        expect(sceneLayerColor(result, 'layer', [x, y])).toEqual([0, 0, 0, 0])
  const transparent = paintSceneImageGradient(source, {
    ...operation,
    color: [255, 0, 0, 0],
    endColor: [0, 255, 0, 0],
  })
  expect(sceneLayerColor(transparent, 'layer', [2, 1])).toEqual([0, 0, 0, 0])
})

test('vertical and diagonal gradients use source V=0 at row zero and continuous projected distance', () => {
  const vertical = paintSceneImageGradient(fixture(), { ...operation, from: [2, 0], to: [2, 2] })
  expect(sceneLayerColor(vertical, 'layer', [4, 0])).toEqual(operation.color)
  expect(sceneLayerColor(vertical, 'layer', [0, 2])).toEqual(operation.endColor)
  const diagonal = paintSceneImageGradient(fixture(), { ...operation, from: [0, 0], to: [2, 2] })
  expect(sceneLayerColor(diagonal, 'layer', [2, 0])).toEqual([128, 0, 128, 255])
  expect(sceneLayerColor(diagonal, 'layer', [1, 0])).toEqual([191, 0, 64, 255])
})

test('gradient reader owns settings and rejects malformed input; a zero length draft cannot become a command', () => {
  const source = fixture(),
    settings = structuredClone(operation)
  const parsed = readSceneGradientOperation(settings, source)
  settings.color[0] = 3
  settings.from[0] = 0
  expect(parsed).toEqual(operation)
  for (const patch of [
    { color: 2 },
    { endColor: [0, 0, 0, 256] },
    { color: [0, NaN, 0, 255] },
    { from: [-1, 0] },
    { to: [5, 1] },
    { layerId: 'missing' },
    { extra: true },
    { region: { x0: 0, x1: 5, y0: 0, y1: 0 } },
  ])
    expect(() => readSceneGradientOperation({ ...operation, ...patch }, source)).toThrow()
  expect(() => readSceneGradientOperation(operation, { ...source, encoding: 'indexed' })).toThrow()
  expect(() => paintSceneImageGradient(source, { ...operation, to: operation.from })).toThrow(
    'dois pontos diferentes',
  )
})

test('picker returns exact authorial bytes or palette index without flattening or sharing mutable storage', () => {
  const source = fixture()
  source.layers[0]!.pixels.set([17, 33, 65, 128], 4)
  const color = sceneLayerColor(source, 'layer', [1, 0])
  expect(color).toEqual([17, 33, 65, 128])
  if (typeof color === 'number') throw new Error('Expected RGBA')
  color[0] = 200
  expect(source.layers[0]!.pixels[4]).toBe(17)
  const indexed = {
    ...source,
    encoding: 'indexed' as const,
    layers: [{ ...source.layers[0]!, pixels: new Uint8Array(15) }],
  }
  indexed.layers[0]!.pixels[1] = 7
  expect(sceneLayerColor(indexed, 'layer', [1, 0])).toBe(7)
  expect(sceneLayerColor(indexed, 'layer', [0, 0])).toBe(0)
  expect(() => sceneLayerColor(source, 'layer', [0.5, 0])).toThrow()
  expect(() => sceneLayerColor(source, 'missing', [0, 0])).toThrow()
})

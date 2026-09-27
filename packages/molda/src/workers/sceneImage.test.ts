import { expect, test } from 'bun:test'
import { scenePalette } from '../scene/composite'
import { operateSceneImage } from '../scene/imageOperations'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { operateImageInWorker } from './sceneImage'
import {
  readSceneImageReply,
  readSceneImageRequest,
  type SceneImageRequest,
  sceneImageReply,
} from './sceneImageProtocol'
import type { TaskWorker } from './workerTask'

function fixture(): SceneImageRequest {
  const document = migrateLegacyModel(makeModel()).document
  const image = document.images[0]!
  return {
    documentId: document.id,
    revision: 2,
    image,
    palette: scenePalette(document),
    operation: { kind: 'rgba' },
  }
}
test.each([
  'rgba',
  'fill',
] as const)('real image worker %s agrees with the pure operation and never detaches live source bytes', async (kind) => {
  const request = fixture()
  if (kind === 'fill')
    request.operation = {
      kind,
      layerId: request.image.layers[0]!.id,
      point: [0, 0],
      color: 7,
      tolerance: 0,
    }
  request.image.layers.push({
    ...request.image.layers[0]!,
    id: 'untouched',
    pixels: request.image.layers[0]!.pixels.slice(),
  })
  const before = structuredClone(request)
  const result = await operateImageInWorker(request)
  expect(result).toEqual(operateSceneImage(request.image, request.operation, request.palette))
  expect(request).toEqual(before)
  expect(request.image.layers[0]!.pixels.byteLength).toBe(
    request.image.width * request.image.height,
  )
  if (kind === 'fill') expect(result.layers[1]).toBe(request.image.layers[1])
})

test('worker protocol rejects foreign tokens, incomplete conversions, invalid pixels and out-of-scope layers', () => {
  const request = fixture()
  expect(readSceneImageRequest(request)).toEqual(request)
  expect(() => readSceneImageRequest({ ...request, extra: true })).toThrow()
  const result = operateSceneImage(request.image, request.operation, request.palette)
  const reply = sceneImageReply(request, result)
  for (const patch of [
    { revision: 3 },
    { documentId: 'other' },
    { imageId: 'other' },
    { encoding: 'indexed' },
    { layers: [] },
    { layers: [...reply.layers, ...reply.layers] },
    { layers: [{ id: reply.layers[0]!.id, pixels: new Uint8Array(1) }] },
    { layers: [{ ...reply.layers[0], id: 'wrong' }] },
  ])
    expect(() => readSceneImageReply({ ...reply, ...patch }, request)).toThrow()
  const parsed = readSceneImageReply(reply, request)
  if (parsed.type !== 'result') throw new Error('Missing result')
  expect(parsed.result).toEqual(result)
  expect(parsed.result.layers[0]!.pixels).not.toBe(reply.layers[0]!.pixels)
  const fill: SceneImageRequest = {
    ...request,
    operation: {
      kind: 'fill',
      layerId: request.image.layers[0]!.id,
      point: [0, 0],
      color: 7,
      tolerance: 0,
    },
  }
  const pixels = request.image.layers[0]!.pixels.slice()
  pixels[0] = 255
  expect(() =>
    readSceneImageReply(
      {
        ...reply,
        encoding: 'indexed',
        layers: [{ id: fill.operation.kind === 'fill' && fill.operation.layerId, pixels }],
      },
      fill,
    ),
  ).toThrow()
})

test('cancellation terminates image CPU work and ignores a late reply', async () => {
  const events = new EventTarget()
  let terminations = 0
  const worker: TaskWorker = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    postMessage: () => {},
    terminate: () => {
      terminations++
    },
  }
  const controller = new AbortController()
  const result = operateImageInWorker(fixture(), controller.signal, () => worker)
  controller.abort()
  events.dispatchEvent(new MessageEvent('message', { data: null }))
  await expect(result).rejects.toMatchObject({ name: 'AbortError' })
  expect(terminations).toBe(1)
})

test('real shape worker fills a megapixel without affecting an unselected layer or detaching the source', async () => {
  const request = fixture()
  request.image = {
    ...request.image,
    width: 1024,
    height: 1024,
    layers: [{ ...request.image.layers[0]!, pixels: new Uint8Array(1024 * 1024) }],
  }
  request.operation = {
    kind: 'shape',
    layerId: request.image.layers[0]!.id,
    shape: 'rectangle',
    from: [0, 0],
    to: [1023, 1023],
    color: 7,
    brush: 1,
    filled: true,
  }
  request.image.layers.push({
    ...request.image.layers[0]!,
    id: 'untouched-shape',
    pixels: new Uint8Array(1024 * 1024).fill(2),
  })
  const result = await operateImageInWorker(request)
  expect(result.layers[0]!.pixels.every((c) => c === 7)).toBe(true)
  expect(request.image.layers[0]!.pixels.every((c) => c === 0)).toBe(true)
  expect(result.layers[1]).toBe(request.image.layers[1])
})

test('real gradient worker preserves every byte of the pure scoped gradient and rejects a zero-length command', async () => {
  const request = fixture()
  request.image = operateSceneImage(request.image, { kind: 'rgba' }, request.palette)
  request.image.layers.push({
    ...request.image.layers[0]!,
    id: 'untouched-gradient',
    pixels: request.image.layers[0]!.pixels.slice(),
  })
  request.operation = {
    kind: 'gradient',
    layerId: request.image.layers[0]!.id,
    from: [0, 0],
    to: [3, 2],
    color: [17, 33, 65, 128],
    endColor: [255, 10, 30, 0],
    region: { x0: 0, x1: 3, y0: 0, y1: 2 },
  }
  const before = structuredClone(request)
  const result = await operateImageInWorker(request)
  expect(result).toEqual(operateSceneImage(request.image, request.operation, request.palette))
  expect(request).toEqual(before)
  expect(result.layers[1]).toBe(request.image.layers[1])
  const reply = sceneImageReply(request, result)
  expect(() =>
    readSceneImageReply(
      { ...reply, layers: [{ id: 'untouched-gradient', pixels: result.layers[0]!.pixels }] },
      request,
    ),
  ).toThrow()
  await expect(
    operateImageInWorker({ ...request, operation: { ...request.operation, to: [0, 0] } }),
  ).rejects.toThrow('dois pontos diferentes')
})

test('real stamp worker matches pure alpha and transforms, retains other layers and never transfers the source raster', async () => {
  const request = fixture()
  request.image = operateSceneImage(request.image, { kind: 'rgba' }, request.palette)
  request.image.layers.push({
    ...request.image.layers[0]!,
    id: 'untouched-stamp',
    pixels: request.image.layers[0]!.pixels.slice(),
  })
  request.operation = {
    kind: 'stamp',
    layerId: request.image.layers[0]!.id,
    point: [1, 1],
    scale: 2,
    turns: 1,
    flipX: true,
    flipY: false,
    raster: {
      width: 2,
      height: 3,
      pixels: new Uint8Array([
        17, 33, 65, 128, 0, 0, 0, 0, 0, 255, 0, 255, 255, 0, 255, 0, 0, 0, 255, 64, 17, 33, 65, 200,
      ]),
    },
    region: { x0: 0, y0: 0, x1: 3, y1: 2 },
  }
  const before = structuredClone(request)
  const result = await operateImageInWorker(request)
  expect(result).toEqual(operateSceneImage(request.image, request.operation, request.palette))
  expect(result.layers[1]).toBe(request.image.layers[1])
  expect(request).toEqual(before)
  expect(request.operation.raster.pixels.byteLength).toBe(24)
})

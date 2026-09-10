import { expect, test } from 'bun:test'
import { bakeSceneImageAtlas } from '../scene/imageAtlas'
import { applySceneImageAtlas, prepareSceneImageAtlas } from '../scene/imageAtlasCommands'
import { readSceneDocument } from '../scene/readDocument'
import { makeSceneAtlasDocument } from '../testing/sceneAtlasFixture'
import { bakeAtlasInWorker } from './sceneAtlas'
import {
  readSceneAtlasReply,
  readSceneAtlasRequest,
  type SceneAtlasRequest,
  sceneAtlasReply,
} from './sceneAtlasProtocol'
import type { TaskWorker } from './workerTask'

function fixture(): SceneAtlasRequest {
  const plan = prepareSceneImageAtlas(makeSceneAtlasDocument(), 'body')
  return {
    documentId: plan.document.id,
    revision: 7,
    images: plan.images,
    tiles: plan.tiles,
    palette: plan.palette,
  }
}
test('real atlas worker matches the canonical compositor and keeps live buffers attached and unchanged', async () => {
  const request = fixture(),
    before = structuredClone(request)
  expect(await bakeAtlasInWorker(request)).toEqual(
    bakeSceneImageAtlas(request.images, request.tiles, request.palette),
  )
  expect(request).toEqual(before)
})

test('MASK atlas worker retains hidden RGB, per-material cutoff/opacity and independent original layers', async () => {
  const source = makeSceneAtlasDocument()
  for (const material of source.materials) {
    material.baseColor = { kind: 'rgba', value: [0, 0, 0, 0] }
    material.alphaMask = { cutoff: 0, opacity: 0.37123456789 }
  }
  for (const image of source.images) {
    image.encoding = 'rgba'
    image.layers = [
      {
        id: `${image.id}-layer`,
        name: 'Folhas',
        visible: true,
        opacity: 1,
        pixels: Uint8Array.from({ length: image.width * image.height * 4 }, (_, i) =>
          i % 4 === 3 ? 0 : (i * 73 + 17) % 256,
        ),
      },
    ]
  }
  const before = structuredClone(source)
  const plan = prepareSceneImageAtlas(source, 'body')
  const request = {
    documentId: source.id,
    revision: 7,
    images: plan.images,
    tiles: plan.tiles,
    palette: plan.palette,
  }
  expect(readSceneAtlasRequest(request)).toEqual(request)
  expect(request.tiles.every((tile) => tile.preserveTransparentRgb)).toBe(true)
  const raster = await bakeAtlasInWorker(request)
  expect(raster).toEqual(bakeSceneImageAtlas(plan.images, plan.tiles, plan.palette))
  for (const slot of plan.layout.slots) {
    const image = plan.images.find((image) => image.id === slot.imageId)!
    const start = (slot.y * raster.width + slot.x) * 4
    expect(raster.pixels.slice(start, start + 4)).toEqual(image.layers[0]!.pixels.slice(0, 4))
  }
  let id = 0
  const next = applySceneImageAtlas(source, plan, raster, () => `mask-atlas-${id++}`)
  expect(readSceneDocument(next).status).toBe('valid')
  for (const material of next.materials.slice(source.materials.length))
    expect(material.alphaMask).toEqual({ cutoff: 0, opacity: 0.37123456789 })
  expect(next.images.slice(0, source.images.length)).toEqual(source.images)
  expect(source).toEqual(before)
})
test('atlas boundary owns image/palette/result bytes and rejects foreign, malformed and unbounded payloads', () => {
  const request = fixture()
  const parsed = readSceneAtlasRequest(request)
  expect(parsed).toEqual(request)
  expect(parsed.images[0]!.layers[0]!.pixels).not.toBe(request.images[0]!.layers[0]!.pixels)
  expect(parsed.tiles[0]!.base).not.toBe(request.tiles[0]!.base)
  for (const patch of [
    { extra: true },
    { revision: -1 },
    { images: [...request.images, request.images[0]] },
    { tiles: [...request.tiles, request.tiles[0]] },
    { tiles: [{ ...request.tiles[0], base: [2, 0, 0, 1] }] },
    { palette: [] },
    { images: request.images.slice(1) },
    { tiles: [] },
  ])
    expect(() => readSceneAtlasRequest({ ...request, ...patch })).toThrow()
  const raster = bakeSceneImageAtlas(request.images, request.tiles, request.palette)
  const reply = sceneAtlasReply(request, raster)
  const result = readSceneAtlasReply(reply, request)
  if (result.type !== 'result') throw new Error('Missing result')
  expect(result.result).toEqual(raster)
  expect(result.result.pixels).not.toBe(raster.pixels)
  for (const patch of [
    { revision: 8 },
    { documentId: 'other' },
    { extra: true },
    { raster: { ...raster, pixels: new Uint8Array(1) } },
    { raster: { width: 1, height: 1, pixels: new Uint8Array(4) } },
  ])
    expect(() => readSceneAtlasReply({ ...reply, ...patch }, request)).toThrow()
})
test('atlas cancellation terminates CPU work and ignores late replies without transferring source buffers', async () => {
  const events = new EventTarget()
  let terminated = 0
  const request = fixture()
  const worker: TaskWorker = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    postMessage: (...args: unknown[]) => {
      expect(args).toEqual([request])
    },
    terminate: () => {
      terminated++
    },
  }
  const controller = new AbortController()
  const pending = bakeAtlasInWorker(request, controller.signal, () => worker)
  controller.abort()
  events.dispatchEvent(new MessageEvent('message', { data: null }))
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  expect(terminated).toBe(1)
})

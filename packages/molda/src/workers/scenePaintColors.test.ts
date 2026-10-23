import { expect, test } from 'bun:test'
import { addScenePrimitive } from '../scene/commands'
import { scenePalette } from '../scene/composite'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import {
  prepareScenePaintIndicators,
  sceneImagePaintColors,
  scenePaintIndicators,
} from '../scene/paintIndicators'
import { ensureScenePaintSurface } from '../scene/paintSurface'
import { resolveScenePaintIndicators } from '../state/scenePaintIndicatorsTask'
import { makeModel } from '../testing/fixtures'
import { scenePaintColorsInWorker } from './scenePaintColors'
import { readScenePaintColorsReply, readScenePaintColorsRequest } from './scenePaintColorsProtocol'
import type { TaskWorker } from './workerTask'

function fixture(encoding: 'indexed' | 'rgba' = 'indexed') {
  const box = addScenePrimitive(migrateLegacyModel(makeModel({ parts: [] })).document, 'box', 'Cor')
  const prepared = ensureScenePaintSurface(box, { nodeId: box.nodes[0]!.id })
  if (prepared.status !== 'ready') throw new Error('Missing surface')
  const source = prepared.document
  const image = source.images[0]!
  const bytes = encoding === 'rgba' ? 4 : 1
  const pixels = new Uint8Array(256 * 256 * bytes)
  if (bytes === 4) {
    for (let i = 0; i < pixels.length; i += 4) pixels.set([231, 43, 80, 183], i)
  } else pixels.fill(7)
  source.images[0] = {
    ...image,
    encoding,
    width: 256,
    height: 256,
    layers: [
      { ...image.layers[0]!, pixels, opacity: 0.4 },
      { ...image.layers[0]!, id: 'hidden', pixels: pixels.slice(), visible: false },
      { ...image.layers[0]!, id: 'overlay', pixels: pixels.slice(), opacity: 0.2 },
    ],
  }
  return source
}

test.each([
  'indexed',
  'rgba',
] as const)('real %s indicator worker matches the composed histogram and keeps source buffers', async (encoding) => {
  const source = fixture(encoding),
    plan = prepareScenePaintIndicators(source)
  expect(plan.pending.length).toBe(1)
  expect(plan.colors.has(source.nodes[0]!.id)).toBe(false)
  const before = structuredClone(source)
  const result = await resolveScenePaintIndicators(source, plan, 4, new AbortController().signal)
  expect(result).toEqual(scenePaintIndicators(before))
  expect(source).toEqual(before)
  expect(prepareScenePaintIndicators(source).pending).toHaveLength(0)
})

test('indicator protocol rejects foreign revisions, unknown fields and fabricated swatch formats', () => {
  const source = fixture()
  const request = {
    documentId: source.id,
    revision: 2,
    image: source.images[0]!,
    palette: scenePalette(source),
    base: [0, 0, 0, 1] as [number, number, number, number],
  }
  expect(readScenePaintColorsRequest(request)).toEqual(request)
  expect(() => readScenePaintColorsRequest({ ...request, extra: true })).toThrow()
  expect(() => readScenePaintColorsRequest({ ...request, base: [0, 0, 0, 5] })).toThrow()
  const reply = {
    documentId: request.documentId,
    revision: 2,
    imageId: request.image.id,
    type: 'result',
    colors: ['#ff0000'],
  }
  for (const patch of [
    { revision: 3 },
    { imageId: 'other' },
    { documentId: 'other' },
    { extra: true },
    { colors: ['red'] },
    { colors: ['#ff0000', '#ff0000'] },
    { colors: Array(4).fill('#ff0000') },
  ])
    expect(() => readScenePaintColorsReply({ ...reply, ...patch }, request)).toThrow()
  expect(readScenePaintColorsReply(reply, request)).toEqual({ type: 'result', result: ['#ff0000'] })
})

test('cancellation terminates the worker; a late computation cannot publish or populate another revision cache', async () => {
  const source = fixture(),
    plan = prepareScenePaintIndicators(source, 0),
    job = plan.pending[0]!
  const events = new EventTarget()
  let stopped = 0
  const worker: TaskWorker = {
    postMessage() {},
    terminate() {
      stopped++
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  }
  const controller = new AbortController()
  const result = scenePaintColorsInWorker(
    { ...job, documentId: source.id, revision: 1 },
    controller.signal,
    () => worker,
  )
  controller.abort()
  events.dispatchEvent(new MessageEvent('message', { data: null }))
  await expect(result).rejects.toMatchObject({ name: 'AbortError' })
  expect(stopped).toBe(1)
  const lateController = new AbortController()
  let finish!: (colors: readonly string[]) => void
  const late = resolveScenePaintIndicators(
    source,
    plan,
    1,
    lateController.signal,
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  lateController.abort()
  finish(['#ff0000'])
  await expect(late).rejects.toMatchObject({ name: 'AbortError' })
  expect(prepareScenePaintIndicators(source, 0).pending).toHaveLength(1)
  const changed = {
    ...source,
    images: source.images.map((image) => ({
      ...image,
      layers: image.layers.map((layer) => ({ ...layer, visible: false })),
    })),
  }
  const next = prepareScenePaintIndicators(changed, 0)
  const colors = await resolveScenePaintIndicators(changed, next, 2, new AbortController().signal)
  expect(colors).toEqual(scenePaintIndicators(structuredClone(changed)))
  expect(prepareScenePaintIndicators(source, 0).pending).toHaveLength(1)
})

test('a render has one total scan budget and shared image variants keep exact material ordering', async () => {
  const source = fixture()
  const image = source.images[0]!
  source.images[0] = {
    ...image,
    width: 16,
    height: 16,
    layers: [{ ...image.layers[0]!, pixels: new Uint8Array(256) }],
  }
  const original = source.nodes.find((node) => node.kind === 'mesh')!
  if (original.kind !== 'mesh') throw new Error('Missing mesh')
  const material = source.materials.find((entry) => entry.id === original.materialId)!
  for (let i = 1; i < 40; i++) {
    const id = `material-${i}`
    source.materials.push({
      ...material,
      id,
      baseColor: { kind: 'rgba', value: [i / 40, 0.4, 0.8, 1] },
    })
    source.nodes.push({ ...original, id: `piece-${i}`, materialId: id })
  }
  const plan = prepareScenePaintIndicators(source, 256)
  expect(plan.pending).toHaveLength(39)
  const output = await resolveScenePaintIndicators(
    source,
    plan,
    1,
    new AbortController().signal,
    async (request) =>
      sceneImagePaintColors(structuredClone(request.image), request.palette, request.base),
  )
  expect(output).toEqual(scenePaintIndicators(structuredClone(source)))
  expect(output.size).toBe(40)
})

import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { createDocumentEditorStore } from '../state/editorStore'
import { makeSceneAtlasDocument } from '../testing/sceneAtlasFixture'
import { operateImageInWorker } from '../workers/sceneImage'
import { setSceneNodeFlag } from './commands'
import { scenePalette } from './composite'
import type { SceneImage, SceneImageFlipbook } from './document'
import { sceneToJson } from './documentJson'
import { bakeSceneImageAtlas } from './imageAtlas'
import { prepareSceneImageAtlas } from './imageAtlasCommands'
import {
  readSceneImageFlipbook,
  sampleSceneFlipbook,
  sceneFlipbookRegion,
  sceneFlipbookTexel,
} from './imageFlipbook'
import { setSceneImageFlipbook } from './imageFlipbookCommands'
import { editSceneImageLayers } from './imageLayerCommands'
import { readSceneDocument } from './readDocument'

const settings: SceneImageFlipbook = {
  frameWidth: 2,
  frameHeight: 2,
  frames: [3, 0, 0, 2],
  fps: 2.5,
  loop: true,
}
const dimensions = { width: 4, height: 4 }

test('flipbook validates whole cells and explicit sequence without truncating, clamping or dropping repeated frames', () => {
  const parsed = readSceneImageFlipbook(settings, dimensions)
  expect(parsed).toEqual(settings)
  expect(parsed.frames).not.toBe(settings.frames)
  for (const patch of [
    { frameWidth: 3 },
    { frameHeight: 0 },
    { frameWidth: 2.5 },
    { frames: [] },
    { frames: [4] },
    { frames: [-1] },
    { frames: [0.5] },
    { frames: new Array(257).fill(0) },
    { fps: 0 },
    { fps: 61 },
    { fps: Infinity },
    { loop: 1 },
    { extra: true },
  ])
    expect(() => readSceneImageFlipbook({ ...settings, ...patch }, dimensions)).toThrow()
  expect(() =>
    readSceneImageFlipbook(
      { ...settings, frameWidth: 1, frameHeight: 1 },
      { width: 1024, height: 1024 },
    ),
  ).toThrow('256')
})

test('flipbook sampling separates sequence positions from sheet cells, ends once or loops and keeps long times finite', () => {
  expect(sampleSceneFlipbook(settings, 0)).toEqual({ step: 0, frame: 3, finished: false })
  expect(sampleSceneFlipbook(settings, 0.4)).toEqual({ step: 1, frame: 0, finished: false })
  expect(sampleSceneFlipbook(settings, 0.8)).toEqual({ step: 2, frame: 0, finished: false })
  expect(sampleSceneFlipbook(settings, 1.6)).toEqual({ step: 0, frame: 3, finished: false })
  expect(sampleSceneFlipbook({ ...settings, loop: false }, 1.6)).toEqual({
    step: 3,
    frame: 2,
    finished: true,
  })
  expect(sampleSceneFlipbook({ ...settings, loop: false }, Number.MAX_VALUE)).toEqual({
    step: 3,
    frame: 2,
    finished: true,
  })
  const large = sampleSceneFlipbook(settings, Number.MAX_VALUE)
  expect(Number.isSafeInteger(large.step)).toBe(true)
  expect(large.step).toBeGreaterThanOrEqual(0)
  expect(large.step).toBeLessThan(settings.frames.length)
  for (const time of [-1, NaN, Infinity])
    expect(() => sampleSceneFlipbook(settings, time)).toThrow()
})

test('visible top-left numbering maps to exact canonical rows and 3D UV clamps within the chosen cell, never its neighbor', () => {
  const image: SceneImage = {
    ...dimensions,
    id: 'image',
    name: 'Image',
    encoding: 'rgba',
    layers: [],
    flipbook: settings,
  }
  expect(sceneFlipbookRegion(image, 0)).toEqual({ x0: 0, y0: 2, x1: 1, y1: 3 })
  expect(sceneFlipbookRegion(image, 1)).toEqual({ x0: 2, y0: 2, x1: 3, y1: 3 })
  expect(sceneFlipbookRegion(image, 2)).toEqual({ x0: 0, y0: 0, x1: 1, y1: 1 })
  expect(sceneFlipbookRegion(image, 3)).toEqual({ x0: 2, y0: 0, x1: 3, y1: 1 })
  expect(sceneFlipbookTexel(image, [0, 0], 0)).toEqual([0, 2])
  expect(sceneFlipbookTexel(image, [1, 1], 0)).toEqual([1, 3])
  expect(sceneFlipbookTexel(image, [Number.MAX_VALUE, -Number.MAX_VALUE], 0)).toEqual([1, 2])
  expect(sceneFlipbookTexel(image, [NaN, 0], 0)).toBeNull()
  for (const frame of [-1, 4, 0.5, NaN]) expect(() => sceneFlipbookRegion(image, frame)).toThrow()
})

test('flipbook metadata is undoable without copying pixels, honors all shared locks and survives JSON and image workers', async () => {
  const document = makeSceneAtlasDocument(),
    image = document.images[0]!
  const flipbook = { ...settings, frameWidth: image.width / 2, frameHeight: image.height / 2 }
  const next = setSceneImageFlipbook(document, image.id, flipbook)
  expect(next.images[0]!.layers).toBe(image.layers)
  expect(next.images[0]!.flipbook?.frames).not.toBe(flipbook.frames)
  expect(next.geometries).toBe(document.geometries)
  expect(next.materials).toBe(document.materials)
  expect(setSceneImageFlipbook(next, image.id, flipbook)).toBe(next)
  expect(setSceneImageFlipbook(document, image.id, null)).toBe(document)
  expect(setSceneImageFlipbook(next, image.id, null).images[0]!.flipbook).toBeUndefined()
  const parsed = readSceneDocument(sceneToJson(next))
  expect(parsed.status).toBe('valid')
  if (parsed.status !== 'valid') throw new Error('Missing document')
  expect(parsed.document.images[0]!.flipbook).toEqual(flipbook)
  expect(() => prepareSceneImageAtlas(next, 'body')).toThrow('animação')
  expect(() =>
    bakeSceneImageAtlas(
      [next.images[0]!],
      [{ imageId: image.id, base: [0, 0, 0, 0] }],
      scenePalette(next),
    ),
  ).toThrow('animadas')
  expect(() =>
    setSceneImageFlipbook(setSceneNodeFlag(document, ['body'], 'locked', true), image.id, flipbook),
  ).toThrow('travada')
  const converted = await operateImageInWorker({
    documentId: next.id,
    revision: 1,
    image: next.images[0]!,
    palette: scenePalette(next),
    operation: { kind: 'rgba' },
  })
  expect(converted.flipbook).toBe(next.images[0]!.flipbook)
  expect(editSceneImageLayers(next, image.id, { kind: 'rgba' }).images[0]!.flipbook).toBe(
    next.images[0]!.flipbook,
  )
  const editor = createDocumentEditorStore({
    asset: document,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  try {
    editor.getState().commit(next)
    editor.getState().undo()
    expect(editor.getState().asset.images).toEqual(document.images)
    expect(editor.getState().canUndo).toBe(false)
    editor.getState().redo()
    expect(editor.getState().asset.images[0]!.flipbook).toEqual(flipbook)
  } finally {
    editor.getState().dispose()
  }
})

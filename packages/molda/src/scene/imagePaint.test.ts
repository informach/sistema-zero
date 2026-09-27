import { expect, test } from 'bun:test'
import { makeModel } from '../testing/fixtures'
import { compositeSceneImage, scenePalette } from './composite'
import type { SceneImage } from './document'
import {
  paintSceneImage,
  paintSceneImageSegment,
  resolveScenePaintTarget,
  sceneImageTexel,
} from './imagePaint'
import { migrateLegacyModel } from './migrateLegacy'
import { readSceneDocument } from './readDocument'

test.each([
  'indexed',
  'rgba',
] as const)('%s brush interpolation clips stamps and owns only changed pixels', (encoding) => {
  const channels = encoding === 'rgba' ? 4 : 1
  const image: SceneImage = {
    id: 'image',
    name: 'Imagem',
    encoding,
    width: 7,
    height: 3,
    layers: [
      { id: 'a', name: 'Base', visible: true, opacity: 1, pixels: new Uint8Array(21 * channels) },
      { id: 'b', name: 'Luz', visible: true, opacity: 0.5, pixels: new Uint8Array(21 * channels) },
    ],
  }
  const color = encoding === 'rgba' ? ([12, 34, 56, 128] as [number, number, number, number]) : 3
  const source = structuredClone(image)
  const result = paintSceneImageSegment(
    image,
    'a',
    { from: [0, 0], to: [6, 0], color, brush: 3 },
    16,
  )
  const expected = new Uint8Array(21 * channels)
  for (let i = 0; i < 14; i++)
    expected.set(typeof color === 'number' ? [color] : color, i * channels)
  expect(result.layers[0]!.pixels).toEqual(expected)
  expect(result.layers[0]!.pixels.buffer).not.toBe(image.layers[0]!.pixels.buffer)
  expect(result.layers[1]).toBe(image.layers[1])
  expect(
    paintSceneImageSegment(result, 'a', { from: [0, 0], to: [6, 0], color, brush: 3 }, 16),
  ).toBe(result)
  expect(() =>
    paintSceneImageSegment(image, 'a', { from: [Infinity, 0], to: [0, 0], color, brush: 1 }, 16),
  ).toThrow()
  expect(() =>
    paintSceneImageSegment(image, 'missing', { from: [0, 0], to: [0, 0], color, brush: 1 }, 16),
  ).toThrow('camada')
  expect(image).toEqual(source)
})

test('canonical paint validates bindings and shared locks without changing UV or material metadata', () => {
  const document = migrateLegacyModel(makeModel()).document
  const image = document.images[0]!
  const material = document.materials.find((entry) => entry.colorImageId === image.id)!
  const target = {
    nodeId: 'body',
    materialId: material.id,
    imageId: image.id,
    layerId: image.layers[0]!.id,
  }
  const next = paintSceneImage(document, target, { from: [0, 0], to: [1, 2], color: 7, brush: 1 })
  expect(next.geometries).toBe(document.geometries)
  expect(next.materials).toBe(document.materials)
  expect(next.nodes).toBe(document.nodes)
  expect(compositeSceneImage(next.images[0]!, scenePalette(next)).slice(0, 4)).toEqual(
    new Uint8Array([120, 220, 82, 255]),
  )
  expect(readSceneDocument(next).status).toBe('valid')
  const locked = {
    ...document,
    materials: document.materials.map((m) =>
      m.id === 'material:wing' ? { ...m, colorImageId: image.id } : m,
    ),
    nodes: document.nodes.map((n) => (n.id === 'wing' ? { ...n, locked: true } : n)),
  }
  expect(() => resolveScenePaintTarget(locked, target)).toThrow('travada')
  expect(() => resolveScenePaintTarget(document, { ...target, nodeId: 'wing' })).toThrow('vínculo')
  const hidden = {
    ...document,
    images: document.images.map((i) =>
      i.id === image.id ? { ...i, layers: i.layers.map((l) => ({ ...l, visible: false })) } : i,
    ),
  }
  expect(() => resolveScenePaintTarget(hidden, target)).toThrow('Mostre')
})

test('UV to texel mapping matches clamped flipY=false resources, including extreme imported coordinates', () => {
  const image = { width: 7, height: 3 }
  expect(sceneImageTexel(image, [0, 0])).toEqual([0, 0])
  expect(sceneImageTexel(image, [1, 1])).toEqual([6, 2])
  expect(sceneImageTexel(image, [0.5, 0.5])).toEqual([3, 1])
  expect(sceneImageTexel(image, [-1e308, 1e308])).toEqual([0, 2])
  expect(sceneImageTexel(image, [NaN, 0])).toBeNull()
})

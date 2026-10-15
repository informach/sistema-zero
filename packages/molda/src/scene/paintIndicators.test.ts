import { expect, test } from 'bun:test'
import { makeModel } from '../testing/fixtures'
import { addScenePrimitive } from './commands'
import type { SceneImage } from './document'
import { migrateLegacyModel } from './migrateLegacy'
import { scenePaintIndicators } from './paintIndicators'
import { ensureScenePaintSurface } from './paintSurface'

test('piece color indicators use composed paint and visible layers rather than an imported palette', () => {
  const withBox = addScenePrimitive(
    migrateLegacyModel(makeModel({ parts: [] })).document,
    'box',
    'Cor',
  )
  const nodeId = withBox.nodes.at(-1)!.id
  const ready = ensureScenePaintSurface(withBox, { nodeId })
  if (ready.status !== 'ready') throw new Error('Missing fixture surface')
  const source = ready.document
  const material = source.materials.find((entry) => entry.id === ready.target.materialId)
  if (!material?.colorImageId) throw new Error('Missing fixture color image')
  const sourceImage = source.images.find((entry) => entry.id === material.colorImageId)!
  const image: SceneImage = {
    ...sourceImage,
    encoding: 'rgba',
    width: 2,
    height: 2,
    layers: [
      {
        ...sourceImage.layers[0]!,
        pixels: new Uint8Array([255, 0, 0, 255, 255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]),
      },
    ],
  }
  const painted = {
    ...source,
    images: source.images.map((entry) => (entry.id === image.id ? image : entry)),
  }
  expect(scenePaintIndicators(painted).get(nodeId)).toEqual(['#ff0000', '#0000ff', '#00ff00'])
  const hidden = {
    ...painted,
    materials: painted.materials.map((entry) =>
      entry.id === material.id
        ? {
            ...entry,
            baseColor: {
              kind: 'rgba' as const,
              value: [0.25, 0.5, 0.75, 1] as [number, number, number, number],
            },
          }
        : entry,
    ),
    images: painted.images.map((entry) =>
      entry === image
        ? { ...image, layers: image.layers.map((layer) => ({ ...layer, visible: false })) }
        : entry,
    ),
  }
  expect(scenePaintIndicators(hidden).get(nodeId)).toEqual(['#4080bf'])
  expect(scenePaintIndicators(painted).get(nodeId)).toEqual(['#ff0000', '#0000ff', '#00ff00'])
})

import { expect, test } from 'bun:test'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { readSceneAlphaMask } from './alphaMask'
import { patchSceneMaterial } from './appearanceCommands'
import { compositeSceneImage } from './composite'
import { sceneToJson } from './documentJson'
import { prepareSceneImageRaster } from './imageRaster'
import { readSceneDocument } from './readDocument'

test('closed mask contract preserves finite precision, rejects incomplete fields and owns its values', () => {
  const source = makeSceneGlbFixture(1, 1, 2, 2)
  const before = structuredClone(source)
  for (const cutoff of [0, Number.MIN_VALUE, 0.123456789123, 1, 2, Number.MAX_VALUE]) {
    const input = { cutoff, opacity: 0.123456789123 }
    const next = patchSceneMaterial(source, 'material', { alphaMask: input })
    expect(next.materials[0]!.alphaMask).toEqual(input)
    expect(next.materials[0]!.alphaMask).not.toBe(input)
    expect(patchSceneMaterial(next, 'material', { alphaMask: input })).toBe(next)
    expect(next.images).toBe(source.images)
    expect(next.geometries).toBe(source.geometries)
    const read = readSceneDocument(sceneToJson(next))
    expect(read.status).toBe('valid')
    if (read.status !== 'valid') throw new Error('Expected roundtrip')
    expect(read.document).toEqual(next)
    const removed = patchSceneMaterial(next, 'material', { alphaMask: null })
    expect(removed.materials).toEqual(source.materials)
    expect(patchSceneMaterial(removed, 'material', { alphaMask: null })).toBe(removed)
  }
  for (const value of [
    null,
    false,
    [],
    {},
    { cutoff: 0.5 },
    { opacity: 1 },
    { cutoff: -1, opacity: 1 },
    { cutoff: NaN, opacity: 1 },
    { cutoff: Infinity, opacity: 1 },
    { cutoff: 0.5, opacity: -1 },
    { cutoff: 0.5, opacity: 1.1 },
    { cutoff: 0.5, opacity: NaN },
    { cutoff: 0.5, opacity: 1, future: true },
  ])
    expect(() => readSceneAlphaMask(value, 'mask')).toThrow()
  expect(readSceneAlphaMask({ cutoff: -0, opacity: -0 }, 'mask')).toEqual({ cutoff: 0, opacity: 0 })
  expect(source).toEqual(before)
  const locked = { ...source, nodes: source.nodes.map((node) => ({ ...node, locked: true })) }
  expect(() =>
    patchSceneMaterial(locked, 'material', { alphaMask: { cutoff: 0.5, opacity: 1 } }),
  ).toThrow()
})

test('zero-alpha colors have an explicit mask composition policy, including partial updates and hidden layers', () => {
  const source = makeSceneGlbFixture(1, 1, 2, 2)
  const image = source.images[0]!
  image.layers[0]!.pixels.set([193, 47, 91, 0, 9, 81, 127, 0])
  const lower = image.layers[0]!
  image.layers.push({ ...lower, id: 'upper', pixels: lower.pixels.slice() })
  image.layers[1]!.pixels.set([201, 17, 3, 0])
  const before = structuredClone(image)
  expect(compositeSceneImage(image, []).slice(0, 4)).toEqual(new Uint8Array(4))
  expect(compositeSceneImage(image, [], [0, 0, 0, 0], true).slice(0, 4)).toEqual(
    new Uint8Array([201, 17, 3, 0]),
  )
  const hidden = { ...image, layers: [lower, { ...image.layers[1]!, visible: false }] }
  expect(compositeSceneImage(hidden, [], [0, 0, 0, 0], true).slice(0, 4)).toEqual(
    new Uint8Array([193, 47, 91, 0]),
  )
  const raster = { image, base: [0, 0, 0, 0] as [number, number, number, number], paletteKey: '' }
  expect(
    prepareSceneImageRaster({ ...raster, preserveTransparentRgb: true }, [], raster)?.region,
  ).toBeUndefined()
  const next = structuredClone(image)
  next.layers[1]!.pixels[0] = 73
  const patch = prepareSceneImageRaster(
    { ...raster, image: next, preserveTransparentRgb: true },
    [],
    { ...raster, preserveTransparentRgb: true },
  )!
  expect(patch.region).toEqual({ x0: 0, y0: 0, x1: 0, y1: 0 })
  expect(patch.pixels).toEqual(new Uint8Array([73, 17, 3, 0]))
  expect(image).toEqual(before)
})

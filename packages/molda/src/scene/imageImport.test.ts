import { expect, spyOn, test } from 'bun:test'
import { makeModel } from '../testing/fixtures'
import { importSceneColorImage } from './appearanceCommands'
import { sceneToJson } from './documentJson'
import { sceneRasterFromCanvas, validateSceneRgbaRaster } from './imageImport'
import { SCENE_LIMITS } from './limits'
import { migrateLegacyModel } from './migrateLegacy'
import { readSceneDocument } from './readDocument'

const rgba = () => ({
  width: 2,
  height: 3,
  pixels: Uint8Array.from({ length: 24 }, (_, i) => (i * 37) % 256),
})

test('canvas import reverses rows once, preserves all decoded RGBA bytes and owns its buffer', () => {
  const buffer = new Uint8ClampedArray(32)
  const bytes = buffer.subarray(4, 28)
  bytes.set(rgba().pixels)
  const raster = sceneRasterFromCanvas(2, 3, bytes)
  expect(raster.pixels).toEqual(
    new Uint8Array([...bytes.slice(16, 24), ...bytes.slice(8, 16), ...bytes.slice(0, 8)]),
  )
  bytes.fill(255)
  expect(raster.pixels).not.toEqual(new Uint8Array(24).fill(255))
  for (const value of [
    { ...rgba(), width: 1025 },
    { ...rgba(), width: 1.5 },
    { ...rgba(), height: 0 },
    { ...rgba(), pixels: new Uint8Array(23) },
    { ...rgba(), extra: true },
  ])
    expect(() => validateSceneRgbaRaster(value)).toThrow()
})

test('import binds a new owned RGBA source, retains the old library image and never changes geometry or UVs', () => {
  const source = migrateLegacyModel(makeModel()).document,
    before = structuredClone(source)
  const material = source.materials.find((m) => m.colorImageId)!
  const input = rgba(),
    expected = input.pixels.slice()
  let id = 0
  const result = importSceneColorImage(
    source,
    material.id,
    'Minha imagem.png',
    input,
    () => `imported_${++id}`,
  )
  const added = result.images.at(-1)!
  expect(added).toMatchObject({ width: 2, height: 3, encoding: 'rgba', name: 'Minha imagem.png' })
  expect(added.layers[0]!.pixels).toEqual(expected)
  input.pixels.fill(0)
  expect(added.layers[0]!.pixels).toEqual(expected)
  expect(result.materials.find((m) => m.id === material.id)?.colorImageId).toBe(added.id)
  expect(result.images.slice(0, -1)).toEqual(source.images)
  expect(result.images[0]).toBe(source.images[0])
  expect(result.geometries).toBe(source.geometries)
  expect(result.nodes).toBe(source.nodes)
  expect(readSceneDocument(sceneToJson(result)).status).toBe('valid')
  expect(source).toEqual(before)
})

test('import checks shared locks and aggregate capacity before copying pixels or allocating identities', () => {
  const source = migrateLegacyModel(makeModel()).document
  const node = source.nodes.find((n) => n.id === 'body')!
  if (node.kind !== 'mesh') throw new Error('Missing mesh')
  const input = rgba(),
    copy = spyOn(input.pixels, 'slice')
  let ids = 0
  const allocate = () => `imported_${++ids}`
  try {
    expect(() =>
      importSceneColorImage(
        {
          ...source,
          nodes: source.nodes.map((n) => (n.id === node.id ? { ...n, locked: true } : n)),
        },
        node.materialId,
        'Imagem',
        input,
        allocate,
      ),
    ).toThrow()
    expect(source.images.length).toBeLessThanOrEqual(8)
    const full = {
      ...source,
      images: Array.from({ length: 8 }, (_, i) => ({
        ...source.images[0]!,
        id: source.images[i]?.id ?? `capacity_${i}`,
        width: 1024,
        height: 1024,
        encoding: 'rgba' as const,
        layers: [
          { ...source.images[0]!.layers[0]!, pixels: new Uint8Array(SCENE_LIMITS.pixelBytes / 8) },
        ],
      })),
    }
    expect(readSceneDocument(full).status).toBe('valid')
    expect(() => importSceneColorImage(full, node.materialId, 'Imagem', input, allocate)).toThrow(
      'espaço para pintura',
    )
    expect(copy).not.toHaveBeenCalled()
    expect(ids).toBe(0)
  } finally {
    copy.mockRestore()
  }
})

import { expect, test } from 'bun:test'
import { encodeSceneGlb } from '../export/sceneGlb'
import { makeModel } from '../testing/fixtures'
import { readGlb, readImage } from '../testing/glbRead'
import { expectValidGlb } from '../testing/gltfValidation'
import { decodePng } from '../testing/pngDecode'
import { compositeSceneImage, sceneBaseColor, scenePalette } from './composite'
import { sceneToJson } from './documentJson'
import { convertSceneImageRgba } from './imageOperations'
import { paintSceneImage } from './imagePaint'
import { SCENE_LIMITS } from './limits'
import { migrateLegacyModel } from './migrateLegacy'
import { eraseScenePaintCutout } from './paintCutout'
import { readSceneDocument } from './readDocument'
import { list, record } from './validation'

function fixture() {
  const original = migrateLegacyModel(makeModel()).document
  const image = original.images[0]!
  const material = original.materials.find((entry) => entry.colorImageId === image.id)!
  const document = {
    ...original,
    materials: original.materials.map((entry) =>
      entry === material ? { ...entry, baseColor: { kind: 'palette' as const, index: 7 } } : entry,
    ),
  }
  const target = {
    nodeId: 'body',
    materialId: material.id,
    imageId: image.id,
    layerId: image.layers[0]!.id,
  }
  return { document, target }
}
function raster(
  document: ReturnType<typeof fixture>['document'],
  target: ReturnType<typeof fixture>['target'],
) {
  const image = document.images.find((entry) => entry.id === target.imageId)!
  const material = document.materials.find((entry) => entry.id === target.materialId)!
  const palette = scenePalette(document)
  return compositeSceneImage(image, palette, sceneBaseColor(material, palette))
}

test('vazado removes the base at only the brushed pixel; painting restores it and project JSON preserves it', () => {
  const { document, target } = fixture()
  const before = raster(document, target)
  const cut = eraseScenePaintCutout(document, target, { from: [1, 0], to: [1, 0], brush: 1 })
  const after = raster(cut, target)
  expect(after[7]).toBe(0)
  expect(after.slice(0, 4)).toEqual(before.slice(0, 4))
  expect(after.slice(8)).toEqual(before.slice(8))
  expect(raster(document, target)).toEqual(before)
  expect(cut.images[0]!.layers).toHaveLength(document.images[0]!.layers.length + 1)
  expect(cut.materials.find((entry) => entry.id === target.materialId)!.alphaMask).toEqual({
    cutoff: 0.5,
    opacity: 1,
  })
  const restored = readSceneDocument(sceneToJson(cut))
  if (restored.status !== 'valid') throw new Error(JSON.stringify(restored))
  expect(raster(restored.document, target)).toEqual(after)
  const painted = paintSceneImage(cut, target, { from: [1, 0], to: [1, 0], brush: 1, color: 2 })
  expect(raster(painted, target)[7]).toBe(255)
  expect(eraseScenePaintCutout(cut, target, { from: [1, 0], to: [1, 0], brush: 1 })).toBe(cut)
})

test('vazado clears visible lower paint, preserves hidden layers, and clips a wide brush at the face boundary', () => {
  const { document, target } = fixture()
  const image = document.images[0]!
  const lower = { ...image.layers[0]!, id: 'lower', pixels: image.layers[0]!.pixels.map(() => 2) }
  const hidden = { ...lower, id: 'hidden', visible: false }
  const layered = {
    ...document,
    images: [{ ...image, layers: [lower, hidden, ...image.layers] }, ...document.images.slice(1)],
  }
  const before = raster(layered, target)
  const cut = eraseScenePaintCutout(layered, target, {
    from: [1, 0],
    to: [1, 0],
    brush: 3,
    region: { x0: 0, y0: 0, x1: 1, y1: 1 },
  })
  const after = raster(cut, target)
  expect(after[7]).toBe(0)
  expect(after.slice(8, 12)).toEqual(before.slice(8, 12))
  expect(cut.images[0]!.layers.find((entry) => entry.id === hidden.id)).toBe(hidden)
})

test('shared images stay unchanged for other materials and scalar maps', () => {
  const { document, target } = fixture()
  const source = document.materials.find((entry) => entry.id === target.materialId)!
  const other = {
    ...source,
    id: 'other-paint',
    baseColor: { kind: 'rgba' as const, value: [0, 0, 1, 1] as [number, number, number, number] },
  }
  const converted = convertSceneImageRgba(document.images[0]!, scenePalette(document))
  const shared = {
    ...document,
    images: [converted, ...document.images.slice(1)],
    materials: [
      ...document.materials.map((entry) =>
        entry === source ? { ...entry, roughnessImageId: target.imageId } : entry,
      ),
      other,
    ],
  }
  const cut = eraseScenePaintCutout(shared, target, { from: [0, 0], to: [0, 0], brush: 1 })
  const kept = cut.materials.find((entry) => entry.id === other.id)!
  const edited = cut.materials.find((entry) => entry.id === target.materialId)!
  expect(kept.colorImageId).not.toBe(target.imageId)
  expect(edited.roughnessImageId).toBe(kept.colorImageId)
  expect(
    cut.images.find((entry) => entry.id === kept.colorImageId)!.layers.map((layer) => layer.pixels),
  ).toEqual(converted.layers.map((layer) => layer.pixels))
  expect(kept.baseColor).toEqual(other.baseColor)
  expect(raster(cut, target)[3]).toBe(0)
})

test('GLB preserves a pixel cutout with MASK, crisp cutoff and a transparent PNG texel', async () => {
  const { document, target } = fixture()
  const cut = eraseScenePaintCutout(document, target, { from: [0, 0], to: [0, 0], brush: 1 })
  const result = encodeSceneGlb(cut)
  await expectValidGlb(result.bytes)
  const glb = readGlb(result.bytes)
  const materials = list(glb.json.materials, 'materials', 100).map((row) => record(row, 'material'))
  expect(materials.some((row) => row.alphaMode === 'MASK' && row.alphaCutoff === 0.5)).toBe(true)
  const pixels = decodePng(readImage(glb, 0)).rgba
  expect([...pixels].filter((_, i) => i % 4 === 3 && pixels[i] === 0)).toHaveLength(1)
})

test('cutting a pixel in imported translucent paint preserves blending outside the stroke', () => {
  const { document, target } = fixture()
  const partial = {
    ...document,
    materials: document.materials.map((entry) =>
      entry.id === target.materialId
        ? {
            ...entry,
            baseColor: {
              kind: 'rgba' as const,
              value: [0, 1, 0, 0.2] as [number, number, number, number],
            },
          }
        : entry,
    ),
  }
  const cut = eraseScenePaintCutout(partial, target, { from: [0, 0], to: [0, 0], brush: 1 })
  expect(cut.materials.find((entry) => entry.id === target.materialId)!.alphaMask).toBeUndefined()
  expect(raster(cut, target).slice(4)).toEqual(raster(partial, target).slice(4))
  expect(raster(cut, target)[3]).toBe(0)
})

test('a full layer budget refuses background preparation without changing authored bytes', () => {
  const { document, target } = fixture()
  const image = document.images[0]!
  const full = {
    ...document,
    images: [
      {
        ...image,
        layers: Array.from({ length: SCENE_LIMITS.layersPerImage }, (_, index) => ({
          ...image.layers[0]!,
          id: index === 0 ? target.layerId : `layer-${index}`,
        })),
      },
      ...document.images.slice(1),
    ],
  }
  const before = sceneToJson(full)
  expect(() => eraseScenePaintCutout(full, target, { from: [0, 0], to: [0, 0], brush: 1 })).toThrow(
    'máximo de camadas',
  )
  expect(sceneToJson(full)).toEqual(before)
})

test.each([
  0, 0.37, 1,
])('an imported zero-cutoff mask with opacity %s keeps every untouched visible pixel when one pixel is cut out', (opacity) => {
  const { document, target } = fixture()
  const rgba = convertSceneImageRgba(document.images[0]!, scenePalette(document))
  for (const layer of rgba.layers)
    for (let offset = 0; offset < layer.pixels.length; offset += 4)
      layer.pixels.set([16, 64, 128, offset % 12 === 8 ? 1 : 0], offset)
  const source = {
    ...document,
    images: [rgba, ...document.images.slice(1)],
    materials: document.materials.map((entry) =>
      entry.id === target.materialId
        ? {
            ...entry,
            baseColor: {
              kind: 'rgba' as const,
              value: [0, 0, 0, 0] as [number, number, number, number],
            },
            alphaMask: { cutoff: 0, opacity },
          }
        : entry,
    ),
  }
  const cut = eraseScenePaintCutout(source, target, { from: [0, 0], to: [0, 0], brush: 1 })
  const material = cut.materials.find((entry) => entry.id === target.materialId)!
  const pixels = raster(cut, target)
  const visible = (index: number) =>
    (pixels[index * 4 + 3]! / 255) * material.alphaMask!.opacity >= material.alphaMask!.cutoff
  expect(visible(0)).toBe(false)
  expect(visible(1)).toBe(true)
  expect(visible(2)).toBe(true)
  expect([...pixels.slice(4, 7)]).toEqual([16, 64, 128])
})

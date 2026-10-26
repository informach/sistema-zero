import { expect, test } from 'bun:test'
import { encodeSceneGlb } from '../export/sceneGlb'
import { makeModel } from '../testing/fixtures'
import { readGlb } from '../testing/glbRead'
import { sceneAppearanceUsage } from './appearanceUsage'
import { addScenePrimitive } from './commands'
import { compositeSceneImage, sceneBaseColor, scenePalette } from './composite'
import { sceneToJson } from './documentJson'
import { paintSceneImageGradient } from './imageGradient'
import { convertSceneImageRgba } from './imageOperations'
import { resolveScenePaintTarget } from './imagePaint'
import { migrateLegacyModel } from './migrateLegacy'
import { ensureScenePaintSurface } from './paintSurface'
import { makeScenePaintBaseTransparent } from './paintTransparentBase'
import { readSceneDocument } from './readDocument'
import { list, record } from './validation'

function ids() {
  let id = 0
  return () => `clear_${++id}`
}

test('transparent base isolates a shared piece and lets a gradient fade to the scene', () => {
  const nextId = ids()
  const empty = migrateLegacyModel(makeModel({ parts: [] })).document
  const one = addScenePrimitive(empty, 'box', 'feixe', nextId)
  const two = addScenePrimitive(one, 'box', 'outra', nextId)
  const [beam, other] = two.nodes
  if (beam?.kind !== 'mesh' || other?.kind !== 'mesh') throw new Error('Peças ausentes')
  const prepared = ensureScenePaintSurface(two, { nodeId: beam.id }, nextId)
  if (prepared.status !== 'ready') throw new Error('Pintura ausente')
  const source = {
    ...prepared.document,
    images: prepared.document.images.map((image) =>
      image.id === prepared.target.imageId
        ? convertSceneImageRgba(image, scenePalette(prepared.document))
        : image,
    ),
  }
  const shared = {
    ...source,
    nodes: source.nodes.map((node) =>
      node.id === other.id ? { ...other, materialId: prepared.target.materialId } : node,
    ),
  }
  const result = makeScenePaintBaseTransparent(shared, prepared.target, nextId)
  const { image, material } = resolveScenePaintTarget(result.document, result.target)
  expect(result.target.materialId).not.toBe(prepared.target.materialId)
  expect(result.target.imageId).not.toBe(prepared.target.imageId)
  expect(material.baseColor).toEqual({ kind: 'rgba', value: [0, 0, 0, 0] })
  expect(material.alphaMask).toBeUndefined()
  expect(
    result.document.materials.find((entry) => entry.id === prepared.target.materialId),
  ).toEqual(source.materials.find((entry) => entry.id === prepared.target.materialId))
  const palette = scenePalette(result.document)
  const gradient = paintSceneImageGradient(image, {
    kind: 'gradient',
    layerId: result.target.layerId,
    from: [0, 0],
    to: [image.width - 1, 0],
    color: [255, 240, 0, 128],
    endColor: [255, 240, 0, 0],
  })
  const pixels = compositeSceneImage(gradient, palette, sceneBaseColor(material, palette))
  expect(pixels[3]).toBe(128)
  expect(pixels[(image.width - 1) * 4 + 3]).toBe(0)
  const exported = encodeSceneGlb({
    ...result.document,
    images: result.document.images.map((entry) => (entry.id === image.id ? gradient : entry)),
  })
  const materials = list(readGlb(exported.bytes).json.materials, 'materials', 256)
  expect(materials.some((entry) => record(entry, 'material').alphaMode === 'BLEND')).toBe(true)
  expect(readSceneDocument(sceneToJson(result.document)).status).toBe('valid')
  expect(makeScenePaintBaseTransparent(result.document, result.target, nextId).document).toBe(
    result.document,
  )
})

test('transparent base covers every material on the piece and removes binary cutout', () => {
  const source = migrateLegacyModel(makeModel()).document
  const material = source.materials.find((entry) => entry.colorImageId === source.images[0]!.id)!
  const masked = {
    ...source,
    materials: source.materials.map((entry) =>
      entry.id === material.id ? { ...entry, alphaMask: { cutoff: 0.5, opacity: 1 } } : entry,
    ),
  }
  const target = {
    nodeId: 'body',
    materialId: material.id,
    imageId: source.images[0]!.id,
    layerId: source.images[0]!.layers[0]!.id,
  }
  const result = makeScenePaintBaseTransparent(masked, target, ids())
  const usage = sceneAppearanceUsage(result.document)
  for (const id of usage.byNode.get('body') ?? []) {
    const changed = usage.index.materials.get(id)!
    expect(changed.baseColor).toEqual({ kind: 'rgba', value: [0, 0, 0, 0] })
    expect(changed.alphaMask).toBeUndefined()
  }
  expect(result.document.materials.find((entry) => entry.id === 'material:wing')).toEqual(
    source.materials.find((entry) => entry.id === 'material:wing'),
  )
  expect(resolveScenePaintTarget(result.document, result.target).image).toBe(source.images[0]!)
  expect(readSceneDocument(sceneToJson(result.document)).status).toBe('valid')
})

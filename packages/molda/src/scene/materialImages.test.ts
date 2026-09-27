import { expect, test } from 'bun:test'
import { makeSceneAtlasDocument } from '../testing/sceneAtlasFixture'
import {
  copySceneMaterialForNode,
  createSceneMaterialImage,
  importSceneMaterialImage,
  patchSceneMaterial,
} from './appearanceCommands'
import { sceneAppearanceUsage } from './appearanceUsage'
import { duplicateSceneNodes, setSceneNodeFlag } from './commands'
import type { MoldaSceneDocument } from './document'
import { sceneToJson } from './documentJson'
import { prepareSceneImageAtlas } from './imageAtlasCommands'
import { editSceneImageLayers } from './imageLayerCommands'
import { paintSceneImage, resolveScenePaintTarget } from './imagePaint'
import { SCENE_LIMITS } from './limits'
import {
  SCENE_MATERIAL_IMAGE_FIELDS,
  SCENE_MATERIAL_IMAGE_KEYS,
  sceneMaterialImageIds,
} from './materialImages'
import { readSceneDocument } from './readDocument'

function fixture() {
  let document = makeSceneAtlasDocument()
  const imageId = document.images[0]!.id
  document = editSceneImageLayers(document, imageId, { kind: 'rgba' })
  const materialId = document.materials.find((m) => m.colorImageId === imageId)!.id
  document = patchSceneMaterial(document, materialId, {
    normalImageId: imageId,
    roughnessImageId: imageId,
    metalnessImageId: imageId,
    normalStrength: 1 / 7,
    normalFlipY: true,
  })
  return { document, imageId, materialId }
}
function sequence() {
  let id = 0
  return () => `detail_${++id}`
}

test.each([
  'normal',
  'roughness',
  'metalness',
] as const)('creating/importing/painting %s uses the selected binding and never replaces the color image', (kind) => {
  const { document, materialId } = fixture()
  const nextId = sequence()
  const next = createSceneMaterialImage(
    document,
    materialId,
    { kind, name: 'Detalhe', width: 2, height: 3, encoding: 'rgba' },
    nextId,
  )
  const image = next.images.at(-1)!,
    material = next.materials.find((m) => m.id === materialId)!
  expect(image.layers[0]!.pixels).toEqual(new Uint8Array(24))
  expect(material[SCENE_MATERIAL_IMAGE_FIELDS[kind]]).toBe(image.id)
  expect(material.colorImageId).toBe(
    document.materials.find((m) => m.id === materialId)!.colorImageId,
  )
  const target = {
    nodeId: 'body',
    materialId,
    imageId: image.id,
    layerId: image.layers[0]!.id,
    imageKind: kind,
  }
  expect(resolveScenePaintTarget(next, target).imageKind).toBe(kind)
  expect(() => resolveScenePaintTarget(next, { ...target, imageKind: 'color' })).toThrow('vínculo')
  const painted = paintSceneImage(next, target, {
    from: [0, 0],
    to: [0, 0],
    brush: 1,
    color: [17, 65, 129, 255],
  })
  expect(painted.images.at(-1)!.layers[0]!.pixels.slice(0, 4)).toEqual(
    new Uint8Array([17, 65, 129, 255]),
  )
  expect(painted.images[0]).toBe(document.images[0])
  expect(painted.geometries).toBe(document.geometries)
  const pixels = new Uint8Array([71, 131, 255, 255, 9, 3, 1, 0])
  const imported = importSceneMaterialImage(
    painted,
    materialId,
    kind,
    'Importado',
    { width: 2, height: 1, pixels },
    nextId,
  )
  expect(imported.images.at(-1)!.layers[0]!.pixels).toEqual(pixels)
  expect(imported.images.at(-1)!.layers[0]!.pixels).not.toBe(pixels)
  expect(imported.images[0]).toBe(document.images[0])
  expect(
    imported.materials.find((m) => m.id === materialId)![SCENE_MATERIAL_IMAGE_FIELDS[kind]],
  ).toBe(imported.images.at(-1)!.id)
  expect(readSceneDocument(imported).status).toBe('valid')
  expect(() =>
    createSceneMaterialImage(document, materialId, {
      kind,
      name: 'Não',
      width: 1,
      height: 1,
      encoding: 'indexed',
    }),
  ).toThrow('cores livres')
})

test('detail bindings survive strict JSON roundtrip with exact strength; no implicit indexed-to-data conversion or missing references', () => {
  const { document, materialId, imageId } = fixture()
  const parsed = readSceneDocument(sceneToJson(document))
  expect(parsed.status).toBe('valid')
  if (parsed.status !== 'valid') throw new Error('Missing document')
  expect(parsed.document.materials).toEqual(document.materials)
  expect(
    patchSceneMaterial(document, materialId, {
      normalImageId: imageId,
      normalStrength: 1 / 7,
      normalFlipY: true,
    }),
  ).toBe(document)
  const detached = patchSceneMaterial(document, materialId, { normalImageId: null })
  expect(detached.images).toBe(document.images)
  expect(detached.materials.find((m) => m.id === materialId)?.normalImageId).toBeUndefined()
  for (const patch of [
    { normalImageId: 'absent' },
    { roughnessImageId: document.images[1]!.id },
    { normalStrength: -1 },
    { normalStrength: 5 },
    { normalStrength: NaN },
    { normalFlipY: 'yes' },
    { normalImage: imageId },
  ])
    expect(() =>
      patchSceneMaterial(document, materialId, patch as Parameters<typeof patchSceneMaterial>[2]),
    ).toThrow()
  expect(() => prepareSceneImageAtlas(document, 'body')).toThrow('mapas de detalhes')
})

test('all image roles participate in locks; material isolation clones each reachable image once and leaves locked users untouched', () => {
  const { document: initial, materialId, imageId } = fixture()
  const otherId = initial.materials.find((m) => m.colorImageId === initial.images[1]!.id)!.id
  let document = patchSceneMaterial(initial, otherId, { normalImageId: imageId })
  document = setSceneNodeFlag(document, ['wing'], 'locked', true)
  expect(sceneAppearanceUsage(document).images.get(imageId)).toEqual(new Set(['body', 'wing']))
  expect(() =>
    editSceneImageLayers(document, imageId, {
      kind: 'opacity',
      layerId: document.images[0]!.layers[0]!.id,
      value: 0.5,
    }),
  ).toThrow('travada')
  const next = copySceneMaterialForNode(document, 'body', materialId, sequence())
  const copy = next.materials.at(-1)!,
    image = next.images.at(-1)!
  expect(next.images.length).toBe(document.images.length + 1)
  expect(sceneMaterialImageIds(copy)).toEqual(new Set([image.id]))
  for (const field of SCENE_MATERIAL_IMAGE_KEYS) expect(copy[field]).toBe(image.id)
  expect(image.layers[0]!.pixels).toEqual(document.images[0]!.layers[0]!.pixels)
  expect(image.layers[0]!.pixels).not.toBe(document.images[0]!.layers[0]!.pixels)
  expect(next.nodes[1]).toBe(document.nodes[1])
  expect(next.materials.find((m) => m.id === otherId)).toBe(
    document.materials.find((m) => m.id === otherId),
  )
  expect(sceneAppearanceUsage(next).images.get(image.id)).toEqual(new Set(['body']))
  expect(readSceneDocument(next).status).toBe('valid')
})

test('subtree duplication remaps every data image and keeps internal aliasing without aliasing original pixels', () => {
  const { document, materialId, imageId } = fixture()
  const next = duplicateSceneNodes(document, ['body'], sequence())
  const source = document.materials.find((m) => m.id === materialId)!
  const copied = next.materials.slice(document.materials.length).find((m) => m.normalImageId)!
  expect(sceneMaterialImageIds(copied).size).toBe(1)
  expect(copied.normalImageId).not.toBe(imageId)
  expect(copied.normalStrength).toBe(source.normalStrength)
  const image = next.images.find((i) => i.id === copied.normalImageId)!
  expect(image.layers[0]!.pixels).toEqual(document.images[0]!.layers[0]!.pixels)
  expect(image.layers[0]!.pixels).not.toBe(document.images[0]!.layers[0]!.pixels)
  expect(readSceneDocument(next).status).toBe('valid')
})

test('multi-role isolation checks aggregate pixel capacity before allocating IDs or cloning paint', () => {
  const { document, materialId } = fixture()
  const image = {
    ...document.images[0]!,
    width: 1024,
    height: 1024,
    layers: Array.from({ length: 8 }, (_, i) => ({
      ...document.images[0]!.layers[0]!,
      id: `full_${i}`,
      pixels: new Uint8Array(1024 * 1024 * 4),
    })),
  }
  const full: MoldaSceneDocument = {
    ...document,
    images: [image],
    materials: document.materials.map((m) => ({
      ...m,
      ...(m.colorImageId ? { colorImageId: image.id } : {}),
    })),
  }
  expect(readSceneDocument(full).status).toBe('valid')
  expect(image.layers.reduce((sum, l) => sum + l.pixels.byteLength, 0)).toBe(
    SCENE_LIMITS.pixelBytes,
  )
  let calls = 0
  expect(() =>
    copySceneMaterialForNode(full, 'body', materialId, () => {
      calls++
      return 'new_id'
    }),
  ).toThrow('espaço para pintura')
  expect(calls).toBe(0)
})

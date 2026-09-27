import { expect, test } from 'bun:test'
import { makeModel } from '../testing/fixtures'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import {
  copySceneMaterialForNode,
  createSceneColorImage,
  patchSceneMaterial,
} from './appearanceCommands'
import { sceneAppearanceUsage } from './appearanceUsage'
import { compositeSceneImage, sceneBaseColor, scenePalette } from './composite'
import type { MoldaSceneDocument, SceneImage, SceneMaterial } from './document'
import { sceneToJson } from './documentJson'
import { editSceneImageLayers } from './imageLayerCommands'
import { SCENE_LIMITS } from './limits'
import { migrateLegacyModel } from './migrateLegacy'
import { readSceneDocument } from './readDocument'

function fixture() {
  let id = 0
  const nextId = () => `appearance_${++id}`
  const initial = migrateLegacyModel(makeModel()).document
  const node = initial.nodes.find((n) => n.id === 'body')!
  if (node.kind !== 'mesh') throw new Error('Missing node')
  const document = createSceneColorImage(
    initial,
    node.materialId,
    { name: 'Pintura', width: 2, height: 3, encoding: 'indexed' },
    nextId,
  )
  const image = document.images.at(-1)!
  image.layers[0]!.pixels.set([0, 1, 2, 3, 4, 5])
  return { document, image, materialId: node.materialId, node, nextId }
}

test('material edits validate the shared reader contract and preserve untouched resources and exact base colors', () => {
  const { document, materialId } = fixture()
  const before = structuredClone(document)
  expect(patchSceneMaterial(document, materialId, {})).toBe(document)
  const baseColor: SceneMaterial['baseColor'] = {
    kind: 'rgba',
    value: [1 / 7, 0.123456789123456, 1, 0.3333333333333333],
  }
  const color = patchSceneMaterial(document, materialId, { baseColor })
  const next = patchSceneMaterial(color, materialId, {
    roughness: 0.2,
    metalness: 0.6,
    doubleSided: true,
  })
  expect(next.images).toBe(document.images)
  expect(next.nodes).toBe(document.nodes)
  expect(next.geometries).toBe(document.geometries)
  expect(next.materials.find((m) => m.id === materialId)?.baseColor).toEqual(baseColor)
  expect(patchSceneMaterial(next, materialId, { baseColor })).toBe(next)
  expect(readSceneDocument(sceneToJson(next)).status).toBe('valid')
  for (const patch of [
    { roughness: NaN },
    { metalness: 1.1 },
    { colorImageId: 'missing' },
    { name: '' },
    { baseColor: { kind: 'palette' as const, index: 0 } },
  ])
    expect(() => patchSceneMaterial(document, materialId, patch)).toThrow()
  expect(() =>
    patchSceneMaterial(document, materialId, { roughness: 0, script: true } as {
      roughness: number
    }),
  ).toThrow('Campo desconhecido')
  const detached = patchSceneMaterial(document, materialId, { colorImageId: null })
  expect(detached.images).toBe(document.images)
  expect(detached.materials.find((m) => m.id === materialId)?.colorImageId).toBeUndefined()
  expect(document).toEqual(before)
})

test('new rectangular color images bind explicitly, retain old sources and validate IDs and dimensions before publishing', () => {
  const { document, image, materialId, nextId } = fixture()
  const result = createSceneColorImage(
    document,
    materialId,
    { name: 'Livre', width: 7, height: 3, encoding: 'rgba' },
    nextId,
  )
  const added = result.images.at(-1)!
  expect(result.images.find((entry) => entry.id === image.id)).toBe(image)
  expect(added.layers[0]!.pixels).toEqual(new Uint8Array(7 * 3 * 4))
  expect(result.materials.find((m) => m.id === materialId)?.colorImageId).toBe(added.id)
  expect(readSceneDocument(result).status).toBe('valid')
  expect(() =>
    createSceneColorImage(
      document,
      materialId,
      { name: 'Errado', width: 2.5, height: 3, encoding: 'indexed' },
      nextId,
    ),
  ).toThrow()
  expect(() =>
    createSceneColorImage(
      document,
      materialId,
      { name: 'Errado', width: 2048, height: 3, encoding: 'rgba' },
      nextId,
    ),
  ).toThrow()
  expect(() =>
    createSceneColorImage(
      document,
      materialId,
      { name: 'Errado', width: 2, height: 3, encoding: 'indexed' },
      () => image.id,
    ),
  ).toThrow('identidade')
})

test.each([
  'box',
  'mesh',
  'path',
] as const)('shared %s paint honors inherited locks; explicit copy isolates only the chosen node and its corner bindings', (kind) => {
  const { document, image, materialId, node, nextId } = fixture()
  const original = document.geometries.find((g) => g.id === node.geometryId)!
  if (original.kind === 'mesh' || original.kind === 'path') throw new Error('Expected primitive')
  const grid = makeSceneGridGeometry(1, original.id)
  grid.faces.f_0_0!.materialId = materialId
  const geometry =
    kind === 'mesh'
      ? grid
      : kind === 'path'
        ? {
            id: original.id,
            kind: 'path' as const,
            points: [
              { id: 'a', position: [0, 0, 0] as [number, number, number] },
              { id: 'b', position: [0, 1, 0] as [number, number, number] },
            ],
            radius: 0.1,
            around: 6,
            endCaps: true,
            surfaces: {
              side: {
                materialId,
                uv: {
                  origin: [0, 0] as [number, number],
                  u: [1, 0] as [number, number],
                  v: [0, 1] as [number, number],
                },
              },
            },
          }
        : {
            ...original,
            surfaces: {
              ...original.surfaces,
              pz: {
                materialId,
                uv: {
                  origin: [0, 0] as [number, number],
                  u: [1, 0] as [number, number],
                  v: [0, 1] as [number, number],
                },
              },
            },
          }
  const shared: MoldaSceneDocument = {
    ...document,
    geometries: document.geometries.map((g) => (g.id === geometry.id ? geometry : g)),
    nodes: [
      ...document.nodes.map((n) =>
        n.id === 'wing' && n.kind === 'mesh'
          ? { ...n, geometryId: geometry.id, parentId: 'locked_group' }
          : n,
      ),
      {
        id: 'locked_group',
        name: 'Grupo',
        kind: 'group',
        parentId: null,
        hidden: true,
        locked: true,
        transform: {
          kind: 'trs',
          translation: [0, 0, 0],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        },
      },
    ],
  }
  const before = structuredClone(shared)
  expect(readSceneDocument(shared).status).toBe('valid')
  expect(sceneAppearanceUsage(shared).images.get(image.id)).toEqual(new Set(['body', 'wing']))
  expect(() => patchSceneMaterial(shared, materialId, { roughness: 0.2 })).toThrow('travada')
  expect(() =>
    editSceneImageLayers(shared, image.id, {
      kind: 'opacity',
      layerId: image.layers[0]!.id,
      value: 0.5,
    }),
  ).toThrow('travada')
  const copied = copySceneMaterialForNode(shared, 'body', materialId, nextId)
  const newNode = copied.nodes.find((n) => n.id === 'body')!
  if (newNode.kind !== 'mesh') throw new Error('Missing node')
  expect(newNode.geometryId).not.toBe(geometry.id)
  expect(newNode.materialId).not.toBe(materialId)
  const paint = copied.images.at(-1)!
  expect(paint.id).not.toBe(image.id)
  expect(paint.layers[0]!.pixels).toEqual(image.layers[0]!.pixels)
  expect(paint.layers[0]!.pixels.buffer).not.toBe(image.layers[0]!.pixels.buffer)
  expect(copied.geometries.find((g) => g.id === geometry.id)).toBe(geometry)
  expect(copied.nodes.find((n) => n.id === 'wing')).toBe(shared.nodes.find((n) => n.id === 'wing'))
  expect(sceneAppearanceUsage(copied).images.get(image.id)).toEqual(new Set(['wing']))
  expect(sceneAppearanceUsage(copied).images.get(paint.id)).toEqual(new Set(['body']))
  expect(readSceneDocument(sceneToJson(copied)).status).toBe('valid')
  expect(patchSceneMaterial(copied, newNode.materialId, { roughness: 0.2 })).not.toBe(copied)
  expect(() => copySceneMaterialForNode(shared, 'wing', materialId, nextId)).toThrow('Destrave')
  expect(shared).toEqual(before)
})

test('layer commands preserve source pixels, stacking and last-layer safety with exact metadata no-ops', () => {
  const { document, image, nextId } = fixture()
  const before = structuredClone(document)
  const layerId = image.layers[0]!.id
  const added = editSceneImageLayers(document, image.id, { kind: 'add', name: 'Detalhes' }, nextId)
  expect(added.images.at(-1)!.layers[0]).toBe(image.layers[0])
  expect(added.images.at(-1)!.layers[1]!.pixels.every((p) => p === 0)).toBe(true)
  const duplicated = editSceneImageLayers(added, image.id, { kind: 'duplicate', layerId }, nextId)
  const layers = duplicated.images.at(-1)!.layers
  expect(layers[1]!.pixels).toEqual(image.layers[0]!.pixels)
  expect(layers[1]!.pixels.buffer).not.toBe(image.layers[0]!.pixels.buffer)
  const moved = editSceneImageLayers(duplicated, image.id, { kind: 'move', layerId, direction: 1 })
  expect(moved.images.at(-1)!.layers[1]).toBe(layers[0])
  let changed = editSceneImageLayers(moved, image.id, { kind: 'opacity', layerId, value: 1 / 7 })
  changed = editSceneImageLayers(changed, image.id, { kind: 'visible', layerId, value: false })
  changed = editSceneImageLayers(changed, image.id, { kind: 'rename', layerId, name: 'Base' })
  const metadata = changed.images.at(-1)!.layers[1]!
  expect([metadata.name, metadata.opacity, metadata.visible]).toEqual(['Base', 1 / 7, false])
  expect(metadata.pixels).toBe(image.layers[0]!.pixels)
  expect(editSceneImageLayers(changed, image.id, { kind: 'opacity', layerId, value: 1 / 7 })).toBe(
    changed,
  )
  expect(editSceneImageLayers(document, image.id, { kind: 'move', layerId, direction: -1 })).toBe(
    document,
  )
  expect(() => editSceneImageLayers(document, image.id, { kind: 'remove', layerId })).toThrow(
    'pelo menos',
  )
  expect(() =>
    editSceneImageLayers(document, image.id, { kind: 'opacity', layerId, value: NaN }),
  ).toThrow()
  expect(() =>
    editSceneImageLayers(document, image.id, { kind: 'rename', layerId: 'missing', name: 'Base' }),
  ).toThrow('não existe')
  expect(readSceneDocument(changed).status).toBe('valid')
  expect(document).toEqual(before)
})

test('indexed-to-RGBA conversion preserves every layer and composited color while intentionally releasing palette binding', () => {
  const { document, image, nextId } = fixture()
  let source = editSceneImageLayers(
    document,
    image.id,
    { kind: 'duplicate', layerId: image.layers[0]!.id },
    nextId,
  )
  source = editSceneImageLayers(source, image.id, {
    kind: 'opacity',
    layerId: source.images.at(-1)!.layers[1]!.id,
    value: 0.123456789,
  })
  const material = source.materials.find((m) => m.colorImageId === image.id)!
  const palette = scenePalette(source)
  const before = source.images.at(-1)!
  const rgba = editSceneImageLayers(source, image.id, { kind: 'rgba' })
  const converted = rgba.images.at(-1)!
  expect(compositeSceneImage(converted, palette, sceneBaseColor(material, palette))).toEqual(
    compositeSceneImage(before, palette, sceneBaseColor(material, palette)),
  )
  expect(converted.layers.map((l) => [l.id, l.name, l.opacity, l.visible])).toEqual(
    before.layers.map((l) => [l.id, l.name, l.opacity, l.visible]),
  )
  expect(converted.layers[0]!.pixels.slice(0, 4)).toEqual(new Uint8Array(4))
  expect(converted.layers[0]!.pixels.length).toBe(before.layers[0]!.pixels.length * 4)
  expect(editSceneImageLayers(rgba, image.id, { kind: 'rgba' })).toBe(rgba)
  expect(readSceneDocument(sceneToJson(rgba)).status).toBe('valid')
  const changedPalette = scenePalette({ paletteId: 'pastel' })
  expect(compositeSceneImage(converted, changedPalette)).toEqual(
    compositeSceneImage(converted, palette),
  )
  expect(compositeSceneImage(before, changedPalette)).not.toEqual(
    compositeSceneImage(before, palette),
  )
})

test('paint budget rejects copies, conversion and excess layers before allocating identities or modifying originals', () => {
  const { document, image, materialId } = fixture()
  const large: SceneImage = {
    ...image,
    width: 1024,
    height: 1024,
    encoding: 'rgba',
    layers: Array.from({ length: 8 }, (_, i) => ({
      id: `layer_${i}`,
      name: 'Camada',
      opacity: 1,
      visible: true,
      pixels: new Uint8Array(1024 * 1024 * 4),
    })),
  }
  const full = {
    ...document,
    images: [large],
    materials: document.materials.map((m) =>
      m.colorImageId ? { ...m, colorImageId: large.id } : m,
    ),
  }
  expect(readSceneDocument(full).status).toBe('valid')
  let allocated = 0
  const nextId = () => `new_${++allocated}`
  expect(() => copySceneMaterialForNode(full, 'body', materialId, nextId)).toThrow(
    'espaço para pintura',
  )
  expect(() =>
    editSceneImageLayers(full, image.id, { kind: 'add', name: 'Outra' }, nextId),
  ).toThrow('espaço para pintura')
  expect(() =>
    createSceneColorImage(
      full,
      materialId,
      { name: 'Outra', width: 1, height: 1, encoding: 'indexed' },
      nextId,
    ),
  ).toThrow('espaço para pintura')
  expect(allocated).toBe(0)
  const indexedFull = {
    ...full,
    images: [
      {
        ...large,
        encoding: 'indexed' as const,
        layers: Array.from({ length: 32 }, (_, i) => ({
          ...large.layers[0]!,
          id: `indexed_${i}`,
          pixels: new Uint8Array(1024 * 1024),
        })),
      },
    ],
  }
  expect(() => editSceneImageLayers(indexedFull, image.id, { kind: 'rgba' })).toThrow(
    'espaço para pintura',
  )
  const maximum = {
    ...image,
    layers: Array.from({ length: SCENE_LIMITS.layersPerImage }, (_, i) => ({
      ...image.layers[0]!,
      id: `layer_${i}`,
    })),
  }
  expect(() =>
    editSceneImageLayers(
      {
        ...document,
        images: document.images.map((entry) => (entry.id === maximum.id ? maximum : entry)),
      },
      image.id,
      { kind: 'add', name: 'Outra' },
      nextId,
    ),
  ).toThrow('máximo')
})

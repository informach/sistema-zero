import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { createSceneColorImage } from './appearanceCommands'
import {
  addScenePrimitive,
  convertSceneNodesToMesh,
  editSceneMesh,
  setSceneNodeFlag,
} from './commands'
import { createSceneProject } from './createProject'
import type { MoldaSceneDocument, SceneMeshGeometry } from './document'
import { paintSceneImage } from './imagePaint'
import { mirrorMeshFaces } from './meshComponentOperations'
import { readSceneDocument } from './readDocument'
import { simpleScenePaintUv } from './simplePaintUv'

function fixture() {
  let document = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'UV' }),
    'box',
    'corpo',
  )
  const nodeId = document.nodes.at(-1)!.id
  document = convertSceneNodesToMesh(document, [nodeId])
  document = editSceneMesh(document, nodeId, (mesh) => ({
    ...makeSceneGridGeometry(2),
    id: mesh.id,
  }))
  const node = document.nodes.find((entry) => entry.id === nodeId)!
  if (node.kind !== 'mesh') throw new Error('Missing node')
  document = createSceneColorImage(document, node.materialId, {
    name: 'desenho',
    width: 8,
    height: 8,
    encoding: 'indexed',
  })
  const image = document.images.at(-1)!
  document = paintSceneImage(
    document,
    { nodeId, materialId: node.materialId, imageId: image.id, layerId: image.layers[0]!.id },
    { from: [0, 0], to: [7, 7], color: 2, brush: 1 },
  )
  return { document, nodeId, node, imageId: image.id }
}

function painted(document: MoldaSceneDocument, nodeId: string) {
  const node = document.nodes.find((entry) => entry.id === nodeId)!
  if (node.kind !== 'mesh') throw new Error('Missing node')
  const mesh = document.geometries.find(
    (entry) => entry.id === node.geometryId,
  ) as SceneMeshGeometry
  const material = document.materials.find(
    (entry) => entry.id === (Object.values(mesh.faces)[0]!.materialId ?? node.materialId),
  )!
  return { mesh, image: document.images.find((entry) => entry.id === material.colorImageId)! }
}

test('simple UV transfers each old face into a continuous chart, retains layers, and is idempotent', () => {
  const f = fixture()
  const old = f.document.images.find((entry) => entry.id === f.imageId)!
  const document = {
    ...f.document,
    images: f.document.images.map((image) =>
      image.id === old.id
        ? {
            ...image,
            layers: [
              ...image.layers,
              {
                id: 'hidden',
                name: 'Guardada',
                visible: false,
                opacity: 0.4,
                pixels: new Uint8Array(64).fill(5),
              },
            ],
          }
        : image,
    ),
  }
  const before = structuredClone(document)
  const next = simpleScenePaintUv(document, f.nodeId)
  const { mesh, image } = painted(next, f.nodeId)
  expect(readSceneDocument(next).status).toBe('valid')
  expect(image.layers.map(({ name, visible, opacity }) => ({ name, visible, opacity }))).toEqual(
    document.images
      .find((entry) => entry.id === old.id)!
      .layers.map(({ name, visible, opacity }) => ({ name, visible, opacity })),
  )
  expect(image.layers[0]!.pixels.some((value) => value === 2)).toBe(true)
  expect(image.layers[1]!.pixels.filter((value) => value === 5)).toHaveLength(4)
  expect(mesh.vertices).toEqual(painted(document, f.nodeId).mesh.vertices)
  expect(Object.keys(mesh.faces)).toEqual(Object.keys(painted(document, f.nodeId).mesh.faces))
  expect(document).toEqual(before)
  expect(simpleScenePaintUv(next, f.nodeId)).toBe(next)
})

test('simple UV preserves continuous reflection and its paint through later mesh edits', () => {
  const f = fixture()
  const source = editSceneMesh(
    f.document,
    f.nodeId,
    (mesh) =>
      mirrorMeshFaces(mesh, Object.keys(mesh.faces), {
        axis: 0,
        center: 0,
        copy: true,
        continuous: true,
      }).mesh,
  )
  const original = painted(source, f.nodeId).mesh
  const next = simpleScenePaintUv(source, f.nodeId)
  const mapped = painted(next, f.nodeId).mesh
  expect(readSceneDocument(next).status).toBe('valid')
  expect(mapped.symmetry).toEqual(original.symmetry)
  for (const [a, b] of Object.entries(mapped.symmetry!.faces)) {
    expect(mapped.faces[b]!.materialId).toBe(mapped.faces[a]!.materialId)
    expect(mapped.faces[b]!.corners.map((c) => c.uv)).toEqual(
      mapped.faces[a]!.corners.map((c) => c.uv).reverse(),
    )
  }
  expect(simpleScenePaintUv(next, f.nodeId)).toBe(next)
  const edited = editSceneMesh(next, f.nodeId, (mesh) => ({
    ...mesh,
    vertices: Object.fromEntries(
      Object.entries(mesh.vertices).map(([id, p]) => [id, [p[0], p[1] + 1, p[2]]]),
    ),
  }))
  expect(readSceneDocument(edited).status).toBe('valid')
  expect(painted(edited, f.nodeId).image).toBe(painted(next, f.nodeId).image)
})

test('shared geometry/material/image are isolated, including a locked other instance', () => {
  const f = fixture()
  const shared: MoldaSceneDocument = {
    ...f.document,
    nodes: [...f.document.nodes, { ...f.node, id: 'other', name: 'outra', locked: true }],
  }
  const before = painted(shared, 'other')
  const next = simpleScenePaintUv(shared, f.nodeId)
  expect(painted(next, 'other').mesh).toBe(before.mesh)
  expect(painted(next, 'other').image).toBe(before.image)
  expect(painted(next, f.nodeId).mesh).not.toBe(before.mesh)
  expect(painted(next, f.nodeId).image).not.toBe(before.image)
  expect(readSceneDocument(next).status).toBe('valid')
})

test('locked target refuses UV changes and a primitive can receive the same simple mapping', () => {
  const f = fixture()
  expect(() =>
    simpleScenePaintUv(setSceneNodeFlag(f.document, [f.nodeId], 'locked', true), f.nodeId),
  ).toThrow('Destrave')
  const primitive = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Caixa' }),
    'box',
    'caixa',
  )
  const nodeId = primitive.nodes.at(-1)!.id
  const next = simpleScenePaintUv(primitive, nodeId)
  expect(painted(next, nodeId).image.layers[0]!.pixels.every((value) => value === 0)).toBe(true)
  expect(readSceneDocument(next).status).toBe('valid')
})

test('RGBA paint remains exact-color and materials sharing an image get independent new charts', () => {
  const f = fixture()
  const rgba = new Uint8Array(8 * 8 * 4)
  for (let i = 0; i < rgba.length; i += 4) rgba.set([17, 55, 99, 200], i)
  const source: MoldaSceneDocument = {
    ...f.document,
    images: f.document.images.map((image) => ({
      ...image,
      encoding: 'rgba',
      layers: image.layers.map((layer) => ({ ...layer, pixels: rgba })),
    })),
    materials: [...f.document.materials, { ...f.document.materials[0]!, id: 'second-material' }],
    geometries: f.document.geometries.map((geometry) =>
      geometry.kind === 'mesh'
        ? {
            ...geometry,
            faces: {
              ...geometry.faces,
              f_1_1: { ...geometry.faces.f_1_1!, materialId: 'second-material' },
            },
          }
        : geometry,
    ),
  }
  const next = simpleScenePaintUv(source, f.nodeId)
  expect(readSceneDocument(next).status).toBe('valid')
  const { mesh } = painted(next, f.nodeId)
  const imageIds = new Set(
    Object.values(mesh.faces).map(
      (face) => next.materials.find((entry) => entry.id === face.materialId)!.colorImageId,
    ),
  )
  expect(imageIds.size).toBe(2)
  for (const id of imageIds) {
    const image = next.images.find((entry) => entry.id === id)!
    expect(image.encoding).toBe('rgba')
    let count = 0
    for (let i = 0; i < image.layers[0]!.pixels.length; i += 4) {
      const pixel = [...image.layers[0]!.pixels.slice(i, i + 4)]
      if (pixel[3] === 0) continue
      expect(pixel).toEqual([17, 55, 99, 200])
      count++
    }
    expect(count).toBeGreaterThan(0)
  }
  expect(next.images.find((entry) => entry.id === f.imageId)).toBe(source.images[0]!)
})

test('special maps and animated paint refuse before changing source resources', () => {
  const f = fixture()
  const detail = {
    ...f.document.images[0]!,
    id: 'details',
    encoding: 'rgba' as const,
    layers: f.document.images[0]!.layers.map((layer) => ({
      ...layer,
      pixels: new Uint8Array(8 * 8 * 4).fill(255),
    })),
  }
  const maps: MoldaSceneDocument = {
    ...f.document,
    images: [...f.document.images, detail],
    materials: f.document.materials.map((material) => ({
      ...material,
      roughnessImageId: detail.id,
    })),
  }
  expect(readSceneDocument(maps).status).toBe('valid')
  expect(() => simpleScenePaintUv(maps, f.nodeId)).toThrow('relevo')
  expect(maps.images[0]).toBe(f.document.images[0]!)
  const animation: MoldaSceneDocument = {
    ...f.document,
    images: f.document.images.map((image) => ({
      ...image,
      flipbook: { frameWidth: 4, frameHeight: 4, frames: [0, 1], fps: 2, loop: true },
    })),
  }
  expect(() => simpleScenePaintUv(animation, f.nodeId)).toThrow('animação')
})

test('a narrow painted triangle keeps visible color even when its new pixel center falls outside the face', () => {
  const f = fixture()
  let source = editSceneMesh(f.document, f.nodeId, (mesh) => ({
    ...mesh,
    vertices: { a: [0, 0, 0], b: [1, 0, 0], c: [0, 0.1, 0] },
    faces: {
      triangle: {
        corners: [
          { vertexId: 'a', uv: [0, 0] },
          { vertexId: 'b', uv: [1, 0] },
          { vertexId: 'c', uv: [0, 1] },
        ],
      },
    },
  }))
  source = {
    ...source,
    images: source.images.map((image) => ({
      ...image,
      layers: image.layers.map((layer) => ({
        ...layer,
        pixels: new Uint8Array(layer.pixels.length).fill(2),
      })),
    })),
  }
  const next = simpleScenePaintUv(source, f.nodeId)
  expect(painted(next, f.nodeId).image.layers[0]!.pixels.some((value) => value === 2)).toBe(true)
})

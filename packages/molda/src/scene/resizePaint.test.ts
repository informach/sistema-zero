import { expect, test } from 'bun:test'
import { createModelAsset } from '../core/model'
import { structuredBytes } from '../core/structuredBytes'
import { createDocumentEditorStore } from '../state/editorStore'
import { createSceneTransformGesture } from '../state/sceneTransformGesture'
import {
  addSceneShape,
  duplicateSceneNodes,
  editSceneMesh,
  groupSceneNodes,
  setScenePrimitiveDetail,
  transformSceneNodes,
} from './commands'
import { createSceneProject } from './createProject'
import type { MoldaSceneDocument } from './document'
import { indexSceneDocument } from './documentIndex'
import { composeTransform, transformDirection } from './matrix'
import { mirrorMeshFaces } from './meshComponentOperations'
import { mapMeshUv } from './meshUv'
import { migrateLegacyModel } from './migrateLegacy'
import { ensureScenePaintSurface } from './paintSurface'
import { sceneGeometryMesh } from './parametricGeometry'
import { setScenePieceCoordinates } from './pieceCoordinates'
import { readSceneDocument } from './readDocument'
import { sceneTransformTrs } from './transformTrs'

function setup(kind: 'plane' | 'box' | 'cylinder' = 'plane', old = false) {
  let document = old
    ? migrateLegacyModel(createModelAsset({ name: 'Antigo', starter: false })).document
    : createSceneProject({ kind: 'empty', name: 'Pixels' })
  document = addSceneShape(document, kind, 'Peça')
  const id = document.nodes.at(-1)!.id
  document = setScenePieceCoordinates(
    document,
    id,
    'dimensions',
    kind === 'plane' ? [3, 0, 2] : [3, 2, 2],
  )
  const ready = ensureScenePaintSurface(document, { nodeId: id })
  if (ready.status !== 'ready') throw new Error('Missing painting')
  return { document: ready.document, id }
}

function shown(document: MoldaSceneDocument, id: string) {
  const index = indexSceneDocument(document),
    node = index.scene.nodes.get(id)!
  if (node.kind !== 'mesh') throw new Error('Missing piece')
  const mesh = sceneGeometryMesh(index.geometries.get(node.geometryId)!)
  return { mesh, node, index }
}

function assertMetric(document: MoldaSceneDocument, id: string) {
  const { mesh, node, index } = shown(document, id)
  for (const face of Object.values(mesh.faces)) {
    const material = index.materials.get(face.materialId ?? node.materialId)!
    const image = index.images.get(material.colorImageId!)!
    face.corners.forEach((corner, i) => {
      const other = face.corners[(i + 1) % face.corners.length]!
      const a = mesh.vertices[corner.vertexId]!,
        b = mesh.vertices[other.vertexId]!
      const length = Math.hypot(
        ...transformDirection(index.scene.worldMatrices.get(id)!, [
          b[0] - a[0],
          b[1] - a[1],
          b[2] - a[2],
        ]),
      )
      const pixels = Math.hypot(
        (other.uv[0] - corner.uv[0]) * image.width,
        (other.uv[1] - corner.uv[1]) * image.height,
      )
      expect(pixels).toBeCloseTo(length, 8)
    })
  }
}

test('new planes and boxes have exactly one paint pixel per world unit, including odd sizes', () => {
  for (const kind of ['plane', 'box'] as const) {
    const f = setup(kind)
    expect(f.document.settings.texelsPerUnit).toBe(1)
    assertMetric(f.document, f.id)
    expect(readSceneDocument(f.document).status).toBe('valid')
  }
})

test('resizing expands the grid without multiplying paint pixels or retaining retired paint images', () => {
  const f = setup()
  const image = f.document.images[0]!
  const pixels = image.layers[0]!.pixels
  pixels.fill(3)
  const before = structuredClone(f.document)
  const next = setScenePieceCoordinates(f.document, f.id, 'dimensions', [6, 0, 4])
  assertMetric(next, f.id)
  expect(next.images).toHaveLength(1)
  expect(next.materials).toHaveLength(f.document.materials.length)
  expect(next.images[0]!.layers[0]!.pixels.filter((v) => v === 3)).toHaveLength(6)
  expect(next.images[0]!.layers[0]!.pixels.filter((v) => v === 0).length).toBeGreaterThan(0)
  expect(f.document).toEqual(before)
  expect(readSceneDocument(next).status).toBe('valid')
})

test('resizing a piece with a shared high-density texture does not duplicate its image', () => {
  let document = createSceneProject({ kind: 'empty', name: 'Pixels' })
  document = addSceneShape(document, 'box', 'Primeira')
  const firstId = document.nodes.at(-1)!.id
  const painted = ensureScenePaintSurface(document, { nodeId: firstId, density: 8 })
  if (painted.status !== 'ready') throw new Error('Missing painting')
  document = addSceneShape(painted.document, 'box', 'Segunda')
  const secondId = document.nodes.at(-1)!.id
  document = {
    ...document,
    nodes: document.nodes.map((node) =>
      node.id === secondId && node.kind === 'mesh'
        ? { ...node, materialId: painted.target.materialId }
        : node,
    ),
  }
  const resized = setScenePieceCoordinates(document, firstId, 'dimensions', [6, 2, 2])
  expect(resized.images).toHaveLength(document.images.length)
  expect(resized.materials).toHaveLength(document.materials.length)
  expect(shown(resized, firstId).node.materialId).toBe(shown(resized, secondId).node.materialId)
  expect(readSceneDocument(resized).status).toBe('valid')
})

test('moving and turning preserve painting references; a group scale adjusts each descendant once', () => {
  const f = setup('box')
  const move = setScenePieceCoordinates(f.document, f.id, 'position', [4, 0, 1])
  const turn = setScenePieceCoordinates(move, f.id, 'rotation', [0, 45, 0])
  expect(turn.images).toBe(f.document.images)
  expect(turn.geometries).toBe(f.document.geometries)
  const grouped = groupSceneNodes(turn, [f.id])
  const group = grouped.nodes.find((n) => n.kind === 'group')!
  const next = transformSceneNodes(
    grouped,
    [group.id],
    composeTransform({
      kind: 'trs',
      translation: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [2, 3, 2],
    }),
  )
  assertMetric(next, f.id)
  expect(next.geometries[0]!.kind).toBe('box')
})

test('older projects keep their paint density, UV and pixels through resizing and reopening', () => {
  const f = setup('box', true)
  expect(f.document.settings.texelsPerUnit).toBe(4)
  const next = setScenePieceCoordinates(f.document, f.id, 'dimensions', [6, 4, 4])
  expect(next.images).toBe(f.document.images)
  expect(next.geometries).toBe(f.document.geometries)
  expect(readSceneDocument(next).status).toBe('valid')
})

test('a resized duplicate has its own paint and leaves the original unchanged', () => {
  const f = setup('box')
  const duplicated = duplicateSceneNodes(f.document, [f.id])
  const copy = duplicated.nodes.at(-1)!
  const snapshot = structuredClone(duplicated)
  const next = setScenePieceCoordinates(duplicated, copy.id, 'dimensions', [6, 4, 4])
  assertMetric(next, copy.id)
  assertMetric(next, f.id)
  expect(duplicated).toEqual(snapshot)
  expect(shown(next, f.id).mesh).toEqual(shown(duplicated, f.id).mesh)
})

test('a freely rotated UV island remains square in world space after a nonuniform size change', () => {
  const f = setup()
  const rotated = editSceneMesh(f.document, f.id, (mesh) =>
    mapMeshUv(mesh, Object.keys(mesh.faces), (uv) => {
      const angle = Math.PI / 6,
        x = uv[0] - 0.5,
        y = uv[1] - 0.5
      return [
        0.5 + x * Math.cos(angle) - y * Math.sin(angle),
        0.5 + x * Math.sin(angle) + y * Math.cos(angle),
      ]
    }),
  )
  const next = setScenePieceCoordinates(rotated, f.id, 'dimensions', [6, 0, 3])
  assertMetric(next, f.id)
  const corners = Object.values(shown(next, f.id).mesh.faces)[0]!.corners
  expect(Math.abs(corners[1]!.uv[0] - corners[0]!.uv[0])).toBeGreaterThan(0.01)
  expect(Math.abs(corners[1]!.uv[1] - corners[0]!.uv[1])).toBeGreaterThan(0.01)
})

test('rgba cutouts, hidden layers and paint metadata survive resizing without interpolation', () => {
  const f = setup()
  const image = f.document.images[0]!
  const rgba = new Uint8Array(image.width * image.height * 4)
  for (let i = 0; i < rgba.length; i += 4) rgba.set([13, 27, 49, 255], i)
  const source: MoldaSceneDocument = {
    ...f.document,
    images: [
      {
        ...image,
        encoding: 'rgba',
        layers: [
          { ...image.layers[0]!, pixels: rgba },
          {
            id: 'hidden',
            name: 'Guardada',
            visible: false,
            opacity: 0.4,
            pixels: new Uint8Array(rgba.length),
          },
        ],
      },
    ],
  }
  const next = setScenePieceCoordinates(source, f.id, 'dimensions', [6, 0, 4])
  const pixels = next.images[0]!.layers[0]!.pixels
  expect(pixels.filter((_, i) => i % 4 === 3 && pixels[i] === 255)).toHaveLength(6)
  for (let i = 0; i < pixels.length; i += 4)
    if (pixels[i + 3]) expect([...pixels.slice(i, i + 4)]).toEqual([13, 27, 49, 255])
  expect(next.images[0]!.layers[1]!.opacity).toBe(0.4)
  expect(next.images[0]!.layers[1]!.visible).toBe(false)
  assertMetric(next, f.id)
})

test('shared geometry, materials and images are isolated from a locked instance', () => {
  const f = setup('box'),
    original = shown(f.document, f.id).node
  const shared = {
    ...f.document,
    nodes: [...f.document.nodes, { ...original, id: 'instance', locked: true }],
  }
  const snapshot = structuredClone(shared)
  const next = setScenePieceCoordinates(shared, f.id, 'dimensions', [6, 4, 4])
  assertMetric(next, f.id)
  expect(shown(next, 'instance').mesh).toEqual(shown(shared, 'instance').mesh)
  expect(next.images.find((i) => i.id === shared.images[0]!.id)).toEqual(shared.images[0])
  expect(shared).toEqual(snapshot)
  expect(readSceneDocument(next).status).toBe('valid')
})

test('size gestures cancel and undo both UVs and pixels in one history step', () => {
  const f = setup()
  const errors: unknown[] = []
  const editor = createDocumentEditorStore({
    asset: f.document,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
    autosaveMs: 60000,
  })
  const gesture = createSceneTransformGesture(editor, (error) => errors.push(error))
  const delta = composeTransform({
    kind: 'trs',
    translation: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    scale: [2, 1, 2],
  })
  try {
    gesture.begin([f.id])
    gesture.preview(delta)
    gesture.end(false)
    expect(editor.getState().asset).toBe(f.document)
    expect(editor.getState().canUndo).toBe(false)
    gesture.begin([f.id])
    gesture.preview(delta)
    gesture.preview(delta)
    gesture.end(true)
    assertMetric(editor.getState().asset, f.id)
    editor.getState().undo()
    expect(editor.getState().asset.nodes).toEqual(f.document.nodes)
    expect(editor.getState().asset.geometries).toEqual(f.document.geometries)
    expect(editor.getState().asset.images).toEqual(f.document.images)
    expect(editor.getState().canUndo).toBe(false)
    editor.getState().redo()
    assertMetric(editor.getState().asset, f.id)
    expect(errors).toEqual([])
  } finally {
    editor.getState().dispose()
  }
})

test('fractional dimensions keep fractional UV coverage instead of stretching a rounded grid', () => {
  const f = setup('box')
  const unpainted = {
    ...f.document,
    images: [],
    materials: f.document.materials.map(({ colorImageId: _, ...m }) => m),
  }
  const small = setScenePieceCoordinates(unpainted, f.id, 'dimensions', [1.1, 2.3, 3.1])
  const result = ensureScenePaintSurface(small, { nodeId: f.id })
  if (result.status !== 'ready') throw new Error('Missing painting')
  assertMetric(result.document, f.id)
})

test('large authored coordinates with tiny node scales still resize at physical pixel size', () => {
  const f = setup()
  const tiny: MoldaSceneDocument = {
    ...f.document,
    nodes: f.document.nodes.map((node) => {
      const trs = sceneTransformTrs(node.transform)
      return {
        ...node,
        transform: {
          kind: 'trs',
          ...trs,
          scale: [trs.scale[0] * 1e-12, trs.scale[1], trs.scale[2] * 1e-12],
        },
      }
    }),
    geometries: f.document.geometries.map((mesh) => {
      if (mesh.kind !== 'mesh') throw new Error('Missing plane')
      return {
        ...mesh,
        vertices: Object.fromEntries(
          Object.entries(mesh.vertices).map(([id, p]) => [id, [p[0] * 1e12, p[1], p[2] * 1e12]]),
        ),
      }
    }),
  }
  const next = transformSceneNodes(
    tiny,
    [f.id],
    composeTransform({
      kind: 'trs',
      translation: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [2, 1, 2],
    }),
  )
  assertMetric(next, f.id)
  expect(next.images).not.toBe(tiny.images)
})

test('oversized and animated paint reject the whole size change instead of stretching or losing work', () => {
  const f = setup(),
    snapshot = structuredClone(f.document)
  expect(() => setScenePieceCoordinates(f.document, f.id, 'dimensions', [2048, 0, 2048])).toThrow(
    'não cabe',
  )
  const animated: MoldaSceneDocument = {
    ...f.document,
    images: f.document.images.map((image) => ({
      ...image,
      flipbook: {
        frameWidth: image.width,
        frameHeight: image.height,
        frames: [0],
        fps: 4,
        loop: true,
      },
    })),
  }
  expect(() => setScenePieceCoordinates(animated, f.id, 'dimensions', [6, 0, 4])).toThrow('quadros')
  expect(f.document).toEqual(snapshot)
})

test('curved primitives retain their parametric surfaces, including sphere pole seams', () => {
  for (const kind of ['cylinder', 'sphere'] as const) {
    let source = addSceneShape(createSceneProject({ kind: 'empty', name: 'Curvas' }), kind, 'Curva')
    const id = source.nodes[0]!.id
    if (kind === 'sphere') source = setScenePrimitiveDetail(source, id, { around: 8, down: 2 })
    const ready = ensureScenePaintSurface(source, { nodeId: id })
    if (ready.status !== 'ready') throw new Error('Missing paint')
    const next = setScenePieceCoordinates(ready.document, id, 'dimensions', [4, 4, 4])
    expect(next.geometries[0]!.kind).toBe(kind)
    expect(readSceneDocument(next).status).toBe('valid')
    const image = next.images[0]!
    const mesh = shown(next, id).mesh
    for (const face of Object.values(mesh.faces))
      for (const { uv } of face.corners) {
        expect(uv[0]).toBeGreaterThanOrEqual(0)
        expect(uv[1]).toBeGreaterThanOrEqual(0)
        expect(uv[0]).toBeLessThanOrEqual(1)
        expect(uv[1]).toBeLessThanOrEqual(1)
      }
    expect(image.width * image.height).toBeGreaterThanOrEqual(16)
  }
})

test('continuous mesh mirrors keep sharing reflected UVs when the piece is resized', () => {
  const f = setup()
  const mirrored = editSceneMesh(
    f.document,
    f.id,
    (mesh) =>
      mirrorMeshFaces(mesh, Object.keys(mesh.faces), {
        axis: 0,
        center: 3,
        copy: true,
        continuous: true,
      }).mesh,
  )
  const next = transformSceneNodes(
    mirrored,
    [f.id],
    composeTransform({
      kind: 'trs',
      translation: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [2, 1, 2],
    }),
  )
  const mesh = shown(next, f.id).mesh
  for (const [source, reflected] of Object.entries(mesh.symmetry!.faces)) {
    expect(mesh.faces[reflected]!.corners.map((c) => c.uv)).toEqual(
      [...mesh.faces[source]!.corners].reverse().map((c) => c.uv),
    )
  }
  assertMetric(next, f.id)
  expect(readSceneDocument(next).status).toBe('valid')
})

import { expect, test } from 'bun:test'
import { encodeSceneGlb } from '../export/sceneGlb'
import { readGlb } from '../testing/glbRead'
import { expectValidGlb } from '../testing/gltfValidation'
import { sceneBounds } from './bounds'
import { addSceneShape, editSceneMesh, groupSceneNodes, setSceneNodeFlag } from './commands'
import { createSceneProject } from './createProject'
import { indexSceneDocument } from './documentIndex'
import { sceneToJson } from './documentJson'
import { buildSceneGeometry } from './geometry'
import { paintSceneImage } from './imagePaint'
import { extrudeMeshFaces } from './meshExtrude'
import { ensureScenePaintSurface } from './paintSurface'
import { scenePieceCoordinates, setScenePieceCoordinates } from './pieceCoordinates'
import { addScenePrimitiveNear, duplicateSceneNodesNearby } from './placement'
import { readSceneDocument } from './readDocument'
import { list, record } from './validation'

const empty = () => createSceneProject({ kind: 'empty', name: 'Chão' })
const plane = () => addSceneShape(empty(), 'plane', 'Plano')

test('Plano is a horizontal editable quad with upward normals and square UVs', () => {
  const document = plane()
  const geometry = document.geometries[0]!
  expect(geometry.kind).toBe('mesh')
  if (geometry.kind !== 'mesh') throw new Error('Expected editable mesh')
  expect(Object.keys(geometry.vertices)).toHaveLength(4)
  expect(Object.keys(geometry.faces)).toHaveLength(1)
  const built = buildSceneGeometry(geometry)
  expect(built.positions).toHaveLength(18)
  expect(built.issues).toEqual([])
  for (let i = 0; i < built.normals.length; i += 3)
    expect(Array.from(built.normals.slice(i, i + 3))).toEqual([0, 1, 0])
  expect(sceneBounds(indexSceneDocument(document))).toEqual({ min: [-1, 0, -1], max: [1, 0, 1] })
  expect(document.materials[0]!.doubleSided).toBe(true)
})

test('a plane resizes on its nonzero axes without flattening its transform or moving its pivot', () => {
  const source = plane(),
    id = source.nodes[0]!.id
  const next = setScenePieceCoordinates(source, id, 'dimensions', [6, 0, 4])
  const result = scenePieceCoordinates(next, id)
  expect(result.dimensions).toEqual([6, 0, 4])
  expect(result.trs.scale).toEqual([3, 1, 2])
  expect(result.position).toEqual([0, 0, 0])
  expect(source.nodes[0]!.transform).not.toEqual(next.nodes[0]!.transform)
  expect(() => setScenePieceCoordinates(next, id, 'dimensions', [6, 1, 4])).toThrow('Puxar')
  expect(() => setScenePieceCoordinates(next, id, 'dimensions', [0, 0, 4])).toThrow()
})

test('plane movement and rotation keep a valid editable surface', () => {
  const source = plane(),
    id = source.nodes[0]!.id
  const moved = setScenePieceCoordinates(source, id, 'position', [3, 2, 4])
  expect(scenePieceCoordinates(moved, id).position).toEqual([3, 2, 4])
  const rotated = setScenePieceCoordinates(moved, id, 'rotation', [90, 0, 0])
  expect(scenePieceCoordinates(rotated, id).rotation[0]).toBeCloseTo(90)
  expect(readSceneDocument(rotated).status).toBe('valid')
})

test('planes are placed separately, including multiple flat obstacles, and inherit the chosen group', () => {
  let source = plane()
  const first = source.nodes[0]!.id
  source = addScenePrimitiveNear(source, 'plane', 'Segundo', [first])
  source = addScenePrimitiveNear(source, 'plane', 'Terceiro', [first])
  const centers = source.nodes.map(
    (node) => scenePieceCoordinates(source, node.id).trs.translation[0],
  )
  expect(new Set(centers).size).toBe(3)
  const grouped = groupSceneNodes(source, [first], { name: 'Chão' })
  const group = grouped.nodes.find((node) => node.kind === 'group')!
  const next = addScenePrimitiveNear(grouped, 'plane', 'No grupo', [group.id])
  expect(next.nodes.at(-1)!.parentId).toBe(group.id)
  const locked = setSceneNodeFlag(grouped, [group.id], 'locked', true)
  expect(() => addScenePrimitiveNear(locked, 'plane', 'Não criar', [group.id])).toThrow()
})

test('the duplicate owns an independent mesh and keeps the zero-thickness surface', () => {
  const source = plane()
  const next = duplicateSceneNodesNearby(source, [source.nodes[0]!.id])
  expect(next.nodes).toHaveLength(2)
  expect(next.geometries[1]).not.toBe(next.geometries[0])
  expect(scenePieceCoordinates(next, next.nodes[1]!.id).dimensions).toEqual([2, 0, 2])
})

test('plane paint preparation preserves the quad and permits extrusion upward', () => {
  const source = plane(),
    id = source.nodes[0]!.id
  const prepared = ensureScenePaintSurface(source, { nodeId: id, faceId: 'plane' })
  expect(prepared.status).toBe('ready')
  if (prepared.status !== 'ready') throw new Error('Plane should be paintable')
  expect(prepared.document.images).toHaveLength(1)
  expect(prepared.document.materials[0]!.doubleSided).toBe(true)
  const painted = paintSceneImage(prepared.document, prepared.target, {
    from: [0, 0],
    to: [0, 0],
    color: 3,
    brush: 1,
  })
  expect(painted.images[0]!.layers[0]!.pixels[0]).toBe(3)
  expect(prepared.document.images[0]!.layers[0]!.pixels[0]).toBe(0)
  expect(painted.geometries).toBe(prepared.document.geometries)
  const extruded = editSceneMesh(source, id, (mesh) => extrudeMeshFaces(mesh, ['plane'], 2))
  expect(sceneBounds(indexSceneDocument(extruded))).toEqual({ min: [-1, 0, -1], max: [1, 2, 1] })
  expect(source.geometries[0]).not.toBe(extruded.geometries[0])
})

test('native project and GLB preserve the plane and its double-sided material', async () => {
  const document = plane()
  expect(readSceneDocument(sceneToJson(document)).status).toBe('valid')
  const exported = encodeSceneGlb(document)
  await expectValidGlb(exported.bytes)
  const glb = readGlb(exported.bytes)
  expect(record(list(glb.json.materials, 'materials', 10)[0], 'material').doubleSided).toBe(true)
})

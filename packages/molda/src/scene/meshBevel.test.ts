import { expect, test } from 'bun:test'
import { bevelMeshEdge } from './meshBevel'
import { meshFaceFrame, requireMatchingFaceUv } from './meshFaceFrame'
import { cutMeshByPlane } from './meshPlaneCut'
import { indexMeshEdges, meshEdgeKey } from './meshTopology'
import { primitiveMesh } from './primitiveMesh'
import { readSceneGeometry } from './readGeometry'

function cube(scale = 1) {
  return primitiveMesh({
    id: 'g',
    kind: 'box',
    from: [-scale, -scale, -scale],
    to: [scale, scale, scale],
    surfaces: {
      px: { materialId: 'paint', uv: { origin: [0.1, 0.2], u: [0.3, 0.1], v: [-0.1, 0.4] } },
    },
  }).mesh
}

test('each cube edge can be chamfered without opening the solid or moving paint at different scales', () => {
  for (const scale of [1e-12, 1, 1e12]) {
    const mesh = cube(scale)
    const before = structuredClone(mesh)
    for (const edge of indexMeshEdges(mesh).edges.keys()) {
      const { mesh: result, edgeIds } = bevelMeshEdge(mesh, [edge], scale / 10)
      expect(Object.keys(result.vertices)).toHaveLength(10)
      expect(Object.keys(result.faces)).toHaveLength(7)
      expect(edgeIds).toHaveLength(4)
      for (const incident of indexMeshEdges(result).edges.values()) {
        expect(incident).toHaveLength(2)
        expect([incident[0]!.a, incident[0]!.b]).toEqual([incident[1]!.b, incident[1]!.a])
      }
      for (const [id, face] of Object.entries(mesh.faces)) {
        expect(result.faces[id]).toBeDefined()
        expect(result.faces[id]!.materialId).toBe(face.materialId)
        const samples = result.faces[id]!.corners.map((c) => ({
          point: result.vertices[c.vertexId]!,
          uv: c.uv,
        }))
        expect(() =>
          requireMatchingFaceUv(meshFaceFrame(mesh, id), samples, 'paint moved'),
        ).not.toThrow()
      }
      const capId = Object.keys(result.faces).find((id) => !Object.hasOwn(mesh.faces, id))!
      const frame = meshFaceFrame(result, capId)
      for (const point of frame.points)
        expect(Math.max(...point.map((p) => Math.abs(p / scale)))).toBeCloseTo(1, 12)
      expect(readSceneGeometry(result)).toEqual(result)
      expect(mesh).toEqual(before)
    }
  }
})

test('chamfer stays local, preserves other solids, unused points and construction lines, and supports another edge', () => {
  const mesh = cube()
  const extra = primitiveMesh({
    id: 'other',
    kind: 'box',
    from: [10, 10, 10],
    to: [12, 12, 12],
    surfaces: {},
  }).mesh
  mesh.vertices = {
    ...mesh.vertices,
    ...Object.fromEntries(Object.entries(extra.vertices).map(([id, p]) => [`other:${id}`, p])),
    unused: [100, 100, 100],
  }
  mesh.faces = {
    ...mesh.faces,
    ...Object.fromEntries(
      Object.entries(extra.faces).map(([id, f]) => [
        `other:${id}`,
        { ...f, corners: f.corners.map((c) => ({ ...c, vertexId: `other:${c.vertexId}` })) },
      ]),
    ),
  }
  const edge = meshEdgeKey('v_111', 'v_101')
  mesh.looseEdges = [['v_111', 'v_101']]
  const result = bevelMeshEdge(mesh, [edge], 0.1)
  const fresh = Object.entries(result.mesh.vertices)
    .filter(([id]) => !Object.hasOwn(mesh.vertices, id))
    .map(([, p]) => p)
  expect(fresh).toHaveLength(4)
  for (const p of fresh) {
    expect(Math.abs(p[1])).toBe(1)
    expect(p[0] === 1 || p[2] === 1).toBe(true)
    expect(p[0] + p[2]).toBeCloseTo(2 - 0.1 * Math.SQRT2, 14)
  }
  expect(result.mesh.faces['other:px']).toBe(mesh.faces['other:px'])
  expect(result.mesh.vertices['other:v_111']).toBe(mesh.vertices['other:v_111'])
  expect(result.mesh.vertices.unused).toBe(mesh.vertices.unused)
  expect(result.mesh.looseEdges).toBe(mesh.looseEdges)
  expect(result.mesh.vertices.v_111).toBe(mesh.vertices.v_111)
  expect(result.mesh.vertices.v_101).toBe(mesh.vertices.v_101)
  const opposite = meshEdgeKey('v_000', 'v_010')
  const second = bevelMeshEdge(result.mesh, [opposite], 0.1)
  expect(Object.keys(second.mesh.faces)).toHaveLength(14)
  for (const incident of indexMeshEdges(second.mesh).edges.values())
    expect(incident).toHaveLength(2)
})

test('oversized, inward, flat, open, missing and invalid chamfers never publish partial geometry', () => {
  const mesh = cube()
  const edge = [...indexMeshEdges(mesh).edges.keys()][0]!
  const before = structuredClone(mesh)
  let id = 0
  const nextId = () => `allocated:${id++}`
  expect(bevelMeshEdge(mesh, [edge], 0).mesh).toBe(mesh)
  for (const depth of [-1, NaN, Infinity, 10, Number.MIN_VALUE])
    expect(() => bevelMeshEdge(mesh, [edge], depth, nextId)).toThrow()
  expect(() => bevelMeshEdge(mesh, [], 0.1, nextId)).toThrow()
  expect(() => bevelMeshEdge(mesh, ['missing'], 0.1, nextId)).toThrow()
  const divided = cutMeshByPlane(mesh, { origin: [0, 0, 0], normal: [1, 0, 0] })
  expect(() => bevelMeshEdge(divided.mesh, [divided.edgeIds[0]!], 0.1, nextId)).toThrow('não forma')
  const painted = structuredClone(mesh)
  const incident = indexMeshEdges(painted).edges.get(edge)!
  painted.faces[incident[0]!.faceId]!.corners[2]!.uv = [0.2, 0.3]
  expect(() => bevelMeshEdge(painted, [edge], 0.1, nextId)).toThrow('pintura')
  const open = structuredClone(mesh)
  delete open.faces.nx
  expect(() => bevelMeshEdge(open, [edge], 0.1, nextId)).toThrow()
  const inverted = {
    ...mesh,
    faces: Object.fromEntries(
      Object.entries(mesh.faces).map(([id, f]) => [
        id,
        { ...f, corners: [...f.corners].reverse() },
      ]),
    ),
  }
  expect(() => bevelMeshEdge(inverted, [edge], 0.1, nextId)).toThrow('fora')
  expect(id).toBe(0)
  expect(mesh).toEqual(before)
})

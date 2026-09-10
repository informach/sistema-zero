import { expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { buildSceneGeometry } from './geometry'
import { cutMeshByPlane } from './meshPlaneCut'
import { indexMeshEdges } from './meshTopology'
import { primitiveMesh } from './primitiveMesh'
import { readSceneGeometry } from './readGeometry'
import { triangulateFace } from './triangulate'

function cube(scale = 1) {
  return primitiveMesh({
    id: 'g',
    kind: 'box',
    from: [-scale, -scale, -scale],
    to: [scale, scale, scale],
    surfaces: {},
  }).mesh
}
function volume(mesh: ReturnType<typeof cube>) {
  let total = 0
  for (const face of Object.values(mesh.faces)) {
    const points = face.corners.map((c) => mesh.vertices[c.vertexId]!)
    const triangles = triangulateFace(points)
    if (triangles.status !== 'ok') throw new Error('Invalid face')
    for (const [a, b, c] of triangles.triangles) {
      const p = points[a]!,
        q = points[b]!,
        r = points[c]!
      total +=
        (p[0] * (q[1] * r[2] - q[2] * r[1]) +
          p[1] * (q[2] * r[0] - q[0] * r[2]) +
          p[2] * (q[0] * r[1] - q[1] * r[0])) /
        6
    }
  }
  return total
}

test('plane cuts share points across a closed solid, preserve volume and orientation at different scales', () => {
  for (const scale of [1e-12, 1, 1e12]) {
    for (const normal of [
      [1, 0, 0],
      [1, 1, 1],
      [1, 1, 0],
    ] as Vec3[]) {
      const mesh = cube(scale)
      const before = structuredClone(mesh)
      let id = 0
      const result = cutMeshByPlane(mesh, { origin: [0, 0, 0], normal }, () => `new-${id++}`)
      expect(volume(result.mesh) / scale ** 3).toBeCloseTo(8, 10)
      for (const edges of indexMeshEdges(result.mesh).edges.values()) {
        expect(edges).toHaveLength(2)
        expect([edges[0]!.a, edges[0]!.b]).toEqual([edges[1]!.b, edges[1]!.a])
      }
      const onPlane = (vertexId: string) =>
        Math.abs(
          result.mesh.vertices[vertexId]!.reduce((sum, v, axis) => sum + v * normal[axis]!, 0) /
            scale,
        ) < 1e-12
      for (const key of result.edgeIds) {
        const edge = indexMeshEdges(result.mesh).edges.get(key)![0]!
        expect(onPlane(edge.a) && onPlane(edge.b)).toBe(true)
      }
      expect(result.edgeIds.length).toBeGreaterThan(0)
      expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
      expect(buildSceneGeometry(result.mesh).issues).toEqual([])
      expect(mesh).toEqual(before)
      for (const [id, point] of Object.entries(mesh.vertices))
        expect(result.mesh.vertices[id]).toBe(point)
    }
  }
})

test('exact axis position, original UV seams and construction lines survive a cut', () => {
  const mesh = makeSceneGridGeometry(2)
  mesh.looseEdges = [
    ['v_0_1', 'v_1_1'],
    ['v_1_1', 'v_2_1'],
  ]
  mesh.faces.f_0_0!.materialId = 'bottom'
  mesh.faces.f_0_1!.materialId = 'top'
  const result = cutMeshByPlane(mesh, { origin: [0.1, 0, 0], normal: [2, 0, 0] })
  expect(result.vertexIds).toHaveLength(3)
  expect(result.edgeIds).toHaveLength(2)
  expect(result.mesh.faces.f_1_1).toBe(mesh.faces.f_1_1)
  expect(result.mesh.looseEdges).toHaveLength(3)
  expect(result.mesh.looseEdges[2]).toBe(mesh.looseEdges[1])
  for (const id of result.vertexIds) expect(result.mesh.vertices[id]![0]).toBe(0.1)
  const shared = result.vertexIds.find((id) => result.mesh.vertices[id]![1] === 0.25)!
  const corners = Object.values(result.mesh.faces).flatMap((face) =>
    face.corners
      .filter((c) => c.vertexId === shared)
      .map((c) => ({ uv: c.uv, material: face.materialId })),
  )
  expect(corners).toHaveLength(4)
  for (const corner of corners) {
    expect(corner.uv[0]).toBeCloseTo(0.4, 14)
    expect(corner.uv[1]).toBe(corner.material === 'bottom' ? 1 : 0)
  }
  expect(result.mesh.looseEdges[0]![1]).toBe(shared)
  expect(result.mesh.looseEdges[1]![0]).toBe(shared)
  expect(cutMeshByPlane(result.mesh, { origin: [0.1, 0, 0], normal: [1, 0, 0] }).mesh).toBe(
    result.mesh,
  )
})

test('planes through existing vertices cut without adding duplicate points; tangent/missing planes are no-ops', () => {
  const mesh = makeSceneGridGeometry(1)
  const cut = cutMeshByPlane(mesh, { origin: [0, 0, 0], normal: [1, -1, 0] })
  expect(cut.vertexIds).toHaveLength(0)
  expect(cut.edgeIds).toHaveLength(1)
  expect(Object.keys(cut.mesh.faces)).toHaveLength(2)
  expect(Object.keys(cut.mesh.vertices)).toHaveLength(4)
  for (const origin of [
    [0, 0, 0],
    [1, 0, 0],
  ] as Vec3[])
    expect(cutMeshByPlane(mesh, { origin, normal: [1, 0, 0] }).mesh).toBe(mesh)
})

test('invalid planes, non-affine UVs, concavity and budgets fail before allocating authorial IDs', () => {
  const mesh = makeSceneGridGeometry(1)
  let ids = 0
  const allocate = () => `new-${++ids}`
  for (const normal of [
    [0, 0, 0],
    [Infinity, 0, 0],
    [NaN, 1, 0],
  ] as Vec3[])
    expect(() => cutMeshByPlane(mesh, { origin: [0.1, 0, 0], normal }, allocate)).toThrow()
  const painted = structuredClone(mesh)
  painted.faces.f_0_0!.corners[2]!.uv = [0.6, 0.8]
  expect(() =>
    cutMeshByPlane(painted, { origin: [0.1, 0, 0], normal: [1, 0, 0] }, allocate),
  ).toThrow('pintura')
  const concave = structuredClone(mesh)
  concave.vertices.v_1_1 = [0.05, 0.05, 0]
  expect(() =>
    cutMeshByPlane(concave, { origin: [0.1, 0, 0], normal: [1, 0, 0] }, allocate),
  ).toThrow('reentrâncias')
  const full = makeSceneGridGeometry(100)
  expect(() => cutMeshByPlane(full, { origin: [0.1, 0, 0], normal: [1, 0, 0] }, allocate)).toThrow(
    'orçamento',
  )
  expect(ids).toBe(0)
})

test('preexisting special IDs and disconnected construction lines are never aliased by temporary identities', () => {
  const mesh = makeSceneGridGeometry(1)
  mesh.vertices = { ...mesh.vertices, ['__proto__']: [-1, 0, 0], 'plane:0': [1, 0, 0] }
  mesh.looseEdges = [['__proto__', 'plane:0']]
  const result = cutMeshByPlane(mesh, { origin: [0.1, 0, 0], normal: [1, 0, 0] })
  expect(result.vertexIds).toHaveLength(3)
  expect(Object.hasOwn(result.mesh.vertices, '__proto__')).toBe(true)
  expect(result.mesh.vertices.__proto__).toBe(mesh.vertices.__proto__)
  expect(result.mesh.vertices['plane:0']).toBe(mesh.vertices['plane:0'])
  expect(result.mesh.looseEdges).toHaveLength(2)
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
})

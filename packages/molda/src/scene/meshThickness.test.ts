import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import type { SceneMeshGeometry } from './document'
import { prepareMeshThickness, thickenMeshFaces } from './meshThickness'
import { indexMeshEdges } from './meshTopology'
import { readSceneGeometry } from './readGeometry'
import { triangulateFace } from './triangulate'

function volume(mesh: SceneMeshGeometry) {
  let sum = 0
  for (const face of Object.values(mesh.faces)) {
    const points = face.corners.map((corner) => mesh.vertices[corner.vertexId]!)
    const triangulated = triangulateFace(points)
    if (triangulated.status !== 'ok') throw new Error('Invalid surface')
    for (const [a, b, c] of triangulated.triangles) {
      const [ax, ay, az] = points[a]!
      const [bx, by, bz] = points[b]!
      const [cx, cy, cz] = points[c]!
      sum += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6
    }
  }
  return sum
}

test('thickness closes a planar sheet with outward winding, exact top/bottom paint and original material links', () => {
  const mesh = makeSceneGridGeometry(2)
  mesh.faces.f_0_0!.materialId = 'paint'
  const before = structuredClone(mesh)
  let id = 0
  const result = thickenMeshFaces(mesh, Object.keys(mesh.faces), 0.125, () => `new_${++id}`)
  expect(Object.keys(result.vertices)).toHaveLength(18)
  expect(Object.keys(result.faces)).toHaveLength(16)
  expect(volume(result)).toBeCloseTo(0.25 * 0.125, 12)
  for (const edges of indexMeshEdges(result).edges.values()) {
    expect(edges).toHaveLength(2)
    expect(edges[0]!.a).toBe(edges[1]!.b)
  }
  for (const [key, face] of Object.entries(mesh.faces)) {
    const cap = result.faces[key]!
    expect(cap.materialId).toBe(face.materialId)
    cap.corners.forEach((corner, i) => {
      expect(corner.uv).toBe(face.corners[i]!.uv)
    })
    const bottom = Object.entries(result.faces).find(
      ([id, value]) =>
        !Object.hasOwn(mesh.faces, id) && value.corners.every((c) => face.corners.includes(c)),
    )![1]
    expect(bottom.materialId).toBe(face.materialId)
  }
  for (const [id, point] of Object.entries(mesh.vertices)) expect(result.vertices[id]).toBe(point)
  expect(result.looseEdges).toBe(mesh.looseEdges)
  expect(readSceneGeometry(result)).toEqual(result)
  expect(mesh).toEqual(before)
})

test('holes remain empty, surrounded by inner walls instead of being filled by a new bottom face', () => {
  const mesh = makeSceneGridGeometry(3)
  delete mesh.faces.f_1_1
  let id = 0
  const result = thickenMeshFaces(mesh, Object.keys(mesh.faces), 0.2, () => `new_${++id}`)
  expect(Object.keys(result.faces)).toHaveLength(32)
  expect(volume(result)).toBeCloseTo((0.75 ** 2 - 0.25 ** 2) * 0.2, 12)
  for (const edges of indexMeshEdges(result).edges.values()) {
    expect(edges).toHaveLength(2)
    expect(edges[0]!.a).toBe(edges[1]!.b)
  }
  expect(readSceneGeometry(result)).toEqual(result)
})

test('prepared thickness is absolute, reuses stable IDs, restores zero and releases bounded derived caches', () => {
  const mesh = makeSceneGridGeometry(2)
  const plan = prepareMeshThickness(mesh, Object.keys(mesh.faces))
  const apply = (amount: number) => {
    let id = 0
    return plan.apply(amount, () => `new_${++id}`)
  }
  expect(apply(0)).toBe(mesh)
  expect(plan.retainedBytes).toBe(0)
  const first = apply(0.123456789123)
  expect(plan.retainedBytes).toBeGreaterThan(0)
  const second = apply(0.2)
  expect(Object.keys(second.vertices)).toEqual(Object.keys(first.vertices))
  expect(Object.keys(second.faces)).toEqual(Object.keys(first.faces))
  expect(Math.max(...Object.values(second.vertices).map((p) => p[2]))).toBe(0.2)
  expect(apply(0)).toBe(mesh)
  plan.dispose()
  plan.dispose()
  expect(plan.retainedBytes).toBe(0)
  expect(() => apply(0.3)).toThrow('já terminou')
})

test('thickness refuses partial sheets, non-affine paint, invalid distances and budgets before allocating geometry IDs', () => {
  const mesh = makeSceneGridGeometry(2)
  let allocations = 0
  const nextId = () => `new_${++allocations}`
  expect(() => thickenMeshFaces(mesh, ['f_0_0'], 0.2, nextId)).toThrow('superfície solta inteira')
  for (const value of [-1, NaN, Infinity])
    expect(() => thickenMeshFaces(mesh, Object.keys(mesh.faces), value, nextId)).toThrow()
  mesh.faces.f_1_1!.corners[2]!.uv = [0.4, 0.7]
  expect(() => thickenMeshFaces(mesh, Object.keys(mesh.faces), 0.2, nextId)).toThrow('pintura')
  const full = makeSceneGridGeometry(100)
  expect(() => thickenMeshFaces(full, Object.keys(full.faces), 0.2, nextId)).toThrow('orçamento')
  expect(allocations).toBe(0)
})

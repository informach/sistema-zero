import { expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import type { SceneMeshGeometry } from './document'
import { requireClosedSceneMesh, sceneMeshVolume } from './meshSolid'
import { requireNonIntersectingSceneSolid } from './meshSolidIntersections'
import { primitiveMesh } from './primitiveMesh'
import { splitSceneSolid } from './solidCut'

function cube(prefix: string, center: Vec3, size = 1, inward = false): SceneMeshGeometry {
  const mesh = primitiveMesh({
    id: prefix,
    kind: 'box',
    from: [-size, -size, -size],
    to: [size, size, size],
    surfaces: {},
  }).mesh
  return {
    ...mesh,
    vertices: Object.fromEntries(
      Object.entries(mesh.vertices).map(([id, point]) => [
        prefix + id,
        point.map((n, axis) => n + center[axis]!) as Vec3,
      ]),
    ),
    faces: Object.fromEntries(
      Object.entries(mesh.faces).map(([id, face]) => [
        prefix + id,
        {
          ...face,
          corners: (inward ? [...face.corners].reverse() : face.corners).map((corner) => ({
            ...corner,
            vertexId: prefix + corner.vertexId,
          })),
        },
      ]),
    ),
  }
}
function merge(a: SceneMeshGeometry, b: SceneMeshGeometry): SceneMeshGeometry {
  return { ...a, vertices: { ...a.vertices, ...b.vertices }, faces: { ...a.faces, ...b.faces } }
}

test('closed incidence alone does not permit crossed, coplanar-overlapping or disconnected touching shells', () => {
  for (const offset of [
    [0.7, 0.3, 0.4],
    [1, 0, 0],
    [2, 0, 0],
    [2, 2, 2],
  ] as Vec3[]) {
    const mesh = merge(cube('a', [0, 0, 0]), cube('b', offset))
    requireClosedSceneMesh(mesh)
    expect(() => requireNonIntersectingSceneSolid(mesh)).toThrow('faces')
    expect(() => splitSceneSolid(mesh, { origin: [0, 0, 0], normal: [0, 1, 0] }, 'cap')).toThrow(
      'faces',
    )
  }
})

test('hollow and disconnected solids produce closed caps with holes, conserving exterior UVs and volume', () => {
  for (const mesh of [
    merge(cube('outer', [0, 0, 0], 2), cube('inner', [0, 0, 0], 1, true)),
    merge(cube('a', [-3, 0, 0]), cube('b', [3, 0, 0])),
  ]) {
    const before = structuredClone(mesh),
      volume = sceneMeshVolume(mesh)
    const halves = splitSceneSolid(mesh, { origin: [0, 0, 0], normal: [0, 1, 0] }, 'cap')
    for (const half of halves) {
      requireClosedSceneMesh(half)
      requireNonIntersectingSceneSolid(half)
      expect(sceneMeshVolume(half)).toBeCloseTo(volume / 2, 10)
      for (const face of Object.values(half.faces)) {
        if (face.materialId === 'cap') continue
        for (const corner of face.corners) {
          const original = Object.values(mesh.faces)
            .flatMap((entry) => entry.corners)
            .find(
              (entry) =>
                entry.vertexId === corner.vertexId &&
                entry.uv[0] === corner.uv[0] &&
                entry.uv[1] === corner.uv[1],
            )
          if (mesh.vertices[corner.vertexId]) expect(original).toBeDefined()
        }
      }
    }
    expect(mesh).toEqual(before)
  }
})

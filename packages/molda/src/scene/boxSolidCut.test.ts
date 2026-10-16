import { expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import { splitSceneBox } from './boxSolidCut'
import type { ScenePrimitiveGeometry } from './document'
import { sceneMeshVolume } from './meshSolid'
import { primitiveMesh } from './primitiveMesh'

test('axis cuts preserve native dimensions, UV functions, material seams and local coordinates', () => {
  const box: ScenePrimitiveGeometry & { kind: 'box' } = {
    id: 'box',
    kind: 'box',
    from: [-3, -1, -4],
    to: [3, 1, 4],
    surfaces: Object.fromEntries(
      ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map((face) => [
        face,
        {
          materialId: face,
          uv: { origin: [0.13, 0.29], u: [0.47, 0.31], v: [-0.27, 0.18] },
        },
      ]),
    ),
  }
  const original = primitiveMesh(box).mesh
  for (const axis of [0, 1, 2] as const)
    for (const sign of [-1, 1]) {
      const normal: Vec3 = [0, 0, 0]
      normal[axis] = sign
      const halves = splitSceneBox(box, { origin: [0, 0, 0], normal }, 'cap')!
      const meshes = halves.map((half) => primitiveMesh(half).mesh)
      expect(meshes.reduce((sum, mesh) => sum + sceneMeshVolume(mesh), 0)).toBeCloseTo(96, 10)
      for (const half of halves) {
        expect(half.kind).toBe('box')
        const mesh = primitiveMesh(half).mesh
        for (const [id, face] of Object.entries(mesh.faces)) {
          if (face.materialId === 'cap') continue
          expect(face.materialId).toBe(id)
          const old = original.faces[id]!
          // Every retained endpoint has exactly its old UV; new midpoints interpolate both UV axes.
          for (const corner of face.corners) {
            const point = mesh.vertices[corner.vertexId]!
            const matches = old.corners.filter((entry) => {
              const candidate = original.vertices[entry.vertexId]!
              return candidate.every((n, i) => i === axis || n === point[i])
            })
            if (point[axis] !== 0) {
              const match = matches.find(
                (entry) => original.vertices[entry.vertexId]![axis] === point[axis],
              )!
              for (const i of [0, 1] as const) expect(corner.uv[i]).toBeCloseTo(match.uv[i], 12)
            } else {
              expect(matches.length).toBe(2)
              for (const i of [0, 1] as const)
                expect(corner.uv[i]).toBeCloseTo((matches[0]!.uv[i] + matches[1]!.uv[i]) / 2, 12)
            }
          }
        }
      }
      if (axis === 2)
        for (const half of halves)
          expect(half.to.map((n, i) => n - half.from[i]!)).toEqual([6, 2, 4])
    }
  expect(splitSceneBox(box, { origin: [0, 0, 0], normal: [1, 1, 0] }, 'cap')).toBeNull()
})

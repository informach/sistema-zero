import { expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import { indexMeshEdges } from './meshTopology'
import { primitiveMesh } from './primitiveMesh'
import { sceneCutPoint, sceneSolidCutPlane } from './solidCutPoints'

test('two points share a face, the third can tilt the plane, and later points must stay coplanar at any scale', () => {
  for (const scale of [1e-10, 1, 1e10]) {
    const mesh = primitiveMesh({
      id: 'mesh',
      kind: 'box',
      from: [-scale, -scale, -scale],
      to: [scale, scale, scale],
      surfaces: {},
    }).mesh
    const topology = indexMeshEdges(mesh)
    const midpoint = (expected: Vec3) => {
      for (const edgeId of topology.edges.keys()) {
        const point = { edgeId, t: 0.5 },
          location = sceneCutPoint(mesh, point, topology)
        if (location.every((value, axis) => Math.abs(value / scale - expected[axis]!) < 1e-12))
          return point
      }
      throw new Error('Missing edge')
    }
    const a = midpoint([-1, 1, 0]),
      b = midpoint([1, 1, 0]),
      c = midpoint([-1, 0, 1]),
      d = midpoint([1, 0, 1])
    const straight = sceneSolidCutPlane(mesh, [a, b], topology)
    expect(Math.abs(straight.normal[2])).toBeCloseTo(1, 12)
    const tilted = sceneSolidCutPlane(mesh, [a, b, c, d], topology)
    expect(Math.abs(tilted.normal[1])).toBeCloseTo(Math.SQRT1_2, 12)
    expect(() => sceneSolidCutPlane(mesh, [a, b, c, midpoint([0, -1, 1])], topology)).toThrow(
      'plano',
    )
    expect(() => sceneSolidCutPlane(mesh, [a, midpoint([1, -1, 0])], topology)).toThrow(
      'mesma face',
    )
    expect(() => sceneSolidCutPlane(mesh, [a, a], topology)).toThrow('diferentes')
    expect(() => sceneSolidCutPlane(mesh, [{ ...a, t: 0 }, a, { ...a, t: 1 }], topology)).toThrow(
      'terceiro',
    )
    expect(() => sceneCutPoint(mesh, { ...a, t: Infinity }, topology)).toThrow()
  }
})

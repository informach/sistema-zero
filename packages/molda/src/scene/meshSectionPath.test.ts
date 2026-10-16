import { expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import { meshPlaneSection } from './meshPlaneSection'
import { meshSectionPath } from './meshSectionPath'
import { primitiveMesh } from './primitiveMesh'

test('a cut path crosses consecutive surface faces, not the box interior, at tiny and large scales', () => {
  for (const scale of [1e-10, 1, 1e10]) {
    const mesh = primitiveMesh({
      id: 'box',
      kind: 'box',
      from: [-3 * scale, -scale, -4 * scale],
      to: [3 * scale, scale, 4 * scale],
      surfaces: {},
    }).mesh
    const section = meshPlaneSection(mesh, { origin: [0, 0, 0], normal: [0, 0, 1] })
    const points: Vec3[] = [
      [-3 * scale, scale, 0],
      [3 * scale, scale, 0],
      [3 * scale, -scale, 0],
    ]
    const path = meshSectionPath(section, points)
    expect(path[0]![0]).toEqual(points[0]!)
    expect(path.at(-1)![1]).toEqual(points.at(-1)!)
    const length = path.reduce((sum, [a, b]) => sum + Math.hypot(...a.map((n, i) => n - b[i]!)), 0)
    expect(length / scale).toBeCloseTo(8, 8)
    for (const [a, b] of path)
      expect((a[1] === scale && b[1] === scale) || (a[0] === 3 * scale && b[0] === 3 * scale)).toBe(
        true,
      )
    const around = meshSectionPath(section, [
      [0, scale, 0],
      [0, -scale, 0],
    ])
    expect(
      around.reduce((sum, [a, b]) => sum + Math.hypot(...a.map((n, i) => n - b[i]!)), 0) / scale,
    ).toBeCloseTo(8, 8)
  }
})

test('disconnected cross sections never gain an invented bridge', () => {
  expect(
    meshSectionPath(
      [
        [
          [0, 0, 0],
          [1, 0, 0],
        ],
        [
          [2, 0, 0],
          [3, 0, 0],
        ],
      ],
      [
        [0, 0, 0],
        [3, 0, 0],
      ],
    ),
  ).toEqual([])
})

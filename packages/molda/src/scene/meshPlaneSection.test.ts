import { expect, test } from 'bun:test'
import { meshPlaneSection } from './meshPlaneSection'
import { primitiveMesh } from './primitiveMesh'

test('cut preview follows the surface at all scales, without connecting points through the solid', () => {
  for (const scale of [1e-10, 1, 1e10]) {
    const mesh = primitiveMesh({
      id: 'box',
      kind: 'box',
      from: [-3 * scale, -scale, -4 * scale],
      to: [3 * scale, scale, 4 * scale],
      surfaces: {},
    }).mesh
    const segments = meshPlaneSection(mesh, { origin: [0, 0, 0], normal: [0, 0, 1] })
    expect(segments.length).toBeGreaterThanOrEqual(4)
    for (const [a, b] of segments) {
      expect(a[2]).toBe(0)
      expect(b[2]).toBe(0)
      expect(
        (Math.abs(a[0]) === 3 * scale && a[0] === b[0]) ||
          (Math.abs(a[1]) === scale && a[1] === b[1]),
      ).toBe(true)
    }
    const length = segments.reduce(
      (sum, [a, b]) => sum + Math.hypot(...a.map((n, i) => n - b[i]!)),
      0,
    )
    expect(length / scale).toBeCloseTo(16, 10)
  }
})

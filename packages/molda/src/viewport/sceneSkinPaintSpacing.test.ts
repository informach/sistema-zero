import { expect, test } from 'bun:test'
import { OrthographicCamera, PerspectiveCamera } from 'three'
import { sceneSkinPaintSpacing } from './sceneSkinPaintSpacing'

test('projected brush spacing follows orthographic zoom and perspective depth in CSS pixels', () => {
  const rect = { width: 400, height: 400 }
  const ortho = new OrthographicCamera(-2, 2, 2, -2, 0.1, 100)
  ortho.position.z = 10
  expect(sceneSkinPaintSpacing(ortho, [0, 0, 0], 0.2, rect)).toBeCloseTo(5, 12)
  ortho.zoom = 2
  ortho.updateProjectionMatrix()
  expect(sceneSkinPaintSpacing(ortho, [0, 0, 0], 0.2, rect)).toBeCloseTo(10, 12)
  const perspective = new PerspectiveCamera(90, 1, 0.1, 100)
  perspective.position.z = 10
  expect(sceneSkinPaintSpacing(perspective, [0, 0, 0], 1, rect)).toBeCloseTo(5, 12)
  expect(sceneSkinPaintSpacing(perspective, [0, 0, -10], 1, rect)).toBeCloseTo(2.5, 12)
})

test('spacing stays finite and bounded for singular projections, tiny or huge brushes and hidden canvases', () => {
  const camera = new PerspectiveCamera(60, 1, 0.1, 100)
  const rect = { width: 400, height: 400 }
  for (const radius of [null, 0, -1, NaN, Infinity, Number.MIN_VALUE, Number.MAX_VALUE, 1000]) {
    const spacing = sceneSkinPaintSpacing(camera, [0, 0, -10], radius, rect)
    expect(spacing >= 1 && spacing <= 16).toBe(true)
  }
  expect(sceneSkinPaintSpacing(camera, [0, 0, 0], 1, rect)).toBe(1)
  expect(sceneSkinPaintSpacing(camera, [0, 0, -10], 1, { width: 0, height: 0 })).toBe(1)
  expect(sceneSkinPaintSpacing(camera, [0, 0, -10], 1000, rect)).toBe(16)
})

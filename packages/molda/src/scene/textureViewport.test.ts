import { expect, test } from 'bun:test'
import { fitTextureCamera, textureZoomStep, zoomTextureCamera } from './textureViewport'

test('zoom preserves the texel under the pointer, including at both camera limits', () => {
  const before = { x: -143.5, y: 29.75, scale: 2.5 }
  const anchor = { x: 245.25, y: 130.5 }
  for (const requested of [0.001, 0.5, 1, 4, 64, 1000]) {
    const after = zoomTextureCamera(before, requested, anchor)
    expect((anchor.x - after.x) / after.scale).toBeCloseTo((anchor.x - before.x) / before.scale, 10)
    expect((anchor.y - after.y) / after.scale).toBeCloseTo((anchor.y - before.y) / before.scale, 10)
    expect(after.scale).toBeGreaterThanOrEqual(0.01)
    expect(after.scale).toBeLessThanOrEqual(64)
  }
})

test('fit preserves rectangular pixel proportions and close zoom steps use whole texels', () => {
  const image = { width: 128, height: 32 }
  const frame = { width: 480, height: 640 }
  const camera = fitTextureCamera(frame, image)
  expect(camera.x + (image.width * camera.scale) / 2).toBe(frame.width / 2)
  expect(camera.y + (image.height * camera.scale) / 2).toBe(frame.height / 2)
  expect((image.width * camera.scale) / (image.height * camera.scale)).toBe(4)
  expect(textureZoomStep(1.25, 1)).toBe(2)
  expect(textureZoomStep(3.75, -1)).toBe(3)
  expect(textureZoomStep(0.8, 1)).toBe(1)
  expect(textureZoomStep(1, -1)).toBe(0.5)
})

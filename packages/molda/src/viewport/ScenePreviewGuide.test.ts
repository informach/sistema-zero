import { expect, test } from 'bun:test'
import { Points } from 'three'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { ScenePreviewGuide } from './ScenePreviewGuide'

test('cut guides keep CSS sizes, draw above the surface, and retain only unoccluded candidate markers', () => {
  const guide = new ScenePreviewGuide()
  try {
    guide.update({
      size: 2,
      points: [[0, 0, 0]],
      hover: [1, 0, 0],
      cut: {
        midpoints: [
          [0, 0, 0],
          [0, 0, -1],
        ],
        segments: [
          [
            [0, 0, 0],
            [1, 0, 0],
          ],
        ],
        provisional: [],
      },
    })
    const points = guide.root.children.filter((child) => child instanceof Points)
    expect(points.map((point) => point.material.size)).toEqual([8, 16, 22])
    expect(points.every((point) => !point.material.depthTest)).toBe(true)
    guide.updateCutVisibility((point) => point[2] === 0)
    expect(points[0]!.geometry.drawRange.count).toBe(1)
    expect(points[0]!.geometry.getAttribute('position').getZ(0)).toBe(0)
    guide.updateCutVisibility(() => true)
    expect(points[0]!.geometry.drawRange.count).toBe(2)
    const lines = guide.root.children.filter((child) => child instanceof LineSegments2)
    guide.updateCutVisibility(
      () => true,
      () => [],
    )
    expect(lines.every((line) => !line.visible)).toBe(true)
    guide.updateCutVisibility(
      () => true,
      () => [
        [
          [0, 0, 0],
          [0.5, 0, 0],
        ],
      ],
    )
    expect(lines.every((line) => line.visible && !line.material.depthTest)).toBe(true)
    expect(lines[0]!.geometry.getAttribute('instanceEnd').getX(0)).toBe(0.5)
  } finally {
    guide.dispose()
  }
  expect(guide.root.children).toHaveLength(0)
})

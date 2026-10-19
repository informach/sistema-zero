import { expect, test } from 'bun:test'
import { Points } from 'three'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { ScenePreviewGuide } from './ScenePreviewGuide'

test('pivot markers are readable and follow visibility changes without losing hidden candidates', () => {
  const guide = new ScenePreviewGuide()
  try {
    guide.update({
      size: 1,
      snapPoints: [
        [0, 0, 0],
        [0, 0, -1],
      ],
    })
    const points = guide.root.children.find((child) => child instanceof Points)!
    expect(points.material.size).toBe(14)
    guide.updateSnapVisibility((point) => point[2] === 0)
    expect(points.geometry.drawRange.count).toBe(1)
    expect(points.geometry.getAttribute('position').getZ(0)).toBe(0)
    guide.updateSnapVisibility((point) => point[2] === -1)
    expect(points.geometry.drawRange.count).toBe(1)
    expect(points.geometry.getAttribute('position').getZ(0)).toBe(-1)
    guide.updateSnapVisibility(() => true)
    expect(points.geometry.drawRange.count).toBe(2)
    expect(points.geometry.getAttribute('position').getZ(0)).toBe(0)
    expect(points.geometry.getAttribute('position').getZ(1)).toBe(-1)
    guide.update(null)
    expect(guide.root.children).toHaveLength(0)
    guide.updateSnapVisibility(() => true)
  } finally {
    guide.dispose()
  }
})

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

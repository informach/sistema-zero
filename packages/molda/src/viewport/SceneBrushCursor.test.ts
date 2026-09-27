import { expect, test } from 'bun:test'
import { Group, LineSegments, Vector3 } from 'three'
import { SceneBrushCursor, type SceneBrushSurface } from './SceneBrushCursor'

test('world-size tangent guide owns fixed lazy buffers and reuses them across movement, radius and clear', () => {
  const cursor = new SceneBrushCursor(),
    surface: SceneBrushSurface = { point: [3, 4, 5], normal: [1, 2, 3] },
    source = structuredClone(surface)
  expect(cursor.root.visible).toBe(false)
  expect(cursor.root.children).toHaveLength(0)
  expect(cursor.show(surface, 2)).toBe(true)
  const line = cursor.root.children[0]
  if (!(line instanceof LineSegments)) throw new Error('Expected cursor line')
  const positions = line.geometry.getAttribute('position'),
    colors = line.geometry.getAttribute('color'),
    original = [...positions.array]
  expect(positions.count).toBe(128)
  expect(new Set(colors.array)).toEqual(new Set([0, 1]))
  expect(line.material.depthTest).toBe(false)
  expect(line.material.depthWrite).toBe(false)
  expect(line.material.toneMapped).toBe(false)
  expect(cursor.show(surface, 2)).toBe(false)
  cursor.root.updateMatrixWorld(true)
  const center = new Vector3(...surface.point),
    normal = new Vector3(...surface.normal).normalize()
  for (let i = 0; i < positions.count; i++) {
    const offset = new Vector3()
      .fromBufferAttribute(positions, i)
      .applyMatrix4(line.matrixWorld)
      .sub(center)
    expect(offset.length()).toBeCloseTo(2, 6)
    expect(offset.dot(normal)).toBeCloseTo(0, 12)
  }
  for (let i = 0; i < 100; i++) cursor.show({ point: [i, 0, 0], normal: [0, 0, -1] }, 3)
  expect(cursor.root.children[0]).toBe(line)
  expect(line.geometry.getAttribute('position')).toBe(positions)
  expect(line.geometry.getAttribute('color')).toBe(colors)
  expect([...positions.array]).toEqual(original)
  expect(positions.version).toBe(0)
  expect(cursor.clear()).toBe(true)
  expect(cursor.clear()).toBe(false)
  expect(cursor.show(source, 0.5)).toBe(true)
  expect(cursor.root.children[0]).toBe(line)
  surface.point[0] = 900
  surface.normal[0] = 900
  expect(cursor.root.position.toArray()).toEqual(source.point)
  expect(cursor.root.scale.toArray()).toEqual([0.5, 0.5, 0.5])

  let geometries = 0,
    materials = 0
  line.geometry.addEventListener('dispose', () => geometries++)
  line.material.addEventListener('dispose', () => materials++)
  const parent = new Group().add(cursor.root)
  cursor.dispose()
  cursor.dispose()
  expect([geometries, materials]).toEqual([1, 1])
  expect(parent.children).toHaveLength(0)
  expect(cursor.root.children).toHaveLength(0)
  expect(cursor.show(source, 1)).toBe(false)
})

test('unrepresentable guides hide without clamping the operation or retaining invalid data', () => {
  const cursor = new SceneBrushCursor(),
    surface: SceneBrushSurface = { point: [1, 2, 3], normal: [0, 0, 1] }
  try {
    for (const radius of [
      0,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MIN_VALUE,
      1e100,
      null,
    ]) {
      cursor.show(surface, 1)
      expect(cursor.show(surface, radius)).toBe(true)
      expect(cursor.root.visible).toBe(false)
    }
    for (const invalid of [
      { point: [Number.NaN, 0, 0], normal: [0, 0, 1] },
      { point: [1e100, 0, 0], normal: [0, 0, 1] },
      { point: [0, 0, 0], normal: [0, 0, 0] },
      { point: [0, 0, 0], normal: [Number.POSITIVE_INFINITY, 0, 0] },
      { point: [0, 0, 0], normal: [1.7e308, 1.7e308, 1.7e308] },
    ] satisfies SceneBrushSurface[]) {
      cursor.show(surface, 1)
      expect(cursor.show(invalid, 1)).toBe(true)
      expect(cursor.root.visible).toBe(false)
    }
    expect(cursor.show({ point: [0, 0, 0], normal: [1e-200, 0, 0] }, 1)).toBe(true)
    expect(cursor.root.quaternion.toArray().every(Number.isFinite)).toBe(true)
    expect(new Vector3(0, 0, 1).applyQuaternion(cursor.root.quaternion).x).toBeCloseTo(1, 12)
    expect(cursor.show({ point: [0, 0, 0], normal: [Number.MIN_VALUE, 0, 0] }, 1)).toBe(true)
    expect(cursor.root.quaternion.toArray().every(Number.isFinite)).toBe(true)
    expect(new Vector3(0, 0, 1).applyQuaternion(cursor.root.quaternion).x).toBeCloseTo(1, 12)
    expect(cursor.show(null, 1)).toBe(true)
  } finally {
    cursor.dispose()
  }
})

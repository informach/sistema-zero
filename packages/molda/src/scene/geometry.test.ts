import { describe, expect, test } from 'bun:test'
import { createPart, type Vec3 } from '../core/model'
import { buildPartGeometry } from '../model/geometry'
import { partMatrix, transformPoint } from '../model/transform'
import { makeModel } from '../testing/fixtures'
import type { SceneMeshGeometry } from './document'
import { indexSceneDocument } from './documentIndex'
import { buildSceneGeometry, triangleUv } from './geometry'
import { migrateLegacyModel } from './migrateLegacy'
import { triangulateFace } from './triangulate'

function polygon(points: Vec3[]): SceneMeshGeometry {
  return {
    id: 'geometry',
    kind: 'mesh',
    vertices: Object.fromEntries(points.map((point, i) => [`v${i}`, point])),
    faces: {
      face: { corners: points.map((_, i) => ({ vertexId: `v${i}`, uv: [i / 7, i / 13] })) },
    },
    looseEdges: [],
  }
}

describe('derived scene geometry', () => {
  test.each([
    'box',
    'wedge',
    'cylinder',
    'sphere',
  ] as const)('%s migration draws the same world geometry and local UV as v1', (shape) => {
    const part = createPart({
      id: 'part',
      name: 'Forma',
      shape,
      from: [-2, 1, -3],
      to: [3, 5, 4],
      rotation: [30, 45, -15],
      color: 2,
    })
    const legacy = buildPartGeometry(part)
    const document = migrateLegacyModel(makeModel({ parts: [part] })).document
    const geometry = document.geometries[0]
    const world = indexSceneDocument(document).scene.worldMatrices.get(part.id)
    if (!geometry || !world) throw new Error('Missing geometry')
    const built = buildSceneGeometry(geometry)
    expect(built.issues).toEqual([])
    expect(built.faceIds).toEqual(legacy.faceOfTriangle)
    expect(built.uvs).toEqual(legacy.uvs)
    for (let offset = 0; offset < built.positions.length; offset += 3) {
      const a: Vec3 = [
        legacy.positions[offset] ?? NaN,
        legacy.positions[offset + 1] ?? NaN,
        legacy.positions[offset + 2] ?? NaN,
      ]
      const b: Vec3 = [
        built.positions[offset] ?? NaN,
        built.positions[offset + 1] ?? NaN,
        built.positions[offset + 2] ?? NaN,
      ]
      const before = transformPoint(partMatrix(part), a)
      const after = transformPoint(world, b)
      for (let axis = 0; axis < 3; axis++) expect(after[axis]).toBeCloseTo(before[axis] ?? NaN, 5)
    }
  })

  test('small native primitives are not silently discarded by the legacy absolute-area threshold', () => {
    const built = buildSceneGeometry({
      id: 'tiny',
      kind: 'box',
      from: [0, 0, 0],
      to: [1e-9, 2e-9, 3e-9],
      surfaces: {},
    })
    expect(built.faceIds).toHaveLength(12)
    expect(built.normals.every(Number.isFinite)).toBe(true)
  })

  test('concave polygons conserve signed area, winding and every corner without crossing outside the face', () => {
    const points: Vec3[] = [
      [0, 0, 0],
      [3, 0, 0],
      [3, 1, 0],
      [1, 1, 0],
      [1, 3, 0],
      [0, 3, 0],
    ]
    for (const loop of [points, [...points].reverse()]) {
      const result = triangulateFace(loop)
      expect(result.status).toBe('ok')
      expect(result.triangles).toHaveLength(4)
      let area = 0
      const vertices = new Set<number>()
      for (const triangle of result.triangles) {
        const [a, b, c] = triangle.map((index) => loop[index])
        if (!a || !b || !c) throw new Error('Missing triangle')
        const signed = ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2
        expect(Math.sign(signed)).toBe(loop === points ? 1 : -1)
        area += signed
        for (const vertex of triangle) vertices.add(vertex)
        const x = (a[0] + b[0] + c[0]) / 3
        const y = (a[1] + b[1] + c[1]) / 3
        expect(x <= 1 || y <= 1).toBe(true)
      }
      expect(Math.abs(area)).toBe(5)
      expect(vertices.size).toBe(points.length)
    }
  })

  test('convex quads retain their legacy diagonal and malformed cycles return explicit issues', () => {
    expect(
      triangulateFace([
        [0, 0, 0],
        [2, 0, 0],
        [2, 2, 0],
        [0, 2, 0],
      ]),
    ).toEqual({
      status: 'ok',
      triangles: [
        [0, 1, 2],
        [0, 2, 3],
      ],
    })
    const crossed = polygon([
      [0, 0, 0],
      [2, 2, 0],
      [0, 2, 0],
      [2, 0, 0],
    ])
    expect(buildSceneGeometry(crossed).issues).toEqual([
      { faceId: 'face', code: 'self-intersection' },
    ])
    const flat = polygon([
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
    ])
    expect(buildSceneGeometry(flat).issues).toEqual([{ faceId: 'face', code: 'degenerate' }])
    expect(buildSceneGeometry(crossed).positions).toHaveLength(0)
  })

  test('UV seams, arbitrary face ids and face materials survive expansion and picking', () => {
    const geometry = polygon([
      [0, 0, 0],
      [2, 0, 0],
      [0, 2, 0],
    ])
    const face = geometry.faces.face
    if (!face) throw new Error('Missing face')
    face.materialId = 'paint'
    face.corners[0] = { vertexId: 'v0', uv: [0.12345, 0.23456] }
    geometry.faces.other = {
      corners: [
        { vertexId: 'v0', uv: [0.9, 0.8] },
        { vertexId: 'v2', uv: [1, 0] },
        { vertexId: 'v1', uv: [0, 1] },
      ],
    }
    const original = structuredClone(geometry)
    const built = buildSceneGeometry(geometry)
    expect(built.materialIds).toEqual(['paint', null])
    expect(built.faceIds).toEqual(['face', 'other'])
    expect(triangleUv(built, 0, [1, 0, 0])[0]).toBeCloseTo(0.12345, 6)
    expect(triangleUv(built, 1, [1, 0, 0])[0]).toBeCloseTo(0.9, 6)
    expect(() => triangleUv(built, 2, [1, 0, 0])).toThrow()
    expect(geometry).toEqual(original)
  })

  test('primitive UV rotation and translation preserve spatial buffers and have face material bindings', () => {
    const shape = {
      id: 'box',
      kind: 'box' as const,
      from: [0, 0, 0] as Vec3,
      to: [1, 1, 1] as Vec3,
      surfaces: {},
    }
    const original = buildSceneGeometry(shape)
    const edited = buildSceneGeometry({
      ...shape,
      surfaces: {
        px: { materialId: 'front', uv: { origin: [0.25, -0.5], u: [0, 2], v: [-1, 0] } },
      },
    })
    expect(edited.positions).toEqual(original.positions)
    expect(edited.normals).toEqual(original.normals)
    for (let i = 0; i < edited.faceIds.length; i++) {
      if (edited.faceIds[i] !== 'px') continue
      expect(edited.materialIds[i]).toBe('front')
      for (let j = 0; j < 3; j++) {
        const offset = i * 6 + j * 2
        expect(edited.uvs[offset]).toBe(0.25 - (original.uvs[offset + 1] ?? NaN))
        expect(edited.uvs[offset + 1]).toBe(-0.5 + 2 * (original.uvs[offset] ?? NaN))
      }
    }
  })

  test('Float32 collapse is reported explicitly without changing authorial coordinates', () => {
    const source = polygon([
      [0, 0, 0],
      [1e-50, 0, 0],
      [0, 1e-50, 0],
    ])
    const original = structuredClone(source)
    const built = buildSceneGeometry(source)
    expect(built.issues).toEqual([{ faceId: 'face', code: 'precision' }])
    expect(built.positions).toHaveLength(0)
    expect(source).toEqual(original)
  })
})

import { expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import type { ScenePathGeometry } from './document'
import { buildSceneGeometry } from './geometry'
import { indexMeshEdges } from './meshTopology'
import { pathMesh } from './pathMesh'
import { pathTriangleCount } from './pathParameters'
import { readSceneGeometry } from './readGeometry'

function path(points: Vec3[], around = 8, endCaps = true): ScenePathGeometry {
  return {
    id: 'path',
    kind: 'path',
    points: points.map((position, i) => ({ id: `point:${i}`, position })),
    radius: 0.1,
    around,
    endCaps,
    surfaces: {},
  }
}

test('closed planar and spatial tubes share their closing ring, remain watertight and preserve UV seams', () => {
  for (const points of [
    [
      [0, 0, 0],
      [2, 0, 0],
      [2, 2, 0],
      [0, 2, 0],
    ],
    [
      [0, 0, 0],
      [2, 0, 1],
      [3, 2, 0],
      [1, 3, -1],
      [-1, 1, 1],
    ],
  ] as Vec3[][]) {
    const source = { ...path(points, 12, false), closed: true }
    const original = structuredClone(source)
    const { mesh } = pathMesh(source)
    const topology = indexMeshEdges(mesh)
    expect(Object.keys(mesh.vertices)).toHaveLength(points.length * source.around)
    expect(Object.keys(mesh.faces)).toHaveLength(pathTriangleCount(points.length, source))
    expect(
      Object.keys(mesh.vertices).length - topology.edges.size + Object.keys(mesh.faces).length,
    ).toBe(0)
    for (const incident of topology.edges.values()) {
      expect(incident).toHaveLength(2)
      expect([incident[0]!.a, incident[0]!.b]).toEqual([incident[1]!.b, incident[1]!.a])
    }
    const seam = mesh.faces[`side:${points.length - 1}:0:a`]!
    expect(seam.corners[2]).toEqual({ vertexId: 'ring:0:1', uv: [1 / source.around, 1] })
    expect(mesh.faces['side:0:0:a']!.corners[1]).toEqual({
      vertexId: 'ring:0:1',
      uv: [1 / source.around, 0],
    })
    expect(buildSceneGeometry(source).issues).toEqual([])
    expect(readSceneGeometry(source)).toEqual(source)
    expect(source).toEqual(original)
    for (const invalid of [
      { ...source, endCaps: true },
      { ...source, points: source.points.slice(0, 2) },
      { ...source, points: [...source.points, { ...source.points[0]!, id: 'duplicate-position' }] },
    ])
      expect(() => readSceneGeometry(invalid)).toThrow()
  }
})

test('open straight and bent paths produce consistently oriented tubes with exact budgets and per-corner seams', () => {
  for (const points of [
    [
      [0, 0, 0],
      [0, 2, 0],
    ],
    [
      [0, 0, 0],
      [0, 2, 0],
      [1, 3, 1],
    ],
    [
      [0, 0, 0],
      [1, 0, 0],
      [2, 1, 0],
      [2, 2, 1],
    ],
  ] as Vec3[][]) {
    for (const around of [3, 8, 64])
      for (const endCaps of [false, true]) {
        const source = path(points, around, endCaps)
        source.surfaces.side = {
          materialId: 'paint',
          uv: { origin: [0.1, 0.2], u: [0.7, 0.1], v: [0.1, 0.5] },
        }
        const before = structuredClone(source)
        const { mesh, surfaceByFace } = pathMesh(source)
        const drawn = buildSceneGeometry(source)
        const converted = buildSceneGeometry(mesh)
        expect(drawn.issues).toEqual([])
        expect(drawn.positions).toEqual(converted.positions)
        expect(drawn.uvs).toEqual(converted.uvs)
        expect(drawn.materialIds).toEqual(converted.materialIds)
        expect(drawn.faceIds).toHaveLength(pathTriangleCount(source.points.length, source))
        expect(converted.faceIds.map((id): string => surfaceByFace.get(id)!)).toEqual(drawn.faceIds)
        const topology = indexMeshEdges(mesh)
        expect([...topology.edges.values()].filter((edges) => edges.length === 1)).toHaveLength(
          endCaps ? 0 : around * 2,
        )
        for (const edges of topology.edges.values())
          if (edges.length > 1) {
            expect(edges).toHaveLength(2)
            expect([edges[0]!.a, edges[0]!.b]).toEqual([edges[1]!.b, edges[1]!.a])
          }
        for (let i = 0; i < points.length; i++)
          for (let j = 0; j < around; j++) {
            const point = mesh.vertices[`ring:${i}:${j}`]!
            expect(Math.hypot(...point.map((v, axis) => v - points[i]![axis]!))).toBeCloseTo(
              source.radius,
              12,
            )
          }
        expect(readSceneGeometry(source)).toEqual(source)
        expect(source).toEqual(before)
      }
  }
})

test('straight frames remain aligned across intermediate knots and the two caps face outward', () => {
  const { mesh } = pathMesh(
    path([
      [0, 0, 0],
      [0, 0.5, 0],
      [0, 2, 0],
    ]),
  )
  for (let j = 0; j < 8; j++) {
    expect(mesh.vertices[`ring:0:${j}`]![0]).toBe(mesh.vertices[`ring:2:${j}`]![0])
    expect(mesh.vertices[`ring:0:${j}`]![2]).toBe(mesh.vertices[`ring:2:${j}`]![2])
  }
  const drawn = buildSceneGeometry(mesh)
  drawn.faceIds.forEach((id, i) => {
    if (id.startsWith('top')) expect(drawn.normals[i * 9 + 1]).toBe(1)
    if (id.startsWith('bottom')) expect(drawn.normals[i * 9 + 1]).toBe(-1)
  })
  expect(mesh.faces['side:0:0:a']!.corners[2]!.uv[1]).toBe(0.25)
  const seam = Object.values(mesh.faces).flatMap((f) =>
    f.corners.filter((c) => c.vertexId === 'ring:1:0').map((c) => c.uv[0]),
  )
  expect(seam).toContain(0)
  expect(seam).toContain(1)
})

test('path parsing is strict and rejects degenerate or backtracking paths without quantization', () => {
  const source = path([
    [1e-50, 0, 0],
    [1e-50, 2e-50, 0],
  ])
  source.radius = 1e-51
  expect(readSceneGeometry(source)).toEqual(source)
  expect(pathMesh(source).mesh.vertices['ring:0:0']).not.toEqual(source.points[0]!.position)
  for (const change of [
    { radius: 0 },
    { radius: NaN },
    { around: 2 },
    { around: 65 },
    { around: 3.2 },
    { endCaps: 'true' },
    { extra: 1 },
    { points: [[0, 0, 0]] },
    {
      points: [
        [0, 0, 0],
        [0, 0, 0],
      ],
    },
    {
      points: [
        [0, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
      ],
    },
    {
      points: [
        [0, 0, 0],
        [1, 1, 0],
        [0, 0, 0],
      ],
    },
    { points: Array.from({ length: 129 }, (_, i) => [0, i, 0]) },
    { surfaces: { around: { uv: { origin: [0, 0], u: [1, 0], v: [0, 1] } } } },
  ]) {
    const raw =
      'points' in change && Array.isArray(change.points)
        ? {
            ...change,
            points: change.points.map((position, i) => ({ id: `point:${i}`, position })),
          }
        : change
    expect(() => readSceneGeometry({ ...source, ...raw })).toThrow()
  }
  expect(() =>
    readSceneGeometry({ ...source, points: source.points.map((p) => ({ ...p, id: 'same' })) }),
  ).toThrow('repetido')
})

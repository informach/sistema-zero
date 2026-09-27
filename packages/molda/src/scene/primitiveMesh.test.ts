import { expect, test } from 'bun:test'
import { triangleCountOf } from '../model/geometry'
import { FACES_BY_SHAPE } from '../model/shapes'
import type { ScenePrimitiveGeometry } from './document'
import { buildSceneGeometry } from './geometry'
import { primitiveMesh } from './primitiveMesh'

test.each([
  'box',
  'wedge',
  'cylinder',
  'sphere',
] as const)('%s converts to a closed connected surface without changing rendered bytes', (kind) => {
  const source: ScenePrimitiveGeometry = {
    id: 'geometry',
    kind,
    from: [-0.1234567890123, -2.987654321, -1e-9],
    to: [1.234567890123, 3.123456789, 4.123456789],
    surfaces: Object.fromEntries(
      FACES_BY_SHAPE[kind].map((face) => [
        face,
        {
          materialId: `paint:${face}`,
          uv: {
            origin: [0.123456789, -0.0123456789],
            u: [0.2345678901, 0.17],
            v: [-0.19, 0.987654321],
          },
        },
      ]),
    ),
  }
  const before = structuredClone(source)
  const { mesh, surfaceByFace } = primitiveMesh(source)
  const drawn = buildSceneGeometry(source)
  const converted = buildSceneGeometry(mesh)
  expect(converted.issues).toEqual([])
  expect(converted.positions).toEqual(drawn.positions)
  expect(converted.normals).toEqual(drawn.normals)
  expect(converted.uvs).toEqual(drawn.uvs)
  expect(converted.materialIds).toEqual(drawn.materialIds)
  expect(converted.faceIds.map((id): string => surfaceByFace.get(id) ?? '')).toEqual(drawn.faceIds)
  expect(converted.faceIds).toHaveLength(triangleCountOf(kind))
  const edges = new Map<string, Array<[string, string]>>()
  const adjacent = new Map<string, Set<string>>()
  for (const face of Object.values(mesh.faces)) {
    for (let i = 0; i < face.corners.length; i++) {
      const a = face.corners[i]?.vertexId
      const b = face.corners[(i + 1) % face.corners.length]?.vertexId
      if (!a || !b) throw new Error('Missing corner')
      const key = [a, b].sort().join('|')
      const entries = edges.get(key) ?? []
      entries.push([a, b])
      edges.set(key, entries)
      const neighbors = adjacent.get(a) ?? new Set<string>()
      neighbors.add(b)
      adjacent.set(a, neighbors)
    }
  }
  for (const entries of edges.values()) {
    expect(entries).toHaveLength(2)
    const second = entries[1]
    if (!second) throw new Error('Missing adjacent face')
    expect(entries[0]).toEqual([second[1], second[0]])
  }
  const seen = new Set<string>()
  const pending = [Object.keys(mesh.vertices)[0] ?? '']
  while (pending.length) {
    const id = pending.pop()
    if (!id || seen.has(id)) continue
    seen.add(id)
    pending.push(...(adjacent.get(id) ?? []))
  }
  expect(seen.size).toBe(Object.keys(mesh.vertices).length)
  expect(seen.size - edges.size + Object.keys(mesh.faces).length).toBe(2)
  expect(source).toEqual(before)
  expect(primitiveMesh(source).mesh).toEqual(mesh)
})

test('curved shapes share seam/pole vertices without welding away per-corner UVs', () => {
  for (const kind of ['cylinder', 'sphere'] as const) {
    const { mesh } = primitiveMesh({
      id: 'g',
      kind,
      from: [-1, -1, -1],
      to: [1, 1, 1],
      surfaces: {},
    })
    expect(Object.keys(mesh.vertices)).toHaveLength(kind === 'cylinder' ? 34 : 62)
    const seam = kind === 'cylinder' ? 'ring:top:0' : 'ring:1:0'
    const u = Object.values(mesh.faces).flatMap((face) =>
      face.corners.filter((c) => c.vertexId === seam).map((c) => c.uv[0]),
    )
    expect(u).toContain(0)
    expect(u).toContain(1)
    if (kind === 'sphere') {
      const pole = Object.values(mesh.faces).flatMap((face) =>
        face.corners.filter((c) => c.vertexId === 'pole:top'),
      )
      expect(pole).toHaveLength(12)
      expect(new Set(pole.map((c) => c.uv[0])).size).toBe(12)
    }
  }
})

test('conversion keeps exact endpoints, full-precision UV and coordinates below Float32 range', () => {
  const source: ScenePrimitiveGeometry = {
    id: 'g',
    kind: 'box',
    from: [1e-50, 2e-50, 3e-50],
    to: [2e-50, 4e-50, 6e-50],
    surfaces: {
      px: { uv: { origin: [0.123456789012345, 0.23456789012345], u: [1, 0], v: [0, 1] } },
    },
  }
  const { mesh } = primitiveMesh(source)
  expect(mesh.vertices.v_000).toEqual(source.from)
  expect(mesh.vertices.v_111).toEqual(source.to)
  expect(mesh.faces.px?.corners[0]?.uv).toEqual(source.surfaces.px?.uv.origin)
  expect(mesh.faces.px?.corners[0]?.uv[0]).not.toBe(Math.fround(0.123456789012345))
  expect(buildSceneGeometry(mesh).issues.length).toBeGreaterThan(0)
  expect(mesh.vertices.v_000).not.toBe(source.from)
})

test('thin native shapes keep all representable faces after conversion', () => {
  const source: ScenePrimitiveGeometry = {
    id: 'thin',
    kind: 'box',
    from: [0, 0, 0],
    to: [1, 1e-15, 1],
    surfaces: {},
  }
  const converted = buildSceneGeometry(primitiveMesh(source).mesh)
  expect(converted.issues).toEqual([])
  expect(converted.faceIds).toHaveLength(12)
})

import { describe, expect, test } from 'bun:test'
import type { MoldaMesh, Vec3 } from '../core/model'
import { boxMesh } from './mesh'
import type { MeshPick } from './meshSelection'
import { selectMeshTopology } from './meshSelectionGraph'

function grid(width: number, height: number): MoldaMesh {
  const mesh: MoldaMesh = { vertices: {}, faces: {} }
  for (let y = 0; y <= height; y++) {
    for (let x = 0; x <= width; x++) mesh.vertices[`v${x}_${y}`] = [x, y, 0]
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++)
      mesh.faces[`f_${x}_${y}`] = {
        v: [`v${x}_${y}`, `v${x + 1}_${y}`, `v${x + 1}_${y + 1}`, `v${x}_${y + 1}`],
      }
  }
  return mesh
}
const point = (key: string): MeshPick => ({ kind: 'vertex', key })
const edge = (a: string, b: string): MeshPick => ({ kind: 'edge', keys: [a, b] })
const keysOf = (picks: readonly MeshPick[]) =>
  picks.map((pick) => (pick.kind === 'edge' ? [...pick.keys].sort().join(' ') : pick.key)).sort()

describe('topological selection', () => {
  test('grid growth matches an independent Manhattan-neighborhood oracle for varied selections', () => {
    const mesh = grid(8, 8)
    const before = structuredClone(mesh)
    for (let pass = 0; pass < 20; pass++) {
      const seed = Object.keys(mesh.vertices).filter(
        (_, index) => (index * 17 + pass * 11) % 23 < 3,
      )
      const coordinates = seed.map((key) => mesh.vertices[key]!)
      const expected = Object.entries(mesh.vertices)
        .filter(([, [x, y]]) =>
          coordinates.some(([sx, sy]) => Math.abs(sx - x) + Math.abs(sy - y) <= 1),
        )
        .map(([key]) => key)
        .sort()
      const selected = seed.map(point)
      expect(keysOf(selectMeshTopology(mesh, 'vertex', selected, 'grow'))).toEqual(expected)
      const connected = selectMeshTopology(mesh, 'vertex', selected, 'connected')
      expect(connected).toHaveLength(81)
      expect(selectMeshTopology(mesh, 'vertex', connected, 'connected')).toEqual(connected)
    }
    expect(mesh).toEqual(before)
  })

  test('connected points follow loose edges but do not swallow disconnected geometry or isolated points', () => {
    const mesh = boxMesh([0, 0, 0], [1, 1, 1])
    mesh.vertices.tip = [2, 2, 2]
    mesh.vertices.alone = [3, 3, 3]
    mesh.vertices.far = [4, 4, 4]
    mesh.vertices.end = [5, 5, 5]
    mesh.looseEdges = [
      ['v_111', 'tip'],
      ['far', 'end'],
    ]
    const original = structuredClone(mesh)
    const selected = selectMeshTopology(mesh, 'vertex', [point('v_000')], 'connected')
    expect(selected).toHaveLength(9)
    expect(selected).toContainEqual(point('tip'))
    expect(selected).not.toContainEqual(point('alone'))
    expect(selectMeshTopology(mesh, 'vertex', [point('alone')], 'connected')).toEqual([
      point('alone'),
    ])
    expect(selectMeshTopology(mesh, 'vertex', [point('missing')], 'connected')).toEqual([])
    expect(mesh).toEqual(original)
  })

  test('faces connect only across actual edges, not through a shared point or loose construction edge', () => {
    const mesh = grid(2, 1)
    mesh.vertices.a = [3, 1, 0]
    mesh.vertices.b = [3, 2, 0]
    mesh.faces.f_touch = { v: ['v2_1', 'a', 'b'] }
    expect(
      keysOf(selectMeshTopology(mesh, 'face', [{ kind: 'face', key: 'f_0_0' }], 'connected')),
    ).toEqual(['f_0_0', 'f_1_0'])
  })

  test('grow is one neighborhood, shrink removes its boundary, inverse is exact and mode never changes', () => {
    const mesh = grid(4, 4)
    const seed = [point('v2_2')]
    const grown = selectMeshTopology(mesh, 'vertex', seed, 'grow')
    expect(keysOf(grown)).toEqual(['v1_2', 'v2_1', 'v2_2', 'v2_3', 'v3_2'])
    expect(selectMeshTopology(mesh, 'vertex', grown, 'shrink')).toEqual(seed)
    for (const mode of ['vertex', 'edge', 'face'] as const) {
      const all = selectMeshTopology(mesh, mode, [], 'all')
      expect(all.every((pick) => pick.kind === mode)).toBe(true)
      const half = all.filter((_, index) => index % 2 === 0)
      const inverse = selectMeshTopology(mesh, mode, half, 'invert')
      expect(keysOf(selectMeshTopology(mesh, mode, inverse, 'invert'))).toEqual(keysOf(half))
      expect(half.length + inverse.length).toBe(all.length)
      expect(keysOf(selectMeshTopology(mesh, mode, all, 'shrink'))).toEqual(keysOf(all))
      expect(selectMeshTopology(mesh, mode, all, 'none')).toEqual([])
    }
  })

  test('rings traverse opposite quad sides to both borders and terminate on a closed cube', () => {
    const mesh = grid(4, 3)
    expect(keysOf(selectMeshTopology(mesh, 'edge', [edge('v2_2', 'v2_1')], 'ring'))).toEqual(
      Array.from({ length: 5 }, (_, x) => `v${x}_1 v${x}_2`),
    )
    const cube = boxMesh([0, 0, 0], [1, 1, 1])
    expect(selectMeshTopology(cube, 'edge', [edge('v_000', 'v_100')], 'ring')).toHaveLength(4)
  })

  test('loops follow the unique continuation without turning at poles or crossing triangles', () => {
    const mesh = grid(4, 4)
    const seed = [edge('v1_2', 'v2_2')]
    expect(keysOf(selectMeshTopology(mesh, 'edge', seed, 'loop'))).toEqual(
      Array.from({ length: 4 }, (_, x) => `v${x}_2 v${x + 1}_2`),
    )
    mesh.vertices.pole = [2, 2, 1]
    mesh.looseEdges = [['v2_2', 'pole']]
    expect(selectMeshTopology(mesh, 'edge', seed, 'loop')).toHaveLength(2)
    mesh.faces.f_1_1 = { v: ['v1_1', 'v2_2', 'v1_2'] }
    expect(selectMeshTopology(mesh, 'edge', seed, 'loop')).toHaveLength(1)
  })

  test('a non-manifold ring edge is a stop, not a branch to unrelated quads', () => {
    const mesh = grid(2, 1)
    mesh.vertices.a = [1, 0, 1]
    mesh.vertices.b = [1, 1, 1]
    mesh.faces.f_branch = { v: ['v1_0', 'v1_1', 'b', 'a'] }
    const seed = [edge('v1_0', 'v1_1')]
    expect(selectMeshTopology(mesh, 'edge', seed, 'ring')).toEqual(seed)
    expect(selectMeshTopology(mesh, 'edge', seed, 'loop')).toEqual(seed)
  })

  test('connected edge traversal handles a high-valence star without recursion or an all-pairs matrix', () => {
    const mesh: MoldaMesh = { vertices: { center: [0, 0, 0] }, faces: {} }
    const spokes = Array.from({ length: 1000 }, (_, i) => `v${i}`)
    for (const [i, key] of spokes.entries()) mesh.vertices[key] = [i, 1, 0] as Vec3
    mesh.looseEdges = spokes.map((key) => ['center', key])
    expect(selectMeshTopology(mesh, 'edge', [edge('center', 'v500')], 'connected')).toHaveLength(
      1000,
    )
  })
})

import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import type { SceneMeshGeometry } from './document'
import {
  meshComponentEdges,
  meshComponentIds,
  meshComponentVertices,
  type SceneComponentSelection,
  selectMeshComponents,
} from './meshComponents'
import { meshEdgeKey } from './meshTopology'

function connectedMeshComponents(
  mesh: SceneMeshGeometry,
  selection: Pick<SceneComponentSelection, 'mode' | 'ids'>,
) {
  return selectMeshComponents(mesh, selection, 'connected')
}

test('component identities include isolated points and loose edges, deduplicate shared edges and never invent diagonals', () => {
  const mesh = makeSceneGridGeometry(2)
  mesh.vertices.isolated = [7, 0, 0]
  mesh.vertices.tip = [8, 0, 0]
  mesh.looseEdges.push(['v_0_0', 'v_1_0'], ['isolated', 'tip'])
  const edges = meshComponentEdges(mesh)
  expect(edges.size).toBe(13)
  expect(edges.has(meshEdgeKey('v_0_0', 'v_1_1'))).toBe(false)
  expect(meshComponentIds(mesh, 'vertex')).toHaveLength(11)
  expect(meshComponentIds(mesh, 'face')).toHaveLength(4)
  expect(
    meshComponentVertices(mesh, {
      mode: 'edge',
      ids: [meshEdgeKey('v_0_0', 'v_1_0'), meshEdgeKey('v_1_0', 'v_2_0')],
    }),
  ).toEqual(['v_0_0', 'v_1_0', 'v_2_0'])
  expect(meshComponentVertices(mesh, { mode: 'vertex', ids: ['isolated', 'isolated'] })).toEqual([
    'isolated',
  ])
  expect(() =>
    meshComponentVertices(mesh, { mode: 'edge', ids: [meshEdgeKey('v_0_0', 'tip')] }),
  ).toThrow('não existe')
  expect(() => meshComponentVertices(mesh, { mode: 'vertex', ids: ['toString'] })).toThrow(
    'não existe',
  )
  expect(connectedMeshComponents(mesh, { mode: 'vertex', ids: ['isolated'] })).toEqual([
    'isolated',
    'tip',
  ])
  expect(
    connectedMeshComponents(mesh, { mode: 'edge', ids: [meshEdgeKey('isolated', 'tip')] }),
  ).toEqual([meshEdgeKey('isolated', 'tip')])
  expect(connectedMeshComponents(mesh, { mode: 'vertex', ids: ['v_0_0'] })).toHaveLength(9)
  expect(
    connectedMeshComponents(mesh, { mode: 'edge', ids: [meshEdgeKey('v_0_0', 'v_1_0')] }),
  ).toHaveLength(12)
})

test('component connectivity is iterative on long chains and preserves special authorial IDs', () => {
  const mesh = makeSceneGridGeometry(1)
  mesh.vertices = Object.fromEntries(
    Array.from({ length: 12_000 }, (_, i) => [String(i), [i, 0, 0]]),
  )
  mesh.faces = {}
  mesh.looseEdges = Array.from({ length: 11_999 }, (_, i) => [String(i), String(i + 1)])
  mesh.vertices = { ...mesh.vertices, ['__proto__']: [0.123456789, 2, 3] }
  expect(connectedMeshComponents(mesh, { mode: 'vertex', ids: ['0'] })).toHaveLength(12_000)
  expect(connectedMeshComponents(mesh, { mode: 'vertex', ids: ['__proto__'] })).toEqual([
    '__proto__',
  ])
  expect(meshComponentVertices(mesh, { mode: 'vertex', ids: ['__proto__'] })).toEqual(['__proto__'])
})

test('native selection grows one geometric neighborhood, shrinks it and inverts without touching paint', () => {
  const mesh = makeSceneGridGeometry(8)
  const before = structuredClone(mesh)
  for (let pass = 0; pass < 20; pass++) {
    const seed = Object.keys(mesh.vertices).filter((_, i) => (i * 17 + pass * 11) % 23 < 3)
    const points = seed.map((id) => mesh.vertices[id]!)
    const expected = Object.entries(mesh.vertices)
      .filter(([, [x, y]]) =>
        points.some(([sx, sy]) => Math.abs(sx - x) + Math.abs(sy - y) <= 0.25),
      )
      .map(([id]) => id)
    expect(selectMeshComponents(mesh, { mode: 'vertex', ids: seed }, 'grow')).toEqual(expected)
  }
  for (const mode of ['vertex', 'edge', 'face'] as const) {
    const all = selectMeshComponents(mesh, { mode, ids: [] }, 'all')
    const half = all.filter((_, i) => i % 2 === 0)
    const inverse = selectMeshComponents(mesh, { mode, ids: half }, 'invert')
    expect(selectMeshComponents(mesh, { mode, ids: inverse }, 'invert')).toEqual(half)
    expect(selectMeshComponents(mesh, { mode, ids: all }, 'shrink')).toEqual(all)
    expect(selectMeshComponents(mesh, { mode, ids: all }, 'none')).toEqual([])
  }
  const seed = ['v_4_4']
  const grown = selectMeshComponents(mesh, { mode: 'vertex', ids: seed }, 'grow')
  expect(selectMeshComponents(mesh, { mode: 'vertex', ids: grown }, 'shrink')).toEqual(seed)
  expect(mesh).toEqual(before)
})

test('native rings cross opposite quad sides and loops stop at poles, triangles and branching edges', () => {
  const mesh = makeSceneGridGeometry(4)
  const ring = [meshEdgeKey('v_2_1', 'v_2_2')]
  expect(selectMeshComponents(mesh, { mode: 'edge', ids: ring }, 'ring').sort()).toEqual(
    Array.from({ length: 5 }, (_, x) => meshEdgeKey(`v_${x}_1`, `v_${x}_2`)).sort(),
  )
  const loop = [meshEdgeKey('v_1_2', 'v_2_2')]
  expect(selectMeshComponents(mesh, { mode: 'edge', ids: loop }, 'loop').sort()).toEqual(
    Array.from({ length: 4 }, (_, x) => meshEdgeKey(`v_${x}_2`, `v_${x + 1}_2`)).sort(),
  )
  mesh.vertices.pole = [0.5, 0.5, 1]
  mesh.looseEdges = [['v_2_2', 'pole']]
  expect(selectMeshComponents(mesh, { mode: 'edge', ids: loop }, 'loop')).toHaveLength(2)
  mesh.faces.f_1_1!.corners.splice(1, 1)
  expect(selectMeshComponents(mesh, { mode: 'edge', ids: loop }, 'loop')).toEqual(loop)
  const branched = makeSceneGridGeometry(2)
  branched.faces.extra = branched.faces.f_0_0!
  const internal = [meshEdgeKey('v_1_0', 'v_1_1')]
  expect(selectMeshComponents(branched, { mode: 'edge', ids: internal }, 'ring')).toEqual(internal)
  expect(selectMeshComponents(branched, { mode: 'edge', ids: internal }, 'loop')).toEqual(internal)
})

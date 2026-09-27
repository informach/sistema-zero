import { expect, test } from 'bun:test'
import type { SceneMeshGeometry } from './document'
import { identityMatrix, transformPoint } from './matrix'
import { meshMovementWeights, moveMeshWithWeights } from './meshSoftMovement'
import { readSceneGeometry } from './readGeometry'

test('soft reach follows connected edge distances in world units, never nearby disconnected points', () => {
  const mesh: SceneMeshGeometry = {
    id: 'chain',
    kind: 'mesh',
    faces: {},
    vertices: {
      a: [0, 0, 0],
      b: [1, 0, 0],
      c: [2, 0, 0],
      alone: [0.01, 0, 0],
      duplicate: [0, 0, 0],
    },
    looseEdges: [
      ['a', 'b'],
      ['b', 'c'],
      ['a', 'duplicate'],
    ],
  }
  const world = identityMatrix()
  world[0] = 2
  const weights = meshMovementWeights(mesh, ['a'], world, 4)
  expect([...weights]).toEqual([
    ['a', 1],
    ['b', 0.5],
    ['duplicate', 1],
  ])
  const result = moveMeshWithWeights(mesh, weights, [0, 0.123456789123, 0])
  expect(result.vertices.a![1]).toBe(0.123456789123)
  expect(result.vertices.b![1]).toBe(0.123456789123 / 2)
  expect(result.vertices.c).toBe(mesh.vertices.c)
  expect(result.vertices.alone).toBe(mesh.vertices.alone)
  expect(result.faces).toBe(mesh.faces)
  expect(result.looseEdges).toBe(mesh.looseEdges)
  expect(readSceneGeometry(result)).toEqual(result)
  expect(moveMeshWithWeights(mesh, weights, [0, 0, 0])).toBe(mesh)
})

test('multi-source priorities match an independent repeated-relaxation oracle over cyclic graphs and shear', () => {
  for (let run = 0; run < 20; run++) {
    const mesh: SceneMeshGeometry = {
      id: 'graph',
      kind: 'mesh',
      faces: {},
      vertices: {},
      looseEdges: [],
    }
    for (let i = 0; i < 30; i++)
      mesh.vertices[String(i)] = [(i * 7 + run) % 11, (i * 3 + run) % 7, i / 13]
    for (let i = 0; i < 60; i++) {
      const a = (i * 17 + run) % 30
      const b = (i * 23 + run + 3) % 30
      if (a !== b) mesh.looseEdges.push([String(a), String(b)])
    }
    const world = identityMatrix()
    world[0] = 1.25
    world[4] = 0.7
    world[9] = -0.4
    const points = Object.fromEntries(
      Object.entries(mesh.vertices).map(([id, p]) => [id, transformPoint(world, p)]),
    )
    const seeds = [String(run % 30), String((run + 5) % 30)]
    const distance = new Map(
      Object.keys(mesh.vertices).map((id) => [id, seeds.includes(id) ? 0 : Infinity]),
    )
    for (let pass = 0; pass < 30; pass++) {
      for (const [a, b] of mesh.looseEdges) {
        const pa = points[a]!
        const pb = points[b]!
        const length = Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2])
        distance.set(a, Math.min(distance.get(a)!, distance.get(b)! + length))
        distance.set(b, Math.min(distance.get(b)!, distance.get(a)! + length))
      }
    }
    const weights = meshMovementWeights(mesh, seeds, world, 25)
    for (const [id, d] of distance) {
      const t = Math.max(0, 1 - d / 25)
      expect(weights.get(id) ?? 0).toBeCloseTo(t * t * (3 - 2 * t), 12)
    }
  }
})

test('large chains are iterative, preserve special IDs and reject invalid reach or non-translation data', () => {
  const mesh: SceneMeshGeometry = {
    id: 'large',
    kind: 'mesh',
    faces: {},
    vertices: Object.fromEntries(Array.from({ length: 12_000 }, (_, i) => [String(i), [i, 0, 0]])),
    looseEdges: Array.from({ length: 11_999 }, (_, i) => [String(i), String(i + 1)]),
  }
  mesh.vertices = { ...mesh.vertices, ['__proto__']: [0, 0, 0] }
  mesh.looseEdges.push(['__proto__', '0'])
  const weights = meshMovementWeights(mesh, ['__proto__'], identityMatrix(), 12_000)
  expect(weights.size).toBe(12_001)
  expect(weights.get('__proto__')).toBe(1)
  for (const radius of [0, -1, NaN, Infinity])
    expect(() => meshMovementWeights(mesh, ['0'], identityMatrix(), radius)).toThrow()
  expect(() => meshMovementWeights(mesh, ['missing'], identityMatrix(), 1)).toThrow('não existe')
  expect(() => moveMeshWithWeights(mesh, new Map([['0', 1.1]]), [1, 0, 0])).toThrow()
  expect(() => moveMeshWithWeights(mesh, weights, [Infinity, 0, 0])).toThrow()
})

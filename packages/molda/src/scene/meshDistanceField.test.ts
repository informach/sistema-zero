import { expect, test } from 'bun:test'
import type { SceneMeshGeometry } from './document'
import { identityMatrix } from './matrix'
import { prepareMeshDistanceField } from './meshDistanceField'

const mesh: SceneMeshGeometry = {
  id: 'mesh',
  kind: 'mesh',
  vertices: { a: [0, 0, 0], b: [1, 0, 0], c: [0, 1, 0], d: [0, 0, 0], e: [1, 0, 0], f: [0, 1, 0] },
  faces: {
    front: {
      corners: [
        { vertexId: 'a', uv: [0, 0] },
        { vertexId: 'b', uv: [1, 0] },
        { vertexId: 'c', uv: [0, 1] },
      ],
    },
    separate: {
      corners: [
        { vertexId: 'd', uv: [0, 0] },
        { vertexId: 'e', uv: [1, 0] },
        { vertexId: 'f', uv: [0, 1] },
      ],
    },
  },
  looseEdges: [['a', 'd']],
}

test('surface distance excludes construction bridges and disconnected coincident points but all-edge movement keeps them', () => {
  const source = structuredClone(mesh),
    surface = prepareMeshDistanceField(mesh, identityMatrix(), 2, 'surface'),
    all = prepareMeshDistanceField(mesh, identityMatrix(), 2, 'all')
  expect([...surface.query([{ id: 'a', distance: 0 }])]).toEqual([
    ['a', 0],
    ['b', 1],
    ['c', 1],
  ])
  expect(all.query([{ id: 'a', distance: 0 }]).size).toBe(6)
  expect(surface.query([{ id: 'a', distance: 0.5 }]).get('b')).toBe(1.5)
  expect(surface.query([{ id: 'a', distance: 1 }]).has('b')).toBe(false)
  expect(surface.query([{ id: 'b', distance: 0 }]).get('a')).toBe(1)
  expect(surface.query([]).size).toBe(0)
  expect(mesh).toEqual(source)
})

test('world transforms, returned points and earlier distance maps cannot change a later query', () => {
  const world = identityMatrix()
  world[0] = 2
  world[4] = 1
  const field = prepareMeshDistanceField(mesh, world, 4)
  world[0] = 100
  const point = field.point('b')
  expect(point).toEqual([2, 0, 0])
  point[0] = 999
  const first = field.query([
    { id: 'a', distance: 0.25 },
    { id: 'a', distance: 1 },
  ])
  expect(first.get('b')).toBe(2.25)
  expect(first.get('c')).toBe(0.25 + Math.SQRT2)
  ;(first as Map<string, number>).clear()
  expect(field.query([{ id: 'a', distance: 0 }]).get('b')).toBe(2)
  expect(field.point('b')).toEqual([2, 0, 0])
  for (const distance of [-1, NaN, Infinity])
    expect(() => field.query([{ id: 'a', distance }])).toThrow()
  expect(() => field.query([{ id: 'missing', distance: 0 }])).toThrow()
})

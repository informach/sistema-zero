import { describe, expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import { indexSceneNodes, reparentPreservingWorld, type SceneNode } from './graph'
import { quaternionFromEulerXYZ, type SceneTransform, transformPoint } from './matrix'

function node(
  id: string,
  parentId: string | null = null,
  translation: Vec3 = [0, 0, 0],
): SceneNode {
  return {
    id,
    parentId,
    transform: {
      kind: 'trs',
      translation,
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
  }
}

function worlds(nodes: readonly SceneNode[]): Map<string, number[]> {
  const index = indexSceneNodes(nodes)
  return new Map(
    [...index.worldMatrices].map(([id, matrix]) => [
      id,
      [
        ...transformPoint(matrix, [0, 0, 0]),
        ...transformPoint(matrix, [1, 2, 3]),
        ...transformPoint(matrix, [-2, 3, -4]),
      ],
    ]),
  )
}

function expectSameWorld(before: Map<string, number[]>, after: Map<string, number[]>): void {
  expect(after.size).toBe(before.size)
  for (const [id, points] of before) {
    const actual = after.get(id)
    if (!actual) throw new Error(`Missing ${id}`)
    for (let i = 0; i < points.length; i += 1) {
      expect(Math.abs((actual[i] ?? 0) - (points[i] ?? 0))).toBeLessThan(1e-9)
    }
  }
}

describe('scene hierarchy', () => {
  test('single parent and parent-first world matrices do not depend on storage order', () => {
    const nodes = [
      node('tip', 'arm', [0, 2, 0]),
      node('arm', 'body', [3, 0, 0]),
      node('body', null, [1, 0, 0]),
    ]
    const index = indexSceneNodes(nodes)
    expect(index.order).toEqual(['body', 'arm', 'tip'])
    expect(index.children.get('body')).toEqual(['arm'])
    expect(index.roots).toEqual(['body'])
    const matrix = index.worldMatrices.get('tip')
    if (!matrix) throw new Error('Missing matrix')
    expect(transformPoint(matrix, [0, 0, 0])).toEqual([4, 2, 0])
    expect(worlds(nodes)).toEqual(worlds([...nodes].reverse()))
  })

  test('invalid identity, missing parents and cycles never produce a partial scene', () => {
    for (const nodes of [
      [node('')],
      [node('same'), node('same')],
      [node('a', 'missing')],
      [node('self', 'self')],
      [node('a', 'b'), node('b', 'a')],
      [node('root'), node('a', 'b'), node('b', 'a')],
    ])
      expect(() => indexSceneNodes(nodes)).toThrow()
  })

  test('deep hierarchy and multi-selection are iterative, not recursive or quadratic', () => {
    const nodes = Array.from({ length: 12_000 }, (_, i) =>
      node(`n${i}`, i ? `n${i - 1}` : null, [1, 0, 0]),
    )
    const index = indexSceneNodes(nodes)
    expect(index.order).toHaveLength(nodes.length)
    expect(index.worldMatrices.get('n11999')?.[12]).toBe(12000)
    // Parent and descendants selected together move once, not once for every selected ancestor.
    expect(
      reparentPreservingWorld(
        nodes,
        nodes.map((item) => item.id),
        null,
      ),
    ).toBe(nodes)
  })

  test('reparent preserves world, shear, descendants, selection atomicity and custom data', () => {
    const rotated: SceneTransform = {
      kind: 'trs',
      translation: [2, 3, 4],
      rotation: quaternionFromEulerXYZ([11, 37.7, 53]),
      scale: [-2, 3, 0.5],
    }
    const nodes = [
      { ...node('a'), transform: rotated, name: 'grupo a' },
      {
        ...node('b'),
        transform: { ...rotated, rotation: quaternionFromEulerXYZ([55, 13, 7]) },
        name: 'grupo b',
      },
      { ...node('arm', 'a', [1, 2, 3]), name: 'braço' },
      { ...node('hand', 'arm', [0, 2, 0]), name: 'mão' },
      { ...node('leg', 'a', [2, 0, 0]), name: 'perna' },
    ]
    const before = structuredClone(nodes)
    const moved = reparentPreservingWorld(nodes, ['arm', 'hand', 'leg', 'arm'], 'b')
    expectSameWorld(worlds(nodes), worlds(moved))
    expect(nodes).toEqual(before)
    expect(moved.find((item) => item.id === 'arm')).toMatchObject({
      parentId: 'b',
      name: 'braço',
      transform: { kind: 'affine' },
    })
    expect(moved.find((item) => item.id === 'hand')).toBe(nodes[3])
    expect(moved.find((item) => item.id === 'leg')?.parentId).toBe('b')
    const detached = reparentPreservingWorld(moved, ['arm', 'leg'], null)
    expectSameWorld(worlds(nodes), worlds(detached))
  })

  test('cycles, missing targets/selection and singular parents refuse the complete command', () => {
    const nodes = [
      node('a'),
      node('b', 'a'),
      node('c', 'b'),
      {
        ...node('flat'),
        transform: {
          kind: 'trs' as const,
          translation: [0, 0, 0] as Vec3,
          rotation: quaternionFromEulerXYZ([0, 0, 0]),
          scale: [1, 0, 1] as Vec3,
        },
      },
    ]
    const before = structuredClone(nodes)
    for (const [selection, target] of [
      [['a'], 'c'],
      [['a'], 'a'],
      [['b', 'missing'], null],
      [['b'], 'missing'],
      [['b'], 'flat'],
    ] as const)
      expect(() => reparentPreservingWorld(nodes, selection, target)).toThrow()
    expect(nodes).toEqual(before)
    expect(reparentPreservingWorld(nodes, [], null)).toBe(nodes)
    expect(reparentPreservingWorld(nodes, ['b'], 'a')).toBe(nodes)
  })
})

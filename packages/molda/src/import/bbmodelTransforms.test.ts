import { expect, test } from 'bun:test'
import { Matrix4, Object3D, Vector3 } from 'three'
import type { Vec3 } from '../core/model'
import { composeTransform, identityMatrix, transformPoint } from '../scene/matrix'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { readBbmodelGraph } from './bbmodelGraph'
import { BbmodelInputError } from './bbmodelInput'
import { type BbmodelSelectionOptions, planBbmodelSelection } from './bbmodelSelection'
import { readBbmodelTransforms } from './bbmodelTransforms'

function source(
  json: Record<string, unknown> | string,
  version: BbmodelVersion = '5.0',
  options: BbmodelSelectionOptions = {},
) {
  const bytes = new TextEncoder().encode(
    typeof json === 'string'
      ? json
      : JSON.stringify({ meta: { format_version: version, model_format: 'free' }, ...json }),
  )
  const envelope = readBbmodelEnvelope(bytes)
  const graph = readBbmodelGraph(envelope)
  return { envelope, graph, selection: planBbmodelSelection(envelope, graph, options) }
}
function near(actual: ArrayLike<number>, expected: ArrayLike<number>, epsilon = 1e-10) {
  expect(actual.length).toBe(expected.length)
  for (let i = 0; i < actual.length; i++)
    expect(Math.abs(actual[i]! - expected[i]!)).toBeLessThan(epsilon)
}
function failure(run: () => unknown, reason: BbmodelInputError['reason'], path: string) {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(BbmodelInputError)
  expect((error as BbmodelInputError).reason).toBe(reason)
  expect((error as BbmodelInputError).path).toBe(path)
}

test('free bbmodel pivots and mixed Euler orders match independent CPU world transforms in all published layouts', () => {
  for (const version of ['4.9', '4.10', '5.0'] as const) {
    for (let i = 0; i < 20; i++) {
      const outer = { uuid: 'outer', origin: [5, -2, 3], rotation: [i * 1.23, 11.7, -26.25] }
      const inner = { uuid: 'inner', origin: [-3, 7, 11], rotation: [28.9, -i * 2.37, 51.3] }
      const input = source(
        {
          elements: [
            { uuid: 'cube', type: 'cube', origin: [1.5, 2.25, -4], rotation: [31.25, 47.5, -19.7] },
            { uuid: 'mesh', type: 'mesh', origin: [8, -2, 0.5], rotation: [31.25, 47.5, -19.7] },
          ],
          ...(version === '5.0' ? { groups: [outer, inner] } : {}),
          outliner: [
            {
              ...(version === '5.0' ? { uuid: 'outer' } : outer),
              children: [
                { ...(version === '5.0' ? { uuid: 'inner' } : inner), children: ['cube'] },
                'mesh',
              ],
            },
          ],
        },
        version,
      )
      const before = structuredClone(input)
      const result = readBbmodelTransforms(input.graph, input.selection)
      const objects = new Map<number, Object3D>()
      for (const selected of input.selection.nodes) {
        const row = input.graph.nodes[selected.node]!.source.data
        const origin = row.origin as Vec3
        const angles = row.rotation as Vec3
        const object = new Object3D()
        // Source families use this order; generic Mesh leaves the Three default XYZ intact.
        object.rotation.order = selected.kind === 'mesh' ? 'XYZ' : 'ZYX'
        object.rotation.set(...(angles.map((degrees) => Math.PI / (180 / degrees)) as Vec3))
        object.position.fromArray(origin)
        if (selected.parent !== null) {
          const parentOrigin = input.graph.nodes[selected.parent]!.source.data.origin as Vec3
          object.position.sub(new Vector3(...parentOrigin))
          objects.get(selected.parent)!.add(object)
        }
        object.updateMatrixWorld(true)
        objects.set(selected.node, object)
        const pose = result.get(selected.node)!
        near(composeTransform(pose.local), object.matrix.elements)
        near(pose.world, object.matrixWorld.elements)
        expect(pose.origin).toEqual(origin)
        expect(pose.angles).toEqual(angles)
        expect(pose.order).toBe(object.rotation.order)
        const point: Vec3 =
          selected.kind === 'cube' ? [12 - origin[0], 3 - origin[1], -5 - origin[2]] : [12, 3, -5]
        near(
          transformPoint(pose.world, point),
          new Vector3(...point).applyMatrix4(object.matrixWorld).toArray(),
        )
      }
      expect(input).toEqual(before)
      const first = result.get(input.selection.roots[0]!)!
      first.origin[0] = 999
      first.local.translation[0] = 888
      first.world[12] = 777
      expect(input).toEqual(before)
      expect(
        readBbmodelTransforms(input.graph, input.selection).get(input.selection.roots[0]!)!
          .origin[0],
      ).toBe(5)
    }
  }
})

test('cube rescale keeps source per-axis scale distinct from geometry stretch and leaves mesh/group rest scales unchanged', () => {
  for (const sign of [1, -1]) {
    const input = source({
      elements: [
        {
          uuid: 'cube',
          type: 'cube',
          rotation: [45 * sign, 30 * sign, 60 * sign],
          rescale: true,
          stretch: [8, 9, 10],
        },
      ],
      outliner: ['cube'],
    })
    const result = readBbmodelTransforms(input.graph, input.selection).get(0)!
    expect(result.rescaled).toBe(true)
    near(result.local.scale, [4 / 3, 2 * Math.sqrt(2 / 3), 2 * Math.sqrt(2 / 3)])
    const expected = new Matrix4().compose(
      new Vector3(),
      new Object3D().quaternion.fromArray(result.local.rotation),
      new Vector3(...result.local.scale),
    )
    near(result.world, expected.elements)
  }
  const input = source({
    elements: [
      { uuid: 'quarter-turn', type: 'cube', rotation: [90, -90, 90], rescale: true },
      { uuid: 'normal', type: 'cube', rotation: [45, 30, 60], rescale: false },
      { uuid: 'mesh', type: 'mesh', rotation: [45, 30, 60], rescale: true, scale: [4, 5, 6] },
    ],
    groups: [{ uuid: 'group', scale: [7, 8, 9] }],
    outliner: ['quarter-turn', 'normal', 'mesh', { uuid: 'group' }],
  })
  const result = readBbmodelTransforms(input.graph, input.selection)
  for (const pose of result.values()) expect(pose.local.scale).toEqual([1, 1, 1])
  expect(result.get(2)!.rescaled).toBe(false)
  expect(result.get(3)!.rescaled).toBe(false)
  // Unsupported raw scale/rescale metadata is not approved by this transform-only reader.
  expect(input.graph.nodes[2]!.source.data.scale).toEqual([4, 5, 6])
})

test('free missing pivots/angles use the zero rest pose, and native translations retain source units and signed zero', () => {
  const input = source(
    '{"meta":{"format_version":"5.0","model_format":"free"},"elements":[{"uuid":"cube","type":"cube","origin":[-0,1e-50,16],"rotation":[-0,0,0]}],"groups":[{"uuid":"group"}],"outliner":[{"uuid":"group","children":["cube"]}]}',
  )
  const result = readBbmodelTransforms(input.graph, input.selection)
  expect(result.get(1)!.world).toEqual(identityMatrix())
  const cube = result.get(0)!
  expect(Object.is(cube.origin[0], -0)).toBe(true)
  expect(Object.is(cube.angles[0], -0)).toBe(true)
  expect(cube.local.translation).toEqual([-0, 1e-50, 16])
  expect(cube.world[14]).toBe(16)
  expect(cube.rescaled).toBe(false)
})

test('transform data in separate outliner occurrences is never silently merged into definitions', () => {
  for (const extra of [
    { origin: [1, 2, 3] },
    { rotation: [0, 90, 0] },
    { name: 'Legacy override' },
    { visibility: false },
    { scale: [2, 3, 4] },
  ]) {
    const input = source({ groups: [{ uuid: 'g' }], outliner: [{ uuid: 'g', ...extra }] })
    failure(
      () => readBbmodelTransforms(input.graph, input.selection),
      'unsupported',
      `outliner[0][${JSON.stringify(Object.keys(extra)[0])}]`,
    )
  }
  const input = source({
    groups: [{ uuid: 'first', origin: ['bad', 0, 0] }, { uuid: 'second' }],
    outliner: [
      { uuid: 'first', isOpen: true, selected: true },
      { uuid: 'second', origin: [1, 2, 3] },
    ],
  })
  failure(
    () => readBbmodelTransforms(input.graph, input.selection),
    'unsupported',
    'outliner[1]["origin"]',
  )
  const accepted = source({
    groups: [{ uuid: 'g' }],
    outliner: [{ uuid: 'g', isOpen: true, selected: true }],
  })
  expect(readBbmodelTransforms(accepted.graph, accepted.selection).get(0)!.world).toEqual(
    identityMatrix(),
  )
})

test('transform tuples and cube rescale are strict, without coercing incomplete or non-finite values', () => {
  for (const [extra, path] of [
    [{ origin: null }, 'elements[0].origin'],
    [{ origin: [1, 2] }, 'elements[0].origin'],
    [{ origin: [1, '2', 3] }, 'elements[0].origin[1]'],
    [{ rotation: [1, 2, null] }, 'elements[0].rotation[2]'],
    [{ rotation: [] }, 'elements[0].rotation'],
    [{ rescale: 1 }, 'elements[0].rescale'],
  ] as const) {
    const input = source({ elements: [{ uuid: 'c', type: 'cube', ...extra }], outliner: ['c'] })
    failure(() => readBbmodelTransforms(input.graph, input.selection), 'invalid', path)
  }
  const infinite = source(
    '{"meta":{"format_version":"5.0","model_format":"free"},"groups":[{"uuid":"g","rotation":[0,1e400,0]}],"outliner":[{"uuid":"g"}]}',
  )
  failure(
    () => readBbmodelTransforms(infinite.graph, infinite.selection),
    'invalid',
    'groups[0].rotation[1]',
  )
})

test('local and composed world transforms must be Float32-drawable without rounding or rescaling the source', () => {
  const exact = source({
    groups: [{ uuid: 'g', origin: [3e38, -1e-50, 0] }],
    outliner: [{ uuid: 'g' }],
  })
  const matrix = readBbmodelTransforms(exact.graph, exact.selection).get(0)!.world
  expect(matrix[12]).toBe(3e38)
  expect(matrix[13]).toBe(-1e-50)
  const large = source({
    groups: [{ uuid: 'g', origin: [1e308, 0, 0] }],
    outliner: [{ uuid: 'g' }],
  })
  const before = structuredClone(large)
  failure(() => readBbmodelTransforms(large.graph, large.selection), 'unsupported', 'groups[0]')
  expect(large).toEqual(before)
  const world = source({
    groups: [
      { uuid: 'parent', origin: [3e38, 0, 0] },
      { uuid: 'child', origin: [6e38, 0, 0] },
    ],
    outliner: [{ uuid: 'parent', children: [{ uuid: 'child' }] }],
  })
  // Child local translation is 3e38 and drawable; only its composed world translation overflows.
  failure(() => readBbmodelTransforms(world.graph, world.selection), 'unsupported', 'groups[1]')
})

test('selection limits rest-transform work without reading omitted properties or applying pose/visibility metadata', () => {
  const input = source(
    {
      elements: [
        { uuid: 'unsupported', type: 'armature', origin: ['not-a-vector'] },
        { uuid: 'keep', type: 'cube', visibility: false, export: false },
      ],
      groups: [{ uuid: 'unlisted', origin: ['also-invalid'] }],
      outliner: ['unsupported', 'keep'],
      animations: [{ source: 'javascript:never()' }],
    },
    '5.0',
    { unlisted: 'omit', unsupportedNodes: 'omit-subtree' },
  )
  const result = readBbmodelTransforms(input.graph, input.selection)
  expect([...result.keys()]).toEqual([1])
  expect(result.get(1)!.world).toEqual(identityMatrix())
  expect(input.graph.nodes[1]!.source.data.visibility).toBe(false)
  expect(input.graph.nodes[1]!.source.data.export).toBe(false)
  // This is a partial transform stage, not validation of the entire source document.
  const empty = source({})
  expect(readBbmodelTransforms(empty.graph, empty.selection)).toEqual(new Map())
})

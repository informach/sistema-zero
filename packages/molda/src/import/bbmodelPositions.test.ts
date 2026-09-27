import { expect, test } from 'bun:test'
import { Object3D, Vector3 } from 'three'
import type { Vec3 } from '../core/model'
import { transformPoint } from '../scene/matrix'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { readBbmodelGeometry } from './bbmodelGeometry'
import { BBMODEL_CUBE_DIRECTIONS, type BbmodelCube, type BbmodelMesh } from './bbmodelGeometryTypes'
import { readBbmodelGraph } from './bbmodelGraph'
import { BbmodelInputError } from './bbmodelInput'
import { planBbmodelNativeGeometry } from './bbmodelNativeGeometryPlan'
import { convertBbmodelPositions, readBbmodelPositionOptions } from './bbmodelPositions'
import { planBbmodelSelection } from './bbmodelSelection'
import { readBbmodelTransforms } from './bbmodelTransforms'

test('bbmodel rejects unrepresentable local and world positions, including unused/hidden/nonexporting points', () => {
  const local = simple([
    mesh({
      origin: [0, 0, 0],
      visibility: false,
      export: false,
      vertices: Object.fromEntries([['unused " point', [1e308, 0, 0]]]),
      faces: {},
    }),
  ])
  failure(
    () => convertBbmodelPositions(local.source, local.plans, local.transforms),
    `elements[0].vertices[${JSON.stringify('unused " point')}]`,
  )
  const world = simple([
    mesh({ origin: [3e38, 0, 0], vertices: { unused: [3e38, 0, 0] }, faces: {} }),
  ])
  expect(world.transforms.get(0)!.world.every((value) => Number.isFinite(Math.fround(value)))).toBe(
    true,
  )
  expect(
    (world.source[0] as BbmodelMesh).positions.every((value) =>
      Number.isFinite(Math.fround(value)),
    ),
  ).toBe(true)
  failure(
    () => convertBbmodelPositions(world.source, world.plans, world.transforms),
    'elements[0].vertices["unused"].world',
  )
  const box = simple([
    cube({
      from: [-3e38, 0, 0],
      to: [-2e38, 1, 1],
      origin: [3e38, 0, 0],
      inflate: 0,
      stretch: [1, 1, 1],
    }),
  ])
  failure(
    () => convertBbmodelPositions(box.source, box.plans, box.transforms),
    'elements[0].vertices[0]',
  )
})

test('bbmodel checks transformed AABB corners even when every authored transformed point fits Float32', () => {
  const input = simple([
    mesh({
      origin: [0, 0, 0],
      rotation: [0, 0, 45],
      vertices: { a: [3e38, 0, 0], b: [0, 3e38, 0] },
      faces: {},
    }),
  ])
  for (const point of [
    [3e38, 0, 0],
    [0, 3e38, 0],
  ] as Vec3[])
    expect(
      transformPoint(input.transforms.get(0)!.world, point).every((value) =>
        Number.isFinite(Math.fround(value)),
      ),
    ).toBe(true)
  failure(
    () => convertBbmodelPositions(input.source, input.plans, input.transforms),
    'elements[0].bounds',
  )
})

test('bbmodel cube arithmetic overflow is not repaired and localization collapse is an explicit zero-extent decision', () => {
  const input = simple([
    cube({
      from: [-1e308, 0, 0],
      to: [1e308, 1, 1],
      origin: [0, 0, 0],
      inflate: 0,
      stretch: [1, 1, 1],
      faces: Object.fromEntries(
        BBMODEL_CUBE_DIRECTIONS.map((direction) => [
          direction,
          { uv: [0, 0, 16, 16], texture: null },
        ]),
      ),
    }),
  ])
  expect(input.plans[0]!.faces).toEqual([])
  for (const options of [{}, { nonPositiveCubes: 'preserve' } as const])
    failure(
      () => convertBbmodelPositions(input.source, input.plans, input.transforms, options),
      'elements[0]',
    )
  const collapse = simple([
    cube({
      from: [0, 0, 0],
      to: [1, 1, 1],
      origin: [2 ** 60, 0, 0],
      inflate: 0,
      stretch: [1, 1, 1],
    }),
  ])
  failure(
    () => convertBbmodelPositions(collapse.source, collapse.plans, collapse.transforms),
    'elements[0]',
  )
  const preserved = convertBbmodelPositions(collapse.source, collapse.plans, collapse.transforms, {
    nonPositiveCubes: 'preserve',
  })
  expect(preserved.issues).toEqual([
    { code: 'zero-cube-extents', node: 0, path: 'elements[0]', count: 1 },
  ])
  expect(preserved.geometries[0]!.positions[0]).toBe(preserved.geometries[0]!.positions[12])
})

test('bbmodel coordinate conversion keeps empty meshes, skips unselected source and does not inspect topology or appearance again', () => {
  const input = fixture({
    elements: [
      cube(),
      mesh(),
      mesh({ uuid: 'empty', vertices: {}, faces: {} }),
      cube({ uuid: 'omit' }),
    ],
    outliner: ['empty', 'mesh', 'cube'],
  })
  poison(input.source[0]!, 'faces', 'rescale', 'rotation', 'uvOffset', 'boxUv')
  poison(input.source[1]!, 'faces', 'origin', 'rotation')
  poison(input.source[3]!, 'from', 'to', 'origin', 'faces')
  for (const plan of input.plans) poison(plan, 'faces', 'looseEdges')
  const result = convertBbmodelPositions(input.source, input.plans, input.transforms)
  expect(result.geometries.map((row) => row.node)).toEqual([2, 1, 0])
  expect(result.geometries[0]!.positions).toEqual(new Float64Array())
  expect(result.issues).toEqual([])
  expect(convertBbmodelPositions([], [], new Map())).toEqual({ geometries: [], issues: [] })
})

test('bbmodel positions own their buffers across runs and validate private stage identity before numeric reads', () => {
  const input = simple([cube(), mesh()])
  const first = convertBbmodelPositions(input.source, input.plans, input.transforms)
  const second = convertBbmodelPositions(input.source, input.plans, input.transforms)
  first.geometries[0]!.positions[0] = 123
  first.geometries[1]!.positions[0] = 456
  expect(second.geometries[0]!.positions[0]).toBe(-8)
  expect(second.geometries[1]!.positions[0]).toBe(0)
  expect((input.source[0] as BbmodelCube).from).toEqual([-2, 3, 4])
  expect((input.source[1] as BbmodelMesh).positions[0]).toBe(0)
  poison(input.source[0]!, 'from')
  input.plans[1]!.vertexCount++
  expect(() => convertBbmodelPositions(input.source, input.plans, input.transforms)).toThrow(
    'Mismatched bbmodel position',
  )
  input.plans[1]!.vertexCount--
  expect(() => convertBbmodelPositions(input.source, input.plans, new Map())).toThrow(
    'Mismatched bbmodel position',
  )
  expect(() => convertBbmodelPositions([], input.plans, input.transforms)).toThrow(
    'Mismatched bbmodel position',
  )
})

test('bbmodel coordinate policy is strict; defaults never normalize nonpositive cuboids', () => {
  expect(readBbmodelPositionOptions({})).toEqual({ nonPositiveCubes: 'reject' })
  expect(readBbmodelPositionOptions({ nonPositiveCubes: 'preserve' })).toEqual({
    nonPositiveCubes: 'preserve',
  })
  for (const value of [
    null,
    [],
    42,
    'preserve',
    { nonPositiveCubes: null },
    { nonPositiveCubes: 'inflate' },
    { snap: true },
  ]) {
    let error: unknown
    try {
      readBbmodelPositionOptions(value as never)
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(BbmodelInputError)
    expect((error as BbmodelInputError).reason).toBe('invalid')
  }
})

function cube(overrides: Record<string, unknown> = {}) {
  return {
    uuid: 'cube',
    type: 'cube',
    from: [-2, 3, 4],
    to: [6, 9, 10],
    origin: [1, 2, 3],
    inflate: 0.5,
    stretch: [2, 0.5, 1.5],
    faces: Object.fromEntries(
      BBMODEL_CUBE_DIRECTIONS.map((direction) => [direction, { uv: [0, 0, 16, 16] }]),
    ),
    ...overrides,
  }
}
function mesh(overrides: Record<string, unknown> = {}) {
  return {
    uuid: 'mesh',
    type: 'mesh',
    origin: [40, -6, 2],
    vertices: { a: [0, 0, 0], b: [2.123456789, 0, 0], c: [0, 3, 0], unused: [9, -2, 1] },
    faces: { triangle: { vertices: ['a', 'b', 'c'] } },
    ...overrides,
  }
}
function fixture(json: Record<string, unknown>, version: BbmodelVersion = '5.0') {
  const envelope = readBbmodelEnvelope(
    new TextEncoder().encode(
      JSON.stringify({ meta: { format_version: version, model_format: 'free' }, ...json }),
    ),
  )
  const graph = readBbmodelGraph(envelope)
  const source = readBbmodelGeometry(graph)
  const selection = planBbmodelSelection(envelope, graph, { unlisted: 'omit' })
  const plans = planBbmodelNativeGeometry(source, selection).plans
  const transforms = readBbmodelTransforms(graph, selection)
  return { graph, source, selection, plans, transforms }
}
function simple(elements: Record<string, unknown>[]) {
  return fixture({ elements, outliner: elements.map((row) => row.uuid) })
}
function failure(run: () => unknown, path: string) {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(BbmodelInputError)
  expect((error as BbmodelInputError).reason).toBe('unsupported')
  expect((error as BbmodelInputError).path).toBe(path)
}
function poison(target: object, ...keys: string[]) {
  for (const key of keys)
    Object.defineProperty(target, key, {
      get() {
        throw new Error(`Unexpected read: ${key}`)
      },
    })
}
const expectedCube: Vec3[] = [
  [-8, 2.25, -1.25],
  [-8, 2.25, 9.25],
  [-8, 5.75, -1.25],
  [-8, 5.75, 9.25],
  [10, 2.25, -1.25],
  [10, 2.25, 9.25],
  [10, 5.75, -1.25],
  [10, 5.75, 9.25],
]

test('bbmodel native positions preserve cube inflation/stretch/pivot and mesh-local coordinates through independent world transforms', () => {
  for (const version of ['4.9', '4.10', '5.0'] as const) {
    const group = { uuid: 'root', origin: [-3, 7, 11], rotation: [12, -23, 34] }
    const input = fixture(
      {
        elements: [
          cube({ rotation: [45, 30, 60], rescale: true }),
          mesh({ rotation: [17, -28, 39] }),
        ],
        ...(version === '5.0' ? { groups: [group] } : {}),
        outliner: [
          { ...(version === '5.0' ? { uuid: 'root' } : group), children: ['cube', 'mesh'] },
        ],
      },
      version,
    )
    const before = structuredClone(input)
    const result = convertBbmodelPositions(input.source, input.plans, input.transforms)
    expect(result.issues).toEqual([])
    expect(result.geometries.map((row) => [row.node, row.geometryId])).toEqual([
      [0, 'bbmodel_geometry_0'],
      [1, 'bbmodel_geometry_1'],
    ])
    expect(result.geometries[0]!.positions).toEqual(new Float64Array(expectedCube.flat()))
    const meshSource = input.source[1] as BbmodelMesh
    expect(result.geometries[1]!.positions).toEqual(meshSource.positions)
    expect(result.geometries[1]!.positions === meshSource.positions).toBe(false)
    const objects = new Map<number, Object3D>()
    for (const selected of input.selection.nodes) {
      const raw = input.graph.nodes[selected.node]!.source.data
      const object = new Object3D()
      object.position.fromArray(raw.origin as Vec3)
      object.rotation.order = selected.kind === 'mesh' ? 'XYZ' : 'ZYX'
      object.rotation.set(
        ...((raw.rotation as Vec3).map((value) => Math.PI / (180 / value)) as Vec3),
      )
      if (selected.kind === 'cube')
        object.scale.set(4 / 3, 2 * Math.sqrt(2 / 3), 2 * Math.sqrt(2 / 3))
      if (selected.parent !== null) {
        object.position.sub(
          new Vector3(...(input.graph.nodes[selected.parent]!.source.data.origin as Vec3)),
        )
        objects.get(selected.parent)!.add(object)
      }
      object.updateMatrixWorld(true)
      objects.set(selected.node, object)
    }
    for (const geometry of result.geometries) {
      const expectedPoints =
        geometry.node === 0
          ? expectedCube
          : [
              [0, 0, 0],
              [2.123456789, 0, 0],
              [0, 3, 0],
              [9, -2, 1],
            ]
      for (let v = 0; v < expectedPoints.length; v++) {
        const expected = new Vector3(...(expectedPoints[v] as Vec3))
          .applyMatrix4(objects.get(geometry.node)!.matrixWorld)
          .toArray()
        const local = Array.from(geometry.positions.subarray(v * 3, v * 3 + 3)) as Vec3
        const actual = transformPoint(input.transforms.get(geometry.node)!.world, local)
        for (let axis = 0; axis < 3; axis++)
          expect(Math.abs(actual[axis]! - expected[axis]!)).toBeLessThan(1e-11)
      }
    }
    result.geometries[0]!.positions[0] = 999
    result.geometries[1]!.positions[0] = 888
    expect(input).toEqual(before)
  }
})

test('bbmodel collapsed or inverted cube extents require consent and are never thickened, sorted or snapped', () => {
  for (const overrides of [
    { from: [0, 0, 0], to: [0, 2, 4], inflate: 0, stretch: [1, 1, 1], origin: [0, 0, 0] },
    { stretch: [0, -1, -2] },
    { from: [0, 0, 0], to: [2, 2, 2], inflate: -1, stretch: [1, 1, 1] },
  ]) {
    const input = simple([cube(overrides)])
    failure(
      () => convertBbmodelPositions(input.source, input.plans, input.transforms),
      'elements[0]',
    )
    const result = convertBbmodelPositions(input.source, input.plans, input.transforms, {
      nonPositiveCubes: 'preserve',
    })
    const positions = result.geometries[0]!.positions
    expect(positions[0]).toBe(positions[12])
    expect(result.issues[0]!.code).toBe('zero-cube-extents')
    if (overrides.stretch[1] === -1) {
      expect(positions[1]!).toBeGreaterThan(positions[7]!)
      expect(positions[2]!).toBeGreaterThan(positions[5]!)
      expect(result.issues).toEqual([
        { code: 'zero-cube-extents', node: 0, path: 'elements[0]', count: 1 },
        { code: 'inverted-cube-extents', node: 0, path: 'elements[0]', count: 2 },
      ])
    }
  }
  const inverted = simple([
    cube({ from: [6, 9, 10], to: [-2, 3, 4], inflate: 0, stretch: [1, 1, 1] }),
  ])
  failure(
    () => convertBbmodelPositions(inverted.source, inverted.plans, inverted.transforms),
    'elements[0]',
  )
  const result = convertBbmodelPositions(inverted.source, inverted.plans, inverted.transforms, {
    nonPositiveCubes: 'preserve',
  })
  expect(result.issues).toEqual([
    { code: 'inverted-cube-extents', node: 0, path: 'elements[0]', count: 3 },
  ])
  expect([...result.geometries[0]!.positions.subarray(0, 3)]).toEqual([5, 7, 7])
  expect([...result.geometries[0]!.positions.subarray(21)]).toEqual([-3, 1, 1])
})

test('bbmodel point conversion retains signed zero and doubles, reporting values below drawing precision without rounding them', () => {
  const input = simple([
    mesh({
      origin: [0, 0, 0],
      vertices: { a: [1e-50, 0, 16], b: [0.12345678901234566, 3, 4] },
      faces: {},
    }),
  ])
  const shape = input.source[0] as BbmodelMesh
  shape.positions[1] = -0 // Typed source boundary preserves signed zero; JSON.stringify does not.
  const result = convertBbmodelPositions(input.source, input.plans, input.transforms)
  expect(result.geometries[0]!.positions).toEqual(shape.positions)
  expect(Object.is(result.geometries[0]!.positions[1], -0)).toBe(true)
  expect(result.geometries[0]!.positions[3]).not.toBe(Math.fround(shape.positions[3]!))
  expect(result.issues).toEqual([
    { code: 'sub-float32-local-points', node: 0, path: 'elements[0]', count: 1 },
    { code: 'sub-float32-world-points', node: 0, path: 'elements[0]', count: 1 },
  ])
})

import { expect, test } from 'bun:test'
import { readBbmodelAppearance } from './bbmodelAppearance'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { convertBbmodelFaceUvs, readBbmodelFaceUvOptions } from './bbmodelFaceUvs'
import { readBbmodelGeometry } from './bbmodelGeometry'
import { BBMODEL_CUBE_DIRECTIONS, type BbmodelCube, type BbmodelMesh } from './bbmodelGeometryTypes'
import { readBbmodelGraph } from './bbmodelGraph'
import { BbmodelInputError } from './bbmodelInput'
import { planBbmodelNativeGeometry } from './bbmodelNativeGeometryPlan'
import { planBbmodelSelection } from './bbmodelSelection'
import type { BbmodelVec2, BbmodelVec4 } from './bbmodelValues'

test('bbmodel missing mesh UV requires consent once per original corner and surplus UV is reported once per original face', () => {
  const input = fixture([
    mesh({
      faces: {
        'q " face': { vertices: ['__proto__', 'b', 'c', 'd'], uv: { b: [3, 4], extra: [99, 100] } },
      },
    }),
  ])
  const before = structuredClone(input)
  failure(
    () => convertBbmodelFaceUvs(input.source, input.plans, input.appearance),
    'unsupported',
    `elements[0].faces[${JSON.stringify('q " face')}].uv["__proto__"]`,
  )
  const result = convertBbmodelFaceUvs(input.source, input.plans, input.appearance, {
    missingMeshUvs: 'zero',
  })
  expect(result.geometries[0]!.faces.size).toBe(1)
  const corners = result.geometries[0]!.faces.get(0)!
  expect(corners).toEqual([
    [0, 0],
    [3, 4],
    [0, 0],
    [0, 0],
  ])
  expect(result.issues).toEqual([
    { code: 'missing-mesh-uv-filled', node: 0, path: 'elements[0]', count: 3 },
    { code: 'surplus-mesh-uv-omitted', node: 0, path: 'elements[0]', count: 1 },
  ])
  corners[0]![0] = 7
  expect(corners[2]).toEqual([0, 0])
  expect(input).toEqual(before)
})

test('bbmodel UV conversion ignores unselected, construction, disabled and explicitly omitted faces without reading their UV', () => {
  const input = fixture(
    [
      mesh({
        faces: {
          quad: {
            vertices: ['__proto__', 'b', 'c', 'd'],
            uv: Object.fromEntries(['__proto__', 'b', 'c', 'd'].map((id) => [id, [1, 1]])),
          },
          edge: { vertices: ['b', 'c'] },
          disabled: { vertices: ['__proto__', 'b', 'c'], texture: null },
          unsupported: { vertices: ['__proto__', 'b', 'c', 'd', '__proto__'] },
        },
      }),
      cube({ uuid: 'omitted' }),
    ],
    '5.0',
    { outliner: ['mesh'] },
  )
  const shape = input.source[0] as BbmodelMesh
  poison(shape, 'positions', 'origin', 'rotation')
  for (const face of shape.faces.slice(1)) poison(face, 'uv')
  poison(input.source[1]!, 'faces', 'from', 'to')
  poison(input.appearance, 'project', 'textures', 'groups')
  const result = convertBbmodelFaceUvs(input.source, input.plans, input.appearance)
  expect(result.geometries.map((row) => row.node)).toEqual([0])
  expect([...result.geometries[0]!.faces]).toEqual([
    [
      0,
      [
        [1, 1],
        [1, 1],
        [1, 1],
        [1, 1],
      ],
    ],
  ])
  expect(result.issues).toEqual([])
})

test('bbmodel authorial UV retains signed zero, huge finite units and coincident corners without preview nudges or image normalization', () => {
  const input = fixture([mesh()], '5.0', {
    resolution: { width: 1e308, height: 0.001 },
    textures: [{ uuid: 'unused', width: 512, height: 1024 }],
  })
  const shape = input.source[0] as BbmodelMesh
  const face = shape.faces[0]!
  for (const value of face.uv.values()) {
    value[0] = -0
    value[1] = 1e308
  }
  const before = structuredClone(input)
  poison(input.appearance, 'textures', 'project')
  const result = convertBbmodelFaceUvs(input.source, input.plans, input.appearance)
  for (const uv of result.geometries[0]!.faces.get(0)!) {
    expect(Object.is(uv[0], -0)).toBe(true)
    expect(uv[1]).toBe(1e308)
  }
  expect(shape).toEqual(before.source[0] as BbmodelMesh)
  expect(result.issues).toEqual([])
})

test('bbmodel generated UV checks retained surfaces, not numeric overflow in disabled cube rectangles', () => {
  const faces = Object.fromEntries(
    BBMODEL_CUBE_DIRECTIONS.map((direction) => [
      direction,
      { uv: [0, 0, 0, 0], texture: direction === 'north' ? false : null },
    ]),
  )
  const input = fixture([
    cube({ box_uv: true, from: [-5e307, 0, 0], to: [5e307, 1, 1], stretch: [1e-308, 1, 1], faces }),
  ])
  const result = convertBbmodelFaceUvs(input.source, input.plans, input.appearance)
  expect([...result.geometries[0]!.faces]).toEqual([[0, rectCorners([1, 1, 1e308, 2])]])
  const overflow = fixture([
    cube({ box_uv: true, from: [-5e307, 0, 0], to: [5e307, 1, 1], stretch: [1e-308, 1, 1] }),
  ])
  failure(
    () => convertBbmodelFaceUvs(overflow.source, overflow.plans, overflow.appearance),
    'unsupported',
    'elements[0].faces["south"].uv',
  )
})

test('bbmodel UV options and model format are strict and mismatched private plans remain programming errors', () => {
  expect(readBbmodelFaceUvOptions({})).toEqual({ missingMeshUvs: 'reject' })
  for (const value of [null, [], true, 'zero'])
    failure(() => readBbmodelFaceUvOptions(value as never), 'invalid', 'options')
  for (const missingMeshUvs of [null, 'unwrap', false])
    failure(
      () => readBbmodelFaceUvOptions({ missingMeshUvs } as never),
      'invalid',
      'options.missingMeshUvs',
    )
  failure(() => readBbmodelFaceUvOptions({ snap: true } as never), 'invalid', 'options.snap')
  const input = fixture([mesh()])
  expect(() => convertBbmodelFaceUvs([], input.plans, input.appearance)).toThrow(
    'Mismatched bbmodel UV source',
  )
  input.appearance.modelFormat = 'minecraft'
  failure(
    () => convertBbmodelFaceUvs(input.source, input.plans, input.appearance),
    'unsupported',
    'meta.model_format',
  )
  input.appearance.modelFormat = 'free'
  expect(convertBbmodelFaceUvs([], [], input.appearance)).toEqual({ geometries: [], issues: [] })
})

function cube(overrides: Record<string, unknown> = {}) {
  return {
    uuid: 'cube',
    type: 'cube',
    from: [0, 0, 0],
    to: [2.9, 3.4, 5.99999996],
    faces: Object.fromEntries(
      BBMODEL_CUBE_DIRECTIONS.map((direction) => [direction, { uv: [-2, 3, 11, 19] }]),
    ),
    ...overrides,
  }
}
function mesh(overrides: Record<string, unknown> = {}) {
  return {
    uuid: 'mesh',
    type: 'mesh',
    vertices: Object.fromEntries([
      ['__proto__', [0, 0, 0]],
      ['b', [2, 0, 0]],
      ['c', [2, 2, 0]],
      ['d', [0, 2, 1]],
    ]),
    faces: {
      quad: {
        vertices: ['__proto__', 'b', 'c', 'd'],
        uv: Object.fromEntries([
          ['__proto__', [1, 2]],
          ['b', [3, 4]],
          ['c', [5, 6]],
          ['d', [7, 8]],
        ]),
      },
    },
    ...overrides,
  }
}
function fixture(
  elements: Record<string, unknown>[],
  version: BbmodelVersion = '5.0',
  project: Record<string, unknown> = {},
) {
  const envelope = readBbmodelEnvelope(
    new TextEncoder().encode(
      JSON.stringify({
        ...project,
        meta: { format_version: version, model_format: 'free', ...(project.meta as object) },
        elements,
        outliner: project.outliner ?? elements.map((row) => row.uuid),
      }),
    ),
  )
  const graph = readBbmodelGraph(envelope)
  const source = readBbmodelGeometry(graph)
  const selection = planBbmodelSelection(envelope, graph, { unlisted: 'omit' })
  const plans = planBbmodelNativeGeometry(source, selection, { unsupportedFaces: 'omit' }).plans
  const appearance = readBbmodelAppearance(envelope)
  return { source, plans, appearance }
}
function rectCorners([u0, v0, u1, v1]: BbmodelVec4): BbmodelVec2[] {
  return [
    [u0, v0],
    [u0, v1],
    [u1, v1],
    [u1, v0],
  ]
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
function poison(target: object, ...keys: string[]) {
  for (const key of keys)
    Object.defineProperty(target, key, {
      get() {
        throw new Error(`Unexpected read: ${key}`)
      },
    })
}

test('bbmodel face UV preserves source order, source units and original-corner references through both quad topologies in every revision', () => {
  for (const version of ['4.9', '4.10', '5.0'] as const) {
    const input = fixture([cube(), mesh()], version, { resolution: { width: 64, height: 32 } })
    const before = structuredClone(input)
    const result = convertBbmodelFaceUvs(input.source, input.plans, input.appearance)
    expect(result.issues).toEqual([])
    for (const value of result.geometries[0]!.faces.values())
      expect(value).toEqual(rectCorners([-2, 3, 11, 19]))
    const uv = result.geometries[1]!.faces.get(0)!
    expect(uv).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ])
    expect(result.geometries[1]!.faces.size).toBe(1)
    expect(
      input.plans[1]!.faces.map((face) => face.corners.map((corner) => uv[corner.sourceCorner])),
    ).toEqual([
      [
        [1, 2],
        [3, 4],
        [5, 6],
      ],
      [
        [1, 2],
        [5, 6],
        [7, 8],
      ],
    ])
    const editable = structuredClone(input.plans)
    editable[1]!.faces = [
      {
        id: 'f_0_0',
        sourceFace: 0,
        corners: [0, 1, 2, 3].map((vertex) => ({ vertex, sourceCorner: vertex })),
      },
    ]
    expect(convertBbmodelFaceUvs(input.source, editable, input.appearance)).toEqual(result)
    uv[0]![0] = 999
    result.geometries[0]!.faces.get(0)![0]![0] = 888
    expect(result.geometries[0]!.faces.get(1)![0]![0]).toBe(-2)
    expect(input).toEqual(before)
  }
})

test('bbmodel box UV has independent six-surface orientation goldens, mirror swaps, offset and free size flooring', () => {
  const normal: BbmodelVec4[] = [
    [6.25, 5.5, 8.25, 8.5],
    [0.25, 5.5, 6.25, 8.5],
    [14.25, 5.5, 16.25, 8.5],
    [8.25, 5.5, 14.25, 8.5],
    [8.25, 5.5, 6.25, -0.5],
    [10.25, -0.5, 8.25, 5.5],
  ]
  const mirrored: BbmodelVec4[] = [
    [8.25, 5.5, 6.25, 8.5],
    [14.25, 5.5, 8.25, 8.5],
    [16.25, 5.5, 14.25, 8.5],
    [6.25, 5.5, 0.25, 8.5],
    [6.25, 5.5, 8.25, -0.5],
    [8.25, -0.5, 10.25, 5.5],
  ]
  for (const version of ['4.9', '4.10', '5.0'] as const)
    for (const mirror of [false, true]) {
      const input = fixture(
        [
          cube({
            box_uv: true,
            mirror_uv: mirror,
            uv_offset: [0.25, -0.5],
            inflate: 123,
            stretch: [4, -2, 0],
            origin: [20, 30, 40],
          }),
        ],
        version,
      )
      const before = structuredClone(input)
      const result = convertBbmodelFaceUvs(input.source, input.plans, input.appearance)
      expect([...result.geometries[0]!.faces.values()]).toEqual(
        (mirror ? mirrored : normal).map(rectCorners),
      )
      expect(result.issues).toEqual([
        { code: 'box-uv-materialized', node: 0, path: 'elements[0]', count: 6 },
      ])
      expect(input).toEqual(before)
    }
})

test('bbmodel project box UV inheritance distinguishes explicit false and keeps disabled faces out of generation', () => {
  for (const projectBox of [true, false, undefined])
    for (const shapeBox of [true, false, undefined]) {
      const input = fixture([cube({ box_uv: shapeBox })], '5.0', { meta: { box_uv: projectBox } })
      const enabled = shapeBox ?? projectBox ?? false
      const shape = input.source[0] as BbmodelCube
      if (enabled) for (const face of shape.faces) poison(face, 'uv')
      else poison(shape, 'from', 'to', 'uvOffset', 'mirrorUv')
      const result = convertBbmodelFaceUvs(input.source, input.plans, input.appearance)
      expect(result.issues.length).toBe(enabled ? 1 : 0)
      expect(result.geometries[0]!.faces.get(0)).toEqual(
        enabled ? rectCorners([6, 6, 8, 9]) : rectCorners([-2, 3, 11, 19]),
      )
    }
  const input = fixture([
    cube({
      box_uv: true,
      faces: Object.fromEntries(
        BBMODEL_CUBE_DIRECTIONS.map((direction) => [
          direction,
          { uv: [0, 0, 0, 0], texture: null },
        ]),
      ),
    }),
  ])
  poison(input.source[0]!, 'from', 'to', 'faces', 'uvOffset')
  const result = convertBbmodelFaceUvs(input.source, input.plans, input.appearance)
  expect(result.geometries[0]!.faces.size).toBe(0)
  expect(result.issues).toEqual([])
})

test('bbmodel UV quarter turns preserve oriented rectangles and use bounded indexing for safe huge angles without coercing arbitrary rotations', () => {
  const highestQuarter = Number.MAX_SAFE_INTEGER - (Number.MAX_SAFE_INTEGER % 90)
  for (const rotation of [0, -0, 90, 180, 270, 360, 450, highestQuarter]) {
    const input = fixture([
      cube({
        faces: Object.fromEntries(
          BBMODEL_CUBE_DIRECTIONS.map((direction) => [
            direction,
            { uv: [11, 19, -2, 3], rotation },
          ]),
        ),
      }),
    ])
    const values = convertBbmodelFaceUvs(
      input.source,
      input.plans,
      input.appearance,
    ).geometries[0]!.faces.get(0)!
    const original = rectCorners([11, 19, -2, 3])
    const turn = (rotation / 90) % 4
    expect(values).toEqual([...original.slice(turn), ...original.slice(0, turn)])
  }
  for (const rotation of [-90, 45, 90.5, 1e308]) {
    const input = fixture([
      cube({
        faces: Object.fromEntries(
          BBMODEL_CUBE_DIRECTIONS.map((direction) => [direction, { uv: [0, 0, 16, 16], rotation }]),
        ),
      }),
    ])
    failure(
      () => convertBbmodelFaceUvs(input.source, input.plans, input.appearance),
      'unsupported',
      'elements[0].faces["north"].rotation',
    )
  }
})

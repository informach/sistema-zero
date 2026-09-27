import { expect, test } from 'bun:test'
import { encodeSceneGlb } from '../export/sceneGlb'
import { makeSceneAssistedSkinFixture } from '../testing/sceneAssistedSkin'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import type { GltfAccessorType } from './gltfAccessorLayout'
import { type GltfAccessor, readGltfAccessors } from './gltfAccessors'
import { readGltfBuffers } from './gltfBuffers'
import { readGltfEnvelope } from './gltfEnvelope'
import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'
import { readGltfMeshes } from './gltfMeshes'

function attribute(
  values: number[],
  type: GltfAccessorType = 'VEC3',
  options: Partial<GltfAccessor> = {},
): GltfAccessor {
  const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }[type]
  return {
    type,
    componentType: 5126,
    count: values.length / components,
    normalized: false,
    values: Float64Array.from(values),
    min: Array.from({ length: components }, (_, c) =>
      Math.min(...values.filter((_, i) => i % components === c)),
    ),
    max: Array.from({ length: components }, (_, c) =>
      Math.max(...values.filter((_, i) => i % components === c)),
    ),
    layout: null,
    sparseViews: null,
    ...options,
  }
}
const positions = (count: number) => attribute(Array<number>(count * 3).fill(0))
const indexAccessor = (values: number[], options: Partial<GltfAccessor> = {}) =>
  attribute(values, 'SCALAR', { componentType: 5123, ...options })
const primitive = (extra: Record<string, unknown> = {}) => ({
  attributes: { POSITION: 0 },
  ...extra,
})
const layout = (
  bufferView: number,
  byteStride: number | null = null,
): NonNullable<GltfAccessor['layout']> => ({ bufferView, byteOffset: 0, byteStride, target: null })
function failure(run: () => unknown, reason: GltfInputError['reason'] = 'invalid') {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  expect((error as GltfInputError).reason).toBe(reason)
}

test.each([
  [0, 4, 'points', [0, 1, 2, 3]],
  [1, 4, 'lines', [0, 1, 2, 3]],
  [2, 4, 'lines', [0, 1, 1, 2, 2, 3, 3, 0]],
  [3, 4, 'lines', [0, 1, 1, 2, 2, 3]],
  [4, 6, 'triangles', [0, 1, 2, 3, 4, 5]],
  [5, 4, 'triangles', [0, 1, 2, 1, 3, 2]],
  [6, 4, 'triangles', [1, 2, 0, 2, 3, 0]],
] as const)('mode %s expands ordered indexed and implicit topology without changing winding', (mode, count, kind, expected) => {
  for (const indexed of [false, true]) {
    const indices = Array.from({ length: count }, (_, i) => count - 1 - i)
    const accessors = [positions(count), indexAccessor(indices)]
    const input = [
      { name: 'Peça', primitives: [primitive({ mode, ...(indexed ? { indices: 1 } : {}) })] },
    ]
    const before = structuredClone(input)
    const result = readGltfMeshes(input, accessors).meshes[0]!
    expect(result.name).toBe('Peça')
    expect(result.primitives[0]!.topology).toEqual({
      kind,
      indices: Uint32Array.from(expected.map((i) => (indexed ? indices[i]! : i))),
    })
    expect(result.primitives[0]!.attributes).toEqual(new Map([['POSITION', 0]]))
    expect(result.weights).toEqual([])
    result.primitives[0]!.topology.indices.fill(99)
    expect(Array.from(accessors[1]!.values)).toEqual(indices)
    expect(input).toEqual(before)
  }
})

test('keeps degenerate primitives, missing POSITION and independent material references explicit for later conversion', () => {
  const accessors = [positions(3), indexAccessor([0, 0, 2]), attribute([1, 1, 1, 1, 1, 1], 'VEC2')]
  const result = readGltfMeshes(
    [
      {
        primitives: [
          primitive({ indices: 1, material: 1 }),
          { attributes: { TEXCOORD_0: 2 }, mode: 0 },
        ],
      },
    ],
    accessors,
    2,
  ).meshes[0]!
  expect(Array.from(result.primitives[0]!.topology.indices)).toEqual([0, 0, 2])
  expect(result.primitives[0]!.material).toBe(1)
  expect(result.primitives[1]!.material).toBeNull()
  expect(result.primitives[1]!.attributes.has('POSITION')).toBe(false)
  expect(result.primitives[1]!.topology.kind).toBe('points')
  failure(() => readGltfMeshes([{ primitives: [primitive({ material: 2 })] }], accessors, 2))
  failure(() => readGltfMeshes([{ primitives: [primitive({ material: null })] }], accessors, 2))
})

test('rejects topology counts, out-of-range indices, primitive restart and invalid indices types', () => {
  for (const [mode, count] of [
    [1, 3],
    [2, 1],
    [3, 1],
    [4, 4],
    [5, 2],
    [6, 2],
  ])
    failure(() => readGltfMeshes([{ primitives: [primitive({ mode })] }], [positions(count!)]))
  for (const index of [-1, 3, 99])
    failure(() =>
      readGltfMeshes(
        [{ primitives: [primitive({ indices: 1 })] }],
        [positions(3), indexAccessor([0, 1, index])],
      ),
    )
  for (const componentType of [5121, 5123, 5125] as const) {
    const restart = componentType === 5121 ? 255 : componentType === 5123 ? 65535 : 4294967295
    failure(() =>
      readGltfMeshes(
        [{ primitives: [primitive({ indices: 1 })] }],
        [positions(3), indexAccessor([0, 1, restart], { componentType })],
      ),
    )
  }
  failure(() =>
    readGltfMeshes(
      [{ primitives: [primitive({ indices: 1 })] }],
      [positions(256), indexAccessor([0, 1, 255], { componentType: 5121 })],
    ),
  )
  for (const options of [{ normalized: true }, { componentType: 5126 }, { type: 'VEC3' }] as const)
    failure(() =>
      readGltfMeshes(
        [{ primitives: [primitive({ indices: 1 })] }],
        [positions(3), indexAccessor([0, 1, 2], options)],
      ),
    )
  for (const mode of [-1, 7, null, '4'])
    failure(() => readGltfMeshes([{ primitives: [primitive({ mode })] }], [positions(3)]))
})

test('validates attribute types, counts, bounds, set numbering and joint/weight pairs without dropping custom data', () => {
  const accessors = [
    positions(3),
    attribute(Array(6).fill(0), 'VEC2'),
    attribute(Array(12).fill(0), 'VEC4', { componentType: 5121 }),
    attribute(Array(12).fill(0.25), 'VEC4'),
    attribute(Array(9).fill(0.5), 'VEC3', { componentType: 5121, normalized: true }),
  ]
  const attributes = {
    POSITION: 0,
    TEXCOORD_0: 1,
    TEXCOORD_1: 1,
    COLOR_0: 4,
    JOINTS_0: 2,
    WEIGHTS_0: 3,
    _TEMPERATURE: 4,
  }
  expect(
    readGltfMeshes([{ primitives: [{ attributes }] }], accessors).meshes[0]!.primitives[0]!
      .attributes.size,
  ).toBe(7)
  for (const fields of [
    { POSITION: 1 },
    { POSITION: 0, NORMAL: 1 },
    { POSITION: 0, TANGENT: 3 },
    { POSITION: 0, TEXCOORD_1: 1 },
    { POSITION: 0, TEXCOORD_00: 1 },
    { POSITION: 0, COLOR_0: 2 },
    { POSITION: 0, JOINTS_0: 2 },
    { POSITION: 0, WEIGHTS_0: 3 },
    { POSITION: 0, JOINTS_0: 3, WEIGHTS_0: 2 },
  ])
    failure(() => readGltfMeshes([{ primitives: [{ attributes: fields }] }], accessors))
  for (const patch of [{ min: null }, { max: null }, { normalized: true }, { count: 4 }])
    failure(() =>
      readGltfMeshes(
        [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 } }] }],
        [{ ...accessors[0]!, ...patch }, accessors[1]!],
      ),
    )
  failure(
    () =>
      readGltfMeshes([{ primitives: [{ attributes: { POSITION: 0, UNKNOWN: 1 } }] }], accessors),
    'unsupported',
  )
  failure(() =>
    readGltfMeshes(
      [{ primitives: [{ attributes: { POSITION: 0, _CUSTOM: 1 } }] }],
      [accessors[0]!, attribute([0, 1, 2], 'SCALAR', { componentType: 5125 })],
    ),
  )
})

test('tracks shared bufferView roles and requires stride for distinct vertex accessors, not repeated references', () => {
  const accessors = [positions(3), positions(3), indexAccessor([0, 1, 2])]
  accessors[0]!.layout = layout(0)
  accessors[1]!.layout = layout(0)
  accessors[2]!.layout = layout(1)
  const one = readGltfMeshes(
    [{ primitives: [primitive({ indices: 2 }), primitive({ indices: 2 })] }],
    accessors,
  )
  expect(one.viewUses.get(0)!.accessors.size).toBe(1)
  expect(one.viewUses.get(1)!.role).toBe('indices')
  failure(() =>
    readGltfMeshes([{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 } }] }], accessors),
  )
  accessors[0]!.layout = layout(0, 24)
  accessors[1]!.layout = { ...layout(0, 24), byteOffset: 12 }
  expect(
    readGltfMeshes(
      [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 } }] }],
      accessors,
    ).viewUses.get(0)!.accessors.size,
  ).toBe(2)
  accessors[2]!.layout = layout(0)
  failure(() => readGltfMeshes([{ primitives: [primitive({ indices: 2 })] }], accessors))
  accessors[0]!.layout = { ...layout(0), target: 34963 }
  failure(() => readGltfMeshes([{ primitives: [primitive()] }], accessors))
  accessors[0]!.layout = { ...layout(0), byteOffset: 2 }
  failure(() => readGltfMeshes([{ primitives: [primitive()] }], accessors))
  const colors = attribute(Array(9).fill(0), 'VEC3', {
    componentType: 5121,
    normalized: true,
    layout: layout(2),
  })
  failure(() =>
    readGltfMeshes(
      [{ primitives: [{ attributes: { POSITION: 0, COLOR_0: 1 } }] }],
      [positions(3), colors],
    ),
  )
})

test('morphs may replace only UV set 1, preserve target order/default weights and require matching bases/counts', () => {
  const accessors = [
    positions(3),
    attribute(Array(6).fill(0.5), 'VEC2'),
    attribute(Array(6).fill(0.1), 'VEC2'),
    positions(3),
  ]
  const base = {
    attributes: { POSITION: 0, TEXCOORD_0: 1, TEXCOORD_1: 1 },
    targets: [{ TEXCOORD_1: 2 }, { POSITION: 3 }],
  }
  const source = [{ name: 'Forma', primitives: [base, base], weights: [-1, 0.5] }]
  const mesh = readGltfMeshes(source, accessors).meshes[0]!
  expect(mesh.weights).toEqual([-1, 0.5])
  expect(mesh.primitives[0]!.targets).toEqual([
    new Map([['TEXCOORD_1', 2]]),
    new Map([['POSITION', 3]]),
  ])
  expect(readGltfMeshes([{ primitives: [base] }], accessors).meshes[0]!.weights).toEqual([0, 0])
  mesh.weights[0] = 10
  mesh.primitives[0]!.targets[0]!.clear()
  expect(source[0]!.weights).toEqual([-1, 0.5])
  expect(source[0]!.primitives[0]!.targets[0]).toEqual({ TEXCOORD_1: 2 })
  failure(() => readGltfMeshes([{ primitives: [base, primitive()] }], accessors))
  failure(() => readGltfMeshes([{ primitives: [base], weights: [1] }], accessors))
  failure(() =>
    readGltfMeshes(
      [{ primitives: [{ attributes: { POSITION: 0 }, targets: [{ NORMAL: 3 }] }] }],
      accessors,
    ),
  )
  failure(() =>
    readGltfMeshes(
      [{ primitives: [{ attributes: { POSITION: 0 }, targets: [{ POSITION: 1 }] }] }],
      accessors,
    ),
  )
})

test('shared tangent data is checked once per import, not once per referencing primitive', () => {
  const count = 1000,
    values = Array.from({ length: count }, () => [1, 0, 0, 1]).flat()
  const tangent = attribute(values, 'VEC4'),
    own = tangent.values
  let reads = 0
  Object.defineProperty(tangent, 'values', {
    get() {
      reads++
      return own
    },
  })
  const source = [
    {
      primitives: Array.from({ length: 100 }, () => ({
        attributes: { POSITION: 0, TANGENT: 1 },
        indices: 2,
      })),
    },
  ]
  const result = readGltfMeshes(source, [positions(count), tangent, indexAccessor([0, 1, 2])])
  expect(result.meshes[0]!.primitives).toHaveLength(100)
  expect(reads).toBeLessThanOrEqual(count * 2 + 1)
  own[3] = 0
  failure(() => readGltfMeshes(source, [positions(count), tangent, indexAccessor([0, 1, 2])]))
})

test('bounds metadata and expanded topology before output allocation and refuses malformed rows', () => {
  const accessors = [positions(3)]
  for (const input of [
    null,
    [],
    {},
    [null],
    [{}],
    [{ primitives: [] }],
    [{ primitives: [null] }],
    [{ primitives: [{ attributes: {} }] }],
  ])
    failure(() => readGltfMeshes(input, accessors))
  expect(readGltfMeshes(undefined, accessors).meshes).toEqual([])
  failure(
    () =>
      readGltfMeshes(
        Array.from({ length: GLTF_INPUT_LIMITS.meshes + 1 }, () => ({ primitives: [primitive()] })),
        accessors,
      ),
    'budget',
  )
  failure(
    () =>
      readGltfMeshes(
        [
          {
            primitives: Array.from({ length: GLTF_INPUT_LIMITS.primitives + 1 }, () => primitive()),
          },
        ],
        accessors,
      ),
    'budget',
  )
  const fields = Object.fromEntries(
    Array.from({ length: GLTF_INPUT_LIMITS.attributes + 1 }, (_, i) => [`_A${i}`, 0]),
  )
  failure(() => readGltfMeshes([{ primitives: [{ attributes: fields }] }], accessors), 'budget')
  failure(
    () =>
      readGltfMeshes(
        [
          {
            primitives: [
              primitive({
                targets: Array.from({ length: GLTF_INPUT_LIMITS.morphTargets + 1 }, () => ({
                  POSITION: 0,
                })),
              }),
            ],
          },
        ],
        accessors,
      ),
    'budget',
  )
  // Valid decoded zero accessor; no expanded topology may be allocated for this fan.
  const large = { ...accessors[0]!, count: GLTF_INPUT_LIMITS.topologyIndices }
  failure(() => readGltfMeshes([{ primitives: [primitive({ mode: 6 })] }], [large]), 'budget')
})

test('attribute budgets precede value enumeration and set names cannot hide line breaks', () => {
  const fields: Record<string, unknown> = {}
  for (let i = 0; i <= GLTF_INPUT_LIMITS.attributes; i++)
    Object.defineProperty(fields, `_A${i}`, {
      enumerable: true,
      get() {
        throw new Error('Attribute values must not be read over budget')
      },
    })
  failure(
    () => readGltfMeshes([{ primitives: [{ attributes: fields }] }], [positions(3)]),
    'budget',
  )
  failure(() =>
    readGltfMeshes(
      [{ primitives: [{ attributes: { POSITION: 0, 'TEXCOORD_0\n': 1 } }] }],
      [positions(3), attribute(Array(6).fill(0), 'VEC2')],
    ),
  )
})

test('real textured/animated and assisted/skinned exports preserve every primitive index/attribute/material reference', () => {
  for (const document of [
    makeSceneGlbFixture(2, 2, 3, 2),
    makeSceneAssistedSkinFixture('local').document,
  ]) {
    const before = structuredClone(document)
    const source = readGltfEnvelope(encodeSceneGlb(document, { allowLosses: true }).bytes),
      resources = readGltfBuffers(source)
    if (resources.status !== 'ready') throw new Error('Self-contained fixture expected')
    const accessors = readGltfAccessors(source.json.accessors, resources)
    const original = source.json.meshes as Array<{
      primitives: Array<{ attributes: Record<string, number>; indices: number; material: number }>
    }>
    const result = readGltfMeshes(original, accessors, (source.json.materials as unknown[]).length)
    for (const [m, mesh] of result.meshes.entries())
      for (const [p, primitive] of mesh.primitives.entries()) {
        const raw = original[m]!.primitives[p]!
        expect(primitive.attributes).toEqual(new Map(Object.entries(raw.attributes)))
        expect(primitive.material).toBe(raw.material)
        expect(Array.from(primitive.topology.indices)).toEqual(
          Array.from(accessors[raw.indices]!.values),
        )
      }
    expect(document).toEqual(before)
  }
})

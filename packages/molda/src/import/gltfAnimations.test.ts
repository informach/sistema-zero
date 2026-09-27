import { expect, test } from 'bun:test'
import type { GltfAccessor } from './gltfAccessors'
import { readGltfAnimations } from './gltfAnimations'
import { readGltfGraph } from './gltfGraph'
import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'
import { readGltfMeshes } from './gltfMeshes'

function accessor(values: ArrayLike<number>, type: GltfAccessor['type'] = 'SCALAR'): GltfAccessor {
  const width = type === 'VEC4' ? 4 : type === 'VEC3' ? 3 : 1
  return {
    type,
    componentType: 5126,
    count: values.length / width,
    normalized: false,
    values: Float64Array.from(values, Math.fround),
    min: type === 'SCALAR' ? [Math.fround(values[0]!)] : [0, 0, 0],
    max: type === 'SCALAR' ? [Math.fround(values[values.length - 1]!)] : [0, 0, 0],
    layout: null,
    sparseViews: null,
  }
}
function fixture(output = accessor([1, 2, 3, 4, 5, 6], 'VEC3'), morphs = 0) {
  const accessors = [accessor([0.125, 1.5]), output, accessor([0, 0, 0], 'VEC3')]
  const { meshes, viewUses: meshUses } = readGltfMeshes(
    [
      {
        primitives: [
          {
            mode: 0,
            attributes: { POSITION: 2 },
            ...(morphs
              ? {
                  targets: Array.from({ length: morphs }, () => ({ POSITION: 2 })),
                }
              : {}),
          },
        ],
      },
    ],
    accessors,
  )
  const graph = readGltfGraph({ nodes: [{}, { mesh: 0 }] }, meshes)
  return { accessors, meshes, meshUses, graph, skins: [] }
}
function animation(path = 'translation', node: number | undefined = 0, interpolation?: string) {
  return {
    name: '',
    samplers: [{ input: 0, output: 1, ...(interpolation === undefined ? {} : { interpolation }) }],
    channels: [{ sampler: 0, target: { path, ...(node === undefined ? {} : { node }) } }],
  }
}
function fails(run: () => unknown, path: string, reason: GltfInputError['reason'] = 'invalid') {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  if (!(error instanceof GltfInputError)) throw new Error('Expected structured animation error')
  expect(error.path).toBe(path)
  expect(error.reason).toBe(reason)
}
const samplerPath = 'animations[0].samplers[0]',
  channelPath = 'animations[0].channels[0]'

test('animations own their metadata and keep source time, curves and values untouched', () => {
  const source = fixture(),
    row = animation(),
    before = structuredClone(source.accessors)
  const result = readGltfAnimations([row], source)
  expect(result).toEqual([
    {
      name: '',
      samplers: [{ input: 0, output: 1, interpolation: 'LINEAR' }],
      channels: [{ sampler: 0, target: { kind: 'node', node: 0, path: 'translation' } }],
    },
  ])
  expect(source.accessors).toEqual(before)
  result[0]!.samplers[0]!.output = 0
  result[0]!.channels[0]!.target.node = 1
  expect(row.samplers[0]!.output).toBe(1)
  expect(row.channels[0]!.target.node).toBe(0)
  expect(readGltfAnimations([row], source)[0]!.samplers[0]!.output).toBe(1)
  expect(readGltfAnimations(undefined, source)).toEqual([])
  for (const method of ['STEP', 'CUBICSPLINE'] as const) {
    const data = fixture(accessor(new Float64Array(method === 'STEP' ? 6 : 18), 'VEC3'))
    expect(
      readGltfAnimations([animation('scale', 0, method)], data)[0]!.samplers[0]!.interpolation,
    ).toBe(method)
  }
})

test('required arrays, dense entries, names, references and interpolation are checked', () => {
  const source = fixture()
  for (const value of [null, [], {}, [null], new Array(1)])
    expect(() => readGltfAnimations(value, source)).toThrow(GltfInputError)
  for (const field of ['samplers', 'channels'])
    for (const value of [undefined, null, [], {}, new Array(1)])
      expect(() => readGltfAnimations([{ ...animation(), [field]: value }], source)).toThrow(
        GltfInputError,
      )
  for (const value of [null, -1, 0.5, 10, '0']) {
    for (const field of ['input', 'output'])
      fails(
        () =>
          readGltfAnimations(
            [{ ...animation(), samplers: [{ input: 0, output: 1, [field]: value }] }],
            source,
          ),
        `${samplerPath}.${field}`,
      )
    fails(
      () =>
        readGltfAnimations(
          [{ ...animation(), channels: [{ sampler: value, target: { node: 0, path: 'scale' } }] }],
          source,
        ),
      `${channelPath}.sampler`,
    )
    fails(
      () =>
        readGltfAnimations(
          [{ ...animation(), channels: [{ sampler: 0, target: { node: value, path: 'scale' } }] }],
          source,
        ),
      `${channelPath}.target.node`,
    )
  }
  for (const name of [null, 3])
    expect(() => readGltfAnimations([{ ...animation(), name }], source)).toThrow(GltfInputError)
  fails(
    () => readGltfAnimations([animation('translation', 0, 'CATMULLROM')], source),
    `${samplerPath}.interpolation`,
    'unsupported',
  )
})

test('time formats, bounds, strict monotonicity and cubic cardinality are validated', () => {
  for (const times of [
    [-1, 1],
    [0, 0],
    [2, 1],
  ]) {
    const source = fixture()
    source.accessors[0] = accessor(times)
    fails(() => readGltfAnimations([animation()], source), `${samplerPath}.input`)
  }
  for (const change of [
    { type: 'VEC3' as const },
    { componentType: 5123 as const },
    { normalized: true },
    { min: null },
    { max: null },
  ]) {
    const source = fixture()
    Object.assign(source.accessors[0]!, change)
    fails(() => readGltfAnimations([animation()], source), `${samplerPath}.input`)
  }
  const one = fixture(accessor([0, 0, 0], 'VEC3'))
  one.accessors[0] = accessor([2 ** -149])
  expect(readGltfAnimations([animation()], one)).toHaveLength(1)
  fails(
    () => readGltfAnimations([animation('translation', 0, 'CUBICSPLINE')], one),
    `${samplerPath}.input`,
  )
  const source = fixture()
  source.accessors[0] = accessor([0.125, 0.25, 1.5])
  fails(() => readGltfAnimations([animation()], source), `${channelPath}.sampler`)
})

test('quantized rotations and morph weights preserve signed components and all targets', () => {
  for (const componentType of [5120, 5121, 5122, 5123, 5126] as const) {
    const values = accessor([0, 0, 0, 1, 0, 0, 1, 0], 'VEC4')
    values.componentType = componentType
    values.normalized = componentType !== 5126
    const source = fixture(values)
    expect(readGltfAnimations([animation('rotation')], source)).toHaveLength(1)
    const weights = fixture(
      { ...values, type: 'SCALAR', count: 8, values: new Float64Array(values.values) },
      4,
    )
    weights.accessors[1]!.values[0] =
      componentType === 5126 ? -2 : componentType === 5120 || componentType === 5122 ? -1 : 0
    const original = new Float64Array(weights.accessors[1]!.values)
    expect(readGltfAnimations([animation('weights', 1)], weights)).toHaveLength(1)
    expect(weights.accessors[1]!.values).toEqual(original)
    expect(source.accessors[1]!.values[0]).toBe(0)
    fails(() => readGltfAnimations([animation('scale')], source), `${channelPath}.sampler`)
  }
  const source = fixture(accessor([0, 0, 0, 1, 0, 0, 1, 0], 'VEC4'))
  source.accessors[1]!.normalized = true
  fails(() => readGltfAnimations([animation('rotation')], source), `${channelPath}.sampler`)
  source.accessors[1]!.componentType = 5125
  fails(() => readGltfAnimations([animation('rotation')], source), `${channelPath}.sampler`)
  fails(
    () => readGltfAnimations([animation('weights', 1)], fixture(accessor([0, 1]))),
    `${channelPath}.target.node`,
  )
})

test('quaternion checks skip cubic tangents but preserve antipodes and quantization error', () => {
  const data = accessor(
    [100, 3, -4, 5, 0, 0, 0, 1, -80, 0, 0, 0, 0, 900, 0, 0, 0, 0, 0, -1, 0, 0, -700, 0],
    'VEC4',
  )
  const source = fixture(data),
    before = new Float64Array(data.values)
  expect(readGltfAnimations([animation('rotation', 0, 'CUBICSPLINE')], source)).toHaveLength(1)
  expect(data.values).toEqual(before)
  data.values[7] = 0
  fails(
    () => readGltfAnimations([animation('rotation', 0, 'CUBICSPLINE')], source),
    `${channelPath}.sampler`,
  )
  for (const length of [0, 0.98, 1.02]) {
    const invalid = fixture(accessor([0, 0, 0, length, 0, 0, 0, 1], 'VEC4'))
    fails(() => readGltfAnimations([animation('rotation')], invalid), `${channelPath}.sampler`)
  }
  const quantized = accessor([64 / 127, 64 / 127, 64 / 127, 63 / 127, 0, 0, 0, -1], 'VEC4')
  quantized.componentType = 5120
  quantized.normalized = true
  expect(readGltfAnimations([animation('rotation')], fixture(quantized))).toHaveLength(1)
})

test('targets are unique within each clip and unresolved targets never default to node zero', () => {
  const source = fixture(),
    row = animation()
  row.channels.push({ ...row.channels[0]! })
  fails(() => readGltfAnimations([row], source), 'animations[0].channels[1].target')
  expect(readGltfAnimations([animation(), animation()], source)).toHaveLength(2)
  const missing = { ...animation(), channels: [{ sampler: 0, target: { path: 'translation' } }] }
  const result = readGltfAnimations([missing, animation('pointer')], source)
  expect(result.map((clip) => clip.channels[0]!.target)).toEqual([
    { kind: 'unresolved', node: null, path: 'translation' },
    { kind: 'unresolved', node: 0, path: 'pointer' },
  ])
  expect(
    readGltfAnimations(
      [{ ...missing, channels: [...missing.channels, ...missing.channels] }],
      source,
    ),
  ).toHaveLength(1)
  source.graph.nodes[0]!.transform = {
    kind: 'affine',
    matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  }
  fails(() => readGltfAnimations([animation()], source), `${channelPath}.target.node`)
})

test('numeric roles prevent reuse as input/output, mesh data, or a skin matrix view', () => {
  const source = fixture()
  fails(
    () => readGltfAnimations([{ ...animation(), samplers: [{ input: 0, output: 0 }] }], source),
    `${samplerPath}.output`,
  )
  fails(
    () => readGltfAnimations([{ ...animation(), samplers: [{ input: 0, output: 2 }] }], source),
    `${samplerPath}.output`,
  )
  for (const change of [{ byteStride: 12 }, { target: 34962 as const }]) {
    source.accessors[1]!.layout = {
      bufferView: 7,
      byteOffset: 0,
      byteStride: null,
      target: null,
      ...change,
    }
    fails(() => readGltfAnimations([animation()], source), `${samplerPath}.output`)
  }
  source.accessors[1]!.layout = { bufferView: 7, byteOffset: 0, byteStride: null, target: null }
  source.meshUses.set(7, { role: 'vertex', accessors: new Set([2]) })
  fails(() => readGltfAnimations([animation()], source), `${samplerPath}.output`)
  source.meshUses.clear()
  source.accessors[2]!.layout = { ...source.accessors[1]!.layout }
  fails(
    () =>
      readGltfAnimations([animation()], {
        ...source,
        skins: [{ name: null, joints: [0], skeleton: null, inverseBindMatrices: 2 }],
      }),
    `${samplerPath}.output`,
  )
})

test('shared time and quaternion values are checked once per interpretation and never cached across reads', () => {
  const source = fixture(accessor([0, 0, 0, 1, 0, 0, 0, 1], 'VEC4'))
  let reads = 0
  for (const entry of source.accessors.slice(0, 2)) {
    const data = entry.values
    Object.defineProperty(entry, 'values', {
      configurable: true,
      get() {
        reads++
        return data
      },
    })
  }
  const clips = Array.from({ length: GLTF_INPUT_LIMITS.animations }, () => animation('rotation'))
  expect(readGltfAnimations(clips, source)).toHaveLength(GLTF_INPUT_LIMITS.animations)
  expect(reads).toBe(2)
  source.accessors[0]!.values[1] = 0.125
  fails(() => readGltfAnimations(clips, source), `${samplerPath}.input`)
})

test('quaternion cache distinguishes cubic tangents from linear values sharing the same accessor', () => {
  const data = accessor(
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    'VEC4',
  )
  const source = fixture(data)
  source.accessors.push(accessor([0, 1, 2, 3, 4, 5]))
  const cubic = animation('rotation', 0, 'CUBICSPLINE')
  const linear = { ...animation('rotation'), samplers: [{ input: 3, output: 1 }] }
  expect(readGltfAnimations([cubic], source)).toHaveLength(1)
  fails(() => readGltfAnimations([cubic, linear], source), 'animations[1].channels[0].sampler')
})

test('distinct time/output accessors may share a packed non-vertex view without taking ownership', () => {
  const source = fixture()
  source.accessors[0]!.layout = { bufferView: 4, byteOffset: 0, byteStride: null, target: null }
  source.accessors[1]!.layout = { bufferView: 4, byteOffset: 8, byteStride: null, target: null }
  const before = structuredClone(source.accessors)
  expect(readGltfAnimations([animation()], source)).toHaveLength(1)
  expect(source.accessors).toEqual(before)
  source.accessors[0] = accessor([0, 3600])
  expect(readGltfAnimations([animation()], source)).toHaveLength(1)
  expect(source.accessors[0]!.values[1]).toBe(3600)
})

test('aggregate metadata budgets are checked before array entries or numeric data', () => {
  const source = fixture()
  const untouched = new Array(1)
  Object.defineProperty(untouched, 0, {
    get() {
      throw new Error('Entries must stay unopened')
    },
  })
  fails(
    () =>
      readGltfAnimations(
        Array.from({ length: 1025 }, () => animation()),
        source,
      ),
    'animations',
    'budget',
  )
  for (const field of ['samplers', 'channels'] as const) {
    const rows = Array.from({ length: 1024 }, () => ({
      ...animation(),
      samplers: untouched,
      channels: untouched,
      [field]: new Array(64),
    }))
    rows[1023]![field] = new Array(65)
    fails(() => readGltfAnimations(rows, source), 'animations', 'budget')
  }
})

test('exact animation work budget includes distinct linear/cubic interpretations before opening values', () => {
  const count = 629145
  const accessors = [
    accessor(Float64Array.from({ length: count }, (_, i) => i)),
    accessor(Float64Array.from({ length: count / 3 }, (_, i) => i)),
    accessor(
      Float64Array.from({ length: count * 4 }, (_, i) => (i % 4 === 3 ? 1 : 0)),
      'VEC4',
    ),
    accessor([0, 1, 2, 3]),
    accessor([0, 0, 0, 0]),
  ]
  const source = {
    graph: readGltfGraph({ nodes: [{}] }, []),
    meshes: [],
    skins: [],
    meshUses: new Map(),
    accessors,
  }
  const clips = [
    { ...animation('rotation'), samplers: [{ input: 0, output: 2 }] },
    { ...animation('rotation'), samplers: [{ input: 1, output: 2, interpolation: 'CUBICSPLINE' }] },
    { ...animation('pointer'), samplers: [{ input: 3, output: 4 }] },
  ]
  expect(count + count / 3 + count * 4 + (count / 3) * 4 + 4).toBe(
    GLTF_INPUT_LIMITS.animationValues,
  )
  expect(accessors.reduce((sum, entry) => sum + entry.values.length, 0)).toBeLessThan(
    GLTF_INPUT_LIMITS.accessorValues,
  )
  expect(readGltfAnimations(clips, source)).toHaveLength(3)
  accessors[3] = accessor([0, 1, 2, 3, 4])
  accessors[4] = accessor([0, 0, 0, 0, 0])
  for (const entry of accessors)
    Object.defineProperty(entry, 'values', {
      get() {
        throw new Error('Budget must precede data')
      },
    })
  fails(() => readGltfAnimations(clips, source), 'animations[2].samplers[0].input', 'budget')
})

test('exact sampler/channel limits and cubic morph flattening retain their authored shape', () => {
  const source = fixture(),
    row = animation()
  const channel = { sampler: 0, target: { path: 'translation' } }
  const clips = Array.from({ length: 1024 }, () => ({
    ...row,
    samplers: Array.from({ length: 64 }, () => ({ input: 0, output: 1 })),
    channels: Array.from({ length: 64 }, () => channel),
  }))
  expect(
    readGltfAnimations(clips, source).reduce((sum, clip) => sum + clip.channels.length, 0),
  ).toBe(65536)
  const morph = fixture(accessor(Array.from({ length: 24 }, (_, i) => i - 12)), 4)
  expect(readGltfAnimations([animation('weights', 1, 'CUBICSPLINE')], morph)).toHaveLength(1)
  morph.accessors[1] = accessor(new Float64Array(8))
  fails(
    () => readGltfAnimations([animation('weights', 1, 'CUBICSPLINE')], morph),
    `${channelPath}.sampler`,
  )
  const unresolved = { ...animation(), channels: [{ sampler: 0, target: { path: 'weights' } }] }
  expect(readGltfAnimations([unresolved], morph)[0]!.channels[0]!.target.kind).toBe('unresolved')
})

import { expect, test } from 'bun:test'
import { validateBytes } from 'gltf-validator'
import { encodeGlbContainer } from '../export/glbContainer'
import { encodeSceneGlb } from '../export/sceneGlb'
import { list, record } from '../scene/validation'
import { expectValidGlb } from '../testing/gltfValidation'
import { makeSceneAssistedSkinFixture } from '../testing/sceneAssistedSkin'
import { type GltfAccessor, readGltfAccessors } from './gltfAccessors'
import { readGltfBuffers } from './gltfBuffers'
import { readGltfEnvelope } from './gltfEnvelope'
import { readGltfGraph } from './gltfGraph'
import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'
import { readGltfMeshes } from './gltfMeshes'
import { readGltfSkins } from './gltfSkins'
import { readGltfSkinWeights } from './gltfSkinWeights'

interface SetFixture {
  joints: ArrayLike<number>
  weights: ArrayLike<number>
  type?: 5121 | 5123 | 5126
}
function fixture(sets: SetFixture[], jointCounts = [2], primitiveCopies = 1) {
  const accessors: GltfAccessor[] = [],
    attributes: Record<string, number> = {}
  for (const [i, set] of sets.entries()) {
    const componentType = set.type ?? 5126,
      scale = componentType === 5121 ? 255 : componentType === 5123 ? 65535 : null
    const base: GltfAccessor = {
      type: 'VEC4',
      componentType: 5123,
      count: set.joints.length / 4,
      values: Float64Array.from(set.joints),
      normalized: false,
      min: null,
      max: null,
      layout: null,
      sparseViews: null,
    }
    attributes[`JOINTS_${i}`] = accessors.length
    accessors.push(base)
    attributes[`WEIGHTS_${i}`] = accessors.length
    accessors.push({
      ...base,
      componentType,
      normalized: scale !== null,
      values: Float64Array.from(set.weights, (value) =>
        scale === null ? Math.fround(value) : value / scale,
      ),
    })
  }
  const { meshes, viewUses } = readGltfMeshes(
    [{ primitives: Array.from({ length: primitiveCopies }, () => ({ mode: 0, attributes })) }],
    accessors,
  )
  const count = Math.max(...jointCounts),
    nodes = [
      { children: Array.from({ length: count }, (_, i) => i + 1) },
      ...Array.from({ length: count }, () => ({})),
      ...jointCounts.map((_, i) => ({ mesh: 0, skin: i })),
    ],
    graph = readGltfGraph({ nodes }, meshes, { skins: jointCounts.length, cameras: 0 }),
    skins = readGltfSkins(
      jointCounts.map((joints) => ({ joints: Array.from({ length: joints }, (_, i) => i + 1) })),
      graph,
      accessors,
      viewUses,
    )
  return {
    graph,
    meshes,
    skins,
    accessors,
    read: () => readGltfSkinWeights(graph, meshes, skins, accessors),
  }
}

const path = 'meshes[0].primitives[0].attributes'
function fails(run: () => unknown, field = path, reason: GltfInputError['reason'] = 'invalid') {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  if (!(error instanceof GltfInputError)) throw new Error('Expected a structured weight error')
  expect(error.reason).toBe(reason)
  expect(error.path).toBe(field)
}

test('all influence sets are kept as references and statistics without normalizing or pruning values', () => {
  const source = fixture(
      [
        { joints: [0, 1, 2, 3], weights: [0.125, 0.125, 0.125, 0.125] },
        { joints: [4, 5, 6, 7], weights: [0.125, 0.125, 0.125, 0.125] },
      ],
      [8],
    ),
    before = source.accessors.map((value) => new Float64Array(value.values)),
    result = source.read()
  expect([...result.meshes]).toEqual([[0, [0]]])
  expect(result.layouts).toEqual([
    {
      vertices: 1,
      sets: [
        { joints: 0, weights: 1 },
        { joints: 2, weights: 3 },
      ],
      maximumJoint: 7,
      maximumJointSet: 1,
      maximumInfluences: 8,
      nonUnitVertices: 0,
      unweightedVertices: 0,
      nonZeroUnusedSlots: 0,
    },
  ])
  for (const [i, accessor] of source.accessors.entries())
    expect(accessor.values).toEqual(before[i]!)
  result.layouts[0]!.sets[0]!.joints = 42
  expect(source.meshes[0]!.primitives[0]!.attributes.get('JOINTS_0')).toBe(0)
  expect(source.read().layouts[0]!.sets[0]!.joints).toBe(0)
})

test('negative weights and duplicate positive joints fail across slots and sets; zero slots remain untouched', () => {
  fails(
    () => fixture([{ joints: [0, 1, 0, 0], weights: [1, -0.1, 0, 0] }]).read(),
    `${path}.WEIGHTS_0`,
  )
  fails(
    () => fixture([{ joints: [1, 1, 0, 0], weights: [0.5, 0.5, 0, 0] }]).read(),
    `${path}.JOINTS_0`,
  )
  fails(
    () =>
      fixture([
        { joints: [0, 0, 0, 0], weights: [0.5, 0, 0, 0] },
        { joints: [0, 0, 0, 0], weights: [0.5, 0, 0, 0] },
      ]).read(),
    `${path}.JOINTS_1`,
  )
  const source = fixture([{ joints: [1, 1, 0, 1], weights: [1, 0, -0, 0] }]),
    result = source.read()
  expect(result.layouts[0]!.nonZeroUnusedSlots).toBe(2)
  expect(result.layouts[0]!.maximumInfluences).toBe(1)
  expect(source.accessors[0]!.values).toEqual(Float64Array.of(1, 1, 0, 1))
})

test('joint ranges include zero-weight slots and use the smallest skin used by any instance', () => {
  for (const joint of [2, 255, 65535])
    fails(
      () => fixture([{ joints: [0, joint, 0, 0], weights: [1, 0, 0, 0] }]).read(),
      `${path}.JOINTS_0`,
    )
  const set = { joints: [1, 0, 0, 0], weights: [1, 0, 0, 0] }
  for (const counts of [
    [3, 1],
    [1, 3],
  ])
    fails(() => fixture([set], counts).read(), `${path}.JOINTS_0`)
  expect(fixture([set], [3, 2, 5]).read().layouts[0]!.maximumJoint).toBe(1)
  fails(
    () =>
      fixture(
        [
          { joints: [0, 0, 0, 0], weights: [1, 0, 0, 0] },
          { joints: [3, 0, 0, 0], weights: [0, 0, 0, 0] },
        ],
        [3],
      ).read(),
    `${path}.JOINTS_1`,
  )
})

test('Float32 sum deviations and unweighted vertices are diagnostics, never automatic normalization', () => {
  const source = fixture([
      {
        joints: [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
        weights: [0.25, 0.75, 0, 0, 0.3, 0.3, 0, 0, 0, 0, 0, 0, 2 ** -149, 0, 0, 0],
      },
    ]),
    before = new Float64Array(source.accessors[1]!.values),
    result = source.read().layouts[0]!
  expect(result.nonUnitVertices).toBe(3)
  expect(result.unweightedVertices).toBe(1)
  expect(result.maximumInfluences).toBe(2)
  expect(source.accessors[1]!.values).toEqual(before)
  const maximum = 3.4028234663852886e38
  const large = fixture([{ joints: [0, 1, 0, 0], weights: [maximum, maximum, 0, 0] }]).read()
  expect(large.layouts[0]!.nonUnitVertices).toBe(1)
  expect(JSON.stringify(large.layouts)).not.toContain('null')
})

test('every unsigned 8/16-bit split sums exactly without a floating-point normalization loophole', () => {
  for (const type of [5121, 5123] as const) {
    const maximum = type === 5121 ? 255 : 65535,
      joints = new Uint16Array((maximum + 1) * 4),
      weights = new Uint16Array(joints.length)
    for (let i = 0; i <= maximum; i++) {
      joints[i * 4 + 1] = 1
      weights[i * 4] = i
      weights[i * 4 + 1] = maximum - i
    }
    const source = fixture([{ joints, weights, type }]),
      result = source.read().layouts[0]!
    expect(result.nonUnitVertices).toBe(0)
    expect(result.vertices).toBe(maximum + 1)
    expect(result.maximumInfluences).toBe(2)
    for (const delta of [-1, 1])
      fails(() =>
        fixture([
          { joints: [0, 1, 0, 0], weights: [100, maximum - 100 + delta, 0, 0], type },
        ]).read(),
      )
    fails(() => fixture([{ joints: [0, 0, 0, 0], weights: [0, 0, 0, 0], type }]).read())
  }
})

test('mixed quantized types use an exact common denominator, including all 128 influences', () => {
  const mixed = fixture([
    { type: 5121, joints: [0, 0, 0, 0], weights: [128, 0, 0, 0] },
    { type: 5123, joints: [1, 0, 0, 0], weights: [65535 - 128 * 257, 0, 0, 0] },
  ])
  expect(mixed.read().layouts[0]!.nonUnitVertices).toBe(0)
  const sets: SetFixture[] = Array.from({ length: 32 }, (_, i) => ({
    type: 5123,
    joints: [i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 3],
    weights: [1, 1, 1, i === 31 ? 65535 - 127 : 1],
  }))
  const source = fixture(sets, [128])
  expect(source.read().layouts[0]!.maximumInfluences).toBe(128)
  // One quantization step is smaller than the Float32 diagnostic tolerance
  // for 128 weights; the integer format requirement must still reject it.
  source.accessors[63]!.values[3] = (65535 - 128) / 65535
  fails(() => source.read())
})

test('a mixed float/quantized set remains unmodified and near-unit Float32 sums have explicit tolerance', () => {
  const source = fixture([
      { type: 5121, joints: [0, 0, 0, 0], weights: [128, 0, 0, 0] },
      { type: 5126, joints: [1, 0, 0, 0], weights: [127 / 255, 0, 0, 0] },
    ]),
    before = source.accessors.map((accessor) => new Float64Array(accessor.values))
  expect(source.read().layouts[0]!.nonUnitVertices).toBe(0)
  for (const [i, accessor] of source.accessors.entries())
    expect(accessor.values).toEqual(before[i]!)
  for (const [sum, diagnostics] of [
    [1 + 2 ** -23, 0],
    [1 + 2 ** -21, 1],
  ])
    expect(
      fixture([{ joints: [0, 0, 0, 0], weights: [sum!, 0, 0, 0] }]).read().layouts[0]!
        .nonUnitVertices,
    ).toBe(diagnostics!)
})

test('shared layouts are read once per call even across primitives and differently sized skins', () => {
  const source = fixture([{ joints: [1, 0, 0, 0], weights: [1, 0, 0, 0] }], [4, 2, 3], 1000)
  let reads = 0
  for (const accessor of source.accessors) {
    const values = accessor.values
    Object.defineProperty(accessor, 'values', {
      get() {
        reads++
        return values
      },
    })
  }
  const result = source.read()
  expect(reads).toBe(2)
  expect(result.layouts.length).toBe(1)
  expect(result.meshes.get(0)).toEqual(Array(1000).fill(0))
  source.accessors[1]!.values[0] = -1
  fails(() => source.read(), `${path}.WEIGHTS_0`)
  source.graph.nodes = source.graph.nodes.map((node) => ({ ...node, skin: null }))
  reads = 0
  expect(source.read()).toEqual({ meshes: new Map(), layouts: [] })
  expect(reads).toBe(0)
})

test('work budget counts unique accessor combinations before reading any values', () => {
  const base = fixture(
    [
      {
        joints: new Uint16Array(1024 * 4),
        weights: Float64Array.from({ length: 1024 * 4 }, (_, i) => (i % 4 === 0 ? 1 : 0)),
      },
    ],
    [1],
  )
  const accessors: GltfAccessor[] = [
    ...Array.from({ length: 33 }, () => ({ ...base.accessors[0]! })),
    ...Array.from({ length: 32 }, () => ({ ...base.accessors[1]! })),
  ]
  const combinations = Array.from({ length: 1025 }, (_, i) => ({
    mode: 0,
    attributes: { JOINTS_0: Math.floor(i / 32), WEIGHTS_0: 33 + (i % 32) },
  }))
  const { meshes } = readGltfMeshes([{ primitives: combinations }], accessors)
  expect(GLTF_INPUT_LIMITS.skinWeightSlots === 1024 * 1024 * 4).toBe(true)
  for (const accessor of accessors)
    Object.defineProperty(accessor, 'values', {
      configurable: true,
      get() {
        throw new Error('Values read before aggregate budget')
      },
    })
  fails(
    () => readGltfSkinWeights(base.graph, meshes, base.skins, accessors),
    'meshes[0].primitives[1024].attributes',
    'budget',
  )
  for (const [i, accessor] of accessors.entries())
    Object.defineProperty(accessor, 'values', {
      value: base.accessors[i < 33 ? 0 : 1]!.values,
    })
  const exact = readGltfMeshes([{ primitives: combinations.slice(0, 1024) }], accessors).meshes
  const result = readGltfSkinWeights(base.graph, exact, base.skins, accessors)
  expect(result.layouts.length).toBe(1024)
  expect(
    result.layouts.every((layout) => layout.vertices === 1024 && layout.maximumInfluences === 1),
  ).toBe(true)
})

test('different meshes can share data validation without sharing their skin-range decision', () => {
  const source = fixture([{ joints: [1, 0, 0, 0], weights: [1, 0, 0, 0] }], [2, 1]),
    meshes = [
      source.meshes[0]!,
      { ...source.meshes[0]!, primitives: [...source.meshes[0]!.primitives] },
    ],
    graph = {
      ...source.graph,
      nodes: source.graph.nodes.map((node) => (node.skin === 1 ? { ...node, mesh: 1 } : node)),
    }
  fails(
    () => readGltfSkinWeights(graph, meshes, source.skins, source.accessors),
    'meshes[1].primitives[0].attributes.JOINTS_0',
  )
  const both = {
      ...graph,
      nodes: graph.nodes.map((node) => (node.skin === 1 ? { ...node, skin: 0 } : node)),
    },
    result = readGltfSkinWeights(both, meshes, source.skins, source.accessors)
  expect([...result.meshes]).toEqual([
    [0, [0]],
    [1, [0]],
  ])
  expect(result.layouts.length).toBe(1)
})

function readBytes(bytes: Uint8Array) {
  const envelope = readGltfEnvelope(bytes),
    buffers = readGltfBuffers(envelope)
  if (buffers.status !== 'ready') throw new Error('Self-contained fixture')
  const json = envelope.json,
    accessors = readGltfAccessors(json.accessors, buffers),
    { meshes, viewUses } = readGltfMeshes(
      json.meshes,
      accessors,
      Array.isArray(json.materials) ? json.materials.length : 0,
    ),
    graph = readGltfGraph(json, meshes, {
      skins: Array.isArray(json.skins) ? json.skins.length : 0,
      cameras: 0,
    }),
    skins = readGltfSkins(json.skins, graph, accessors, viewUses)
  return { weights: readGltfSkinWeights(graph, meshes, skins, accessors), accessors }
}

function binaryFixture(weights: number[], type: 5121 | 5123 | 5126, joints = [0, 1, 0, 0]) {
  const step = type === 5121 ? 1 : type === 5123 ? 2 : 4,
    bytes = new Uint8Array(20 + step * 4),
    view = new DataView(bytes.buffer)
  for (let i = 0; i < 4; i++) {
    view.setUint16(12 + i * 2, joints[i]!, true)
    if (step === 1) view.setUint8(20 + i, weights[i]!)
    else if (step === 2) view.setUint16(20 + i * 2, weights[i]!, true)
    else view.setFloat32(20 + i * 4, weights[i]!, true)
  }
  return encodeGlbContainer(
    {
      asset: { version: '2.0' },
      buffers: [{ byteLength: bytes.length }],
      bufferViews: [
        { buffer: 0, byteLength: 12, target: 34962 },
        { buffer: 0, byteOffset: 12, byteLength: 8, target: 34962 },
        { buffer: 0, byteOffset: 20, byteLength: step * 4, target: 34962 },
      ],
      accessors: [
        {
          bufferView: 0,
          type: 'VEC3',
          componentType: 5126,
          count: 1,
          min: [0, 0, 0],
          max: [0, 0, 0],
        },
        { bufferView: 1, type: 'VEC4', componentType: 5123, count: 1 },
        {
          bufferView: 2,
          type: 'VEC4',
          componentType: type,
          count: 1,
          ...(type === 5126 ? {} : { normalized: true }),
        },
      ],
      meshes: [
        { primitives: [{ mode: 0, attributes: { POSITION: 0, JOINTS_0: 1, WEIGHTS_0: 2 } }] },
      ],
      nodes: [{ mesh: 0, skin: 0 }, { children: [2] }, {}],
      skins: [{ joints: [1, 2] }],
      scenes: [{ nodes: [0, 1] }],
      scene: 0,
    },
    [bytes],
  )
}

test('actual binary accessors and validator agree on normal weights, negative values, duplicates and indices', async () => {
  for (const type of [5121, 5123, 5126] as const) {
    const values =
        type === 5121
          ? [128, 127, 0, 0]
          : type === 5123
            ? [32768, 32767, 0, 0]
            : [0.25, 0.75, 0, 0],
      bytes = binaryFixture(values, type)
    await expectValidGlb(bytes)
    const result = readBytes(bytes)
    expect(result.weights.layouts[0]!.nonUnitVertices).toBe(0)
    expect(result.weights.layouts[0]!.maximumInfluences).toBe(2)
    expect(result.accessors[2]!.values[0]).toBe(
      values[0]! / (type === 5121 ? 255 : type === 5123 ? 65535 : 1),
    )
  }
  for (const [bytes, code, field] of [
    [binaryFixture([-0.25, 1.25, 0, 0], 5126), 'ACCESSOR_WEIGHTS_NEGATIVE', `${path}.WEIGHTS_0`],
    [
      binaryFixture([0.5, 0.5, 0, 0], 5126, [1, 1, 0, 0]),
      'ACCESSOR_JOINTS_INDEX_DUPLICATE',
      `${path}.JOINTS_0`,
    ],
    [
      binaryFixture([1, 0, 0, 0], 5126, [0, 2, 0, 0]),
      'ACCESSOR_JOINTS_INDEX_OOB',
      `${path}.JOINTS_0`,
    ],
    [binaryFixture([128, 126, 0, 0], 5121), 'ACCESSOR_WEIGHTS_NON_NORMALIZED', path],
  ] as const) {
    const report = record(await validateBytes(bytes, { format: 'glb' }), 'report'),
      issues = record(report.issues, 'issues')
    expect(
      list(issues.messages, 'messages', 100).map((message) => record(message, 'message').code),
    ).toContain(code)
    fails(() => readBytes(bytes), field)
  }
  // glTF says Float32 sums SHOULD be near one. The validator flags this too;
  // our reader preserves it for explicit conversion review, not native acceptance.
  const nonUnit = binaryFixture([0.25, 0.25, 0, 0], 5126)
  expect(readBytes(nonUnit).weights.layouts[0]!.nonUnitVertices).toBe(1)
})

test('real assisted and mirrored skin exports keep every decoded weight unchanged', async () => {
  for (const space of ['local', 'local-delta'] as const) {
    const { document } = makeSceneAssistedSkinFixture(space),
      bytes = encodeSceneGlb(document, { allowLosses: true }).bytes,
      original = new Uint8Array(bytes)
    await expectValidGlb(bytes, Array(3).fill('NODE_SKINNED_MESH_NON_ROOT'))
    const result = readBytes(bytes)
    expect(result.weights.meshes.size).toBeGreaterThan(0)
    expect(result.weights.layouts.length).toBeGreaterThan(0)
    for (const layout of result.weights.layouts) {
      expect(layout.maximumInfluences).toBeLessThanOrEqual(4)
      expect(layout.nonUnitVertices).toBe(0)
      expect(layout.unweightedVertices).toBe(0)
      expect(layout.sets.length).toBe(1)
    }
    expect(bytes).toEqual(original)
  }
})

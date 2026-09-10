import { expect, test } from 'bun:test'
import { Mesh, type Object3D, SkinnedMesh } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { encodeGlbContainer } from '../export/glbContainer'
import { encodeSceneGlb } from '../export/sceneGlb'
import { identityMatrix } from '../scene/matrix'
import { expectValidGlb } from '../testing/gltfValidation'
import { makeSceneAssistedSkinFixture } from '../testing/sceneAssistedSkin'
import { type GltfAccessor, readGltfAccessors } from './gltfAccessors'
import { readGltfBuffers } from './gltfBuffers'
import { readGltfEnvelope } from './gltfEnvelope'
import { readGltfGraph } from './gltfGraph'
import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'
import { readGltfMeshes } from './gltfMeshes'
import { readGltfSkins } from './gltfSkins'

function fails(run: () => unknown, path: string, reason: GltfInputError['reason'] = 'invalid') {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  if (!(error instanceof GltfInputError)) throw new Error('Expected a structured skin error')
  expect(error.reason).toBe(reason)
  expect(error.path).toBe(path)
}

function matrixAccessor(values: ArrayLike<number> = identityMatrix()): GltfAccessor {
  return {
    componentType: 5126,
    type: 'MAT4',
    count: values.length / 16,
    normalized: false,
    values: Float64Array.from(values),
    min: null,
    max: null,
    layout: null,
    sparseViews: null,
  }
}

function parse(bytes: Uint8Array) {
  const envelope = readGltfEnvelope(bytes),
    resources = readGltfBuffers(envelope)
  if (resources.status !== 'ready') throw new Error('Self-contained fixture')
  const json = envelope.json,
    accessors = readGltfAccessors(json.accessors, resources),
    { meshes, viewUses } = readGltfMeshes(
      json.meshes,
      accessors,
      Array.isArray(json.materials) ? json.materials.length : 0,
    ),
    graph = readGltfGraph(json, meshes, {
      skins: Array.isArray(json.skins) ? json.skins.length : 0,
      cameras: 0,
    })
  return {
    json,
    accessors,
    graph,
    viewUses,
    skins: readGltfSkins(json.skins, graph, accessors, viewUses),
  }
}

function skinnedGraph(nodes: unknown[], scenes?: unknown[]) {
  const base = matrixAccessor()
  const attributes: GltfAccessor[] = [
    { ...base, type: 'VEC4', componentType: 5121, values: Float64Array.of(0, 0, 0, 0) },
    { ...base, type: 'VEC4', values: Float64Array.of(1, 0, 0, 0) },
  ]
  const { meshes } = readGltfMeshes(
    [{ primitives: [{ mode: 0, attributes: { JOINTS_0: 0, WEIGHTS_0: 1 } }] }],
    attributes,
  )
  return readGltfGraph({ nodes, scenes }, meshes, { skins: 2, cameras: 0 })
}

function dispose(root: Object3D) {
  root.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose()
      for (const material of Array.isArray(object.material) ? object.material : [object.material])
        material.dispose()
    }
    if (object instanceof SkinnedMesh) object.skeleton.dispose()
  })
}

test('skin joints retain explicit order, names and optional defaults with owned metadata', () => {
  const source = [
      { joints: [3, 1, 2], name: '', skeleton: 0, extensions: { VENDOR_data: { inert: true } } },
    ],
    before = structuredClone(source),
    graph = readGltfGraph({ nodes: [{ children: [1, 2] }, {}, { children: [3] }, {}] }, [])
  const result = readGltfSkins(source, graph, [], new Map())
  expect(result).toEqual([{ joints: [3, 1, 2], name: '', skeleton: 0, inverseBindMatrices: null }])
  expect(result[0]!.joints).not.toBe(source[0]!.joints)
  result[0]!.joints[0] = 0
  expect(source).toEqual(before)
  expect(readGltfSkins([{ joints: [3] }], graph, [], new Map())[0]).toEqual({
    name: null,
    joints: [3],
    skeleton: null,
    inverseBindMatrices: null,
  })
  expect(readGltfSkins(undefined, graph, [], new Map())).toEqual([])
})

test('joints, optional references, required lists and name types are not coerced', () => {
  const graph = readGltfGraph({ nodes: [{ children: [1] }, {}] }, []),
    accessor = matrixAccessor()
  for (const joints of [
    undefined,
    null,
    [],
    '1',
    [2],
    [-1],
    [0.5],
    [NaN],
    [0, 0],
    [null],
    ['0'],
    new Array(1),
  ])
    fails(() => readGltfSkins([{ joints }], graph, [], new Map()), 'skins[0].joints')
  for (const field of ['skeleton', 'inverseBindMatrices'])
    for (const value of [null, -1, 99, 0.5, '0'])
      fails(
        () => readGltfSkins([{ joints: [0], [field]: value }], graph, [accessor], new Map()),
        `skins[0].${field}`,
      )
  fails(() => readGltfSkins([{ joints: [0], name: 5 }], graph, [], new Map()), 'skins[0].name')
  fails(
    () =>
      readGltfSkins(
        [{ joints: [0], name: 'x'.repeat(GLTF_INPUT_LIMITS.pathLength + 1) }],
        graph,
        [],
        new Map(),
      ),
    'skins[0].name',
    'budget',
  )
  fails(() => readGltfSkins([], graph, [], new Map()), 'skins')
  fails(() => readGltfSkins([null], graph, [], new Map()), 'skins[0]')
})

test('common ancestry uses subtree intervals rather than node numbering or breadth-first ranges', () => {
  const graph = readGltfGraph(
    {
      nodes: [
        { children: [5, 2] },
        {},
        { children: [3] },
        { children: [1] },
        {},
        { children: [4] },
        {},
      ],
    },
    [],
  )
  for (const skeleton of [0, 2, 3])
    expect(readGltfSkins([{ joints: [1, 3], skeleton }], graph, [], new Map())[0]!.skeleton).toBe(
      skeleton,
    )
  for (const skeleton of [1, 4, 5, 6])
    fails(
      () => readGltfSkins([{ joints: [1, 3], skeleton }], graph, [], new Map()),
      'skins[0].skeleton',
    )
  fails(() => readGltfSkins([{ joints: [1, 6] }], graph, [], new Map()), 'skins[0].joints')
  expect(readGltfSkins([{ joints: [6], skeleton: 6 }], graph, [], new Map())[0]!.joints).toEqual([
    6,
  ])
})

test('every scene containing a skin instance also contains its joint tree, without borrowing another scene', () => {
  const nodes = [
      { children: [1] },
      { mesh: 0, skin: 0 },
      { children: [3] },
      { mesh: 0, children: [4] },
      {},
      {},
    ],
    source = [{ joints: [4, 3], skeleton: 2 }]
  for (const scenes of [
    undefined,
    [{ nodes: [0, 2] }, { nodes: [0, 2, 5] }, { nodes: [2] }, { nodes: [5] }],
    [{ nodes: [5] }],
  ]) {
    const graph = skinnedGraph(nodes, scenes)
    expect(readGltfSkins(source, graph, [], new Map())[0]!.joints).toEqual([4, 3])
    expect(graph.nodes[3]!.mesh).toBe(0) // Being a joint does not remove its attached mesh.
  }
  for (const scenes of [
    [{ nodes: [0] }, { nodes: [2] }],
    [{ nodes: [0, 2] }, { nodes: [0] }],
  ])
    fails(() => readGltfSkins(source, skinnedGraph(nodes, scenes), [], new Map()), 'nodes[1].skin')
  const sameTree = skinnedGraph(
    [{ children: [1, 2] }, { mesh: 0, skin: 0 }, { children: [3] }, {}],
    [{ nodes: [0] }],
  )
  expect(readGltfSkins([{ joints: [3, 2] }], sameTree, [], new Map())[0]!.joints).toEqual([3, 2])
  fails(() => readGltfSkins(undefined, sameTree, [], new Map()), 'nodes[1].skin')
  const wrongCount = skinnedGraph([{ mesh: 0, skin: 1 }])
  fails(() => readGltfSkins([{ joints: [0] }], wrongCount, [], new Map()), 'nodes[0].skin')
})

test('shared scene memberships are indexed once and later calls observe changed scene roots', () => {
  const instances = Array.from({ length: 500 }, () => ({ mesh: 0, skin: 0 })),
    graph = skinnedGraph(
      [{ children: instances.map((_, i) => i + 2) }, {}, ...instances],
      Array.from({ length: 1000 }, () => ({ nodes: [0, 1] })),
    ),
    source = [{ joints: [1] }]
  let reads = 0
  for (const scene of graph.scenes) {
    const roots = scene.roots
    Object.defineProperty(scene, 'roots', {
      get() {
        reads++
        return roots
      },
    })
  }
  readGltfSkins(source, graph, [], new Map())
  expect(reads).toBe(graph.scenes.length)
  graph.scenes[999]!.roots.pop()
  fails(() => readGltfSkins(source, graph, [], new Map()), 'nodes[2].skin')
})

test('matrix references retain affine singular/reflected values and allow unused trailing matrices', () => {
  const graph = readGltfGraph({ nodes: [{ children: [1] }, {}] }, []),
    reflected = identityMatrix(),
    singular = identityMatrix()
  reflected[0] = -2
  reflected[4] = 0.125
  reflected[12] = 0.0001
  singular[5] = 0
  const accessor = matrixAccessor([...reflected, ...singular, ...identityMatrix()]),
    original = new Float64Array(accessor.values)
  const result = readGltfSkins(
    [{ joints: [1, 0], inverseBindMatrices: 0 }],
    graph,
    [accessor],
    new Map(),
  )
  expect(result[0]!.inverseBindMatrices).toBe(0)
  expect(accessor.values).toEqual(original)
  for (const [offset, value] of [
    [3, 1],
    [7, -1],
    [11, 0.001],
    [15, 0],
    [47, 2],
  ]) {
    const changed = matrixAccessor(original)
    changed.values[offset!] = value!
    fails(
      () => readGltfSkins([{ joints: [1], inverseBindMatrices: 0 }], graph, [changed], new Map()),
      'skins[0].inverseBindMatrices',
    )
  }
  fails(
    () =>
      readGltfSkins(
        [{ joints: [0, 1], inverseBindMatrices: 0 }],
        graph,
        [matrixAccessor()],
        new Map(),
      ),
    'skins[0].inverseBindMatrices',
  )
})

test('matrix format, stride, target and mesh bufferView usage remain distinct', () => {
  const graph = readGltfGraph({ nodes: [{}] }, []),
    skin = [{ joints: [0], inverseBindMatrices: 0 }],
    base = matrixAccessor(),
    cases: GltfAccessor[] = [
      { ...base, type: 'VEC4' },
      { ...base, componentType: 5123 },
      { ...base, normalized: true },
      { ...base, layout: { bufferView: 0, byteOffset: 0, byteStride: 64, target: null } },
      { ...base, layout: { bufferView: 0, byteOffset: 0, byteStride: null, target: 34962 } },
      { ...base, layout: { bufferView: 0, byteOffset: 0, byteStride: null, target: 34963 } },
    ]
  for (const accessor of cases)
    fails(() => readGltfSkins(skin, graph, [accessor], new Map()), 'skins[0].inverseBindMatrices')
  const packed: GltfAccessor = {
    ...base,
    layout: { bufferView: 7, byteOffset: 0, byteStride: null, target: null },
  }
  for (const role of ['vertex', 'indices'] as const)
    fails(
      () => readGltfSkins(skin, graph, [packed], new Map([[7, { role, accessors: new Set([0]) }]])),
      'skins[0].inverseBindMatrices',
    )
  expect(readGltfSkins(skin, graph, [packed], new Map())[0]!.inverseBindMatrices).toBe(0)
})

test('shared inverse bind values are checked once per call, but counts and future mutations are not cached away', () => {
  const graph = readGltfGraph({ nodes: [{ children: [1] }, {}] }, []),
    matrix = matrixAccessor()
  let reads = 0
  const accessor: GltfAccessor = {
    ...matrix,
    get values() {
      reads++
      return matrix.values
    },
  }
  const one = [{ joints: [0], inverseBindMatrices: 0 }]
  readGltfSkins(one, graph, [accessor], new Map())
  const singleReads = reads
  reads = 0
  readGltfSkins(
    Array.from({ length: 500 }, () => one[0]),
    graph,
    [accessor],
    new Map(),
  )
  expect(reads).toBe(singleReads)
  fails(
    () =>
      readGltfSkins(
        [...one, { joints: [0, 1], inverseBindMatrices: 0 }],
        graph,
        [accessor],
        new Map(),
      ),
    'skins[1].inverseBindMatrices',
  )
  matrix.values[15] = 0
  fails(() => readGltfSkins(one, graph, [accessor], new Map()), 'skins[0].inverseBindMatrices')
})

test('aggregate skin and joint budgets precede joint-value copies and matrix inspection', () => {
  const graph = readGltfGraph({ nodes: [{}] }, []),
    tooMany = Array.from({ length: GLTF_INPUT_LIMITS.skins + 1 }, () => ({ joints: [0] }))
  fails(() => readGltfSkins(tooMany, graph, [], new Map()), 'skins', 'budget')
  expect(
    readGltfSkins(tooMany.slice(0, GLTF_INPUT_LIMITS.skins), graph, [], new Map()).length,
  ).toBe(GLTF_INPUT_LIMITS.skins)
  const joints = Array<number>(GLTF_INPUT_LIMITS.skinJoints).fill(0)
  Object.defineProperty(joints, 0, {
    get() {
      throw new Error('Values read before joint budget')
    },
  })
  fails(() => readGltfSkins([{ joints }, { joints: [0] }], graph, [], new Map()), 'skins', 'budget')
})

test('a 65,536-node joint chain is read iteratively at the exact joint budget', () => {
  const count = GLTF_INPUT_LIMITS.skinJoints,
    nodes = Array.from({ length: count }, (_, i) => (i + 1 < count ? { children: [i + 1] } : {})),
    graph = readGltfGraph({ nodes }, []),
    joints = Array.from({ length: count }, (_, i) => count - i - 1),
    result = readGltfSkins([{ joints, skeleton: 0 }], graph, [], new Map())
  expect(result[0]!.joints).toEqual(joints)
  expect(result[0]!.joints).not.toBe(joints)
})

test('sparse inverse binds pass the validator and agree with a packed Three oracle; absent binds are identity', async () => {
  const data = new Uint8Array(68),
    view = new DataView(data.buffer)
  data[0] = 0
  const values = identityMatrix()
  values[12] = -3.25
  for (let i = 0; i < 16; i++) view.setFloat32(4 + i * 4, values[i]!, true)
  for (const sparse of [false, true]) {
    const bytes = encodeGlbContainer(
      {
        asset: { version: '2.0' },
        nodes: [{ children: [1] }, {}],
        skins: [{ joints: [1], ...(sparse ? { inverseBindMatrices: 0 } : {}) }],
        ...(sparse
          ? {
              buffers: [{ byteLength: data.length }],
              bufferViews: [
                { buffer: 0, byteLength: 1 },
                { buffer: 0, byteOffset: 4, byteLength: 64 },
              ],
              accessors: [
                {
                  type: 'MAT4',
                  componentType: 5126,
                  count: 1,
                  sparse: {
                    count: 1,
                    indices: { bufferView: 0, componentType: 5121 },
                    values: { bufferView: 1 },
                  },
                },
              ],
            }
          : {}),
      },
      sparse ? [data] : [],
    )
    await expectValidGlb(bytes)
    const parsed = parse(bytes)
    // Three 0.184 rejects sparse itemSize > 4. Keep the sparse source/validator
    // check; its packed equivalent uses the same matrix bytes as an independent oracle.
    const oracle = sparse
      ? encodeGlbContainer(
          {
            ...parsed.json,
            accessors: [{ bufferView: 1, type: 'MAT4', componentType: 5126, count: 1 }],
          },
          [data],
        )
      : bytes
    if (sparse) await expectValidGlb(oracle)
    const loaded = await new GLTFLoader().parseAsync(new Uint8Array(oracle).buffer, '')
    try {
      const skeleton = await loaded.parser.getDependency('skin', 0)
      expect(skeleton.boneInverses[0].elements).toEqual(sparse ? values : identityMatrix())
      const accessor = parsed.skins[0]!.inverseBindMatrices
      if (sparse) {
        expect(accessor).toBe(0)
        expect(Array.from(parsed.accessors[0]!.values)).toEqual(values)
      } else expect(accessor).toBeNull()
      skeleton.dispose()
    } finally {
      for (const scene of loaded.scenes) dispose(scene)
    }
  }
})

test('real assisted and mirrored skin exports retain joint order and inverse binds through independent loaders', async () => {
  for (const space of ['local', 'local-delta'] as const) {
    const { document } = makeSceneAssistedSkinFixture(space),
      bytes = encodeSceneGlb(document, { allowLosses: true }).bytes
    await expectValidGlb(bytes, Array(3).fill('NODE_SKINNED_MESH_NON_ROOT'))
    const parsed = parse(bytes),
      loaded = await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer, '')
    expect(parsed.skins.length).toBe(3)
    try {
      for (let i = 0; i < parsed.skins.length; i++) {
        const skin = parsed.skins[i]!,
          skeleton = await loaded.parser.getDependency('skin', i)
        expect(skeleton.bones.length).toBe(skin.joints.length)
        for (const [j, joint] of skin.joints.entries()) {
          const node = await loaded.parser.getDependency('node', joint)
          expect(skeleton.bones[j]).toBe(node)
          if (skin.inverseBindMatrices !== null)
            expect(
              Array.from(
                parsed.accessors[skin.inverseBindMatrices]!.values.subarray(j * 16, (j + 1) * 16),
              ),
            ).toEqual(skeleton.boneInverses[j].elements)
        }
        skeleton.dispose()
      }
    } finally {
      for (const scene of loaded.scenes) dispose(scene)
    }
  }
})

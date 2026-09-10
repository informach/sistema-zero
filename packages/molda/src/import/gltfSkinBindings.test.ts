import { expect, test } from 'bun:test'
import { AnimationMixer, LoopOnce, Mesh, type Object3D, SkinnedMesh, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { createModelAsset } from '../core/model'
import { GlbBinary } from '../export/GlbBinary'
import { encodeGlbContainer } from '../export/glbContainer'
import { encodeSceneGlb } from '../export/sceneGlb'
import { indexSceneNodes } from '../scene/graph'
import { identityMatrix, transformPoint } from '../scene/matrix'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { readSceneDocument } from '../scene/readDocument'
import { readSceneSkins } from '../scene/readSkin'
import { SCENE_SKIN_LIMITS } from '../scene/skin'
import { deformSceneSkin, prepareSceneSkin } from '../scene/skinPose'
import { makeGltfJointMeshFixture } from '../testing/gltfJointMesh'
import { expectValidGlb } from '../testing/gltfValidation'
import { makeSceneAssistedSkinFixture } from '../testing/sceneAssistedSkin'
import { prepareGltfAnimationChannel } from './gltfAnimationSample'
import { readGltfDocument } from './gltfDocument'
import { convertGltfGeometries } from './gltfGeometries'
import { convertGltfHierarchy } from './gltfHierarchy'
import { GltfInputError } from './gltfInput'
import { selectGltfDocument } from './gltfSelection'
import { convertGltfSkinBindings } from './gltfSkinBindings'

function stages(bytes: Uint8Array) {
  const read = readGltfDocument(bytes)
  if (read.status !== 'ready') throw new Error('Unexpected missing resources')
  const source = read.document,
    selection = selectGltfDocument(source, source.graph.defaultScene),
    resources = {
      geometryIds: selection.variants.map((_, i) => `shape_${i}`),
      defaultMaterialId: 'default',
    },
    hierarchy = convertGltfHierarchy(source, selection, resources),
    geometry = convertGltfGeometries(
      source.meshes,
      source.accessors,
      selection.variants.map((variant, i) => ({
        ...variant,
        geometryId: resources.geometryIds[i]!,
      })),
      {
        ids: new Map(source.appearance.materials.map((_, i) => [i, `material_${i}`])),
        defaultId: 'default',
      },
    )
  return {
    source,
    selection,
    hierarchy,
    geometry,
    convert: (weights: 'preserve' | 'normalize' = 'preserve') =>
      convertGltfSkinBindings(source, selection, hierarchy, geometry.sources, { weights }),
  }
}
function native(
  stage: ReturnType<typeof stages>,
  result: ReturnType<typeof convertGltfSkinBindings>,
) {
  return {
    ...migrateLegacyModel(createModelAsset({ name: 'Importação', starter: false, now: 1 }))
      .document,
    nodes: stage.hierarchy.nodes,
    geometries: stage.geometry.geometries,
    skins: result.skins,
    materials: ['default', ...stage.source.appearance.materials.map((_, i) => `material_${i}`)].map(
      (id) => ({
        id,
        name: id,
        baseColor: {
          kind: 'rgba' as const,
          value: [1, 1, 1, 1] as [number, number, number, number],
        },
        roughness: 1,
        metalness: 0,
        doubleSided: false,
      }),
    ),
  }
}
function fails(
  run: () => unknown,
  reason: GltfInputError['reason'] = 'unsupported',
  path?: string,
) {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  if (!(error instanceof GltfInputError)) throw new Error('Expected structured error')
  expect(error.reason).toBe(reason)
  if (path) expect(error.path).toBe(path)
}

interface SetFixture {
  joints: number[]
  weights: number[]
  quantization?: 255 | 65535
}
function rig(
  sets: SetFixture[],
  options: {
    vertices?: number
    joints?: number
    instances?: number
    primitives?: number
    matrices?: number[]
  } = {},
) {
  const count = options.vertices ?? 1,
    jointCount = options.joints ?? 2,
    instances = options.instances ?? 1,
    binary = new GlbBinary(),
    accessors: Record<string, unknown>[] = []
  function accessor(
    data: Float32Array | Uint8Array | Uint16Array,
    type: 'VEC3' | 'VEC4' | 'MAT4',
    normalized = false,
    bounds = false,
  ) {
    const index = accessors.length
    accessors.push({
      bufferView: binary.addView(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)),
      componentType: data instanceof Float32Array ? 5126 : data instanceof Uint8Array ? 5121 : 5123,
      type,
      count: data.length / (type === 'VEC3' ? 3 : type === 'VEC4' ? 4 : 16),
      ...(normalized ? { normalized: true } : {}),
      ...(bounds ? { min: [0, 0, 0], max: [0, 0, 0] } : {}),
    })
    return index
  }
  const attributes: Record<string, number> = {
    POSITION: accessor(new Float32Array(count * 3), 'VEC3', false, true),
  }
  sets.forEach((set, index) => {
    attributes[`JOINTS_${index}`] = accessor(
      Uint16Array.from({ length: count * 4 }, (_, i) => set.joints[i % 4]!),
      'VEC4',
    )
    const values = Array.from({ length: count * 4 }, (_, i) => set.weights[i % 4]!),
      data =
        set.quantization === 255
          ? Uint8Array.from(values)
          : set.quantization === 65535
            ? Uint16Array.from(values)
            : Float32Array.from(values)
    attributes[`WEIGHTS_${index}`] = accessor(data, 'VEC4', set.quantization !== undefined)
  })
  const inverseBindMatrices =
      options.matrices === undefined
        ? undefined
        : accessor(Float32Array.from(options.matrices), 'MAT4'),
    nodes = [
      { children: Array.from({ length: jointCount }, (_, i) => i + 1) },
      ...Array.from({ length: jointCount }, (_, i) => ({ translation: [i, 1, 0] })),
      ...Array.from({ length: instances }, () => ({ mesh: 0, skin: 0 })),
    ]
  return encodeGlbContainer(
    {
      asset: { version: '2.0' },
      buffers: [{ byteLength: binary.byteLength }],
      bufferViews: binary.views,
      accessors,
      meshes: [
        {
          primitives: Array.from({ length: options.primitives ?? 1 }, () => ({
            attributes,
            mode: 0,
          })),
        },
      ],
      nodes,
      skins: [
        {
          name: 'Esqueleto',
          joints: Array.from({ length: jointCount }, (_, i) => jointCount - i),
          skeleton: 0,
          inverseBindMatrices,
        },
      ],
      scenes: [{ nodes: [0, ...Array.from({ length: instances }, (_, i) => jointCount + 1 + i)] }],
      scene: 0,
    },
    binary.segments,
  )
}
const unit: SetFixture = { joints: [0, 1, 0, 0], weights: [0.25, 0.75, 0, 0] }

test('native bindings retain joint order, authored IBM, zero-slot semantics and independent ownership', () => {
  const matrix = identityMatrix()
  matrix[0] = -2
  matrix[12] = 0.25
  const stage = stages(
      rig([unit], {
        instances: 2,
        primitives: 2,
        matrices: [...matrix, ...identityMatrix(), ...identityMatrix()],
      }),
    ),
    before = structuredClone(stage.source),
    result = stage.convert()
  expect(result.issues).toEqual([])
  expect(result.skins.length).toBe(2)
  expect(result.skins[0]!.joints.map((joint) => joint.nodeId)).toEqual([
    'gltf_node_2',
    'gltf_node_1',
  ])
  expect(result.skins[0]!.joints[0]!.inverseBindMatrix).toEqual(matrix)
  expect(Object.keys(result.skins[0]!.weights)).toEqual(['p_0_v_0', 'p_1_v_0'])
  expect(result.skins[0]!.weights.p_0_v_0).toEqual([
    { jointId: 'gltf_node_2', weight: 0.25 },
    { jointId: 'gltf_node_1', weight: 0.75 },
  ])
  expect(readSceneDocument(native(stage, result)).status).toBe('valid')
  result.skins[0]!.joints[0]!.inverseBindMatrix[0] = 99
  result.skins[0]!.weights.p_0_v_0![0]!.weight = 99
  expect(result.skins[1]!.joints[0]!.inverseBindMatrix).toEqual(matrix)
  expect(result.skins[0]!.weights.p_1_v_0![0]!.weight).toBe(0.25)
  expect(result.skins[1]!.weights.p_0_v_0![0]!.weight).toBe(0.25)
  expect(stage.source).toEqual(before)
  expect(stage.convert().skins[0]!.weights.p_0_v_0![0]!.weight).toBe(0.25)
})

test('all sets participate in the four positive influences without sorting, merging or pruning', () => {
  const stage = stages(
      rig(
        [
          { joints: [0, 1, 0, 0], weights: [0.125, 0.25, 0, 0] },
          { joints: [2, 3, 0, 0], weights: [0.125, 0.5, 0, 0] },
        ],
        { joints: 4 },
      ),
    ),
    result = stage.convert(),
    weights = result.skins[0]!.weights.p_0_v_0!
  expect(weights.map((value) => value.jointId)).toEqual([
    'gltf_node_4',
    'gltf_node_3',
    'gltf_node_2',
    'gltf_node_1',
  ])
  expect(weights.map((value) => value.weight)).toEqual([0.125, 0.25, 0.125, 0.5])
  expect(readSceneDocument(native(stage, result)).status).toBe('valid')
  for (const quantization of [255, 65535] as const) {
    const quantized = stages(
      rig([{ joints: [0, 1, 0, 0], weights: [1, quantization - 1, 0, 0], quantization }]),
    ).convert()
    expect(quantized.skins[0]!.weights.p_0_v_0!.map((value) => value.weight)).toEqual([
      1 / quantization,
      (quantization - 1) / quantization,
    ])
    expect(quantized.issues).toEqual([])
  }
})

test('normalization is opt-in, reported per affected binding/primitive, and leaves source values intact', () => {
  const stage = stages(
      rig([{ joints: [0, 1, 0, 0], weights: [0.2, 0.8, 0, 0] }], {
        vertices: 2,
        instances: 2,
        primitives: 2,
      }),
    ),
    before = structuredClone(stage.source)
  fails(() => stage.convert(), 'unsupported', 'meshes[0].primitives[0].attributes')
  const result = stage.convert('normalize'),
    error = Math.fround(0.2) + Math.fround(0.8) - 1
  expect(result.issues).toEqual(
    result.skins.map((skin, i) => ({
      code: 'weights-normalized',
      path: `nodes[${3 + i}].skin`,
      bindingId: skin.id,
      vertices: 4,
      maximumSumError: error,
    })),
  )
  for (const skin of result.skins)
    for (const row of Object.values(skin.weights))
      expect(row.map((value) => value.weight)).toEqual([0.2, 0.8])
  expect(readSceneDocument(native(stage, result)).status).toBe('valid')
  expect(stage.source).toEqual(before)
  // A representable near-unit Double sum stays exactly authored even with normalize enabled.
  const near = stages(rig([{ joints: [0, 1, 0, 0], weights: [1, 2 ** -28, 0, 0] }])).convert(
    'normalize',
  )
  expect(near.issues).toEqual([])
  expect(near.skins[0]!.weights.p_0_v_0!.map((entry) => entry.weight)).toEqual([1, 2 ** -28])
})

test('unsupported influences, empty weights, singular binds and underflow are refused without silent repair', () => {
  const many = stages(
    rig(
      [
        { joints: [0, 1, 2, 3], weights: [0.125, 0.125, 0.125, 0.125] },
        { joints: [4, 0, 0, 0], weights: [0.5, 0, 0, 0] },
      ],
      { joints: 5 },
    ),
  )
  fails(() => many.convert('normalize'))
  const empty = stages(rig([{ joints: [0, 0, 0, 0], weights: [0, 0, 0, 0] }]))
  fails(() => empty.convert('normalize'))
  const singular = identityMatrix()
  singular[0] = 0
  const badMatrix = stages(rig([unit], { matrices: [...identityMatrix(), ...singular] }))
  Object.defineProperty(badMatrix.source.accessors[2], 'values', {
    get() {
      throw new Error('Weights touched before the invalid inverse bind')
    },
  })
  fails(() => badMatrix.convert(), 'unsupported', 'skins[0].inverseBindMatrices[1]')
  const underflow = stages(rig([{ joints: [0, 1, 0, 0], weights: [3e38, 2 ** -149, 0, 0] }]))
  fails(() => underflow.convert('normalize'))
  const tiny = stages(rig([{ joints: [0, 1, 0, 0], weights: [1, 2 ** -149, 0, 0] }])).convert()
  expect(tiny.skins[0]!.weights.p_0_v_0![1]!.weight).toBe(2 ** -149)
  const badWorld = stages(rig([unit]))
  const node = badWorld.hierarchy.nodes.find((node) => node.kind === 'mesh')!
  node.transform = { kind: 'trs', translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [0, 1, 1] }
  fails(() => badWorld.convert(), 'unsupported', 'nodes[3].skin')
})

test('joint and weighted-vertex budgets include every binding and precede numeric accessor access', () => {
  const joints = stages(
    rig([{ joints: [255, 0, 0, 0], weights: [1, 0, 0, 0] }], { joints: 256 }),
  ).convert()
  expect(joints.skins[0]!.joints.length).toBe(256)
  expect(joints.skins[0]!.weights.p_0_v_0).toEqual([{ jointId: 'gltf_node_1', weight: 1 }])
  const excessJoints = stages(rig([unit], { joints: 257 }))
  for (const accessor of excessJoints.source.accessors)
    Object.defineProperty(accessor, 'values', {
      get() {
        throw new Error('Values touched before budget')
      },
    })
  fails(() => excessJoints.convert(), 'budget')
  const exact = stages(
      rig([unit], { vertices: SCENE_SKIN_LIMITS.weightedVertices / 2, instances: 2 }),
    ),
    reads: number[] = []
  exact.source.accessors.forEach((accessor, i) => {
    const values = accessor.values
    reads[i] = 0
    Object.defineProperty(accessor, 'values', {
      get() {
        reads[i] = reads[i]! + 1
        return values
      },
    })
  })
  const result = exact.convert()
  expect(Object.keys(result.skins[0]!.weights).length * 2).toBe(SCENE_SKIN_LIMITS.weightedVertices)
  expect(reads).toEqual([0, 1, 1])
  expect(readSceneSkins(result.skins).length).toBe(2)
  const excess = stages(
    rig([unit], { vertices: SCENE_SKIN_LIMITS.weightedVertices / 2 + 1, instances: 2 }),
  )
  for (const accessor of excess.source.accessors)
    Object.defineProperty(accessor, 'values', {
      get() {
        throw new Error('Values touched before budget')
      },
    })
  fails(() => excess.convert(), 'budget')
})

test('empty selections have no bindings and mismatched geometry provenance is rejected', () => {
  const empty = stages(new TextEncoder().encode('{"asset":{"version":"2.0"}}'))
  expect(empty.convert()).toEqual({ skins: [], issues: [] })
  const stage = stages(rig([unit]))
  fails(
    () => convertGltfSkinBindings(stage.source, stage.selection, stage.hierarchy, []),
    'invalid',
  )
  fails(
    () =>
      convertGltfSkinBindings(stage.source, stage.selection, stage.hierarchy, [
        stage.geometry.sources[0]!,
        stage.geometry.sources[0]!,
      ]),
    'invalid',
  )
  const geometry = stage.geometry.sources[0]!
  geometry.primitives[0]!.vertexIds.push('extra')
  fails(() => stage.convert(), 'invalid')
})

test('joints carrying meshes bind to group IDs while the native skin targets the correct shape', () => {
  const stage = stages(makeGltfJointMeshFixture()),
    result = stage.convert()
  expect(result.skins[0]!.nodeId).toBe(stage.hierarchy.meshNodeIds.get(3)!)
  expect(result.skins[0]!.joints.map((joint) => joint.nodeId)).toEqual([
    stage.hierarchy.nodeIds.get(1)!,
    stage.hierarchy.nodeIds.get(2)!,
  ])
  expect(result.skins[0]!.weights.p_0_v_2).toEqual([
    { jointId: 'gltf_node_1', weight: 0.25 },
    { jointId: 'gltf_node_2', weight: 0.75 },
  ])
  expect(result.issues).toEqual([
    { code: 'name-generated', path: 'skins[0].name', bindingId: 'gltf_skin_3' },
  ])
  expect(readSceneDocument(native(stage, result)).status).toBe('valid')
})

test('real assisted/mirrored GLBs convert to native bindings and match Three world deformation', async () => {
  for (const space of ['local', 'local-delta'] as const) {
    const bytes = encodeSceneGlb(makeSceneAssistedSkinFixture(space).document, {
      allowLosses: true,
    }).bytes
    await expectValidGlb(bytes, Array(3).fill('NODE_SKINNED_MESH_NON_ROOT'))
    const stage = stages(bytes),
      result = stage.convert('normalize'),
      document = native(stage, result),
      loaded = await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer, '')
    expect(readSceneDocument(document).status).toBe('valid')
    expect(result.skins.length).toBe(3)
    const mixer = new AnimationMixer(loaded.scene),
      preparedSkins = new Map(
        result.skins.map((skin) => [skin.nodeId, prepareSceneSkin(document, skin)]),
      )
    try {
      for (const [clipIndex, clip] of stage.source.animations.entries()) {
        mixer.stopAllAction()
        const action = mixer.clipAction(loaded.animations[clipIndex]!).setLoop(LoopOnce, 1),
          samplers = clip.channels.map((_, channel) =>
            prepareGltfAnimationChannel(clip, channel, stage.source.accessors),
          )
        action.clampWhenFinished = true
        for (const time of [0, 0.375, 1.75, 2, 0.2]) {
          const nodes = structuredClone(document.nodes)
          clip.channels.forEach(({ target }, channel) => {
            if (target.kind !== 'node' || target.path === 'weights')
              throw new Error('Expected resolved TRS fixture')
            const nodeId = stage.hierarchy.nodeIds.get(target.node),
              node = nodes.find((node) => node.id === nodeId)!,
              value = samplers[channel]!.sample(time)
            if (node.transform.kind !== 'trs') throw new Error('Expected animated TRS node')
            if (target.path === 'rotation')
              node.transform.rotation = [value[0]!, value[1]!, value[2]!, value[3]!]
            else node.transform[target.path] = [value[0]!, value[1]!, value[2]!]
          })
          action.reset().play()
          mixer.setTime(time)
          loaded.scene.updateMatrixWorld(true)
          const index = indexSceneNodes(nodes)
          for (const instance of stage.selection.instances) {
            if (instance.skin === null) continue
            const skin = result.skins.find(
                (skin) => skin.nodeId === stage.hierarchy.meshNodeIds.get(instance.node),
              )!,
              prepared = preparedSkins.get(skin.nodeId)!,
              positions = deformSceneSkin(prepared, index.worldMatrices),
              world = index.worldMatrices.get(skin.nodeId)!,
              object: Object3D = await loaded.parser.getDependency('node', instance.node)
            if (!(object instanceof SkinnedMesh)) throw new Error('Expected real skinned mesh')
            const geometrySource = stage.geometry.sources.find(
              (geometry) => geometry.geometryId === stage.geometry.geometries[instance.variant]!.id,
            )!
            expect(geometrySource.primitives.length).toBe(1)
            for (const [vertex, id] of geometrySource.primitives[0]!.vertexIds.entries()) {
              const ordinal = prepared.vertexIds.indexOf(id),
                actual = transformPoint(world, [
                  positions[ordinal * 3]!,
                  positions[ordinal * 3 + 1]!,
                  positions[ordinal * 3 + 2]!,
                ]),
                expected = object
                  .applyBoneTransform(
                    vertex,
                    new Vector3().fromBufferAttribute(
                      object.geometry.getAttribute('position'),
                      vertex,
                    ),
                  )
                  .applyMatrix4(object.matrixWorld)
              expect(new Vector3(...actual).distanceTo(expected)).toBeLessThan(1e-6)
            }
          }
        }
      }
    } finally {
      mixer.stopAllAction()
      mixer.uncacheRoot(loaded.scene)
      loaded.scene.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose()
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            material.dispose()
        }
        if (object instanceof SkinnedMesh) object.skeleton.dispose()
      })
    }
  }
})

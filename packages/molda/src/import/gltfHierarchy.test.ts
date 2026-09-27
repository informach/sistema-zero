import { expect, test } from 'bun:test'
import { AnimationMixer, LoopOnce, Mesh, type Object3D, SkinnedMesh, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { createModelAsset } from '../core/model'
import type { ModelSceneNode, MoldaSceneDocument } from '../scene/document'
import { indexSceneNodes } from '../scene/graph'
import { SCENE_LIMITS } from '../scene/limits'
import { identityMatrix } from '../scene/matrix'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { readSceneDocument } from '../scene/readDocument'
import { deformSceneSkin, prepareSceneSkin } from '../scene/skinPose'
import { makeGltfJointMeshFixture } from '../testing/gltfJointMesh'
import { expectValidGlb } from '../testing/gltfValidation'
import { prepareGltfAnimationChannel } from './gltfAnimationSample'
import { readGltfDocument } from './gltfDocument'
import { convertGltfGeometries } from './gltfGeometries'
import { convertGltfHierarchy } from './gltfHierarchy'
import { GltfInputError } from './gltfInput'
import { selectGltfDocument } from './gltfSelection'

function ready(bytes: Uint8Array) {
  const result = readGltfDocument(bytes)
  if (result.status !== 'ready') throw new Error('Unexpected missing resource')
  return result.document
}
function source(json: Record<string, unknown>) {
  return ready(new TextEncoder().encode(JSON.stringify({ asset: { version: '2.0' }, ...json })))
}
function hierarchy(document: ReturnType<typeof ready>, sceneIndex = document.graph.defaultScene) {
  const selection = selectGltfDocument(document, sceneIndex),
    resources = {
      geometryIds: selection.variants.map((_, i) => `shape_${i}`),
      defaultMaterialId: 'default',
    }
  return { selection, resources, result: convertGltfHierarchy(document, selection, resources) }
}
function base(nodes: ModelSceneNode[]): MoldaSceneDocument {
  return {
    ...migrateLegacyModel(createModelAsset({ name: 'Importação de teste', starter: false, now: 1 }))
      .document,
    nodes,
  }
}
function close(actual: ArrayLike<number>, expected: ArrayLike<number>) {
  expect(actual.length).toBe(expected.length)
  for (let i = 0; i < actual.length; i++)
    expect(Math.abs(actual[i]! - expected[i]!)).toBeLessThanOrEqual(
      1e-10 * Math.max(1, Math.abs(expected[i]!)),
    )
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

test('native groups retain selected root order, duplicate names and exact owned local transforms', () => {
  const document = source({
      nodes: [
        { name: 'A', children: [3, 2], translation: [0.123456789, -1, 2], scale: [-2, 0.5, 3] },
        { name: 'A' },
        { name: 'Filho', matrix: [0, -2, 0, 0, 3, 0, 0, 0, 0, 0, 1, 0, 0.001, 2, 3, 1] },
        { name: 'Colapso válido', scale: [0, 1, 1] },
        { name: 'Fora' },
      ],
      scenes: [{ nodes: [1, 0] }, { nodes: [4] }],
      scene: 0,
    }),
    before = structuredClone(document),
    { result } = hierarchy(document)
  expect(result.nodes.map((node) => node.id)).toEqual([
    'gltf_node_1',
    'gltf_node_0',
    'gltf_node_3',
    'gltf_node_2',
  ])
  expect(result.nodes.map((node) => node.name)).toEqual(['A', 'A', 'Colapso válido', 'Filho'])
  expect(result.nodes.every((node) => node.kind === 'group' && !node.hidden && !node.locked)).toBe(
    true,
  )
  expect(result.meshNodeIds.size).toBe(0)
  expect(result.issues).toEqual([])
  for (const [index, id] of result.nodeIds)
    expect(result.nodes.find((node) => node.id === id)!.transform).toEqual(
      document.graph.nodes[index]!.transform,
    )
  expect(readSceneDocument(base(result.nodes)).status).toBe('valid')
  const transform = result.nodes[1]!.transform
  if (transform.kind !== 'trs') throw new Error('Expected TRS')
  transform.translation[0] = 99
  const matrix = result.nodes[3]!.transform
  if (matrix.kind !== 'affine') throw new Error('Expected authored matrix')
  matrix.matrix[0] = 99
  result.nodeIds.clear()
  expect(document).toEqual(before)
  expect(hierarchy(document, 1).result.nodes.map((node) => node.id)).toEqual(['gltf_node_4'])
})

test('name changes and camera omissions are explicit and bounded without trimming or broken surrogate pairs', () => {
  const names = [
      undefined,
      '',
      '   ',
      'x'.repeat(128),
      `${'x'.repeat(127)}😀fim`,
      `${'x'.repeat(126)}😀fim`,
    ],
    document = source({
      nodes: names.map((name, i) => ({ name, ...(i === 0 ? { camera: 0 } : {}) })),
      cameras: [{ type: 'perspective', perspective: { yfov: 1, znear: 0.01 } }],
    }),
    before = structuredClone(document),
    { result } = hierarchy(document)
  expect(result.nodes.map((node) => node.name)).toEqual([
    'Grupo 1',
    'Grupo 2',
    '   ',
    'x'.repeat(128),
    'x'.repeat(127),
    `${'x'.repeat(126)}😀`,
  ])
  expect(result.issues).toEqual([
    { code: 'name-generated', path: 'nodes[0].name', nodeId: 'gltf_node_0' },
    { code: 'camera-omitted', path: 'nodes[0].camera', nodeId: 'gltf_node_0' },
    { code: 'name-generated', path: 'nodes[1].name', nodeId: 'gltf_node_1' },
    { code: 'name-shortened', path: 'nodes[4].name', nodeId: 'gltf_node_4' },
    { code: 'name-shortened', path: 'nodes[5].name', nodeId: 'gltf_node_5' },
  ])
  expect(readSceneDocument(base(result.nodes)).status).toBe('valid')
  expect(document).toEqual(before)
})

test('joint/mesh splits keep separate TRS and shape identities, unchanged children and shared variants', () => {
  const document = ready(makeGltfJointMeshFixture()),
    before = structuredClone(document),
    { result, selection } = hierarchy(document)
  expect(result.nodes.length).toBe(7)
  expect(result.nodeIds.size).toBe(5)
  expect(result.meshNodeIds.size).toBe(4)
  const index = indexSceneNodes(result.nodes)
  for (const joint of [1, 2]) {
    const id = result.nodeIds.get(joint)!,
      meshId = result.meshNodeIds.get(joint)!,
      mesh = index.nodes.get(meshId)!
    expect(index.nodes.get(id)!.kind).toBe('group')
    expect(mesh.kind).toBe('mesh')
    expect(mesh.parentId).toBe(id)
    expect(mesh.transform).toEqual({ kind: 'affine', matrix: identityMatrix() })
    expect(index.worldMatrices.get(id)).toEqual(index.worldMatrices.get(meshId))
  }
  expect(index.nodes.get(result.nodeIds.get(2)!)!.parentId).toBe(result.nodeIds.get(1)!)
  expect(index.nodes.get(result.nodeIds.get(4)!)!.parentId).toBe(result.nodeIds.get(3)!)
  expect(result.nodeIds.get(3)).toBe(result.meshNodeIds.get(3))
  expect(result.issues.map((issue) => issue.code)).toEqual(['joint-mesh-split', 'joint-mesh-split'])
  for (const instance of selection.instances) {
    const mesh = index.nodes.get(result.meshNodeIds.get(instance.node)!)!
    if (mesh.kind !== 'mesh') throw new Error('Expected native mesh')
    expect(mesh.geometryId).toBe(`shape_${instance.variant}`)
  }
  expect(document).toEqual(before)
})

test('expanded node budget precedes transform copies; native resource IDs must be complete and unique', () => {
  const exactSource = ready(makeGltfJointMeshFixture(SCENE_LIMITS.nodes - 2)),
    exact = hierarchy(exactSource)
  expect(exact.result.nodes.length).toBe(SCENE_LIMITS.nodes)
  const excessSource = ready(makeGltfJointMeshFixture(SCENE_LIMITS.nodes - 1)),
    selection = selectGltfDocument(excessSource, 0)
  Object.defineProperty(excessSource.graph.nodes[0], 'transform', {
    get() {
      throw new Error('Transform touched before budget')
    },
  })
  let error: unknown
  try {
    convertGltfHierarchy(excessSource, selection, exact.resources)
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  if (!(error instanceof GltfInputError)) throw new Error('Expected structured budget')
  expect(error.reason).toBe('budget')
  expect(error.path).toBe('nodes')
  for (const geometryIds of [
    [],
    ['only_one'],
    ['same', 'same'],
    ['valid', 'not valid'],
    ['valid', ''],
    new Array<string>(2),
  ])
    expect(() =>
      convertGltfHierarchy(exactSource, exact.selection, { ...exact.resources, geometryIds }),
    ).toThrow()
  expect(() =>
    convertGltfHierarchy(exactSource, exact.selection, {
      ...exact.resources,
      defaultMaterialId: '',
    }),
  ).toThrow()
})

test('real GLB hierarchy and animated joint/rigid attachments match Three without a double mesh transform', async () => {
  const bytes = makeGltfJointMeshFixture()
  await expectValidGlb(bytes, [
    'ANIMATION_CHANNEL_TARGET_NODE_SKIN',
    'NODE_SKINNED_MESH_NON_ROOT',
    'NODE_SKINNED_MESH_LOCAL_TRANSFORMS',
  ])
  const document = ready(bytes),
    { selection, resources, result } = hierarchy(document),
    geometry = convertGltfGeometries(
      document.meshes,
      document.accessors,
      selection.variants.map((variant, i) => ({
        ...variant,
        geometryId: resources.geometryIds[i]!,
      })),
      { ids: new Map(), defaultId: 'default' },
    ),
    native: MoldaSceneDocument = {
      ...base(result.nodes),
      geometries: geometry.geometries,
      materials: [
        {
          id: 'default',
          name: 'Material',
          baseColor: { kind: 'rgba', value: [1, 1, 1, 1] },
          roughness: 1,
          metalness: 1,
          doubleSided: false,
        },
      ],
      skins: [
        {
          id: 'skin',
          name: 'Vínculo da fixture',
          nodeId: result.meshNodeIds.get(3)!,
          joints: [1, 2].map((joint) => ({
            nodeId: result.nodeIds.get(joint)!,
            inverseBindMatrix: identityMatrix(),
          })),
          weights: {
            p_0_v_0: [{ jointId: result.nodeIds.get(1)!, weight: 1 }],
            p_0_v_1: [{ jointId: result.nodeIds.get(2)!, weight: 1 }],
            p_0_v_2: [
              { jointId: result.nodeIds.get(1)!, weight: 0.25 },
              { jointId: result.nodeIds.get(2)!, weight: 0.75 },
            ],
          },
        },
      ],
    }
  expect(readSceneDocument(native).status).toBe('valid')
  const skin = prepareSceneSkin(native, native.skins![0]!),
    loaded = await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer, ''),
    mixer = new AnimationMixer(loaded.scene),
    action = mixer.clipAction(loaded.animations[0]!).setLoop(LoopOnce, 1),
    clip = document.animations[0]!,
    samples = clip.channels.map((_, channel) =>
      prepareGltfAnimationChannel(clip, channel, document.accessors),
    )
  action.clampWhenFinished = true
  try {
    for (const time of [0, 0.5, 1, 0.25, 0.9]) {
      const nodes = structuredClone(native.nodes)
      clip.channels.forEach((channel, i) => {
        if (channel.target.kind !== 'node' || channel.target.path !== 'translation')
          throw new Error('Fixture has translation channels only')
        const nodeId = result.nodeIds.get(channel.target.node),
          node = nodes.find((node) => node.id === nodeId)!,
          value = samples[i]!.sample(time)
        if (node.transform.kind !== 'trs') throw new Error('Animated source is TRS')
        node.transform.translation = [value[0]!, value[1]!, value[2]!]
      })
      action.reset().play()
      mixer.setTime(time)
      loaded.scene.updateMatrixWorld(true)
      const index = indexSceneNodes(nodes)
      for (const [sourceNode, nativeId] of result.nodeIds) {
        const object: Object3D = await loaded.parser.getDependency('node', sourceNode)
        close(index.worldMatrices.get(nativeId)!, object.matrixWorld.elements)
      }
      const mesh: Object3D = await loaded.parser.getDependency('node', 3)
      if (!(mesh instanceof SkinnedMesh)) throw new Error('Expected bound mesh')
      const deformed = deformSceneSkin(skin, index.worldMatrices),
        nativeWorld = index.worldMatrices.get(result.meshNodeIds.get(3)!)!
      for (let vertex = 0; vertex < 3; vertex++) {
        const p = new Vector3().fromBufferAttribute(mesh.geometry.getAttribute('position'), vertex),
          expected = mesh.applyBoneTransform(vertex, p).applyMatrix4(mesh.matrixWorld),
          local = deformed.subarray(vertex * 3, vertex * 3 + 3),
          actual = [0, 1, 2].map(
            (axis) =>
              nativeWorld[axis]! * local[0]! +
              nativeWorld[axis + 4]! * local[1]! +
              nativeWorld[axis + 8]! * local[2]! +
              nativeWorld[axis + 12]!,
          )
        close(actual, expected.toArray())
      }
    }
  } finally {
    mixer.stopAllAction()
    mixer.uncacheRoot(loaded.scene)
    dispose(loaded.scene)
  }
})

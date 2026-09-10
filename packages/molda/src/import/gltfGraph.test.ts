import { expect, test } from 'bun:test'
import { Matrix4, Mesh, type Object3D, Quaternion, SkinnedMesh, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { Vec3 } from '../core/model'
import { encodeGlbContainer } from '../export/glbContainer'
import { encodeSceneGlb } from '../export/sceneGlb'
import { indexSceneNodes } from '../scene/graph'
import { SCENE_LIMITS } from '../scene/limits'
import { composeTransform, identityMatrix, quaternionFromEulerXYZ } from '../scene/matrix'
import { expectValidGlb } from '../testing/gltfValidation'
import { makeSceneAssistedSkinFixture } from '../testing/sceneAssistedSkin'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { readGltfAccessors } from './gltfAccessors'
import { readGltfBuffers } from './gltfBuffers'
import { readGltfEnvelope } from './gltfEnvelope'
import { readGltfGraph, selectGltfScene } from './gltfGraph'
import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'
import { type GltfMesh, readGltfMeshes } from './gltfMeshes'

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
function mesh(targets = 0, skinned = false): GltfMesh {
  return {
    name: null,
    weights: Array<number>(targets).fill(0),
    primitives: [
      {
        attributes: new Map([
          ['POSITION', 0],
          ...(skinned
            ? ([
                ['JOINTS_0', 1],
                ['WEIGHTS_0', 2],
              ] as [string, number][])
            : []),
        ]),
        indicesAccessor: null,
        material: null,
        mode: 0,
        targets: Array.from({ length: targets }, () => new Map([['POSITION', 0]])),
        topology: { kind: 'points', indices: Uint32Array.of(0) },
      },
    ],
  }
}
function match(actual: readonly number[], expected: readonly number[]) {
  expect(actual.length).toBe(expected.length)
  actual.forEach((value, i) => {
    expect(Math.abs(value - expected[i]!)).toBeLessThanOrEqual(
      1e-12 * Math.max(1, Math.abs(expected[i]!)),
    )
  })
}

test('reads ordered forests and shared scene roots without merging scenes or modifying source metadata', () => {
  const input = {
    nodes: [
      { name: 'Dedo', translation: [0.125, 0, 0] },
      { name: 'Dedo' },
      { children: [3], name: '', extras: { untouched: true } },
      { children: [0] },
    ],
    scenes: [{ nodes: [2], name: 'Uma' }, { nodes: [1, 2], name: 'Duas' }, {}],
    scene: 1,
  }
  const before = structuredClone(input),
    graph = readGltfGraph(input, [])
  expect(graph.defaultScene).toBe(1)
  expect(graph.roots).toEqual([1, 2])
  expect(graph.order).toEqual([1, 2, 3, 0])
  expect(graph.nodes.map((node) => node.parent)).toEqual([3, null, null, 2])
  expect(graph.nodes.map((node) => node.name)).toEqual(['Dedo', 'Dedo', '', null])
  expect(selectGltfScene(graph, 0)).toEqual([2, 3, 0])
  expect(selectGltfScene(graph, 1)).toEqual([1, 2, 3, 0])
  expect(selectGltfScene(graph, 2)).toEqual([])
  graph.nodes[2]!.children.length = 0
  graph.scenes[0]!.roots.length = 0
  if (graph.nodes[0]!.transform.kind !== 'trs') throw new Error('TRS expected')
  graph.nodes[0]!.transform.translation[0] = 900
  expect(input).toEqual(before)
  expect(graph.scenes[1]!.roots).toEqual([1, 2])
})

test('scene-less libraries and empty scenes are distinct explicit selection paths', () => {
  const empty = readGltfGraph({}, [])
  expect(empty).toEqual({ nodes: [], roots: [], order: [], scenes: [], defaultScene: null })
  expect(selectGltfScene(empty, null)).toEqual([])
  const library = readGltfGraph({ nodes: [{}, { children: [0] }] }, [])
  expect(selectGltfScene(library, null)).toEqual([1, 0])
  failure(() => selectGltfScene(library, 0))
  const scenes = readGltfGraph({ nodes: [{}], scenes: [{}, { nodes: [0] }] }, [])
  expect(scenes.defaultScene).toBeNull()
  failure(() => selectGltfScene(scenes, null))
  for (const index of [-1, 2, 0.5, NaN]) failure(() => selectGltfScene(scenes, index))
  failure(() => readGltfGraph({ scene: 0 }, []))
})

test('rejects repeated children, multiple parents, cycles including disconnected ones, and nonroot scene entries', () => {
  for (const nodes of [
    [{ children: [0] }],
    [{ children: [1, 1] }, {}],
    [{ children: [2] }, { children: [2] }, {}],
    [{ children: [1] }, { children: [0] }],
    [{}, { children: [2] }, { children: [1] }],
    [{ children: [-1] }],
    [{ children: [1] }],
    [{ children: [0.5] }],
    [{ children: [null] }],
  ])
    failure(() => readGltfGraph({ nodes }, []))
  const nodes = [{ children: [1] }, {}]
  for (const scene of [{ nodes: [0, 0] }, { nodes: [1] }, { nodes: [2] }, { nodes: [null] }])
    failure(() => readGltfGraph({ nodes, scenes: [scene] }, []))
})

test('preserves owned TRS including negative/zero scale and compares composition with independent Three math', () => {
  const rotation = quaternionFromEulerXYZ([23, -79, 143]),
    translation: Vec3 = [1.234567890123, -Number.MIN_VALUE, 17.5],
    scale: Vec3 = [-3.5, 0, 0.00025]
  const node = { rotation, translation, scale },
    before = structuredClone(node)
  const graph = readGltfGraph({ nodes: [node, {}] }, []),
    transform = graph.nodes[0]!.transform
  expect(transform).toEqual({ kind: 'trs', ...node })
  const oracle = new Matrix4().compose(
    new Vector3().fromArray(translation),
    new Quaternion().fromArray(rotation),
    new Vector3().fromArray(scale),
  )
  match(composeTransform(transform), oracle.elements)
  const identity = graph.nodes[1]!.transform
  expect(composeTransform(identity)).toEqual(identityMatrix())
  if (transform.kind !== 'trs' || identity.kind !== 'trs') throw new Error('TRS expected')
  transform.rotation[0] = 1
  transform.scale[1] = 10
  expect(node).toEqual(before)
  expect(identity.rotation).toEqual([0, 0, 0, 1])
})

test('retains affine matrices exactly, including reflections, singular axes and huge/tiny independent columns', async () => {
  const rotations = new Quaternion().fromArray(quaternionFromEulerXYZ([31, 73, 19]))
  const matrices = [
    [-2, 3, 4],
    [0, 3, 4],
    [0, 0, -4],
    [0, 0, 0],
  ].map(
    (scale) =>
      new Matrix4().compose(new Vector3(1.125, -2.5, 3), rotations, new Vector3().fromArray(scale))
        .elements,
  )
  const extreme = identityMatrix()
  extreme[0] = 1e-300
  extreme[5] = -1e300
  extreme[10] = Number.MIN_VALUE
  for (const matrix of [...matrices, extreme]) {
    const graph = readGltfGraph({ nodes: [{ matrix }] }, [])
    const transform = graph.nodes[0]!.transform
    if (transform.kind !== 'affine') throw new Error('Affine expected')
    // Canonical authoring has one zero; compare every nonzero component exactly too.
    expect(transform.matrix.every((value, i) => value === matrix[i])).toBe(true)
    expect(composeTransform(transform).every((value, i) => value === matrix[i])).toBe(true)
    expect(transform.matrix).not.toBe(matrix)
  }
  // The validator's decomposer is a separate oracle for ordinary nonsingular matrices.
  await expectValidGlb(
    encodeGlbContainer(
      {
        asset: { version: '2.0' },
        nodes: [{ matrix: matrices[0] }],
        scenes: [{ nodes: [0] }],
        scene: 0,
      },
      [],
    ),
  )
})

test('rejects malformed transforms, projective or sheared matrices and nonunit quaternions without repair', () => {
  for (const node of [
    { translation: [0, 0] },
    { scale: [1, 1, 1, 1] },
    { rotation: [0, 0, 0] },
    { translation: null },
    { rotation: ['0', 0, 0, 1] },
    { scale: [1, Infinity, 1] },
    { rotation: [0, 0, 0, 0] },
    { rotation: [0, 0, 0, 1.1] },
    { rotation: [0.1, 0, 0, 1] },
    { translation: Array<number>(3) },
    { matrix: null },
    { matrix: identityMatrix(), translation: [0, 0, 0] },
    { matrix: identityMatrix(), rotation: [0, 0, 0, 1] },
    { matrix: identityMatrix(), scale: [1, 1, 1] },
  ])
    expect(() => readGltfGraph({ nodes: [node] }, [])).toThrow(GltfInputError)
  for (const [slot, value] of [
    [3, 0.1],
    [7, 1],
    [11, -1],
    [15, 0],
    [4, 0.125],
  ]) {
    const matrix = identityMatrix()
    matrix[slot!] = value!
    failure(() => readGltfGraph({ nodes: [{ matrix }] }, []))
  }
  const collapsed = identityMatrix()
  collapsed[0] = 0
  collapsed[4] = 1
  collapsed[8] = 1
  failure(() => readGltfGraph({ nodes: [{ matrix: collapsed }] }, []))
})

test('owns node morph overrides and preserves camera/skin references while checking their required mesh attributes', () => {
  const meshes = [mesh(2, true)],
    input = { nodes: [{ mesh: 0, skin: 0, camera: 0, weights: [-1, 0.125] }, { mesh: 0 }] }
  const before = structuredClone({ input, meshes }),
    graph = readGltfGraph(input, meshes, { skins: 1, cameras: 1 })
  expect(graph.nodes[0]!.weights).toEqual([-1, 0.125])
  expect(graph.nodes[0]!.mesh).toBe(0)
  expect(graph.nodes[0]!.skin).toBe(0)
  expect(graph.nodes[0]!.camera).toBe(0)
  expect(graph.nodes[1]!.weights).toBeNull()
  graph.nodes[0]!.weights![0] = 77
  expect({ input, meshes }).toEqual(before)
  for (const node of [
    { skin: 0 },
    { weights: [0, 1] },
    { mesh: 1 },
    { mesh: 0, skin: 1 },
    { camera: 1 },
    { mesh: 0, weights: [] },
    { mesh: 0, weights: [0] },
    { mesh: 0, weights: [NaN, 0] },
    { mesh: 0, weights: Array<number>(2) },
    { mesh: 0, weights: null },
    { mesh: null },
    { skin: null },
    { camera: null },
  ])
    expect(() => readGltfGraph({ nodes: [node] }, meshes, { skins: 1, cameras: 1 })).toThrow(
      GltfInputError,
    )
  failure(() =>
    readGltfGraph({ nodes: [{ mesh: 0, skin: 0 }] }, [mesh()], { skins: 1, cameras: 0 }),
  )
  const missing = mesh(0, true)
  missing.primitives.push(mesh().primitives[0]!)
  failure(() =>
    readGltfGraph({ nodes: [{ mesh: 0, skin: 0 }] }, [missing], { skins: 1, cameras: 0 }),
  )
})

test('accepts Float32 unit rounding without normalizing stored transforms and detects shear at extreme axis scales', () => {
  const rotation = quaternionFromEulerXYZ([73, 19, -113])
  for (const [i, value] of rotation.entries()) rotation[i] = Math.fround(value)
  const matrix = new Matrix4()
    .compose(new Vector3(), new Quaternion().fromArray(rotation), new Vector3(-2, 3, 4))
    .elements.map(Math.fround)
  const input = { nodes: [{ rotation }, { matrix }] },
    graph = readGltfGraph(input, [])
  expect(graph.nodes[0]!.transform).toEqual({
    kind: 'trs',
    translation: [0, 0, 0],
    rotation,
    scale: [1, 1, 1],
  })
  const transform = graph.nodes[1]!.transform
  if (transform.kind !== 'affine') throw new Error('Affine expected')
  expect(transform.matrix.every((value, i) => value === matrix[i])).toBe(true)
  for (const scale of [1e-300, 1e300]) {
    const sheared = identityMatrix()
    sheared[0] = scale
    sheared[4] = 0.01 / scale
    sheared[5] = 1 / scale
    failure(() => readGltfGraph({ nodes: [{ matrix: sheared }] }, []))
  }
})

test('detects invalid forests before reading any transform values', () => {
  const parent = { children: [1] }
  Object.defineProperty(parent, 'matrix', {
    get() {
      throw new Error('Transforms must not be read for a cyclic graph')
    },
  })
  failure(() => readGltfGraph({ nodes: [parent, { children: [0] }] }, []))
})

test('skin mesh attribute checks are shared across node instances only within the current read', () => {
  const source = mesh(0, true),
    original = source.primitives[0]!.attributes
  let reads = 0
  Object.defineProperty(source.primitives[0], 'attributes', {
    get() {
      reads++
      return original
    },
  })
  const nodes = Array.from({ length: 1000 }, () => ({ mesh: 0, skin: 0 }))
  expect(readGltfGraph({ nodes }, [source], { skins: 1, cameras: 0 }).nodes).toHaveLength(1000)
  expect(reads).toBe(2)
  original.delete('WEIGHTS_0')
  failure(() => readGltfGraph({ nodes }, [source], { skins: 1, cameras: 0 }))
})

test('handles the full import-depth budget iteratively, but selects only scenes fitting the authoring budget', () => {
  const count = GLTF_INPUT_LIMITS.nodes
  const nodes = Array.from({ length: count }, (_, i) => (i === 0 ? {} : { children: [i - 1] }))
  const graph = readGltfGraph({ nodes, scenes: [{ nodes: [count - 1] }, {}] }, [])
  expect(graph.order).toHaveLength(count)
  expect(graph.order[0]).toBe(count - 1)
  expect(graph.order[count - 1]).toBe(0)
  failure(() => selectGltfScene(graph, 0), 'budget')
  expect(selectGltfScene(graph, 1)).toEqual([])
  const small = readGltfGraph(
    { nodes: nodes.slice(0, SCENE_LIMITS.nodes), scenes: [{ nodes: [SCENE_LIMITS.nodes - 1] }] },
    [],
  )
  expect(selectGltfScene(small, 0)).toHaveLength(SCENE_LIMITS.nodes)
})

test('bounds graph and scene metadata, aggregate root references and rejects malformed optional values', () => {
  for (const input of [
    null,
    [],
    { nodes: [] },
    { nodes: null },
    { nodes: [null] },
    { nodes: [{ children: [] }] },
    { nodes: [{ children: null }] },
    { scenes: [] },
    { scenes: null },
    { scenes: [null] },
    { scenes: [{ nodes: [] }] },
    { scenes: [{ nodes: null }] },
    { nodes: [{ name: null }] },
    { scenes: [{ name: 1 }] },
    { scenes: [{}], scene: null },
  ])
    failure(() => readGltfGraph(input, []))
  failure(
    () =>
      readGltfGraph({ nodes: Array.from({ length: GLTF_INPUT_LIMITS.nodes + 1 }, () => ({})) }, []),
    'budget',
  )
  failure(
    () =>
      readGltfGraph(
        { scenes: Array.from({ length: GLTF_INPUT_LIMITS.scenes + 1 }, () => ({})) },
        [],
      ),
    'budget',
  )
  failure(
    () => readGltfGraph({ nodes: [{ name: 'x'.repeat(GLTF_INPUT_LIMITS.pathLength + 1) }] }, []),
    'budget',
  )
  const nodes = Array.from({ length: 1024 }, () => ({})),
    roots = nodes.map((_, i) => i)
  failure(
    () =>
      readGltfGraph(
        {
          nodes,
          scenes: Array.from({ length: GLTF_INPUT_LIMITS.sceneRoots / 1024 + 1 }, () => ({
            nodes: roots,
          })),
        },
        [],
      ),
    'budget',
  )
})

test('GLBs exported with affine helpers, animation and skin preserve the real loader hierarchy and world matrices', async () => {
  for (const document of [
    makeSceneGlbFixture(2, 2, 3, 0),
    makeSceneAssistedSkinFixture('local').document,
  ]) {
    const before = structuredClone(document),
      bytes = encodeSceneGlb(document, { allowLosses: true }).bytes
    const envelope = readGltfEnvelope(bytes),
      resources = readGltfBuffers(envelope)
    if (resources.status !== 'ready') throw new Error('Self-contained fixture expected')
    const accessors = readGltfAccessors(envelope.json.accessors, resources)
    const meshes = readGltfMeshes(
      envelope.json.meshes,
      accessors,
      (envelope.json.materials as unknown[]).length,
    ).meshes
    const graph = readGltfGraph(envelope.json, meshes, {
      skins: (envelope.json.skins as unknown[] | undefined)?.length ?? 0,
      cameras: 0,
    })
    const chosen = selectGltfScene(graph, graph.defaultScene)
    const index = indexSceneNodes(
      chosen.map((i) => ({
        id: `n_${i}`,
        parentId: graph.nodes[i]!.parent === null ? null : `n_${graph.nodes[i]!.parent}`,
        transform: graph.nodes[i]!.transform,
      })),
    )
    const loaded = await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer, '')
    try {
      loaded.scene.updateMatrixWorld(true)
      for (const i of chosen) {
        const actual: Object3D = await loaded.parser.getDependency('node', i)
        match(index.worldMatrices.get(`n_${i}`)!, actual.matrixWorld.elements)
        const raw = (envelope.json.nodes as Array<{ mesh?: number; skin?: number }>)[i]!
        expect(graph.nodes[i]!.mesh).toBe(raw.mesh ?? null)
        expect(graph.nodes[i]!.skin).toBe(raw.skin ?? null)
      }
      expect(document).toEqual(before)
    } finally {
      const geometry = new Set<Mesh['geometry']>(),
        materials = new Set<Mesh['material']>(),
        skeletons = new Set<SkinnedMesh['skeleton']>()
      loaded.scene.traverse((object) => {
        if (object instanceof Mesh) {
          geometry.add(object.geometry)
          materials.add(object.material)
        }
        if (object instanceof SkinnedMesh) skeletons.add(object.skeleton)
      })
      for (const skeleton of skeletons) skeleton.dispose()
      for (const item of geometry) item.dispose()
      for (const item of materials)
        for (const material of Array.isArray(item) ? item : [item]) material.dispose()
    }
  }
})

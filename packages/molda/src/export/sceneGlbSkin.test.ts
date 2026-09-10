import { expect, test } from 'bun:test'
import {
  AnimationMixer,
  LoopOnce,
  Matrix3,
  Matrix4,
  Mesh,
  type Object3D,
  SkinnedMesh,
  Vector3,
  Vector4,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import type { SceneAnimationClip } from '../scene/animation'
import type { ModelSceneNode, MoldaSceneDocument } from '../scene/document'
import { indexSceneDocument } from '../scene/documentIndex'
import { buildSceneGeometry } from '../scene/geometry'
import { identityMatrix, quaternionFromEulerXYZ } from '../scene/matrix'
import { readSceneDocument } from '../scene/readDocument'
import { prepareSceneAnimation } from '../scene/sampleAnimation'
import { createSceneSkin } from '../scene/skinCommands'
import { deformSceneSkin, prepareSceneSkin } from '../scene/skinPose'
import { list, number, record } from '../scene/validation'
import { readAccessor, readGlb } from '../testing/glbRead'
import { expectValidGlb } from '../testing/gltfValidation'
import { makeSceneAssistedSkinFixture } from '../testing/sceneAssistedSkin'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { SceneRenderResource } from '../viewport/sceneRenderResource'
import { prepareSceneGlbInWorker } from '../workers/sceneGlb'
import { encodeSceneGlb } from './sceneGlb'
import { MAX_SCENE_GLB_NODES, prepareSceneGlbHierarchy } from './sceneGlbHierarchy'
import { SceneGlbLossError } from './sceneGlbReport'

function fixture() {
  const { document, input } = makeSceneSkinFixture()
  const { id, ...bind } = input
  return createSceneSkin(document, bind, () => id)
}
function rows(value: unknown) {
  return list(value, 'rows', MAX_SCENE_GLB_NODES).map((row) => record(row, 'row'))
}
function index(value: unknown) {
  return number(value, 'index', 0, Number.MAX_SAFE_INTEGER, true)
}
function skinned(root: Object3D) {
  const meshes: SkinnedMesh[] = []
  root.traverse((object) => {
    if (object instanceof SkinnedMesh) meshes.push(object)
  })
  return meshes
}
function dispose(root: Object3D) {
  const geometries = new Set<Mesh['geometry']>(),
    materials = new Set(),
    skeletons = new Set<SkinnedMesh['skeleton']>()
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return
    geometries.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material])
      if (!materials.has(material)) {
        materials.add(material)
        material.dispose()
      }
    if (object instanceof SkinnedMesh) skeletons.add(object.skeleton)
  })
  for (const geometry of geometries) geometry.dispose()
  for (const skeleton of skeletons) skeleton.dispose()
}

test('skin GLB retains ordered inverse binds, exact corner identities and explicit portable conversions without source writes', async () => {
  const source = fixture(),
    geometry = source.geometries[0]!
  if (geometry.kind !== 'mesh') throw new Error('Mesh expected')
  // Same coordinates, different authored point IDs and influences: position matching is wrong.
  const original = geometry.faces.f_0_0!
  const skin = source.skins![0]!
  geometry.faces.overlap = {
    ...original,
    corners: original.corners.map((corner, i) => {
      const id = `overlap-${i}`
      geometry.vertices[id] = [...geometry.vertices[corner.vertexId]!]
      skin.weights[id] = [{ jointId: 'upper', weight: 1 }]
      return { ...corner, vertexId: id }
    }),
  }
  const before = structuredClone(source)
  expect(() => encodeSceneGlb(source)).toThrow(SceneGlbLossError)
  const result = encodeSceneGlb(source, { allowLosses: true })
  expect(result.issues).toEqual([
    { code: 'skin-precision', sourceId: 'skin' },
    { code: 'skin-zero-slots', sourceId: 'skin' },
    { code: 'skin-render-space', sourceId: 'skin' },
  ])
  await expectValidGlb(result.bytes, ['NODE_SKINNED_MESH_NON_ROOT'])
  const parsed = readGlb(result.bytes),
    portable = rows(parsed.json.skins)[0]!,
    matrices = readAccessor(parsed, index(portable.inverseBindMatrices)),
    primitive = rows(rows(parsed.json.meshes)[0]!.primitives)[0]!,
    attributes = record(primitive.attributes, 'attributes'),
    joints = readAccessor(parsed, index(attributes.JOINTS_0)),
    weights = readAccessor(parsed, index(attributes.WEIGHTS_0)),
    built = buildSceneGeometry(geometry)
  expect(matrices).toEqual(
    Float32Array.from(skin.joints.flatMap((joint) => joint.inverseBindMatrix)),
  )
  expect(rows(parsed.json.accessors)[index(portable.inverseBindMatrices)]).toMatchObject({
    type: 'MAT4',
    componentType: 5126,
    count: 2,
  })
  expect(rows(parsed.json.accessors)[index(attributes.JOINTS_0)]).toMatchObject({
    type: 'VEC4',
    componentType: 5123,
    count: built.positions.length / 3,
  })
  for (let vertex = 0; vertex < built.cornerIndices.length; vertex++) {
    const face = geometry.faces[built.faceIds[Math.floor(vertex / 3)]!]!,
      pointId = face.corners[built.cornerIndices[vertex]!]!.vertexId,
      influences = skin.weights[pointId]!
    for (let slot = 0; slot < 4; slot++) {
      const influence = influences[slot],
        weight = influence?.weight ?? 0
      expect(weights[vertex * 4 + slot]).toBe(Math.fround(weight))
      expect(joints[vertex * 4 + slot]).toBe(
        weight ? skin.joints.findIndex((joint) => joint.nodeId === influence!.jointId) : 0,
      )
    }
  }
  expect(source).toEqual(before)
  expect(encodeSceneGlb(source, { allowLosses: true }).bytes).toEqual(result.bytes)
})

test('real GLTFLoader skin poses match native affine deformation, animated hidden bones and reflected skeletons without revealing hidden meshes', async () => {
  const source = fixture(),
    mesh = source.nodes.find((node) => node.kind === 'mesh')!
  source.nodes = source.nodes.map(
    (node): ModelSceneNode =>
      node.id !== 'upper'
        ? node
        : {
            ...node,
            parentId: 'hidden-mesh',
            hidden: true,
            transform: {
              kind: 'trs',
              translation: [2, 3, -1],
              rotation: quaternionFromEulerXYZ([20, 10, 5]),
              scale: [1, 2, 1],
            },
          },
  )
  source.nodes.push({
    ...mesh,
    id: 'hidden-mesh',
    name: 'Não mostrar',
    parentId: null,
    hidden: true,
  })
  source.mirrors = [
    { id: 'mirror-x', sourceId: mesh.id, name: 'Espelho X', axis: 'x', offset: 2 },
    { id: 'mirror-x-copy', sourceId: mesh.id, name: 'Outro X', axis: 'x', offset: 2 },
    { id: 'mirror-z', sourceId: mesh.id, name: 'Espelho Z', axis: 'z', offset: -1 },
  ]
  const clip: SceneAnimationClip = {
    id: 'move',
    name: 'Mover ossos',
    duration: 2,
    fps: 30,
    loop: false,
    space: 'local-delta',
    tracks: [
      {
        nodeId: 'upper',
        channel: 'rotation',
        keys: [
          { time: 0, value: [0, 0, 0, 1], interpolation: 'linear' },
          { time: 2, value: quaternionFromEulerXYZ([50, -20, 70]), interpolation: 'linear' },
        ],
      },
      {
        nodeId: 'lower',
        channel: 'scale',
        keys: [
          { time: 0, value: [1, 1, 1], interpolation: 'linear' },
          { time: 2, value: [0, 1.5, 1], interpolation: 'linear' },
        ],
      },
      {
        nodeId: 'hidden-mesh',
        channel: 'translation',
        keys: [
          { time: 0, value: [0, 0, 0], interpolation: 'smooth' },
          { time: 2, value: [-1, 2, 1], interpolation: 'linear' },
        ],
      },
    ],
  }
  source.animations = [clip]
  const before = structuredClone(source),
    result = encodeSceneGlb(source, { allowLosses: true })
  await expectValidGlb(result.bytes, Array(4).fill('NODE_SKINNED_MESH_NON_ROOT'))
  const json = readGlb(result.bytes).json,
    hierarchy = prepareSceneGlbHierarchy(source),
    loaded = await new GLTFLoader().parseAsync(result.bytes.slice().buffer, ''),
    mixer = new AnimationMixer(loaded.scene),
    action = mixer.clipAction(loaded.animations[0]!)
  action.setLoop(LoopOnce, 1)
  action.clampWhenFinished = true
  action.play()
  const draws = skinned(loaded.scene)
  expect(draws).toHaveLength(4)
  expect(result.stats).toMatchObject({ renderedParts: 4, meshes: 1, drawCalls: 4, clips: 1 })
  expect(rows(json.skins)).toHaveLength(3)
  expect(hierarchy.targets.get('upper')).toHaveLength(3)
  expect(hierarchy.targets.get('hidden-mesh')).toHaveLength(3)
  expect(hierarchy.meshes.has('hidden-mesh')).toBe(false)
  expect(
    result.issues
      .filter((issue) => issue.code === 'skin-dependency')
      .map((issue) => issue.sourceId)
      .sort(),
  ).toEqual(['hidden-mesh', 'lower', 'upper'])
  const skin = source.skins![0]!,
    prepared = prepareSceneSkin(source, skin),
    sampler = prepareSceneAnimation(source, clip.id),
    geometry = source.geometries[0]!
  if (geometry.kind !== 'mesh') throw new Error('Mesh expected')
  const built = buildSceneGeometry(geometry),
    pointIndex = new Map(prepared.vertexIds.map((id, i) => [id, i])),
    point = new Vector3()
  try {
    for (let step = 0; step <= 60; step++) {
      const time = step / 30,
        pose = sampler.sample(time, false),
        positions = deformSceneSkin(prepared, pose.worldMatrices),
        meshWorld = new Matrix4().fromArray(pose.worldMatrices.get(mesh.id)!)
      mixer.setTime(time)
      loaded.scene.updateMatrixWorld(true)
      for (const draw of draws) {
        const mirrorId = draw.userData.molda.mirrorId,
          mirror = source.mirrors.find((mirror) => mirror.id === mirrorId)
        for (let corner = 0; corner < built.cornerIndices.length; corner++) {
          const face = geometry.faces[built.faceIds[Math.floor(corner / 3)]!]!,
            id = face.corners[built.cornerIndices[corner]!]!.vertexId,
            expected = new Vector3()
              .fromArray(positions, pointIndex.get(id)! * 3)
              .applyMatrix4(meshWorld)
          if (mirror) expected[mirror.axis] = 2 * mirror.offset - expected[mirror.axis]
          draw.getVertexPosition(corner, point).applyMatrix4(draw.matrixWorld)
          expect(point.distanceTo(expected)).toBeLessThan(0.00002)
        }
      }
    }
    expect(source).toEqual(before)
  } finally {
    mixer.stopAllAction()
    mixer.uncacheRoot(loaded.scene)
    dispose(loaded.scene)
  }
})

test('distinct bindings share base accessors but not weights; real skeleton clones animate independently and keep attachments', async () => {
  const source = fixture(),
    original = source.nodes.find((node) => node.kind === 'mesh')!
  source.nodes.push(
    { ...original, id: 'copy', name: 'Outra peça' },
    {
      ...original,
      id: 'attachment',
      name: 'Adereço',
      parentId: 'lower',
      transform: {
        kind: 'trs',
        translation: [1, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [0.5, 0.5, 0.5],
      },
    },
  )
  const { id: _id, ...input } = makeSceneSkinFixture().input
  const document = createSceneSkin(
    source,
    {
      ...input,
      nodeId: 'copy',
      weights: Object.fromEntries(
        Object.keys(input.weights).map((id) => [id, [{ jointId: 'lower', weight: 1 }]]),
      ),
    },
    () => 'skin-copy',
  )
  document.animations = [
    {
      id: 'move',
      name: 'Mover',
      duration: 1,
      fps: 30,
      loop: true,
      space: 'local',
      tracks: [
        {
          nodeId: 'lower',
          channel: 'translation',
          keys: [
            { time: 0, value: [0, 1, 0], interpolation: 'linear' },
            { time: 1, value: [2, 1, 0], interpolation: 'linear' },
          ],
        },
      ],
    },
  ]
  const result = encodeSceneGlb(document, { allowLosses: true })
  expect(result.stats.bones).toBe(2)
  await expectValidGlb(result.bytes, Array(2).fill('NODE_SKINNED_MESH_NON_ROOT'))
  const json = readGlb(result.bytes).json,
    attributes = rows(json.meshes).map((mesh) =>
      record(rows(mesh.primitives)[0]!.attributes, 'attributes'),
    )
  expect(new Set(attributes.map((row) => row.POSITION)).size).toBe(1)
  expect(
    new Set(attributes.filter((row) => row.WEIGHTS_0 !== undefined).map((row) => row.WEIGHTS_0))
      .size,
  ).toBe(2)
  const loaded = await new GLTFLoader().parseAsync(result.bytes.slice().buffer, ''),
    first = clone(loaded.scene),
    second = clone(loaded.scene),
    a = skinned(first),
    b = skinned(second),
    mixerA = new AnimationMixer(first),
    mixerB = new AnimationMixer(second)
  try {
    expect(a).toHaveLength(2)
    expect(b).toHaveLength(2)
    expect(a[0]!.skeleton).not.toBe(b[0]!.skeleton)
    expect(a[0]!.skeleton.bones[0]).not.toBe(b[0]!.skeleton.bones[0])
    expect(a[0]!.geometry).toBe(b[0]!.geometry)
    mixerA.clipAction(loaded.animations[0]!).play()
    mixerB.clipAction(loaded.animations[0]!).play()
    mixerA.setTime(0.25)
    mixerB.setTime(0.75)
    first.updateMatrixWorld(true)
    second.updateMatrixWorld(true)
    const saved = b[0]!.getVertexPosition(0, new Vector3()).clone()
    expect(a[0]!.getVertexPosition(0, new Vector3()).distanceTo(saved)).toBeGreaterThan(0.1)
    mixerA.setTime(0.5)
    first.updateMatrixWorld(true)
    expect(b[0]!.getVertexPosition(0, new Vector3())).toEqual(saved)
    const attachment = first.getObjectByName('Adereço')
    expect(attachment instanceof Mesh).toBe(true)
    expect(attachment?.parent?.userData.molda.sourceId).toBe('lower')
  } finally {
    for (const [mixer, root] of [
      [mixerA, first],
      [mixerB, second],
    ] as const) {
      mixer.stopAllAction()
      mixer.uncacheRoot(root)
      for (const mesh of skinned(root)) mesh.skeleton.dispose()
    }
    dispose(loaded.scene)
  }
})

test.each([
  'local',
  'local-delta',
] as const)('%s assisted/limited and reflected poses bake to ordinary portable skins with independent playback', async (space) => {
  const { document, statuses } = makeSceneAssistedSkinFixture(space),
    before = structuredClone(document)
  expect(statuses).toEqual(['reached', 'reached', 'bend-limit'])
  expect(document.animations![0]!.tracks.every((track) => track.channel === 'rotation')).toBe(true)
  expect(document.animations![0]!.tracks).toHaveLength(2)
  expect(document.animations![1]!.tracks).toHaveLength(6)
  const result = await prepareSceneGlbInWorker({ document, documentId: document.id, revision: 7 })
  expect(result).toEqual(encodeSceneGlb(document, { allowLosses: true }))
  expect(result.issues).toContainEqual({ code: 'bend-limit-omitted', sourceId: 'lower' })
  expect(() => encodeSceneGlb(document)).toThrow(SceneGlbLossError)
  await expectValidGlb(result.bytes, Array(3).fill('NODE_SKINNED_MESH_NON_ROOT'))
  const json = readGlb(result.bytes).json
  expect(JSON.stringify(json)).not.toContain('twoBoneGuide')
  expect(JSON.stringify(json)).not.toContain('bendLimit')
  const loaded = await new GLTFLoader().parseAsync(result.bytes.slice().buffer, '')
  const first = clone(loaded.scene),
    second = clone(loaded.scene)
  const roots = [first, second],
    mixers = roots.map((root) => new AnimationMixer(root))
  const draws = roots.map(skinned),
    skin = prepareSceneSkin(document, document.skins![0]!)
  const geometry = document.geometries[0]!
  if (geometry.kind !== 'mesh') throw new Error('Expected mesh')
  const built = buildSceneGeometry(geometry),
    pointIndex = new Map(skin.vertexIds.map((id, i) => [id, i]))
  const samplers = document.animations!.map((clip) => prepareSceneAnimation(document, clip.id))
  try {
    expect(loaded.animations).toHaveLength(2)
    for (const [i, mixer] of mixers.entries()) {
      const action = mixer.clipAction(loaded.animations[i]!)
      action.setLoop(LoopOnce, 1)
      action.clampWhenFinished = true
      action.play()
      expect(draws[i]).toHaveLength(3)
    }
    expect(draws[0]![0]!.skeleton).not.toBe(draws[1]![0]!.skeleton)
    expect(draws[0]![0]!.skeleton.bones[0]).not.toBe(draws[1]![0]!.skeleton.bones[0])
    expect(draws[0]![0]!.geometry).toBe(draws[1]![0]!.geometry)
    for (let step = 0; step <= 120; step++) {
      for (let i = 0; i < 2; i++) {
        const time = i === 0 ? step / 60 : (2 - step / 60) * 0.9
        const pose = samplers[i]!.sample(time, false),
          positions = deformSceneSkin(skin, pose.worldMatrices)
        const world = new Matrix4().fromArray(pose.worldMatrices.get('part-0')!)
        mixers[i]!.setTime(time)
        roots[i]!.updateMatrixWorld(true)
        for (const draw of draws[i]!) {
          const mirror = document.mirrors.find(
            (mirror) => mirror.id === draw.userData.molda.mirrorId,
          )
          for (let corner = 0; corner < built.cornerIndices.length; corner++) {
            const face = geometry.faces[built.faceIds[Math.floor(corner / 3)]!]!
            const id = face.corners[built.cornerIndices[corner]!]!.vertexId
            const expected = new Vector3()
              .fromArray(positions, pointIndex.get(id)! * 3)
              .applyMatrix4(world)
            if (mirror) expected[mirror.axis] = 2 * mirror.offset - expected[mirror.axis]
            const actual = draw
              .getVertexPosition(corner, new Vector3())
              .applyMatrix4(draw.matrixWorld)
            expect(actual.distanceTo(expected)).toBeLessThan(0.00002)
          }
        }
      }
    }
    const saved = draws[1]!.map((mesh) =>
      mesh.getVertexPosition(0, new Vector3()).applyMatrix4(mesh.matrixWorld),
    )
    mixers[0]!.stopAllAction()
    first.updateMatrixWorld(true)
    expect(
      draws[1]!.map((mesh) =>
        mesh.getVertexPosition(0, new Vector3()).applyMatrix4(mesh.matrixWorld),
      ),
    ).toEqual(saved)
    expect(document).toEqual(before)
  } finally {
    for (const [i, mixer] of mixers.entries()) {
      mixer.stopAllAction()
      mixer.uncacheRoot(roots[i]!)
      for (const draw of draws[i]!) draw.skeleton.dispose()
    }
    dispose(loaded.scene)
  }
})

test('portable skin rejects positive weight underflow and Float32-singular inverse binds without changing the native binding', () => {
  const underflow = fixture()
  underflow.skins![0]!.weights.v_0_0 = [
    { jointId: 'upper', weight: 1 },
    { jointId: 'lower', weight: 1e-100 },
  ]
  const singular = fixture(),
    matrix = identityMatrix()
  // Invertible in Double (det ≈ 1e-8), singular after Float32 storage.
  matrix[0] = 1
  matrix[1] = 1
  matrix[4] = 1
  matrix[5] = 1 + 1e-8
  singular.skins![0]!.joints[0]!.inverseBindMatrix = matrix
  const overflow = fixture()
  overflow.skins![0]!.joints[0]!.inverseBindMatrix[12] = 1e100
  for (const source of [underflow, singular, overflow]) {
    const before = structuredClone(source)
    expect(() => encodeSceneGlb(source, { allowLosses: true })).toThrow('precisão')
    expect(source).toEqual(before)
  }
})

test('256 unordered joints in separate native roots share a legal skeleton root and preserve the smallest positive Float32 weight', async () => {
  const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    mesh = document.nodes.find((node) => node.kind === 'mesh')!
  document.nodes = [
    { ...mesh, parentId: null },
    ...Array.from(
      { length: 256 },
      (_, i): ModelSceneNode => ({
        id: `bone-${i}`,
        name: `Osso ${i}`,
        kind: 'locator',
        parentId: null,
        hidden: false,
        locked: false,
        transform: {
          kind: 'trs',
          translation: [i, 0, 0],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        },
      }),
    ),
  ]
  input.jointIds = Array.from({ length: 256 }, (_, i) => `bone-${255 - i}`)
  input.weights = Object.fromEntries(
    Object.keys(input.weights).map((id) => [
      id,
      [0, 1, 100, 255].map((i) => ({ jointId: `bone-${i}`, weight: 0.25 })),
    ]),
  )
  input.weights.v_0_0 = [
    { jointId: 'bone-0', weight: 1 },
    { jointId: 'bone-1', weight: 2 ** -149 },
  ]
  const source = createSceneSkin(document, input, () => id),
    before = structuredClone(source)
  expect(readSceneDocument(source).status).toBe('valid')
  const result = encodeSceneGlb(source, { allowLosses: true })
  await expectValidGlb(result.bytes, ['NODE_SKINNED_MESH_NON_ROOT'])
  const parsed = readGlb(result.bytes),
    portable = rows(parsed.json.skins)[0]!,
    attrs = record(rows(rows(parsed.json.meshes)[0]!.primitives)[0]!.attributes, 'attributes'),
    jointIndices = readAccessor(parsed, index(attrs.JOINTS_0)),
    weights = readAccessor(parsed, index(attrs.WEIGHTS_0))
  expect(portable.joints).toHaveLength(256)
  expect(jointIndices.includes(255)).toBe(true)
  expect(weights.includes(2 ** -149)).toBe(true)
  expect(readAccessor(parsed, index(portable.inverseBindMatrices))).toHaveLength(256 * 16)
  expect(source).toEqual(before)
})

test('an entirely hidden bound mesh does not export its skin, mirrored helpers or hidden bone dependencies', () => {
  const source = fixture()
  source.nodes = source.nodes.map((node) => ({ ...node, hidden: true }))
  source.mirrors = [{ id: 'mirror', sourceId: 'part-0', name: 'Espelho', axis: 'x', offset: 0 }]
  const hierarchy = prepareSceneGlbHierarchy(source),
    result = encodeSceneGlb(source, { allowLosses: true })
  expect(hierarchy.nodes).toEqual([])
  expect(hierarchy.skins.size).toBe(0)
  expect(hierarchy.retained).toEqual([])
  expect(result.stats).toMatchObject({ nodes: 0, meshes: 0, renderedParts: 0, drawCalls: 0 })
  expect(result.issues.every((issue) => issue.code === 'hidden-node')).toBe(true)
})

test('portable skin preserves native face orientation and Three normal transforms under affine scale and mirrors', async () => {
  const source = fixture()
  source.materials = source.materials.map((material) => ({ ...material, doubleSided: false }))
  source.mirrors = [{ id: 'mirror', sourceId: 'part-0', name: 'Espelho', axis: 'x', offset: 2 }]
  const result = encodeSceneGlb(source, { allowLosses: true }),
    loaded = await new GLTFLoader().parseAsync(result.bytes.slice().buffer, ''),
    native = new SceneRenderResource()
  function normal(mesh: SkinnedMesh, vertex: number) {
    const base = new Vector3().fromBufferAttribute(mesh.geometry.getAttribute('normal'), vertex),
      posed = mesh.applyBoneTransform(vertex, new Vector4(base.x, base.y, base.z, 0))
    return new Vector3(posed.x, posed.y, posed.z)
      .applyMatrix3(new Matrix3().getNormalMatrix(mesh.matrixWorld))
      .normalize()
  }
  try {
    native.update(source)
    native.root.updateMatrixWorld(true)
    loaded.scene.updateMatrixWorld(true)
    for (const portable of skinned(loaded.scene)) {
      const id = portable.userData.molda.mirrorId ?? portable.userData.molda.sourceId,
        mesh = native.root.children.find((object) => native.instanceFor(object)?.id === id)
      if (!(mesh instanceof SkinnedMesh)) throw new Error('Native skinned mesh expected')
      expect(Math.sign(portable.matrixWorld.determinant())).toBe(
        Math.sign(mesh.matrixWorld.determinant()),
      )
      for (let vertex = 0; vertex < mesh.geometry.getAttribute('position').count; vertex++)
        expect(normal(portable, vertex).distanceTo(normal(mesh, vertex))).toBeLessThan(0.000001)
    }
  } finally {
    native.dispose()
    dispose(loaded.scene)
  }
})

test('skin dependencies and their reflected paths count toward the helper-node budget before binary work', () => {
  const source = fixture(),
    original = source.nodes.find((node) => node.kind === 'mesh')!
  const nodes: ModelSceneNode[] = Array.from({ length: 440 }, (_, i) => ({
    id: `bone-${i}`,
    name: 'Osso',
    kind: 'group',
    hidden: true,
    locked: false,
    parentId: i ? `bone-${i - 1}` : null,
    transform: { kind: 'affine', matrix: identityMatrix() },
  }))
  nodes.push({ ...original, parentId: null })
  const document: MoldaSceneDocument = {
    ...source,
    skins: [],
    nodes,
    mirrors: Array.from({ length: 30 }, (_, i) => ({
      id: `mirror-${i}`,
      name: 'Espelho',
      sourceId: original.id,
      axis: 'x',
      offset: i,
    })),
  }
  const bound = createSceneSkin(
    document,
    {
      name: 'Vínculo',
      nodeId: original.id,
      jointIds: ['bone-439'],
      weights: Object.fromEntries(
        Object.keys(source.skins![0]!.weights).map((id) => [
          id,
          [{ jointId: 'bone-439', weight: 1 }],
        ]),
      ),
    },
    () => 'skin',
  )
  expect(() => prepareSceneGlbHierarchy(bound)).toThrow('nós demais')
  expect(indexSceneDocument(bound).skins.size).toBe(1)
})

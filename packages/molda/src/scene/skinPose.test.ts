import { expect, test } from 'bun:test'
import {
  Bone,
  BufferAttribute,
  BufferGeometry,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  Skeleton,
  SkinnedMesh,
  Vector3,
} from 'three'
import type { Vec3 } from '../core/model'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import type { MoldaSceneDocument, SceneMeshGeometry } from './document'
import { indexSceneNodes } from './graph'
import { type AffineMatrix, identityMatrix, type SceneTransform } from './matrix'
import { prepareSceneAnimation } from './sampleAnimation'
import { bindSceneSkin } from './skinBinding'
import { deformSceneSkin, prepareSceneSkin, sceneSkinPalette } from './skinPose'

function place(object: Object3D, transform: SceneTransform) {
  object.matrixAutoUpdate = false
  if (transform.kind === 'affine') object.matrix.fromArray(transform.matrix)
  else {
    object.position.fromArray(transform.translation)
    object.quaternion.fromArray(transform.rotation)
    object.scale.fromArray(transform.scale)
    object.updateMatrix()
  }
}

/** Only authorial values are shared with the native side; Three computes its own hierarchy/inverses. */
function threeOracle(
  document: MoldaSceneDocument,
  input: ReturnType<typeof makeSceneSkinFixture>['input'],
) {
  const nodes = new Map<string, Object3D>(),
    geometry = new BufferGeometry(),
    material = new MeshBasicMaterial(),
    mesh = new SkinnedMesh(geometry, material),
    root = new Object3D(),
    source = document.geometries[0] as SceneMeshGeometry,
    vertexIds = Object.keys(source.vertices)
  const weights: number[] = [],
    indices: number[] = []
  for (const vertexId of vertexIds) {
    const influences = input.weights[vertexId]!
    for (let slot = 0; slot < 4; slot++) {
      const influence = influences[slot]
      weights.push(influence?.weight ?? 0)
      indices.push(influence ? input.jointIds.indexOf(influence.jointId) : 0)
    }
  }
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float64Array(vertexIds.flatMap((id) => source.vertices[id]!)), 3),
  )
  geometry.setAttribute('skinIndex', new BufferAttribute(new Uint16Array(indices), 4))
  geometry.setAttribute('skinWeight', new BufferAttribute(new Float64Array(weights), 4))
  for (const node of document.nodes) {
    const object =
      node.id === input.nodeId
        ? mesh
        : input.jointIds.includes(node.id)
          ? new Bone()
          : new Object3D()
    place(object, node.transform)
    nodes.set(node.id, object)
  }
  for (const node of document.nodes)
    (node.parentId === null ? root : nodes.get(node.parentId)!).add(nodes.get(node.id)!)
  root.updateMatrixWorld(true)
  const bones = input.jointIds.map((id) => nodes.get(id) as Bone),
    inverses = bones.map((bone) => bone.matrixWorld.clone().invert().multiply(mesh.matrixWorld)),
    skeleton = new Skeleton(bones, inverses)
  mesh.bind(skeleton, new Matrix4())
  root.updateMatrixWorld(true)
  return {
    nodes,
    root,
    mesh,
    skeleton,
    dispose() {
      skeleton.dispose()
      geometry.dispose()
      material.dispose()
    },
  }
}

test('Double skin deformation matches real Three SkinnedMesh across affine/reflected ancestors and independent joint/mesh poses', () => {
  const { document, input } = makeSceneSkinFixture(),
    original = structuredClone({ document, input }),
    binding = bindSceneSkin(document, input),
    prepared = prepareSceneSkin(document, binding),
    oracle = threeOracle(document, input),
    before = structuredClone(prepared),
    positions = (document.geometries[0] as SceneMeshGeometry).vertices
  try {
    for (let i = 0; i < 2; i++) {
      for (let component = 0; component < 16; component++)
        expect(binding.joints[i]!.inverseBindMatrix[component]!).toBeCloseTo(
          oracle.skeleton.boneInverses[i]!.elements[component]!,
          12,
        )
    }
    const rest = deformSceneSkin(prepared, indexSceneNodes(document.nodes).worldMatrices)
    for (let i = 0; i < rest.length; i++) expect(rest[i]!).toBeCloseTo(prepared.positions[i]!, 12)
    for (let frame = 0; frame <= 120; frame++) {
      const time = frame / 120,
        angle = time * Math.PI * 0.8,
        changed = document.nodes.map((node) => {
          if (node.id === 'lower')
            return {
              ...node,
              transform: {
                kind: 'trs',
                translation: [time, 1, -time],
                rotation: [0, 0, Math.sin(angle / 2), Math.cos(angle / 2)],
                scale: [1 + time, 1 - time * 2, 1],
              } as SceneTransform,
            }
          if (node.id === 'part-0' && node.transform.kind === 'affine') {
            const matrix = [...node.transform.matrix] as AffineMatrix
            matrix[12] += time * 2
            return { ...node, transform: { kind: 'affine', matrix } as SceneTransform }
          }
          return node
        }),
        native = deformSceneSkin(prepared, indexSceneNodes(changed).worldMatrices)
      for (const node of changed) place(oracle.nodes.get(node.id)!, node.transform)
      oracle.root.updateMatrixWorld(true)
      for (const [vertex, vertexId] of prepared.vertexIds.entries()) {
        const expected = oracle.mesh.applyBoneTransform(
          vertex,
          new Vector3(...positions[vertexId]!),
        )
        for (const [component, value] of expected.toArray().entries())
          expect(native[vertex * 3 + component]!).toBeCloseTo(value, 10)
      }
    }
    expect(prepared).toEqual(before)
    expect({ document, input }).toEqual(original)
  } finally {
    oracle.dispose()
  }
})

test('the existing local-delta timeline drives joint skinning with no second animation system', () => {
  const { document, input } = makeSceneSkinFixture()
  document.animations = [
    {
      id: 'move',
      name: 'Dobrar',
      duration: 2,
      fps: 24,
      loop: false,
      space: 'local-delta',
      tracks: [
        {
          nodeId: 'lower',
          channel: 'translation',
          keys: [
            { time: 0, value: [0, 0, 0], interpolation: 'linear' },
            { time: 2, value: [2, 0, 0], interpolation: 'linear' },
          ],
        },
      ],
    },
  ]
  const prepared = prepareSceneSkin(document, bindSceneSkin(document, input)),
    player = prepareSceneAnimation(document, 'move'),
    oracle = threeOracle(document, input),
    positions = (document.geometries[0] as SceneMeshGeometry).vertices
  try {
    for (const time of [0, Number.MIN_VALUE, 0.5, 1, 1.999999999, 2]) {
      const result = deformSceneSkin(prepared, player.sample(time).worldMatrices)
      place(oracle.nodes.get('lower')!, {
        kind: 'trs',
        translation: [time, 1, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      })
      oracle.root.updateMatrixWorld(true)
      for (const [vertex, id] of prepared.vertexIds.entries()) {
        const expected = oracle.mesh
          .applyBoneTransform(vertex, new Vector3(...positions[id]!))
          .toArray()
        for (let axis = 0; axis < 3; axis++)
          expect(result[vertex * 3 + axis]!).toBeCloseTo(expected[axis]!, 11)
      }
    }
  } finally {
    oracle.dispose()
  }
})

test('prepared buffers own exact values, reject incomplete/non-affine/singular poses and never emit partial invalid positions', () => {
  const { document, input } = makeSceneSkinFixture(),
    geometry = document.geometries[0] as SceneMeshGeometry
  geometry.vertices.v_0_0 = [1.123456789123, Number.MIN_VALUE, -2.123456789123]
  const binding = bindSceneSkin(document, input),
    prepared = prepareSceneSkin(document, binding),
    pose = indexSceneNodes(document.nodes).worldMatrices,
    expected = deformSceneSkin(prepared, pose)
  expect([...prepared.positions.slice(0, 3)]).toEqual(geometry.vertices.v_0_0!)
  geometry.vertices.v_0_0 = [99, 99, 99]
  binding.joints[0]!.inverseBindMatrix[12] = 999
  binding.weights.v_0_0![0]!.weight = 99
  expect(deformSceneSkin(prepared, pose)).toEqual(expected)
  expect(Object.keys(prepared).sort()).toEqual([
    'jointIndices',
    'joints',
    'nodeId',
    'positions',
    'vertexIds',
    'weights',
  ])
  const missing = new Map(pose)
  missing.delete('lower')
  expect(() => sceneSkinPalette(prepared, missing)).toThrow('não contém')
  for (const change of [
    (m: AffineMatrix) => {
      m[0] = 0
    },
    (m: AffineMatrix) => {
      m[3] = 1
    },
    (m: AffineMatrix) => {
      m[0] = NaN
    },
  ]) {
    const bad = new Map(pose),
      matrix = identityMatrix()
    change(matrix)
    bad.set(prepared.nodeId, matrix)
    expect(() => deformSceneSkin(prepared, bad)).toThrow()
  }
  const bad = new Map(pose),
    huge = identityMatrix()
  huge[0] = Number.MAX_VALUE
  huge[12] = Number.MAX_VALUE
  bad.set('lower', huge)
  expect(() => deformSceneSkin(prepared, bad)).toThrow()
  expect(deformSceneSkin(prepared, pose)).toEqual(expected)
})

test('the highest joint slot stays addressable and zero-weight slots do not contribute', () => {
  const { document, input } = makeSceneSkinFixture(),
    base = document.nodes[2]!
  document.nodes = [
    ...document.nodes.slice(0, 2),
    ...Array.from({ length: 256 }, (_, i) => ({ ...base, id: `joint-${i}` })),
  ]
  input.jointIds = Array.from({ length: 256 }, (_, i) => `joint-${i}`)
  input.weights = Object.fromEntries(
    Object.keys(input.weights).map((id) => [id, [{ jointId: 'joint-255', weight: 1 }]]),
  )
  const prepared = prepareSceneSkin(document, bindSceneSkin(document, input)),
    pose = new Map(indexSceneNodes(document.nodes).worldMatrices)
  expect(prepared.jointIndices[0]).toBe(255)
  const rest = deformSceneSkin(prepared, pose)
  for (let i = 0; i < rest.length; i++) expect(rest[i]!).toBeCloseTo(prepared.positions[i]!, 12)
  const moved = document.nodes.map((node) =>
    node.id === 'joint-255'
      ? {
          ...node,
          transform: {
            kind: 'trs',
            translation: [1, 1, 0] as Vec3,
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          } as SceneTransform,
        }
      : node,
  )
  expect(deformSceneSkin(prepared, indexSceneNodes(moved).worldMatrices)).not.toEqual(rest)
  input.jointIds.push('rig')
  expect(() => bindSceneSkin(document, input)).toThrow('orçamento')
})

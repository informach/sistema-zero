import { expect, test } from 'bun:test'
import type { Object3D } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { Vec3 } from '../core/model'
import type { SceneAnimationClip } from '../scene/animation'
import { groupSceneNodes } from '../scene/commands'
import type { ModelSceneNode, MoldaSceneDocument } from '../scene/document'
import { indexSceneDocument } from '../scene/documentIndex'
import { evaluateSceneInstances } from '../scene/evaluate'
import { identityMatrix, type Quaternion, quaternionFromEulerXYZ } from '../scene/matrix'
import { prepareSceneAnimation, sampleSceneAnimationTrack } from '../scene/sampleAnimation'
import { animatedScene, sceneAnimationClip, sceneRotationTrack } from '../testing/sceneAnimation'
import { MAX_SCENE_GLB_NODES, prepareSceneGlbHierarchy } from './sceneGlbHierarchy'

async function load(prepared: ReturnType<typeof prepareSceneGlbHierarchy>) {
  const gltf = await new GLTFLoader().parseAsync(
    JSON.stringify({
      asset: { version: '2.0' },
      scene: 0,
      scenes: [{ nodes: prepared.roots }],
      nodes: prepared.nodes,
    }),
    '',
  )
  gltf.scene.updateMatrixWorld(true)
  const nodes: Object3D[] = await Promise.all(
    prepared.nodes.map((_, i) => gltf.parser.getDependency('node', i)),
  )
  return { gltf, nodes }
}
function match(actual: readonly number[], expected: readonly number[]) {
  for (let i = 0; i < 16; i++) expect(actual[i]).toBeCloseTo(expected[i]!, 10)
}

test('legal glTF TRS hierarchy preserves nested shear, reflection, locators, and mesh attachment in the real Three loader', async () => {
  const base = groupSceneNodes(animatedScene(), ['body', 'wing'], {
    name: 'Grupo',
    nextId: () => 'group',
  })
  const source: MoldaSceneDocument = {
    ...base,
    mirrors: [{ id: 'reflected-wing', name: 'Outra asa', sourceId: 'wing', axis: 'x', offset: 1 }],
    nodes: [
      ...base.nodes.map(
        (node): ModelSceneNode =>
          node.id !== 'group'
            ? node
            : {
                ...node,
                transform: {
                  kind: 'affine',
                  matrix: [1, 0, 0, 0, 0.4, 2, 0, 0, -0.2, 0.1, 1, 0, 3, -2, 1, 1],
                },
              },
      ),
      {
        id: 'locator',
        name: 'Ponto',
        kind: 'locator',
        parentId: 'body',
        transform: {
          kind: 'trs',
          translation: [2, 1, -1],
          rotation: quaternionFromEulerXYZ([34, 72, -12]),
          scale: [1, 1, 1],
        },
        hidden: false,
        locked: false,
      },
    ],
  }
  const original = structuredClone(source)
  const prepared = prepareSceneGlbHierarchy(source),
    index = indexSceneDocument(source)
  const loaded = await load(prepared)
  for (const id of index.scene.order) {
    const leaf = prepared.targets.get(id)![0]!.leaf
    match(loaded.nodes[leaf]!.matrixWorld.elements, index.scene.worldMatrices.get(id)!)
  }
  expect(prepared.targets.get('group')![0]!.local).toBeNull()
  expect(prepared.targets.get('body')![0]!.delta).not.toBeNull()
  expect(prepared.targets.get('wing')![0]!.delta).toBeNull()
  expect(prepared.meshes.get('body')).toHaveLength(1)
  expect(prepared.meshes.get('wing')).toHaveLength(2)
  for (const node of prepared.nodes) expect(Object.hasOwn(node, 'matrix')).toBe(false)
  for (const instance of evaluateSceneInstances(index)) {
    const binding = prepared.meshes
      .get(instance.sourceNodeId)!
      .find(
        (i) => (prepared.nodes[i]!.extras.molda.mirrorId ?? instance.sourceNodeId) === instance.id,
      )!
    match(loaded.nodes[binding]!.matrixWorld.elements, instance.worldMatrix)
  }
  expect(source).toEqual(original)
})

test('absolute and relative clips address distinct layers, including animated mirror ancestors, without baking world poses', async () => {
  const initial = animatedScene()
  const base = groupSceneNodes(initial, ['body', 'wing'], {
    name: 'Grupo',
    nextId: () => 'group',
  })
  const source: MoldaSceneDocument = {
    ...base,
    // This fixture authors an absolute-compatible local TRS after grouping.
    nodes: base.nodes.map((node) =>
      node.id === 'wing'
        ? { ...node, transform: initial.nodes.find((entry) => entry.id === 'wing')!.transform }
        : node,
    ),
    mirrors: [{ id: 'reflected-wing', name: 'Outra asa', sourceId: 'wing', axis: 'x', offset: 1 }],
    animations: [
      {
        ...sceneAnimationClip(),
        tracks: [...sceneAnimationClip().tracks, sceneRotationTrack('group')],
      },
      {
        ...sceneAnimationClip('wing'),
        id: 'absolute',
        space: 'local',
        tracks: [
          sceneRotationTrack('group'),
          {
            nodeId: 'wing',
            channel: 'scale',
            keys: [
              { time: 0, value: [-2, 1, 1], interpolation: 'linear' },
              { time: 2, value: [1, 3, 2], interpolation: 'smooth' },
            ],
          },
        ],
      },
    ],
  }
  const prepared = prepareSceneGlbHierarchy(source)
  for (const clip of source.animations!) {
    const loaded = await load(prepared)
    const sampler = prepareSceneAnimation(source, clip.id)
    for (const time of [0, 0.123456789, 0.5, 1, 1.5, 2]) {
      for (const track of clip.tracks) {
        const value = sampleSceneAnimationTrack(track, time)
        for (const target of prepared.targets.get(track.nodeId)!) {
          const id = clip.space === 'local' ? target.local : target.delta
          expect(id === null).toBe(false)
          const node = loaded.nodes[id!]!
          if (track.channel === 'rotation') node.quaternion.fromArray(value as Quaternion)
          else if (track.channel === 'scale') node.scale.fromArray(value as Vec3)
          else node.position.fromArray(value as Vec3)
        }
      }
      loaded.gltf.scene.updateMatrixWorld(true)
      const pose = sampler.sample(time, false)
      for (const instance of evaluateSceneInstances(prepared.index, pose.worldMatrices)) {
        const binding = prepared.meshes
          .get(instance.sourceNodeId)!
          .find(
            (i) =>
              (prepared.nodes[i]!.extras.molda.mirrorId ?? instance.sourceNodeId) === instance.id,
          )!
        match(loaded.nodes[binding]!.matrixWorld.elements, instance.worldMatrix)
      }
    }
  }
})

test('same-plane mirrors share only ancestor paths and mesh bindings, never mutable transform arrays or another instance mesh', () => {
  const base = groupSceneNodes(animatedScene(), ['body', 'wing'], {
    name: 'Grupo',
    nextId: () => 'group',
  })
  const source = {
    ...base,
    mirrors: [
      { id: 'first', name: 'Primeiro', sourceId: 'body', axis: 'x' as const, offset: 0 },
      { id: 'second', name: 'Segundo', sourceId: 'wing', axis: 'x' as const, offset: 0 },
    ],
  }
  const prepared = prepareSceneGlbHierarchy(source)
  expect(prepared.nodes.filter((node) => node.extras.molda.role === 'reflection')).toHaveLength(1)
  expect(prepared.targets.get('group')).toHaveLength(2)
  expect(prepared.meshes.get('body')).toHaveLength(2)
  expect(prepared.meshes.get('wing')).toHaveLength(2)
  const [original, mirror] = prepared.targets.get('group')!
  expect(prepared.nodes[original!.leaf]!.translation).not.toBe(
    prepared.nodes[mirror!.leaf]!.translation,
  )
  expect(prepared.excluded).toEqual([])
})

test('hidden subtrees and their mirrors are explicitly reported and excluded, while locked visible nodes remain exportable', () => {
  const source = animatedScene()
  source.nodes = source.nodes.map((node) => ({ ...node, hidden: node.id === 'wing', locked: true }))
  const prepared = prepareSceneGlbHierarchy(source)
  expect(prepared.excluded).toEqual(['wing'])
  expect([...prepared.meshes.keys()]).toEqual(['body'])
  expect(prepared.targets.has('wing')).toBe(false)
  expect(prepared.nodes.every((node) => node.extras.molda.role !== 'reflection')).toBe(true)
})

test('a mesh used as a mirrored ancestor carries transforms but does not duplicate its visible geometry', async () => {
  const base = animatedScene()
  const source: MoldaSceneDocument = {
    ...base,
    nodes: base.nodes.map((node) => (node.id === 'wing' ? { ...node, parentId: 'body' } : node)),
    mirrors: [{ id: 'reflection', name: 'Outra asa', sourceId: 'wing', axis: 'z', offset: -2 }],
  }
  const prepared = prepareSceneGlbHierarchy(source),
    loaded = await load(prepared)
  expect(prepared.targets.get('body')).toHaveLength(2)
  expect(prepared.meshes.get('body')).toHaveLength(1)
  expect(prepared.meshes.get('wing')).toHaveLength(2)
  expect(prepared.nodes[prepared.targets.get('body')![1]!.leaf]!.extras.molda.role).toBe(
    'mirror-ancestor',
  )
  const mirror = evaluateSceneInstances(prepared.index).find(
    (instance) => instance.id === 'reflection',
  )!
  match(loaded.nodes[prepared.meshes.get('wing')![1]!]!.matrixWorld.elements, mirror.worldMatrix)
})

test('helper expansion has its own preflight budget before factorization, image composition or mesh building', () => {
  const base = animatedScene(),
    mesh = base.nodes.find((node) => node.kind === 'mesh')!
  const nodes: ModelSceneNode[] = Array.from({ length: 440 }, (_, i) => ({
    id: `group-${i}`,
    name: 'Grupo',
    kind: 'group',
    parentId: i ? `group-${i - 1}` : null,
    hidden: false,
    locked: false,
    transform: { kind: 'affine', matrix: identityMatrix() },
  }))
  nodes.push({ ...mesh, id: 'part', parentId: 'group-439' })
  const source: MoldaSceneDocument = {
    ...base,
    nodes,
    animations: [] as SceneAnimationClip[],
    mirrors: Array.from({ length: 30 }, (_, i) => ({
      id: `mirror-${i}`,
      name: 'Espelho',
      sourceId: 'part',
      axis: 'x',
      offset: i,
    })),
  }
  expect(MAX_SCENE_GLB_NODES).toBe(16_384)
  expect(() => prepareSceneGlbHierarchy(source)).toThrow('nós demais')
})

import { expect, test } from 'bun:test'
import { AnimationMixer, LoopOnce, Object3D, Quaternion } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import type { SceneAnimationClip, SceneAnimationTrack } from '../scene/animation'
import type { ModelSceneNode, MoldaSceneDocument } from '../scene/document'
import { evaluateSceneInstances } from '../scene/evaluate'
import { identityMatrix } from '../scene/matrix'
import { readSceneDocument } from '../scene/readDocument'
import { prepareSceneAnimation, sampleSceneAnimationTrack } from '../scene/sampleAnimation'
import { readGlb } from '../testing/glbRead'
import { expectValidGlb } from '../testing/gltfValidation'
import { animatedScene, sceneAnimationClip, sceneRotationTrack } from '../testing/sceneAnimation'
import { encodeSceneGlb } from './sceneGlb'
import { prepareSceneGlbHierarchy } from './sceneGlbHierarchy'
import { SceneGlbLossError } from './sceneGlbReport'
import {
  MAX_SCENE_GLB_ANIMATION_KEYS,
  prepareSceneGlbTrack,
  SCENE_GLB_ROTATION_ERROR,
} from './sceneGlbTrack'

function fixture(clips: SceneAnimationClip[] = [sceneAnimationClip()]): MoldaSceneDocument {
  const source = animatedScene()
  return {
    ...source,
    animations: clips,
    images: [],
    materials: source.materials.map(
      ({ id, name, baseColor, roughness, metalness, doubleSided }) => ({
        id,
        name,
        baseColor,
        roughness,
        metalness,
        doubleSided,
      }),
    ),
  }
}
async function load(source: MoldaSceneDocument, allowLosses = false) {
  const valid = readSceneDocument(source)
  expect(valid.status).toBe('valid')
  const result = encodeSceneGlb(source, { allowLosses })
  await expectValidGlb(result.bytes)
  const gltf = await new GLTFLoader().parseAsync(result.bytes.slice().buffer, '')
  const hierarchy = prepareSceneGlbHierarchy(source)
  const nodes: Object3D[] = await Promise.all(
    hierarchy.nodes.map((_, i) => gltf.parser.getDependency('node', i)),
  )
  return { result, gltf, hierarchy, nodes }
}
function pose(
  mixer: AnimationMixer,
  clip: Parameters<AnimationMixer['clipAction']>[0],
  time: number,
) {
  const action = mixer.clipAction(clip)
  if (!action) throw new Error('Clipe ausente')
  action.reset().setLoop(LoopOnce, 1)
  action.clampWhenFinished = true
  action.play()
  mixer.setTime(time)
  const root = mixer.getRoot()
  if (!(root instanceof Object3D)) throw new Error('Cena esperada')
  root.updateMatrixWorld(true)
}
function match(actual: readonly number[], expected: readonly number[], tolerance = 2e-6) {
  for (let i = 0; i < expected.length; i++)
    expect(Math.abs(actual[i]! - expected[i]!)).toBeLessThanOrEqual(
      tolerance * Math.max(1, Math.abs(expected[i]!)),
    )
}

test('linear/smooth vectors become cubic Hermite channels with exact endpoint slopes, and keep start/end holds and clip duration', async () => {
  const clip = sceneAnimationClip()
  clip.duration = 4
  clip.tracks[0]!.keys[0]!.time = 0.25
  const source = fixture([clip]),
    original = structuredClone(source)
  const loaded = await load(source)
  expect(loaded.result.issues).toEqual([])
  expect(loaded.gltf.animations[0]?.duration).toBe(4)
  const compiled = prepareSceneGlbTrack(clip.tracks[0]!, clip.duration, { keys: 0, channels: 0 })
  expect(compiled.interpolation).toBe('CUBICSPLINE')
  expect(compiled.times).toHaveLength(5)
  expect(compiled.output.length).toBe(compiled.times.length * 9)
  expect(compiled.output.slice(0, 9)).toEqual(new Float32Array(9))
  const sampler = prepareSceneAnimation(source, clip.id),
    mixer = new AnimationMixer(loaded.gltf.scene)
  const target = loaded.hierarchy.targets.get('body')![0]!
  for (const time of [0, 0.1, 0.25, 0.4, 0.91, 1.123456789123, 1.3, 1.75, 2, 3, 4]) {
    pose(mixer, loaded.gltf.animations[0]!, time)
    match(
      loaded.nodes[target.leaf]!.matrixWorld.elements,
      sampler.sample(time, false).worldMatrices.get('body')!,
    )
  }
  mixer.stopAllAction()
  mixer.uncacheRoot(loaded.gltf.scene)
  expect(source).toEqual(original)
})

test('STEP vectors and LINEAR shortest-arc quaternions remain direct glTF samplers with normalized derived values', async () => {
  const clip = sceneAnimationClip(),
    rotation = sceneRotationTrack()
  const translation = clip.tracks[0]!
  for (const key of translation.keys) key.interpolation = 'step'
  rotation.keys[0]!.value = [0, 0, 0, 1.0000001]
  rotation.keys[1]!.value = [0, 0, -Math.sin(0.4), -Math.cos(0.4)]
  clip.tracks.push(rotation)
  const source = fixture([clip]),
    loaded = await load(source),
    mixer = new AnimationMixer(loaded.gltf.scene)
  const target = loaded.hierarchy.targets.get('body')![0]!
  const sampler = prepareSceneAnimation(source, clip.id)
  for (const time of [0, 0.4, 1, Math.fround(translation.keys[1]!.time), 1.5, 2]) {
    pose(mixer, loaded.gltf.animations[0]!, time)
    match(
      loaded.nodes[target.leaf]!.matrixWorld.elements,
      sampler.sample(time, false).worldMatrices.get('body')!,
    )
  }
  expect(prepareSceneGlbTrack(translation, 2, { keys: 0, channels: 0 }).interpolation).toBe('STEP')
  expect(prepareSceneGlbTrack(rotation, 2, { keys: 0, channels: 0 }).interpolation).toBe('LINEAR')
  mixer.stopAllAction()
  mixer.uncacheRoot(loaded.gltf.scene)
})

test('smooth rotation bake is explicit and stays within the angular target in dense real Three playback, including opposite quaternion signs', async () => {
  const rotation = sceneRotationTrack()
  rotation.keys[0]!.interpolation = 'smooth'
  rotation.keys[1]!.value = [0, 0, -1, 0]
  const clip = { ...sceneAnimationClip(), tracks: [rotation] },
    source = fixture([clip])
  expect(() => encodeSceneGlb(source)).toThrow(SceneGlbLossError)
  const loaded = await load(source, true),
    mixer = new AnimationMixer(loaded.gltf.scene)
  const target = loaded.hierarchy.targets.get('body')![0]!.delta!
  expect(loaded.result.issues).toEqual([
    {
      code: 'animation-resampled',
      sourceId: clip.id,
      nodeId: 'body',
      channel: 'rotation',
      samples: 38,
    },
  ])
  let maximum = 0
  for (let i = 0; i <= 800; i++) {
    const time = (i / 800) * 2
    pose(mixer, loaded.gltf.animations[0]!, time)
    const expected = new Quaternion().fromArray(sampleSceneAnimationTrack(rotation, time))
    maximum = Math.max(maximum, loaded.nodes[target]!.quaternion.angleTo(expected))
  }
  expect(maximum).toBeGreaterThan(0.0001)
  expect(maximum).toBeLessThan(SCENE_GLB_ROTATION_ERROR + 1e-6)
  mixer.stopAllAction()
  mixer.uncacheRoot(loaded.gltf.scene)
})

test('mixed STEP/smooth/linear uses an explicitly reported one-Float32-interval jump, not duplicate timestamps or a lost key', async () => {
  const track: SceneAnimationTrack = {
    nodeId: 'body',
    channel: 'translation',
    keys: [
      { time: 0, value: [0, 1, 0], interpolation: 'step' },
      { time: 1, value: [4, 1, 0], interpolation: 'smooth' },
      { time: 2, value: [0, -1, 0], interpolation: 'linear' },
      { time: 3, value: [1, 0, 0], interpolation: 'step' },
    ],
  }
  const clip = { ...sceneAnimationClip(), duration: 3, tracks: [track] },
    source = fixture([clip])
  expect(() => encodeSceneGlb(source)).toThrow(SceneGlbLossError)
  const prepared = prepareSceneGlbTrack(track, 3, { keys: 0, channels: 0 })
  expect(prepared.interpolation).toBe('LINEAR')
  expect(prepared.times[1]).toBe(1 - 2 ** -24)
  expect(prepared.times[2]).toBe(1)
  const loaded = await load(source, true),
    mixer = new AnimationMixer(loaded.gltf.scene)
  const target = loaded.hierarchy.targets.get('body')![0]!.delta!
  for (const time of [0, 0.4, 0.999, 1, 1.25, 1.8, 2, 2.5, 3]) {
    pose(mixer, loaded.gltf.animations[0]!, time)
    match(loaded.nodes[target]!.position.toArray(), sampleSceneAnimationTrack(track, time), 0.004)
  }
  const middle = 1 - 2 ** -25
  pose(mixer, loaded.gltf.animations[0]!, middle)
  expect(loaded.nodes[target]!.position.x).toBeCloseTo(2, 6)
  expect(sampleSceneAnimationTrack(track, middle)[0]).toBe(0)
  mixer.stopAllAction()
  mixer.uncacheRoot(loaded.gltf.scene)
})

test('multiple absolute/delta clips animate mirrored ancestor chains without duplicating samplers, and restore base between clips', async () => {
  const source = fixture(),
    clip = source.animations![0]!
  const group: ModelSceneNode = {
    id: 'group',
    name: 'Grupo',
    kind: 'group',
    parentId: null,
    locked: false,
    hidden: false,
    transform: { kind: 'affine', matrix: [1, 0, 0, 0, 0.3, 2, 0, 0, -0.1, 0.2, 1, 0, 3, -2, 1, 1] },
  }
  source.nodes = [...source.nodes.map((node) => ({ ...node, parentId: 'group' })), group]
  clip.tracks.push(sceneRotationTrack('group'))
  source.animations!.push({
    ...sceneAnimationClip(),
    id: 'absolute',
    name: 'Posar',
    space: 'local',
    tracks: [sceneRotationTrack('wing')],
  })
  source.mirrors = [{ id: 'mirror', name: 'Outra asa', sourceId: 'wing', axis: 'x', offset: 2 }]
  const loaded = await load(source),
    mixer = new AnimationMixer(loaded.gltf.scene)
  expect(loaded.result.stats.animationChannels).toBe(5)
  expect(loaded.result.stats.animationKeys).toBe(7)
  expect(readGlb(loaded.result.bytes).json.animations).toMatchObject([
    {
      name: clip.name,
      channels: [{ sampler: 0 }, { sampler: 1 }, { sampler: 1 }],
      samplers: [{}, {}],
      extras: { molda: { duration: 2, fps: 24, loop: true, space: 'local-delta' } },
    },
    { name: 'Posar', channels: [{ sampler: 0 }, { sampler: 0 }], samplers: [{}] },
  ])
  for (const [i, sourceClip] of source.animations!.entries()) {
    mixer.stopAllAction()
    const sampler = prepareSceneAnimation(source, sourceClip.id)
    for (const time of [0, 0.2, 0.9, 1.5, 2]) {
      pose(mixer, loaded.gltf.animations[i]!, time)
      for (const instance of evaluateSceneInstances(
        loaded.hierarchy.index,
        sampler.sample(time, false).worldMatrices,
      )) {
        const binding = loaded.hierarchy.meshes
          .get(instance.sourceNodeId)!
          .find(
            (j) =>
              (loaded.hierarchy.nodes[j]!.extras.molda.mirrorId ?? instance.sourceNodeId) ===
              instance.id,
          )!
        match(loaded.nodes[binding]!.matrixWorld.elements, instance.worldMatrix)
      }
    }
  }
  mixer.stopAllAction()
  mixer.uncacheRoot(loaded.gltf.scene)
})

test('two real Three clones have independent animation cursors and stopping one does not reset the other', async () => {
  const source = fixture(),
    loaded = await load(source)
  const first = clone(loaded.gltf.scene),
    second = clone(loaded.gltf.scene)
  const a = new AnimationMixer(first),
    b = new AnimationMixer(second),
    clip = loaded.gltf.animations[0]!
  const name = loaded.nodes[loaded.hierarchy.targets.get('body')![0]!.delta!]!.name
  pose(a, clip, 0.5)
  pose(b, clip, 1.5)
  const expectedA = sampleSceneAnimationTrack(source.animations![0]!.tracks[0]!, 0.5)
  const expectedB = sampleSceneAnimationTrack(source.animations![0]!.tracks[0]!, 1.5)
  match(first.getObjectByName(name)!.position.toArray(), expectedA)
  match(second.getObjectByName(name)!.position.toArray(), expectedB)
  a.stopAllAction()
  expect(first.getObjectByName(name)!.position.toArray()).toEqual([0, 0, 0])
  match(second.getObjectByName(name)!.position.toArray(), expectedB)
  b.stopAllAction()
  a.uncacheRoot(first)
  b.uncacheRoot(second)
})

test('clips with no visible channels are reported, while constant channels preserve duration without invalid empty animations', async () => {
  const clip = sceneAnimationClip(),
    source = fixture([clip, { ...clip, id: 'empty', tracks: [] }])
  source.nodes[0]!.hidden = true
  expect(() => encodeSceneGlb(source)).toThrow(SceneGlbLossError)
  const loaded = await load(source, true)
  expect(loaded.gltf.animations).toEqual([])
  expect(loaded.result.issues).toEqual([
    { code: 'hidden-node', sourceId: 'body' },
    { code: 'clip-omitted', sourceId: 'clip', reason: 'hidden' },
    { code: 'clip-omitted', sourceId: 'empty', reason: 'empty' },
  ])
  source.nodes[0]!.hidden = false
  source.animations = [
    {
      ...clip,
      tracks: [
        {
          nodeId: 'body',
          channel: 'scale',
          keys: [{ time: 0.5, value: [-1, 0, 2], interpolation: 'smooth' }],
        },
      ],
    },
  ]
  const constant = await load(source)
  expect(constant.gltf.animations[0]?.duration).toBe(2)
  expect(constant.result.stats.animationKeys).toBe(3)
})

test('Float32 key collisions, tiny mixed holds, unrepresentable durations/values and sampling budgets fail without merging authorial keys', () => {
  const track: SceneAnimationTrack = {
    nodeId: 'body',
    channel: 'translation',
    keys: [
      { time: 1, value: [0, 0, 0], interpolation: 'linear' },
      { time: 1 + Number.EPSILON, value: [1, 0, 0], interpolation: 'linear' },
    ],
  }
  const budget = () => ({ keys: 0, channels: 0 })
  expect(() => prepareSceneGlbTrack(track, 2, budget())).toThrow('mesmo instante')
  expect(() => prepareSceneGlbTrack(sceneRotationTrack(), Number.MIN_VALUE, budget())).toThrow(
    'duração',
  )
  track.keys = [{ time: 0, value: [Number.MAX_VALUE, 0, 0], interpolation: 'linear' }]
  expect(() => prepareSceneGlbTrack(track, 2, budget())).toThrow('valores ou curvas')
  track.keys = [
    { time: 1, value: [0, 0, 0], interpolation: 'step' },
    { time: 1 + 2 ** -23, value: [1, 0, 0], interpolation: 'linear' },
    { time: 2, value: [0, 0, 0], interpolation: 'linear' },
  ]
  expect(() => prepareSceneGlbTrack(track, 2, budget())).toThrow('pausa curta')
  const remaining = { keys: MAX_SCENE_GLB_ANIMATION_KEYS - 1, channels: 0 }
  expect(() => prepareSceneGlbTrack(sceneRotationTrack(), 2, remaining)).toThrow('chaves demais')
  expect(remaining.keys).toBe(MAX_SCENE_GLB_ANIMATION_KEYS)
})

test('mirrored animation channel expansion has an aggregate budget independent of source keys and hierarchy node count', () => {
  const source = fixture([]),
    mesh = source.nodes[0]!
  source.nodes = Array.from(
    { length: 16 },
    (_, i): ModelSceneNode => ({
      id: `g-${i}`,
      name: 'Grupo',
      kind: 'group',
      parentId: i ? `g-${i - 1}` : null,
      locked: false,
      hidden: false,
      transform: { kind: 'affine', matrix: identityMatrix() },
    }),
  )
  source.nodes.push({ ...mesh, parentId: 'g-15' })
  source.mirrors = Array.from({ length: 64 }, (_, i) => ({
    id: `m-${i}`,
    name: 'Espelho',
    sourceId: mesh.id,
    axis: 'x',
    offset: i,
  }))
  const tracks: SceneAnimationTrack[] = source.nodes
    .filter((node) => node.kind === 'group')
    .flatMap((node) =>
      (['translation', 'scale'] as const).map((channel) => ({
        nodeId: node.id,
        channel,
        keys: [{ time: 0, value: [1, 1, 1], interpolation: 'linear' }],
      })),
    )
  source.animations = Array.from({ length: 64 }, (_, i) => ({
    ...sceneAnimationClip(),
    id: `clip-${i}`,
    tracks,
  }))
  expect(prepareSceneGlbHierarchy(source).nodes.length).toBeLessThan(4000)
  expect(() => encodeSceneGlb(source)).toThrow('canais demais')
})

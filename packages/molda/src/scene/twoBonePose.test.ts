import { expect, test } from 'bun:test'
import { Matrix4, Vector3 } from 'three'
import type { Vec3 } from '../core/model'
import { structuredBytes } from '../core/structuredBytes'
import { createDocumentEditorStore } from '../state/editorStore'
import { animatedScene } from '../testing/sceneAnimation'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { makeSceneTwoBoneFixture as fixture } from '../testing/sceneTwoBone'
import { setSceneAnimationKeys } from './animationKeyBatch'
import { captureSceneAnimationLocalPose } from './animationPose'
import { SCENE_LIMITS } from './limits'
import {
  type AffineMatrix,
  composeTransform,
  identityMatrix,
  quaternionFromEulerXYZ,
  transformPoint,
} from './matrix'
import { prepareSceneAnimation } from './sampleAnimation'
import { bindSceneSkin } from './skinBinding'
import { deformSceneSkin, prepareSceneSkin } from './skinPose'
import { prepareSceneTwoBonePose } from './twoBonePose'

const CHAIN = ['root', 'middle', 'tip'] as const
function point(
  pose: ReturnType<ReturnType<typeof prepareSceneAnimation>['sample']>,
  id: string,
): Vec3 {
  const matrix = pose.worldMatrices.get(id)!
  return [matrix[12], matrix[13], matrix[14]]
}

test.each([
  'local',
  'local-delta',
] as const)('%s two-bone frames reach the target, preserve lengths/channels and exactly match committed playback', (space) => {
  const source = fixture(space),
    saved = structuredClone(source)
  const prepared = prepareSceneTwoBonePose(source, 'clip', CHAIN, 0.7)
  for (const target of [
    [1, 1, 0],
    [-1, 0.5, 0.5],
    [0, 0, 0],
    [-2, 0, 0],
    [0, 2, 0],
    [20, 3, -5],
  ] as Vec3[]) {
    const frame = prepared.sample(target, [0, 0, 3]),
      changes = prepared.keys(frame),
      committed = prepared.commit(frame, source)
    expect(changes.length).toBeGreaterThan(0)
    expect(changes.length).toBeLessThanOrEqual(2)
    expect(changes.every((key) => key.channel === 'rotation' && key.key.time === 0.7)).toBe(true)
    expect(frame.pose.worldMatrices).toEqual(
      prepareSceneAnimation(committed, 'clip').sample(0.7, false).worldMatrices,
    )
    expect(point(frame.pose, 'root')).toEqual([0, 0, 0])
    const a = new Vector3(...point(frame.pose, 'root')),
      b = new Vector3(...point(frame.pose, 'middle')),
      c = new Vector3(...point(frame.pose, 'tip'))
    expect(a.distanceTo(b)).toBeCloseTo(1, 12)
    expect(b.distanceTo(c)).toBeCloseTo(1, 12)
    if (Math.hypot(...target) <= 2) {
      expect(frame.reach.status).toBe('reached')
      expect(c.distanceTo(new Vector3(...target))).toBeLessThan(1e-12)
    } else expect(frame.reach.status).toBe('too-far')
    expect(committed.nodes).toBe(source.nodes)
    expect(committed.geometries).toBe(source.geometries)
    expect(committed.images).toBe(source.images)
    for (const id of ['root', 'middle']) {
      const before = captureSceneAnimationLocalPose(source, 'clip', id, 0.7),
        after = captureSceneAnimationLocalPose(committed, 'clip', id, 0.7)
      expect(after.translation).toEqual(before.translation)
      expect(after.scale).toEqual(before.scale)
    }
  }
  expect(prepared.keys(prepared.sample([2, 0, 0]))).toEqual([])
  expect(prepared.commit(prepared.original, source)).toBe(source)
  expect(source).toEqual(saved)
})

test('affine parents preserve their metric; sampled local and relative rigs match independent world targets', () => {
  for (const space of ['local', 'local-delta'] as const)
    for (let i = 0; i < 24; i++) {
      let source = fixture(space)
      const parent = source.nodes.find((node) => node.id === 'parent')!
      parent.transform = {
        kind: 'affine',
        matrix: new Matrix4()
          .makeRotationZ(i * 0.13)
          .multiply(
            new Matrix4().fromArray([1, 0, 0, 0, 0.3, -2, 0, 0, -0.2, 0.1, 3, 0, 2, -1, 4, 1]),
          )
          .toArray() as AffineMatrix,
      }
      source = setSceneAnimationKeys(source, 'clip', [
        {
          nodeId: 'root',
          channel: 'rotation',
          key: { time: 0, value: quaternionFromEulerXYZ([0, 0, 25]), interpolation: 'smooth' },
        },
        {
          nodeId: 'root',
          channel: 'rotation',
          key: { time: 2, value: quaternionFromEulerXYZ([0, 0, -25]), interpolation: 'linear' },
        },
        {
          nodeId: 'middle',
          channel: 'rotation',
          key: { time: 0.7, value: [0, 0, 0, 1], interpolation: 'step' },
        },
      ])
      const prepared = prepareSceneTwoBonePose(source, 'clip', CHAIN, 0.7),
        matrix = new Matrix4().fromArray(composeTransform(parent.transform)),
        target = new Vector3(Math.cos(i) * 1.3, Math.sin(i) * 1.3, 0.2)
          .applyMatrix4(matrix)
          .toArray() as Vec3,
        hint = new Vector3(0, 0, 3).applyMatrix4(matrix).toArray() as Vec3,
        frame = prepared.sample(target, hint),
        keys = prepared.keys(frame),
        committed = prepared.commit(frame, source)
      expect(
        new Vector3(...point(frame.pose, 'tip')).distanceTo(new Vector3(...target)),
      ).toBeLessThan(1e-12)
      expect(frame.pose.worldMatrices).toEqual(
        prepareSceneAnimation(committed, 'clip').sample(0.7, false).worldMatrices,
      )
      expect(keys.find((key) => key.nodeId === 'middle')?.key.interpolation).toBe('step')
      expect(source.animations![0]!.tracks[0]!.keys).toHaveLength(2)
      expect(prepared.keys(prepared.sample(point(prepared.original.pose, 'tip')))).toEqual([])
    }
})

test('a bound mesh follows solved bone keys without changing weights, inverse binds or base geometry', () => {
  const { document, input } = makeSceneSkinFixture()
  document.nodes.push({
    id: 'tip',
    parentId: 'lower',
    name: 'Ponta',
    kind: 'locator',
    hidden: false,
    locked: false,
    transform: { kind: 'trs', translation: [0, 1, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
  })
  document.animations = [{ ...animatedScene().animations[0]!, tracks: [] }]
  const source = { ...document, skins: [bindSceneSkin(document, input)] },
    saved = structuredClone(source),
    prepared = prepareSceneTwoBonePose(source, 'clip', ['upper', 'lower', 'tip'], 0.7),
    parent = prepared.original.pose.worldMatrices.get('rig')!,
    frame = prepared.sample(transformPoint(parent, [1, 2, 0]), transformPoint(parent, [0, 1, 3])),
    committed = prepared.commit(frame, source),
    skin = prepareSceneSkin(source, source.skins![0]!),
    deformation = deformSceneSkin(skin, frame.pose.worldMatrices)
  expect(committed.skins).toBe(source.skins)
  expect(committed.geometries).toBe(source.geometries)
  expect(deformation).not.toEqual(deformSceneSkin(skin, prepared.original.pose.worldMatrices))
  expect(deformation).toEqual(
    deformSceneSkin(
      skin,
      prepareSceneAnimation(committed, 'clip').sample(0.7, false).worldMatrices,
    ),
  )
  expect(source).toEqual(saved)
})

test.each([
  'local',
  'local-delta',
] as const)('%s preserves keyed translations/scales under an animated parent, uses fixed time, and rejects unrepresentable nonuniform joints', (space) => {
  let source = fixture(space)
  source = setSceneAnimationKeys(source, 'clip', [
    {
      nodeId: 'parent',
      channel: 'rotation',
      key: { time: 0, value: quaternionFromEulerXYZ([20, 0, 30]), interpolation: 'linear' },
    },
    {
      nodeId: 'parent',
      channel: 'rotation',
      key: { time: 2, value: quaternionFromEulerXYZ([-30, 20, 0]), interpolation: 'step' },
    },
    {
      nodeId: 'root',
      channel: 'translation',
      key: { time: 0.7, value: [1.123456789123, -2, 3], interpolation: 'step' },
    },
    {
      nodeId: 'middle',
      channel: 'translation',
      key: { time: 0.7, value: [0.5, 0.25, 0], interpolation: 'smooth' },
    },
    {
      nodeId: 'root',
      channel: 'scale',
      key: { time: 0.7, value: [2, 2, 2], interpolation: 'step' },
    },
    {
      nodeId: 'middle',
      channel: 'scale',
      key: { time: 0.7, value: [-1.5, -1.5, -1.5], interpolation: 'smooth' },
    },
  ])
  const prepared = prepareSceneTwoBonePose(source, 'clip', CHAIN, 0.7),
    parent = prepared.original.pose.worldMatrices.get('parent')!,
    target = transformPoint(parent, [3, -1, 3]),
    frame = prepared.sample(target, transformPoint(parent, [1, -2, 8])),
    committed = prepared.commit(frame, source)
  expect(new Vector3(...point(frame.pose, 'tip')).distanceTo(new Vector3(...target))).toBeLessThan(
    1e-12,
  )
  for (let i = 0; i < source.animations![0]!.tracks.length; i++)
    expect(committed.animations![0]!.tracks[i]).toBe(source.animations![0]!.tracks[i])
  expect(frame.pose.worldMatrices).toEqual(
    prepareSceneAnimation(committed, 'clip').sample(0.7, false).worldMatrices,
  )
  const nonuniform = setSceneAnimationKeys(source, 'clip', [
      {
        nodeId: 'root',
        channel: 'scale',
        key: { time: 0.7, value: [2, 1, 3], interpolation: 'step' },
      },
    ]),
    snapshot = structuredClone(nonuniform),
    unsupported = prepareSceneTwoBonePose(nonuniform, 'clip', CHAIN, 0.7)
  expect(() => unsupported.sample(target, transformPoint(parent, [1, -2, 8]))).toThrow()
  expect(nonuniform).toEqual(snapshot)
})

test('unreachable inner targets are reported without stretching or rewriting signed scales', () => {
  const source = fixture('local')
  const middle = source.nodes.find((node) => node.id === 'middle')!
  if (middle.transform.kind !== 'trs') throw new Error('Expected TRS')
  middle.transform.scale = [-2, -2, -2]
  const prepared = prepareSceneTwoBonePose(source, 'clip', CHAIN, 0)
  const frame = prepared.sample([0.1, 0, 0], [0, 0, 1]),
    committed = prepared.commit(frame, source)
  expect(frame.reach.status).toBe('too-close')
  expect(Math.hypot(...point(frame.pose, 'tip'))).toBeCloseTo(1, 12)
  expect(captureSceneAnimationLocalPose(committed, 'clip', 'middle', 0).scale).toEqual([-2, -2, -2])
  expect(frame.pose.worldMatrices).toEqual(
    prepareSceneAnimation(committed, 'clip').sample(0, false).worldMatrices,
  )
})

test('owned private keys resist forged/mutated frames, cancellation and stale revisions, while keeping latest thumbnail on one undo', () => {
  const source = fixture(),
    prepared = prepareSceneTwoBonePose(source, 'clip', CHAIN, 0.7),
    frame = prepared.sample([1, 1, 0]),
    expected = prepared.keys(frame),
    foreign = prepareSceneTwoBonePose(source, 'clip', CHAIN, 0.7)
  expect(() => prepared.keys(foreign.original)).toThrow('outro ajuste')
  const keys = prepared.keys(frame)
  keys[0]!.key.value[0] = 42
  for (const matrix of frame.pose.worldMatrices.values()) (matrix as AffineMatrix).fill(42)
  frame.reach.status = 'too-far'
  expect(prepared.keys(frame)).toEqual(expected)
  expect(() => prepared.commit(frame, { ...source, nodes: [...source.nodes] })).toThrow('mudou')
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { async save() {} },
    autosaveMs: 60_000,
  })
  try {
    editor.getState().setThumb('latest')
    const current = editor.getState().asset,
      committed = prepared.commit(frame, current)
    expect(committed.thumb).toBe('latest')
    expect(committed).toEqual(setSceneAnimationKeys(current, 'clip', expected))
    editor.getState().commit(committed)
    expect(editor.getState().canUndo).toBe(true)
    editor.getState().undo()
    expect(editor.getState().asset.animations).toEqual(source.animations)
    expect(editor.getState().canUndo).toBe(false)
    editor.getState().redo()
    expect(editor.getState().asset.animations).toEqual(committed.animations)
    prepared.cancel()
    expect(() => prepared.commit(frame, current)).toThrow('encerrado')
    expect(() => prepared.keys(frame)).toThrow('encerrado')
    expect(() => prepared.sample([1, 1, 0])).toThrow('encerrado')
  } finally {
    editor.getState().dispose()
  }
})

test('no-op preserves raw authored quaternions, and pointer samples do not reread geometry/images/keys', () => {
  const source = setSceneAnimationKeys(fixture(), 'clip', [
      {
        nodeId: 'root',
        channel: 'rotation',
        key: { time: 0, value: [0, 0, 0, 1 + 1e-8], interpolation: 'smooth' },
      },
    ]),
    saved = structuredClone(source),
    prepared = prepareSceneTwoBonePose(source, 'clip', CHAIN, 0),
    restores: Array<() => void> = []
  try {
    for (const [owner, property] of [
      [source, 'geometries'],
      [source, 'images'],
      [source.animations![0]!.tracks[0]!, 'keys'],
    ] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(owner, property)!
      Object.defineProperty(owner, property, {
        configurable: true,
        get() {
          throw new Error(`Unexpected ${property}`)
        },
      })
      restores.push(() => Object.defineProperty(owner, property, descriptor))
    }
    expect(prepared.keys(prepared.sample([2, 0, 0]))).toEqual([])
    for (let i = 0; i < 60; i++) {
      const frame = prepared.sample([Math.cos(i) * 1.2, Math.sin(i) * 1.2, 0.1], [0, 0, 3])
      expect(prepared.keys(frame).every((key) => key.channel === 'rotation')).toBe(true)
    }
  } finally {
    for (const restore of restores) restore()
  }
  expect(source).toEqual(saved)
})

test('invalid chains, inherited locks, singular frames, unsupported shear, and key budgets refuse without writes', () => {
  for (const chain of [
    ['root', 'tip', 'middle'],
    ['root', 'middle', 'middle'],
    ['root', 'middle', 'body'],
    ['missing', 'middle', 'tip'],
  ] as const)
    expect(() => prepareSceneTwoBonePose(fixture(), 'clip', chain, 0)).toThrow()
  for (const id of ['parent', 'root', 'middle', 'tip', 'body']) {
    const source = fixture()
    source.nodes.find((node) => node.id === id)!.locked = true
    const saved = structuredClone(source)
    expect(() => prepareSceneTwoBonePose(source, 'clip', CHAIN, 0)).toThrow('Destrave')
    expect(source).toEqual(saved)
  }
  for (const id of ['parent', 'root']) {
    const source = fixture()
    const matrix = identityMatrix()
    matrix[0] = 0
    source.nodes.find((node) => node.id === id)!.transform = { kind: 'affine', matrix }
    expect(() => prepareSceneTwoBonePose(source, 'clip', CHAIN, 0)).toThrow()
  }
  const sheared = fixture()
  const matrix = identityMatrix()
  matrix[4] = 0.3
  sheared.nodes.find((node) => node.id === 'root')!.transform = { kind: 'affine', matrix }
  const saved = structuredClone(sheared),
    prepared = prepareSceneTwoBonePose(sheared, 'clip', CHAIN, 0)
  expect(() => prepared.sample([1, 1, 0], [0, 0, 3])).toThrow()
  expect(sheared).toEqual(saved)
  const full = fixture()
  full.animations![0]!.tracks = [
    {
      nodeId: 'body',
      channel: 'translation',
      keys: Array.from({ length: SCENE_LIMITS.animationKeys }, (_, i) => ({
        time: i / SCENE_LIMITS.animationKeys,
        value: [0, 0, 0],
        interpolation: 'linear',
      })),
    },
  ]
  const limited = prepareSceneTwoBonePose(full, 'clip', CHAIN, 1)
  expect(() => limited.sample([1, 1, 0])).toThrow('orçamento')
  expect(limited.keys(limited.original)).toEqual([])
  for (const target of [
    [NaN, 0, 0],
    [Infinity, 0, 0],
  ] as Vec3[])
    expect(() => prepared.sample(target)).toThrow()
})

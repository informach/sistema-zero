import { expect, test } from 'bun:test'
import { Matrix4, Quaternion as ThreeQuaternion, Vector3 } from 'three'
import { animatedScene, sceneRotationTrack } from '../testing/sceneAnimation'
import type { SceneAnimationKeyInput } from './animationCommands'
import { setSceneAnimationKeys } from './animationKeyBatch'
import {
  captureSceneAnimationLocalPose,
  mirrorSceneAnimationLocalPose,
  pasteSceneAnimationLocalPose,
  type SceneAnimationLocalPose,
} from './animationPose'
import { groupSceneNodes } from './commands'
import { sceneToJson } from './documentJson'
import { SCENE_LIMITS } from './limits'
import { composeTransform, quaternionFromEulerXYZ } from './matrix'
import { readSceneDocument } from './readDocument'

test('bulk recording owns all new channels, retains untouched keys, and is a no-op when everything already matches', () => {
  const source = animatedScene(),
    original = structuredClone(source)
  const inputs: SceneAnimationKeyInput[] = [
    {
      nodeId: 'body',
      channel: 'translation',
      key: {
        time: 1.123456789123,
        value: [7.123456789123, Number.MIN_VALUE, -3],
        interpolation: 'smooth',
      },
    },
    {
      nodeId: 'wing',
      channel: 'rotation',
      key: {
        time: 0.23456789123,
        value: quaternionFromEulerXYZ([12.123456789, 35, 48]),
        interpolation: 'linear',
      },
    },
    {
      nodeId: 'wing',
      channel: 'scale',
      key: { time: 0.23456789123, value: [-2, 0, 1.123456789123], interpolation: 'step' },
    },
  ]
  const next = setSceneAnimationKeys(source, 'clip', inputs)
  expect(next.animations![0]!.tracks).toHaveLength(3)
  expect(next.animations![0]!.tracks[0]!.keys[0]).toBe(source.animations[0]!.tracks[0]!.keys[0])
  expect(next.animations![0]!.tracks[0]!.keys[1]!.value).toEqual(inputs[0]!.key.value)
  expect(next.animations![0]!.tracks[0]!.keys[1]!.value).not.toBe(inputs[0]!.key.value)
  expect(setSceneAnimationKeys(next, 'clip', inputs)).toBe(next)
  expect(setSceneAnimationKeys(source, 'clip', [])).toBe(source)
  expect(next.nodes).toBe(source.nodes)
  expect(next.geometries).toBe(source.geometries)
  expect(source).toEqual(original)
  expect(readSceneDocument(sceneToJson(next)).status).toBe('valid')
  expect(() => setSceneAnimationKeys(source, 'clip', [...inputs, inputs[0]!])).toThrow('duas vezes')
  expect(() =>
    setSceneAnimationKeys(source, 'clip', [
      ...inputs,
      {
        nodeId: 'missing',
        channel: 'scale',
        key: { time: 1, value: [1, 1, 1], interpolation: 'linear' },
      },
    ]),
  ).toThrow()
  expect(source).toEqual(original)
})

test('bulk budgets precede reading oversized input values, but replacing at the exact budget remains valid', () => {
  const source = animatedScene()
  source.animations[0]!.tracks[0]!.keys = Array.from(
    { length: SCENE_LIMITS.animationKeys },
    (_, i) => ({ time: i / SCENE_LIMITS.animationKeys, value: [0, 0, 0], interpolation: 'linear' }),
  )
  let reads = 0
  const key: SceneAnimationKeyInput = {
    nodeId: 'body',
    channel: 'translation',
    key: {
      time: 1,
      get value(): [number, number, number] {
        reads++
        return [1.123456789, Number.MIN_VALUE, 0]
      },
      interpolation: 'smooth',
    },
  }
  expect(() => setSceneAnimationKeys(source, 'clip', [key])).toThrow('orçamento')
  expect(reads).toBe(0)
  key.key.time = 0
  const next = setSceneAnimationKeys(source, 'clip', [key])
  expect(next.animations![0]!.tracks[0]!.keys).toHaveLength(SCENE_LIMITS.animationKeys)
  expect(next.animations![0]!.tracks[0]!.keys[0]!.value).toEqual([1.123456789, Number.MIN_VALUE, 0])
})

test('capture owns exact authored quaternion/Double values and samples in-between poses without retaining the document', () => {
  const source = animatedScene()
  const rotation = sceneRotationTrack()
  rotation.keys[0]!.value = [0, 0, 0, 1 + 1e-8]
  source.animations[0]!.tracks.push(rotation)
  const exact = captureSceneAnimationLocalPose(source, 'clip', 'body', 0)
  expect(exact.rotation).toEqual(rotation.keys[0]!.value)
  expect(exact.rotation).not.toBe(rotation.keys[0]!.value)
  expect(Object.keys(exact).sort()).toEqual(['rotation', 'scale', 'space', 'translation'])
  expect(
    captureSceneAnimationLocalPose(source, 'clip', 'body', 1.123456789123).translation,
  ).toEqual([1.123456789, Number.MIN_VALUE, -2.234567891])
  const middle = captureSceneAnimationLocalPose(source, 'clip', 'body', 1)
  expect(Math.hypot(...middle.rotation)).toBeCloseTo(1, 14)
  expect(middle.rotation[2]).toBeCloseTo(Math.SQRT1_2, 14)
  expect(middle.scale).toEqual([1, 1, 1])
})

test.each([
  'x',
  'y',
  'z',
] as const)('local %s reflection matches an independent matrix oracle, preserves scales, and mirrors twice exactly', (axis) => {
  const pose: SceneAnimationLocalPose = {
    space: 'local-delta',
    translation: [2.123456789, Number.MIN_VALUE, -3.987654321],
    rotation: quaternionFromEulerXYZ([34.123456789, -56.789123456, 123.987654321]),
    scale: [-2, 0, 3.123456789],
  }
  const next = mirrorSceneAnimationLocalPose(pose, axis)
  const reflection = new Matrix4().makeScale(
    axis === 'x' ? -1 : 1,
    axis === 'y' ? -1 : 1,
    axis === 'z' ? -1 : 1,
  )
  const original = new Matrix4().compose(
    new Vector3(...pose.translation),
    new ThreeQuaternion(...pose.rotation),
    new Vector3(...pose.scale),
  )
  const expected = reflection.clone().multiply(original).multiply(reflection).elements
  const actual = composeTransform({ kind: 'trs', ...next })
  for (let i = 0; i < 16; i++) expect(actual[i]).toBeCloseTo(expected[i]!, 13)
  expect(next.scale).toEqual(pose.scale)
  expect(next.scale).not.toBe(pose.scale)
  expect(mirrorSceneAnimationLocalPose(next, axis)).toEqual(pose)
})

test('pasting applies only selected roots, owns per-target values, preserves existing easing and respects locked descendants', () => {
  const source = animatedScene()
  const pose = captureSceneAnimationLocalPose(source, 'clip', 'body', 1.123456789123)
  const next = pasteSceneAnimationLocalPose(source, 'clip', ['body', 'wing'], 1.123456789123, pose)
  const tracks = next.animations![0]!.tracks
  expect(tracks).toHaveLength(6)
  expect(tracks[0]!.keys[1]!.interpolation).toBe('smooth')
  expect(
    tracks.find((track) => track.nodeId === 'wing' && track.channel === 'translation')!.keys[0]!
      .value,
  ).toEqual(pose.translation)
  expect(
    tracks.find((track) => track.nodeId === 'wing' && track.channel === 'translation')!.keys[0]!
      .value,
  ).not.toBe(pose.translation)
  const grouped = groupSceneNodes(source, ['body', 'wing'], { name: 'Asas', nextId: () => 'group' })
  const pasted = pasteSceneAnimationLocalPose(grouped, 'clip', ['group', 'body'], 0.5, pose)
  expect(pasted.animations![0]!.tracks.filter((track) => track.nodeId === 'group')).toHaveLength(3)
  expect(pasted.animations![0]!.tracks[0]).toBe(grouped.animations![0]!.tracks[0])
  const locked = {
    ...grouped,
    nodes: grouped.nodes.map((node) => (node.id === 'body' ? { ...node, locked: true } : node)),
  }
  expect(() => pasteSceneAnimationLocalPose(locked, 'clip', ['group'], 0.5, pose)).toThrow(
    'Destrave',
  )
  expect(() => pasteSceneAnimationLocalPose(source, 'clip', [], 0.5, pose)).toThrow()
})

test('absolute poses use rest channels and cannot silently be pasted into delta clips', () => {
  const source = animatedScene()
  source.animations[0]!.space = 'local'
  const node = source.nodes.find((node) => node.id === 'wing')!
  const pose = captureSceneAnimationLocalPose(source, 'clip', 'wing', 0)
  if (node.transform.kind !== 'trs') throw new Error('Expected TRS')
  expect(pose.translation).toEqual(node.transform.translation)
  expect(pose.rotation).toEqual(node.transform.rotation)
  expect(pose.scale).toEqual(node.transform.scale)
  expect(() => pasteSceneAnimationLocalPose(animatedScene(), 'clip', ['wing'], 0, pose)).toThrow(
    'outro tipo',
  )
  expect(() => mirrorSceneAnimationLocalPose({ ...pose, rotation: [0, 0, 0, 0] }, 'x')).toThrow(
    'Rotação',
  )
})

import { expect, test } from 'bun:test'
import { Matrix4 } from 'three'
import { animatedScene, sceneRotationTrack } from '../testing/sceneAnimation'
import { setSceneAnimationKeys } from './animationKeyBatch'
import { prepareSceneAnimationPoseTransform } from './animationPoseTransform'
import { groupSceneNodes } from './commands'
import { SCENE_LIMITS } from './limits'
import {
  type AffineMatrix,
  composeTransform,
  identityMatrix,
  quaternionFromEulerXYZ,
} from './matrix'
import { prepareSceneAnimation } from './sampleAnimation'

function translation(x: number, y = 0, z = 0): AffineMatrix {
  return composeTransform({
    kind: 'trs',
    translation: [x, y, z],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
  })
}

test.each([
  'local',
  'local-delta',
] as const)('visual %s translation writes only changed channels and preserves exact raw quaternion and curve', (space) => {
  const source = animatedScene()
  source.animations[0]!.space = space
  const rotation = sceneRotationTrack()
  rotation.keys[0]!.value = [0, 0, 0, 1 + 1e-8]
  source.animations[0]!.tracks.push(rotation)
  const saved = structuredClone(source)
  const prepared = prepareSceneAnimationPoseTransform(source, 'clip', ['body'], 0)
  expect(prepared.keys(prepared.apply(prepared.original, identityMatrix()))).toEqual([])
  const frame = prepared.apply(prepared.original, translation(4.123456789123, 2, -3))
  const keys = prepared.keys(frame)
  expect(keys).toHaveLength(1)
  expect(keys[0]!.channel).toBe('translation')
  expect(keys[0]!.key.interpolation).toBe('linear')
  expect(frame.values.get('body')!.rotation).toEqual(rotation.keys[0]!.value)
  const committed = setSceneAnimationKeys(source, 'clip', keys)
  expect(committed.animations![0]!.tracks[1]).toBe(rotation)
  const sampled = prepareSceneAnimation(committed, 'clip').sample(0, false)
  expect(frame.pose.worldMatrices).toEqual(sampled.worldMatrices)
  expect(source).toEqual(saved)
})

test('world deltas transform selected roots once and carry their animated descendants, matching an independent Three matrix oracle', () => {
  let source = groupSceneNodes(animatedScene(), ['body', 'wing'], {
    name: 'Grupo',
    nextId: () => 'group',
  })
  source = {
    ...source,
    nodes: source.nodes.map((node) =>
      node.id === 'group'
        ? {
            ...node,
            transform: {
              kind: 'trs',
              translation: [2, -3, 1],
              rotation: quaternionFromEulerXYZ([23, -45, 12]),
              scale: [2, 2, 2],
            },
          }
        : node,
    ),
  }
  const prepared = prepareSceneAnimationPoseTransform(source, 'clip', ['group', 'body'], 0.7)
  const delta = composeTransform({
    kind: 'trs',
    translation: [1, 2, -3],
    rotation: quaternionFromEulerXYZ([12, 24, -31]),
    scale: [1, 1, 1],
  })
  const frame = prepared.apply(prepared.original, delta)
  expect([...frame.values.keys()]).toEqual(['group'])
  for (const id of ['group', 'body', 'wing']) {
    const expected = new Matrix4()
      .fromArray(delta)
      .multiply(new Matrix4().fromArray(prepared.original.pose.worldMatrices.get(id)!)).elements
    frame.pose.worldMatrices.get(id)!.forEach((n, i) => {
      expect(n).toBeCloseTo(expected[i]!, 11)
    })
  }
  const committed = setSceneAnimationKeys(source, 'clip', prepared.keys(frame))
  const sampled = prepareSceneAnimation(committed, 'clip').sample(0.7, false)
  expect(sampled.worldMatrices).toEqual(frame.pose.worldMatrices)
  expect(committed.nodes).toBe(source.nodes)
  expect(committed.geometries).toBe(source.geometries)
})

test('successive drags have absolute seeds, preserve signed and zero scales for translation/uniform scaling, and reject another owner', () => {
  const source = setSceneAnimationKeys(animatedScene(), 'clip', [
    {
      nodeId: 'body',
      channel: 'scale',
      key: { time: 0, value: [-2, 0, 3], interpolation: 'step' },
    },
  ])
  const prepared = prepareSceneAnimationPoseTransform(source, 'clip', ['body'], 0)
  const first = prepared.apply(prepared.original, translation(2))
  const second = prepared.apply(first, translation(3))
  expect(second.values.get('body')!.translation).toEqual([5, 0, 0])
  expect(prepared.apply(first, translation(3)).values).toEqual(second.values)
  expect(second.values.get('body')!.scale).toEqual([-2, 0, 3])
  const scaled = prepared.apply(
    second,
    composeTransform({
      kind: 'trs',
      translation: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [0, 0, 0],
    }),
  )
  expect(scaled.values.get('body')!.scale.every((n) => n === 0)).toBe(true)
  expect(() =>
    prepared.apply(
      first,
      composeTransform({
        kind: 'trs',
        translation: [0, 0, 0],
        rotation: quaternionFromEulerXYZ([0, 30, 0]),
        scale: [1, 1, 1],
      }),
    ),
  ).toThrow('zero')
  const other = prepareSceneAnimationPoseTransform(source, 'clip', ['body'], 0)
  expect(() => prepared.apply(other.original, identityMatrix())).toThrow('mudou')
  expect(() => prepared.keys(other.original)).toThrow('outro ajuste')
})

test('affine bases are preserved; induced shear, singular parent and inherited locks refuse atomically', () => {
  let source = groupSceneNodes(animatedScene(), ['body'], { name: 'Grupo', nextId: () => 'group' })
  source = {
    ...source,
    nodes: source.nodes.map((node) =>
      node.id === 'group'
        ? {
            ...node,
            transform: {
              kind: 'affine',
              matrix: [1, 0, 0, 0, 0.25, 2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            },
          }
        : node,
    ),
  }
  const saved = structuredClone(source)
  const prepared = prepareSceneAnimationPoseTransform(source, 'clip', ['body'], 0)
  const frame = prepared.apply(prepared.original, translation(1, 2, 3))
  expect(
    prepareSceneAnimation(
      setSceneAnimationKeys(source, 'clip', prepared.keys(frame)),
      'clip',
    ).sample(0, false).worldMatrices,
  ).toEqual(frame.pose.worldMatrices)
  expect(() =>
    prepared.apply(
      prepared.original,
      composeTransform({
        kind: 'trs',
        translation: [0, 0, 0],
        rotation: quaternionFromEulerXYZ([0, 0, 45]),
        scale: [1, 1, 1],
      }),
    ),
  ).toThrow('inclinaria')
  expect(source).toEqual(saved)
  const locked = {
    ...source,
    nodes: source.nodes.map((node) => (node.id === 'group' ? { ...node, locked: true } : node)),
  }
  expect(() => prepareSceneAnimationPoseTransform(locked, 'clip', ['body'], 0)).toThrow('Destrave')
  const singular = structuredClone(source)
  const group = singular.nodes.find((node) => node.id === 'group')!
  if (group.transform.kind !== 'affine') throw new Error('Expected affine')
  group.transform.matrix[0] = 0
  expect(() => prepareSceneAnimationPoseTransform(singular, 'clip', ['body'], 0)).toThrow(
    'sem tamanho',
  )
})

test('prepared pointer updates do not revisit geometry, images, or original key arrays, and enforce key budgets', () => {
  const source = animatedScene()
  source.animations[0]!.tracks[0]!.keys = Array.from(
    { length: SCENE_LIMITS.animationKeys },
    (_, i) => ({ time: i / SCENE_LIMITS.animationKeys, value: [0, 0, 0], interpolation: 'smooth' }),
  )
  const prepared = prepareSceneAnimationPoseTransform(source, 'clip', ['body'], 0)
  const added = prepareSceneAnimationPoseTransform(source, 'clip', ['body'], 1)
  let reads = 0
  for (const [owner, property] of [
    [source, 'geometries'],
    [source, 'images'],
    [source.animations[0]!.tracks[0]!, 'keys'],
  ] as const) {
    const value = Object.getOwnPropertyDescriptor(owner, property)!.value
    Object.defineProperty(owner, property, {
      configurable: true,
      get() {
        reads++
        return value
      },
    })
  }
  for (let i = 0; i < 120; i++) {
    const frame = prepared.apply(prepared.original, translation(i))
    expect(prepared.keys(frame)).toHaveLength(i === 0 ? 0 : 1)
  }
  expect(() => added.apply(added.original, translation(1))).toThrow('orçamento')
  expect(reads).toBe(0)
})

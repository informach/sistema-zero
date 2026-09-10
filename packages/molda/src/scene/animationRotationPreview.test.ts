import { expect, test } from 'bun:test'
import { Matrix4 } from 'three'
import { animatedScene, sceneRotationTrack } from '../testing/sceneAnimation'
import { setSceneAnimationKeys } from './animationKeyBatch'
import type { ModelSceneNode, MoldaSceneDocument } from './document'
import { SCENE_LIMITS } from './limits'
import {
  type AffineMatrix,
  composeTransform,
  type Quaternion,
  quaternionFromEulerXYZ,
} from './matrix'
import { prepareSceneAnimation, prepareSceneAnimationRotationPreview } from './sampleAnimation'

function fixture(space: 'local' | 'local-delta'): MoldaSceneDocument {
  const source = animatedScene()
  const support = (id: string, parentId: string | null): ModelSceneNode => ({
    id,
    parentId,
    name: id,
    kind: 'group',
    hidden: false,
    locked: false,
    transform: {
      kind: 'trs',
      translation: [1, 2, -3],
      rotation: quaternionFromEulerXYZ([13, -21, 5]),
      scale: [-2, 0.5, 3],
    },
  })
  return {
    ...source,
    nodes: [
      ...source.nodes.map((node) => (node.id === 'body' ? { ...node, parentId: 'middle' } : node)),
      support('tip', 'middle'),
      support('middle', 'root'),
      support('root', null),
    ],
    animations: [
      {
        ...source.animations[0]!,
        space,
        tracks: [
          ...source.animations[0]!.tracks,
          sceneRotationTrack('root'),
          {
            nodeId: 'middle',
            channel: 'scale',
            keys: [
              { time: 0, value: [-1, 0.25, 2], interpolation: 'smooth' },
              { time: 2, value: [-2, 0.5, 3], interpolation: 'linear' },
            ],
          },
        ],
      },
    ],
  }
}

test.each([
  'local',
  'local-delta',
] as const)('%s nested rotation previews exactly match committed playback without changing other channels', (space) => {
  const source = fixture(space),
    saved = structuredClone(source)
  for (const time of [0, Number.MIN_VALUE, 0.7, 1.123456789123, 2]) {
    const prepared = prepareSceneAnimationRotationPreview(source, 'clip', ['middle', 'root'], time)
    const original = prepareSceneAnimation(source, 'clip').sample(time, false)
    expect(prepared.original.worldMatrices).toEqual(original.worldMatrices)
    expect(prepared.sample(new Map()).worldMatrices).toEqual(original.worldMatrices)
    for (let i = 0; i < 16; i++) {
      const rotations = new Map<string, Quaternion>([
        ['middle', quaternionFromEulerXYZ([i * -7, 11, i * 13])],
        ['root', quaternionFromEulerXYZ([i * 5, i * 9, -17])],
      ])
      const frame = prepared.sample(rotations)
      const committed = setSceneAnimationKeys(
        source,
        'clip',
        [...rotations].map(([nodeId, value]) => ({
          nodeId,
          channel: 'rotation',
          key: { time, value, interpolation: 'linear' },
        })),
      )
      expect(frame.source).toBe(source)
      expect(frame.time).toBe(time)
      expect(frame.clipId).toBe('clip')
      expect(frame.worldMatrices).toEqual(
        prepareSceneAnimation(committed, 'clip').sample(time, false).worldMatrices,
      )
      expect(committed.nodes).toBe(source.nodes)
      expect(committed.geometries).toBe(source.geometries)
      expect(committed.animations![0]!.tracks[0]).toBe(source.animations![0]!.tracks[0])
      expect(committed.animations![0]!.tracks[2]).toBe(source.animations![0]!.tracks[2])
      expect(frame.worldMatrices.get('wing')).toEqual(original.worldMatrices.get('wing'))
      expect(prepared.sample(new Map()).worldMatrices).toEqual(original.worldMatrices)
    }
  }
  expect(source).toEqual(saved)
})

test('relative rotations retain affine shear and negative scales, with a separate Three hierarchy oracle', () => {
  const source = fixture('local-delta')
  source.animations![0]!.tracks = []
  for (const node of source.nodes)
    if (node.id === 'root' || node.id === 'middle')
      node.transform = {
        kind: 'affine',
        matrix: [1, 0, 0, 0, 0.3, -2, 0, 0, -0.2, 0.1, 3, 0, 2, -1, 4, 1],
      }
  const saved = structuredClone(source),
    rotation = quaternionFromEulerXYZ([21, -32, 43])
  const rotations = new Map<string, Quaternion>([
    ['middle', rotation],
    ['root', rotation],
  ])
  const prepared = prepareSceneAnimationRotationPreview(source, 'clip', ['root', 'middle'], 0.5)
  const frame = prepared.sample(rotations)
  const delta = new Matrix4().fromArray(
    composeTransform({
      kind: 'trs',
      translation: [0, 0, 0],
      rotation,
      scale: [1, 1, 1],
    }),
  )
  const expected = new Matrix4()
  for (const id of ['root', 'middle', 'tip']) {
    expected.multiply(
      new Matrix4().fromArray(
        composeTransform(source.nodes.find((node) => node.id === id)!.transform),
      ),
    )
    if (id !== 'tip') expected.multiply(delta)
    frame.worldMatrices.get(id)!.forEach((n, i) => {
      expect(n).toBeCloseTo(expected.elements[i]!, 11)
    })
  }
  const committed = setSceneAnimationKeys(
    source,
    'clip',
    [...rotations].map(([nodeId, value]) => ({
      nodeId,
      channel: 'rotation',
      key: { time: 0.5, value, interpolation: 'step' },
    })),
  )
  expect(frame.worldMatrices).toEqual(
    prepareSceneAnimation(committed, 'clip').sample(0.5, false).worldMatrices,
  )
  expect(source).toEqual(saved)
})

test('each preview owns all matrices, including static branches, and never retains rotation inputs or target lists', () => {
  const source = fixture('local'),
    saved = structuredClone(source),
    ids = ['root', 'middle']
  const prepared = prepareSceneAnimationRotationPreview(source, 'clip', ids, 0.7)
  ids.splice(0, ids.length, 'wing')
  const value: Quaternion = [0, 0, 0, 1 + 1e-8],
    rotations = new Map([['root', value]])
  const frame = prepared.sample(rotations),
    snapshot = structuredClone(frame.worldMatrices)
  value[2] = 1
  rotations.clear()
  expect(frame.worldMatrices).toEqual(snapshot)
  expect(() => prepared.sample(new Map([['wing', [0, 0, 0, 1]]]))).toThrow('outro ajuste')
  for (const pose of [prepared.original, frame])
    for (const matrix of pose.worldMatrices.values()) {
      // Simulate an untyped consumer modifying its output, not the source document.
      ;(matrix as AffineMatrix).fill(42)
    }
  const expected = prepareSceneAnimation(source, 'clip').sample(0.7, false).worldMatrices
  expect(prepared.sample(new Map()).worldMatrices).toEqual(expected)
  expect(prepared.sample(new Map([['root', [0, 0, 0, 1 + 1e-8]]])).worldMatrices).toEqual(snapshot)
  expect(source).toEqual(saved)
})

test('preparation never reads geometry/images and repeated fixed-time updates never read original keys', () => {
  const source = fixture('local-delta'),
    saved = structuredClone(source)
  const descriptors: Array<() => void> = []
  const forbid = (owner: object, property: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(owner, property)!
    Object.defineProperty(owner, property, {
      configurable: true,
      get() {
        throw new Error(`Unexpected read: ${property}`)
      },
    })
    descriptors.push(() => Object.defineProperty(owner, property, descriptor))
  }
  try {
    forbid(source, 'geometries')
    forbid(source, 'images')
    const prepared = prepareSceneAnimationRotationPreview(source, 'clip', ['root', 'middle'], 0.7)
    for (const track of source.animations![0]!.tracks) forbid(track, 'keys')
    for (let i = 0; i < 120; i++) {
      const pose = prepared.sample(new Map([['root', quaternionFromEulerXYZ([i, 0, 0])]]))
      expect(pose.worldMatrices.size).toBe(source.nodes.length)
      expect(prepared.sample(new Map()).worldMatrices).toEqual(prepared.original.worldMatrices)
    }
  } finally {
    for (const restore of descriptors) restore()
  }
  expect(source).toEqual(saved)
})

test('invalid captures and quaternion batches refuse atomically; affine unedited ancestors remain supported', () => {
  const source = fixture('local'),
    saved = structuredClone(source)
  for (const ids of [
    [],
    ['missing'],
    [''],
    Array.from({ length: SCENE_LIMITS.nodes + 1 }, () => 'root'),
  ])
    expect(() => prepareSceneAnimationRotationPreview(source, 'clip', ids, 0)).toThrow()
  for (const time of [-1, 2.01, NaN, Infinity])
    expect(() => prepareSceneAnimationRotationPreview(source, 'clip', ['root'], time)).toThrow()
  expect(() => prepareSceneAnimationRotationPreview(source, 'missing', ['root'], 0)).toThrow(
    'não existe',
  )
  const prepared = prepareSceneAnimationRotationPreview(source, 'clip', ['root', 'middle'], 0.7)
  for (const value of [
    [0, 0, 0, 0],
    [0, 0, 0, 2],
    [NaN, 0, 0, 1],
    [0, 0, Infinity, 1],
  ] as Quaternion[]) {
    expect(() =>
      prepared.sample(
        new Map([
          ['root', [0, 0, 1, 0]],
          ['middle', value],
        ]),
      ),
    ).toThrow()
    expect(prepared.sample(new Map()).worldMatrices).toEqual(prepared.original.worldMatrices)
  }
  expect(source).toEqual(saved)
  source.animations![0]!.tracks = []
  source.nodes.find((node) => node.id === 'root')!.transform = {
    kind: 'affine',
    matrix: [1, 0, 0, 0, 0.3, 2, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1],
  }
  expect(() => prepareSceneAnimationRotationPreview(source, 'clip', ['root'], 0)).toThrow(
    'relativo',
  )
  const below = prepareSceneAnimationRotationPreview(source, 'clip', ['middle'], 0)
  const committed = setSceneAnimationKeys(source, 'clip', [
    {
      nodeId: 'middle',
      channel: 'rotation',
      key: { time: 0, value: [0, 0, 1, 0], interpolation: 'linear' },
    },
  ])
  expect(below.sample(new Map([['middle', [0, 0, 1, 0]]])).worldMatrices).toEqual(
    prepareSceneAnimation(committed, 'clip').sample(0, false).worldMatrices,
  )
})

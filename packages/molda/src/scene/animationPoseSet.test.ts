import { expect, test } from 'bun:test'
import { Matrix4 } from 'three'
import { structuredBytes } from '../core/structuredBytes'
import { createDocumentEditorStore } from '../state/editorStore'
import { makeSceneTwoBoneFixture } from '../testing/sceneTwoBone'
import type { SceneAnimationKeyInput } from './animationCommands'
import { setSceneAnimationKeys } from './animationKeyBatch'
import {
  captureSceneAnimationLocalPose,
  mirrorSceneAnimationLocalPose,
  type SceneAnimationLocalPose,
} from './animationPose'
import {
  captureSceneAnimationPoseSet,
  pasteSceneAnimationPoseSet,
  readSceneAnimationPoseSet,
  type SceneAnimationPosePair,
  type SceneAnimationPoseSet,
} from './animationPoseSet'
import type { ModelSceneNode } from './document'
import { sceneToJson } from './documentJson'
import { SCENE_LIMITS } from './limits'
import { type AffineMatrix, composeTransform, quaternionFromEulerXYZ } from './matrix'
import { readSceneDocument } from './readDocument'
import { prepareSceneAnimation } from './sampleAnimation'

const ids = ['root', 'middle', 'tip']
const pairs = ids.map((sourceId) => ({ sourceId, targetId: `other-${sourceId}` }))
const time = 0.375123456789

function fixture(
  space: SceneAnimationLocalPose['space'] = 'local-delta',
  axis: 'x' | 'y' | 'z' = 'x',
) {
  const source = makeSceneTwoBoneFixture(space)
  const reflection = new Matrix4().makeScale(
    axis === 'x' ? -1 : 1,
    axis === 'y' ? -1 : 1,
    axis === 'z' ? -1 : 1,
  )
  const joints = source.nodes.filter((node) => ids.includes(node.id))
  source.nodes.push(
    ...joints.map((node): ModelSceneNode => {
      const rest = node.transform
      if (rest.kind !== 'trs') throw new Error('Expected TRS')
      const { translation, rotation, scale } = mirrorSceneAnimationLocalPose(
        { space, translation: rest.translation, rotation: rest.rotation, scale: rest.scale },
        axis,
      )
      return {
        ...node,
        id: `other-${node.id}`,
        name: 'Mesmo nome',
        parentId: node.parentId === 'parent' ? 'parent' : `other-${node.parentId}`,
        transform:
          space === 'local-delta'
            ? {
                kind: 'affine',
                matrix: reflection
                  .clone()
                  .multiply(new Matrix4().fromArray(composeTransform(rest)))
                  .multiply(reflection).elements as AffineMatrix,
              }
            : {
                kind: 'trs',
                translation,
                rotation,
                scale,
              },
      }
    }),
  )
  // An affine shared parent deliberately means this is not reflection in global world axes.
  source.nodes = source.nodes.map((node) =>
    node.id === 'parent'
      ? {
          ...node,
          transform: {
            kind: 'affine',
            matrix: [1, 0, 0, 0, 0.25, -2, 0, 0, 0, 0.3, 0.8, 0, 4, -3, 2, 1],
          },
        }
      : node,
  )
  const keys = ids.flatMap((nodeId, i): SceneAnimationKeyInput[] => [
    {
      nodeId,
      channel: 'translation',
      key: { time, value: [i + 0.123456789, i / 3, -0.37], interpolation: 'step' },
    },
    {
      nodeId,
      channel: 'rotation',
      key: {
        time,
        value: quaternionFromEulerXYZ([13 + i * 31, 37 - i * 8, -12 + i * 17]),
        interpolation: 'smooth',
      },
    },
    {
      nodeId,
      channel: 'scale',
      key: { time, value: [i === 1 ? -0.7 : 1.3, 0.8, 1.2], interpolation: 'linear' },
    },
  ])
  return setSceneAnimationKeys(source, 'clip', keys)
}

test.each([
  'local',
  'local-delta',
] as const)('a nested %s pose set reflects all three independent joints on every local axis', (space) => {
  for (const axis of ['x', 'y', 'z'] as const) {
    const source = fixture(space, axis),
      before = structuredClone(source)
    const copied = captureSceneAnimationPoseSet(source, 'clip', [...ids].reverse(), time)
    const next = pasteSceneAnimationPoseSet(source, 'clip', time, copied, pairs, axis)
    const pose = prepareSceneAnimation(next, 'clip').sample(time, false)
    const parentInverse = new Matrix4().fromArray(pose.worldMatrices.get('parent')!).invert()
    const reflection = new Matrix4().makeScale(
      axis === 'x' ? -1 : 1,
      axis === 'y' ? -1 : 1,
      axis === 'z' ? -1 : 1,
    )
    for (const id of ids) {
      const original = parentInverse
        .clone()
        .multiply(new Matrix4().fromArray(pose.worldMatrices.get(id)!))
      const expected = reflection.clone().multiply(original).multiply(reflection)
      const actual = parentInverse
        .clone()
        .multiply(new Matrix4().fromArray(pose.worldMatrices.get(`other-${id}`)!))
      for (let i = 0; i < 16; i++) expect(actual.elements[i]).toBeCloseTo(expected.elements[i]!, 12)
    }
    expect(next.animations![0]!.tracks).toHaveLength(18)
    const reversed = captureSceneAnimationPoseSet(
      next,
      'clip',
      pairs.map((pair) => pair.targetId),
      time,
    )
    const restored = pasteSceneAnimationPoseSet(
      next,
      'clip',
      time,
      reversed,
      pairs.map((pair) => ({ sourceId: pair.targetId, targetId: pair.sourceId })),
      axis,
    )
    expect(captureSceneAnimationPoseSet(restored, 'clip', ids, time)).toEqual(
      captureSceneAnimationPoseSet(source, 'clip', ids, time),
    )
    expect(next.nodes).toBe(source.nodes)
    expect(next.geometries).toBe(source.geometries)
    expect(next.images).toBe(source.images)
    expect(source).toEqual(before)
    expect(readSceneDocument(sceneToJson(next)).status).toBe('valid')
  }
})

test('capture and paste own exact raw quaternions, subnormal numbers and labels without geometry/image reads', () => {
  const source = fixture()
  const root = source.animations![0]!.tracks.find(
    (track) => track.nodeId === 'root' && track.channel === 'rotation',
  )!
  root.keys[0]!.value = [0, 0, 0, 1 + 1e-8]
  const move = source.animations![0]!.tracks.find(
    (track) => track.nodeId === 'tip' && track.channel === 'translation',
  )!
  move.keys[0]!.value = [Number.MIN_VALUE, 1e150, -1e-150]
  let copied: SceneAnimationPoseSet
  const geometry = Object.getOwnPropertyDescriptor(source, 'geometries')!,
    images = Object.getOwnPropertyDescriptor(source, 'images')!
  for (const field of ['geometries', 'images'])
    Object.defineProperty(source, field, {
      configurable: true,
      get() {
        throw new Error('Capture must not read resources')
      },
    })
  try {
    copied = captureSceneAnimationPoseSet(source, 'clip', ids, time)
    expect(Object.keys(copied)).toEqual(['entries'])
    expect(copied.entries.map((entry) => Object.keys(entry).sort())).toEqual(
      ids.map(() => ['name', 'nodeId', 'pose']),
    )
    expect(copied.entries[0]!.pose.rotation).toEqual(root.keys[0]!.value)
    expect(copied.entries[2]!.pose.translation).toEqual(move.keys[0]!.value)
  } finally {
    Object.defineProperty(source, 'geometries', geometry)
    Object.defineProperty(source, 'images', images)
  }
  const saved = structuredClone(copied!)
  const next = pasteSceneAnimationPoseSet(source, 'clip', time, copied!, pairs)
  root.keys[0]!.value.fill(0)
  move.keys[0]!.value.fill(0)
  source.nodes.find((node) => node.id === 'root')!.name = 'Mudou'
  expect(copied!).toEqual(saved)
  copied!.entries[0]!.pose.rotation.fill(999)
  expect(
    next.animations![0]!.tracks.find(
      (track) => track.nodeId === 'other-root' && track.channel === 'rotation',
    )!.keys[0]!.value,
  ).toEqual(saved.entries[0]!.pose.rotation)
})

test('reciprocal mapping swaps snapshot values instead of reading an already replaced joint, retaining destination curves and one undo', () => {
  const source = fixture(),
    copied = captureSceneAnimationPoseSet(source, 'clip', ['root', 'middle'], time)
  const reciprocal = [
    { sourceId: 'root', targetId: 'middle' },
    { sourceId: 'middle', targetId: 'root' },
  ]
  const next = pasteSceneAnimationPoseSet(source, 'clip', time, copied, reciprocal)
  for (const pair of reciprocal) {
    expect(captureSceneAnimationLocalPose(next, 'clip', pair.targetId, time)).toEqual(
      copied.entries.find((entry) => entry.nodeId === pair.sourceId)!.pose,
    )
    for (const channel of ['translation', 'rotation', 'scale']) {
      const track = (document: typeof source) =>
        document.animations![0]!.tracks.find(
          (track) => track.nodeId === pair.targetId && track.channel === channel,
        )!
      expect(track(next).keys[0]!.interpolation).toBe(track(source).keys[0]!.interpolation)
    }
  }
  expect(pasteSceneAnimationPoseSet(next, 'clip', time, copied, reciprocal)).toBe(next)
  const editor = createDocumentEditorStore({
    asset: source,
    persistence: { save: async () => {} },
    sizeOf: structuredBytes,
    autosaveMs: 60_000,
  })
  try {
    editor.getState().commit(next)
    editor.getState().undo()
    expect(editor.getState().asset.animations).toEqual(source.animations)
    expect(editor.getState().canUndo).toBe(false)
    editor.getState().redo()
    expect(editor.getState().asset.animations).toEqual(next.animations)
  } finally {
    editor.getState().dispose()
  }
})

test('incomplete, duplicated, unknown or unbounded pairs and malformed snapshots never partially change a document', () => {
  const source = fixture(),
    before = structuredClone(source),
    copied = captureSceneAnimationPoseSet(source, 'clip', ids, time)
  const invalid: unknown[] = [
    [],
    pairs.slice(1),
    [...pairs, pairs[0]],
    [pairs[0], pairs[0], pairs[2]],
    [pairs[0], { ...pairs[1], targetId: pairs[0]!.targetId }, pairs[2]],
    [{ ...pairs[0], sourceId: 'missing' }, ...pairs.slice(1)],
    [{ ...pairs[0], targetId: 'missing' }, ...pairs.slice(1)],
    [{ ...pairs[0], extra: true }, ...pairs.slice(1)],
    Array.from({ length: SCENE_LIMITS.nodes + 1 }, () => pairs[0]),
  ]
  for (const input of invalid)
    expect(() =>
      pasteSceneAnimationPoseSet(source, 'clip', time, copied, input as SceneAnimationPosePair[]),
    ).toThrow()
  for (const entries of [
    [],
    [copied.entries[0], copied.entries[0]],
    [{ ...copied.entries[0], name: '' }],
    [{ ...copied.entries[0], pose: { ...copied.entries[0]!.pose, rotation: [0, 0, 0, 0] } }],
    [{ ...copied.entries[0], pose: { ...copied.entries[0]!.pose, scale: [1, Infinity, 1] } }],
    [
      copied.entries[0],
      { ...copied.entries[1], pose: { ...copied.entries[1]!.pose, space: 'local' } },
    ],
  ])
    expect(() => readSceneAnimationPoseSet({ entries })).toThrow()
  expect(() => readSceneAnimationPoseSet({ ...copied, document: source })).toThrow()
  expect(() => captureSceneAnimationPoseSet(source, 'clip', ['root', 'root'], time)).toThrow()
  expect(() => captureSceneAnimationPoseSet(source, 'clip', [], time)).toThrow()
  expect(() => captureSceneAnimationPoseSet(source, 'clip', ['missing'], time)).toThrow()
  expect(() => pasteSceneAnimationPoseSet(source, 'clip', NaN, copied, pairs)).toThrow()
  expect(() =>
    pasteSceneAnimationPoseSet(source, 'clip', time, copied, pairs, 'bad' as 'x'),
  ).toThrow()
  expect(source).toEqual(before)
})

test('capturing the node budget indexes hierarchy and tracks once, rather than once per copied pose', () => {
  const source = makeSceneTwoBoneFixture()
  const template = source.nodes.find((node) => node.id === 'root')!
  while (source.nodes.length < SCENE_LIMITS.nodes)
    source.nodes.push({ ...template, id: `joint-${source.nodes.length}`, parentId: null })
  const nodes = source.nodes,
    tracks = source.animations![0]!.tracks
  let nodeReads = 0,
    trackReads = 0
  Object.defineProperty(source, 'nodes', {
    get() {
      nodeReads++
      return nodes
    },
  })
  Object.defineProperty(source.animations![0]!, 'tracks', {
    get() {
      trackReads++
      return tracks
    },
  })
  const copied = captureSceneAnimationPoseSet(
    source,
    'clip',
    nodes.map((node) => node.id),
    time,
  )
  expect(copied.entries).toHaveLength(SCENE_LIMITS.nodes)
  expect(nodeReads).toBe(2)
  expect(trackReads).toBe(3)
  const input = Array.from({ length: SCENE_LIMITS.nodes + 1 }, () => 'root')
  expect(() => captureSceneAnimationPoseSet(source, 'clip', input, time)).toThrow('orçamento')
  expect(nodeReads).toBe(2)
  copied.entries[0]!.pose.rotation[0] = 9
  expect(copied.entries[1]!.pose.rotation).toEqual([0, 0, 0, 1])
})

test('destination locks, incompatible spaces and aggregate key budgets are checked before the one commit', () => {
  const source = fixture(),
    copied = captureSceneAnimationPoseSet(source, 'clip', ids, time)
  for (const nodeId of ['parent', 'other-middle']) {
    const locked = {
      ...source,
      nodes: source.nodes.map((node) => (node.id === nodeId ? { ...node, locked: true } : node)),
    }
    expect(() => pasteSceneAnimationPoseSet(locked, 'clip', time, copied, pairs)).toThrow(
      'Destrave',
    )
  }
  // A locked descendant matters even if that descendant is not a mapped target.
  const locked = {
    ...source,
    nodes: source.nodes.map((node) => (node.id === 'other-tip' ? { ...node, locked: true } : node)),
  }
  expect(() =>
    pasteSceneAnimationPoseSet(
      locked,
      'clip',
      time,
      { entries: copied.entries.slice(0, 1) },
      pairs.slice(0, 1),
    ),
  ).toThrow('Destrave')
  const absolute = fixture('local')
  expect(() => pasteSceneAnimationPoseSet(absolute, 'clip', time, copied, pairs)).toThrow(
    'outro tipo',
  )
  const full = makeSceneTwoBoneFixture()
  full.animations![0]!.tracks = [
    {
      nodeId: 'root',
      channel: 'translation',
      keys: Array.from({ length: SCENE_LIMITS.animationKeys }, (_, i) => ({
        time: i / SCENE_LIMITS.animationKeys,
        value: [0, 0, 0],
        interpolation: 'linear',
      })),
    },
  ]
  expect(() =>
    pasteSceneAnimationPoseSet(
      full,
      'clip',
      time,
      copied,
      ids.map((id) => ({ sourceId: id, targetId: id })),
    ),
  ).toThrow('orçamento')
})

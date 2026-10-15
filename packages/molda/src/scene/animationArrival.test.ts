import { expect, test } from 'bun:test'
import { makeModel } from '../testing/fixtures'
import {
  editSceneAnimationPoses,
  markSceneAnimationChannel,
  recordSceneAnimationInputs,
  retimeSceneAnimationPoses,
  sceneKeyArrival,
  setScenePoseArrival,
} from './animationArrival'
import { createSceneAnimation, setSceneAnimationKey } from './animationCommands'
import { SCENE_LIMITS } from './limits'
import { migrateLegacyModel } from './migrateLegacy'
import { readSceneAnimationClip } from './readAnimation'
import { prepareSceneAnimation } from './sampleAnimation'

function fixture() {
  let document = createSceneAnimation(migrateLegacyModel(makeModel()).document, 'Pular')
  const clipId = document.animations![0]!.id
  const nodeId = document.nodes[0]!.id
  for (const [time, interpolation] of [
    [0, 'linear'],
    [0.5, 'step'],
    [1, 'smooth'],
    [2, 'linear'],
  ] as const) {
    document = setSceneAnimationKey(document, clipId, {
      nodeId,
      channel: 'translation',
      key: { time, value: [0, time * 2, 0], interpolation },
    })
  }
  return { document, clipId, nodeId, channel: 'translation' as const }
}

test('editing arrival changes the preceding interval, never the following interval', () => {
  const { document, clipId, nodeId, channel } = fixture()
  const next = setScenePoseArrival(document, clipId, { nodeId, channel, time: 1 }, 'linear')
  const before = prepareSceneAnimation(document, clipId)
  const after = prepareSceneAnimation(next, clipId)
  expect(before.sample(0.75, false).worldMatrices.get(nodeId)![13]).not.toEqual(
    after.sample(0.75, false).worldMatrices.get(nodeId)![13],
  )
  for (const time of [0, 0.25, 1, 1.25, 1.5, 1.75, 2])
    expect(after.sample(time, false).worldMatrices).toEqual(
      before.sample(time, false).worldMatrices,
    )
  expect(setScenePoseArrival(document, clipId, { nodeId, channel, time: 0 }, 'step')).toBe(document)
})

test('move, copy and delete retain arrival at each surviving destination and reject crossings atomically', () => {
  const { document, clipId, nodeId, channel } = fixture()
  const source = structuredClone(document)
  const ref = { nodeId, channel, time: 1 }
  const moved = editSceneAnimationPoses(document, clipId, [ref], 'move', 0.25)
  const track = moved.animations![0]!.tracks[0]!
  expect(sceneKeyArrival(track, 1.25)).toBe('step')
  expect(sceneKeyArrival(track, 2)).toBe('smooth')
  const copied = editSceneAnimationPoses(document, clipId, [ref], 'copy', 0.5)
  expect(sceneKeyArrival(copied.animations![0]!.tracks[0]!, 1.5)).toBe('step')
  expect(sceneKeyArrival(copied.animations![0]!.tracks[0]!, 2)).toBe('smooth')
  const removed = editSceneAnimationPoses(document, clipId, [ref], 'remove')
  expect(sceneKeyArrival(removed.animations![0]!.tracks[0]!, 2)).toBe('smooth')
  expect(() => editSceneAnimationPoses(document, clipId, [ref], 'move', -0.75)).toThrow(
    'atravessar',
  )
  expect(() => editSceneAnimationPoses(document, clipId, [ref], 'copy', 1)).toThrow('instante')
  expect(document).toEqual(source)
})

test('marking unchanged values creates a hold pose; first later edit includes a starting key', () => {
  const { document, clipId, nodeId, channel } = fixture()
  const marked = markSceneAnimationChannel(document, clipId, { nodeId, channel, time: 0.75 })
  const track = marked.animations![0]!.tracks[0]!
  expect(track.keys.map((key) => key.time)).toEqual([0, 0.5, 0.75, 1, 2])
  expect(sceneKeyArrival(track, 1)).toBe('step')
  let empty = createSceneAnimation(migrateLegacyModel(makeModel()).document, 'Novo')
  const id = empty.animations![0]!.id
  empty = recordSceneAnimationInputs(empty, id, [
    { nodeId, channel, key: { time: 0.5, value: [0, 3, 0], interpolation: 'linear' } },
  ])
  expect(empty.animations![0]!.tracks[0]!.keys.map((key) => key.time)).toEqual([0, 0.5])
  expect(prepareSceneAnimation(empty, id).sample(0, false).worldMatrices.get(nodeId)![13]).not.toBe(
    prepareSceneAnimation(empty, id).sample(0.5, false).worldMatrices.get(nodeId)![13],
  )
})

test('editing an imported channel that begins later preserves its first time', () => {
  let document = createSceneAnimation(migrateLegacyModel(makeModel()).document, 'Importado')
  const clipId = document.animations![0]!.id,
    nodeId = document.nodes[0]!.id
  document = setSceneAnimationKey(document, clipId, {
    nodeId,
    channel: 'translation',
    key: { time: 1, value: [0, 1, 0], interpolation: 'linear' },
  })
  document = recordSceneAnimationInputs(document, clipId, [
    {
      nodeId,
      channel: 'translation',
      key: { time: 1.5, value: [0, 2, 0], interpolation: 'smooth' },
    },
  ])
  expect(document.animations![0]!.tracks[0]!.keys.map((key) => key.time)).toEqual([1, 1.5])
})

test('retiming a batch uses a fixed anchor, keeps arrivals and refuses collisions or inherited locks', () => {
  const { document, clipId, nodeId, channel } = fixture()
  const refs = [0.5, 1].map((time) => ({ nodeId, channel, time }))
  const next = retimeSceneAnimationPoses(document, clipId, refs, 1.5, 0.5)
  expect(next.animations![0]!.tracks[0]!.keys.map((key) => key.time)).toEqual([0, 0.5, 1.25, 2])
  expect(sceneKeyArrival(next.animations![0]!.tracks[0]!, 1.25)).toBe('step')
  expect(() => retimeSceneAnimationPoses(document, clipId, refs, 3, 0.5)).toThrow('instante')
  expect(() => retimeSceneAnimationPoses(document, clipId, refs, 0, 0.5)).toThrow()
  const locked = { ...document, nodes: document.nodes.map((node) => ({ ...node, locked: true })) }
  expect(() => retimeSceneAnimationPoses(locked, clipId, refs, 1.5, 0.5)).toThrow('Destrave')
  expect(document.animations![0]!.tracks[0]!.keys.map((key) => key.time)).toEqual([0, 0.5, 1, 2])
})

test('editing the entire key budget keeps values and arrival metadata and rejects over-budget copies atomically', () => {
  const { document: base, clipId, nodeId, channel } = fixture()
  const clip = readSceneAnimationClip({
    ...base.animations![0]!,
    duration: SCENE_LIMITS.animationSeconds,
    tracks: [
      {
        nodeId,
        channel,
        keys: Array.from({ length: SCENE_LIMITS.animationKeys }, (_, i) => ({
          time: i / 256,
          value: [0, i / 1024, 0],
          interpolation: ['linear', 'smooth', 'step'][i % 3],
        })),
      },
    ],
  })
  const document = { ...base, animations: [clip] }
  const original = structuredClone(clip)
  const refs = clip.tracks[0]!.keys.map((key) => ({ nodeId, channel, time: key.time }))
  const moved = editSceneAnimationPoses(document, clipId, refs, 'move', 0.5)
  const originalTrack = clip.tracks[0]!,
    movedTrack = moved.animations![0]!.tracks[0]!
  if (originalTrack.channel !== 'translation' || movedTrack.channel !== 'translation')
    throw new Error('The command changed the channel kind')
  expect(movedTrack.keys).toEqual(
    originalTrack.keys.map((key) => ({ ...key, time: key.time + 0.5 })),
  )
  expect(() => editSceneAnimationPoses(document, clipId, refs, 'copy', 300)).toThrow()
  expect(() =>
    editSceneAnimationPoses(
      document,
      clipId,
      refs.filter((_, i) => i % 2 === 0),
      'move',
      1 / 128,
    ),
  ).toThrow('atravessar')
  expect(document.animations![0]).toEqual(original)
}, 20_000)

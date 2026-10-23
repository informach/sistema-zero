import { expect, test } from 'bun:test'
import { makeModel } from '../testing/fixtures'
import { animatedScene } from '../testing/sceneAnimation'
import type { SceneAnimationTrack } from './animation'
import {
  editSceneAnimationPoses,
  markSceneAnimationChannel,
  recordSceneAnimationInputs,
  retimeSceneAnimationPoses,
  sceneKeyArrival,
  sceneRotationPaceNeedsChange,
  setScenePoseArrival,
  setSceneRotationPace,
} from './animationArrival'
import { createSceneAnimation, setSceneAnimationKey } from './animationCommands'
import { SCENE_LIMITS } from './limits'
import { quaternionFromEulerXYZ } from './matrix'
import { migrateLegacyModel } from './migrateLegacy'
import { readSceneAnimationClip } from './readAnimation'
import { prepareSceneAnimation, sampleSceneAnimationTrack } from './sampleAnimation'

test('constant rotation pace removes a smooth slowdown at each quarter turn without editing other channels', () => {
  const source = animatedScene()
  const rotation = {
    nodeId: 'body',
    channel: 'rotation' as const,
    keys: [0, 90, 180, 270, 360].map((degrees, index) => ({
      time: index * 0.5,
      value: quaternionFromEulerXYZ([0, 0, degrees]),
      interpolation: 'smooth' as const,
    })),
  }
  source.animations[0]!.tracks.push(rotation)
  const original = structuredClone(source)
  const changed = setSceneRotationPace(source, 'clip', 'body')
  const track = changed.animations![0]!.tracks.find((entry) => entry.channel === 'rotation')!
  expect(track.keys.every((key) => key.interpolation === 'linear')).toBe(true)
  expect(changed.animations![0]!.tracks[0]).toBe(source.animations[0]!.tracks[0])
  expect(changed.nodes).toBe(source.nodes)
  expect(source).toEqual(original)
  expect(sampleSceneAnimationTrack(rotation, 0.125)[2]).toBeCloseTo(
    Math.sin((14.0625 * Math.PI) / 360),
  )
  expect(sampleSceneAnimationTrack(track, 0.125)[2]).toBeCloseTo(Math.sin((22.5 * Math.PI) / 360))
  const angle = (entry: SceneAnimationTrack, a: number, b: number) => {
    const left = sampleSceneAnimationTrack(entry, a)
    const right = sampleSceneAnimationTrack(entry, b)
    const dot = left.reduce((sum, value, axis) => sum + value * right[axis]!, 0)
    return 2 * Math.acos(Math.min(1, Math.abs(dot)))
  }
  expect(angle(rotation, 0.49, 0.51)).toBeLessThan(angle(rotation, 0.24, 0.26) / 10)
  expect(angle(track, 0.49, 0.51)).toBeCloseTo(angle(track, 0.24, 0.26), 10)
  expect(angle(track, 1.99, 0.01)).toBeCloseTo(angle(track, 0.24, 0.26), 10)
  expect(setSceneRotationPace(changed, 'clip', 'body')).toBe(changed)
})

test('constant rotation pace closes the small overshoot in a one-second windmill loop', () => {
  const source = animatedScene()
  const clip = source.animations[0]!
  clip.duration = 1
  clip.tracks = [
    {
      nodeId: 'body',
      channel: 'rotation',
      keys: [
        { time: 0, value: [0, 0, 0, 1], interpolation: 'smooth' },
        {
          time: 0.25,
          value: [0.7101639105223165, 0, 0, 0.7040363770371891],
          interpolation: 'smooth',
        },
        {
          time: 0.5,
          value: [0.9999635491022615, 0, 0, -0.008538177019078271],
          interpolation: 'smooth',
        },
        {
          time: 0.75,
          value: [0.6892790388990742, 0, 0, -0.7244959672312669],
          interpolation: 'smooth',
        },
        {
          time: 1,
          value: [-0.01845055495854263, 0, 0, -0.999829774022419],
          interpolation: 'linear',
        },
      ],
    },
  ]
  const original = structuredClone(source)
  const changed = setSceneRotationPace(source, 'clip', 'body')
  const rotation = changed.animations![0]!.tracks[0]!
  expect(sceneRotationPaceNeedsChange(clip, clip.tracks[0]!)).toBe(true)
  expect(sceneRotationPaceNeedsChange(changed.animations![0]!, rotation)).toBe(false)
  expect(rotation.keys.map((key) => key.time)).toEqual([0, 0.25, 0.5, 0.75, 1])
  expect(rotation.keys.every((key) => key.interpolation === 'linear')).toBe(true)
  expect(rotation.keys.at(-1)!.value).toEqual([0, 0, 0, -1])
  const angularTravel = (a: number, b: number) => {
    const left = sampleSceneAnimationTrack(rotation, a) as number[]
    const right = sampleSceneAnimationTrack(rotation, b) as number[]
    const dot = left.reduce((sum, value, axis) => sum + value * right[axis]!, 0)
    return 2 * Math.acos(Math.min(1, Math.abs(dot)))
  }
  expect(angularTravel(0.99, 0.01)).toBeCloseTo(angularTravel(0.24, 0.26), 1)
  expect(source).toEqual(original)
  expect(setSceneRotationPace(changed, 'clip', 'body')).toBe(changed)
})

test('a two-pose wheel loop becomes a complete constant-speed turn on its authored axis', () => {
  const wheelEnds = [
    [3.0478488118155166e-18, 0.9248902496522317, 2.8133989032143236e-18, 0.38023417271233345],
    [-9.1841592143412926e-18, -0.9208003419824723, -2.5433056285868177e-17, -0.3900342679880346],
    [2.7836111415739452e-17, -0.6974119227052386, 5.4461957117751051e-18, -0.7166705031383547],
    [-5.854905771697111e-18, 0.9999634425755534, 3.9466401868476827e-17, 0.008550643978558124],
  ] as const
  for (const end of wheelEnds) {
    const source = animatedScene()
    source.animations[0]!.duration = 1
    const translation = {
      nodeId: 'body',
      channel: 'translation' as const,
      keys: [
        { time: 0, value: [0, 0, 0] as [number, number, number], interpolation: 'linear' as const },
      ],
    }
    source.animations[0]!.tracks = [
      translation,
      {
        nodeId: 'body',
        channel: 'rotation',
        keys: [
          { time: 0, value: [0, 0, 0, 1], interpolation: 'smooth' },
          { time: 1, value: [...end], interpolation: 'smooth' },
        ],
      },
    ]
    const original = structuredClone(source)
    const changed = setSceneRotationPace(source, 'clip', 'body')
    const track = changed.animations![0]!.tracks[1]!
    expect(track.keys.map((key) => key.time)).toEqual([0, 0.25, 0.5, 0.75, 1])
    expect(track.keys.every((key) => key.interpolation === 'linear')).toBe(true)
    expect(track.keys.at(-1)!.value).toEqual([0, 0, 0, -1])
    const angularTravel = (a: number, b: number) => {
      const left = sampleSceneAnimationTrack(track, a)
      const right = sampleSceneAnimationTrack(track, b)
      const dot = left.reduce((sum, value, axis) => sum + value * right[axis]!, 0)
      return 2 * Math.acos(Math.min(1, Math.abs(dot)))
    }
    expect(angularTravel(0.99, 0.01)).toBeCloseTo(angularTravel(0.24, 0.26), 9)
    expect(changed.animations![0]!.tracks[0]).toBe(translation)
    expect(source).toEqual(original)
  }
})

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

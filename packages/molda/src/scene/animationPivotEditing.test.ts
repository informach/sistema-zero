import { expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import { makeModel } from '../testing/fixtures'
import {
  editSceneAnimationPoses,
  markSceneAnimationChannel,
  recordSceneAnimationChannelValue,
  retimeSceneAnimationPoses,
  setScenePoseArrival,
} from './animationArrival'
import {
  configureSceneAnimation,
  createSceneAnimation,
  reverseSceneAnimation,
  setSceneAnimationKey,
} from './animationCommands'
import { addScenePrimitive } from './commands'
import type { MoldaSceneDocument } from './document'
import { sceneToJson } from './documentJson'
import { quaternionFromEulerXYZ, transformPoint } from './matrix'
import { migrateLegacyModel } from './migrateLegacy'
import { setSceneAuthoringPivot } from './pivot'
import { readSceneAnimationClip } from './readAnimation'
import { readSceneDocument } from './readDocument'
import { prepareSceneAnimation } from './sampleAnimation'

function turn() {
  let document = addScenePrimitive(
    migrateLegacyModel(makeModel({ parts: [] })).document,
    'box',
    'Peça',
  )
  const id = document.nodes[0]!.id
  const pivot: Vec3 = [1, -1, 1]
  document = setSceneAuthoringPivot(document, id, pivot)
  document = createSceneAnimation(document, 'Giro')
  const clipId = document.animations![0]!.id
  document = configureSceneAnimation(document, clipId, { duration: 2, fps: 24, loop: false })
  document = recordSceneAnimationChannelValue(document, clipId, {
    nodeId: id,
    channel: 'rotation',
    key: { time: 1, value: quaternionFromEulerXYZ([0, 90, 0]), interpolation: 'smooth' },
  })
  return { document, id, pivot, clipId }
}

function match(actual: readonly number[], expected: readonly number[]) {
  actual.forEach((value, axis) => {
    expect(value).toBeCloseTo(expected[axis]!, 10)
  })
}

function native(document: MoldaSceneDocument) {
  const result = readSceneDocument(sceneToJson(document))
  expect(result.status).toBe('valid')
  if (result.status !== 'valid') throw new Error('Documento inválido')
  expect(result.document.animations).toEqual(document.animations)
  return result.document
}

test('reversal carries interval pivots to their new destinations, including different pivots and a second reversal', () => {
  const f = turn()
  let source = setSceneAuthoringPivot(f.document, f.id, [-2, 1, 3])
  source = recordSceneAnimationChannelValue(source, f.clipId, {
    nodeId: f.id,
    channel: 'rotation',
    key: { time: 2, value: quaternionFromEulerXYZ([30, 150, 20]), interpolation: 'smooth' },
  })
  source = setScenePoseArrival(
    source,
    f.clipId,
    { nodeId: f.id, channel: 'rotation', time: 1 },
    'linear',
  )
  const original = structuredClone(source)
  const reversed = reverseSceneAnimation(source, f.clipId)
  const twice = reverseSceneAnimation(reversed, f.clipId)
  const a = prepareSceneAnimation(source, f.clipId)
  const b = prepareSceneAnimation(native(reversed), f.clipId)
  const c = prepareSceneAnimation(native(twice), f.clipId)
  for (let i = 0; i <= 128; i++) {
    const time = i / 64
    const expected = a.sample(time, false).worldMatrices.get(f.id)!
    match(b.sample(2 - time, false).worldMatrices.get(f.id)!, expected)
    match(c.sample(time, false).worldMatrices.get(f.id)!, expected)
  }
  expect(source).toEqual(original)
})

test.each([
  'step',
  'linear',
  'smooth',
] as const)('changing angular arrival to %s keeps the pivot fixed without rewriting position keys', (arrival) => {
  const f = turn()
  const ref = { nodeId: f.id, channel: 'rotation' as const, time: 1 }
  const source = setScenePoseArrival(f.document, f.clipId, ref, 'step')
  const changed = setScenePoseArrival(source, f.clipId, ref, arrival)
  const translation = (document: MoldaSceneDocument) =>
    document.animations![0]!.tracks.find((t) => t.channel === 'translation')
  expect(translation(changed)).toBe(translation(f.document))
  const sampler = prepareSceneAnimation(native(changed), f.clipId)
  const center = transformPoint(sampler.sample(0, false).worldMatrices.get(f.id)!, f.pivot)
  for (let i = 0; i <= 128; i++)
    match(transformPoint(sampler.sample(i / 128, false).worldMatrices.get(f.id)!, f.pivot), center)
})

test('changing angular arrival preserves independently authored position keys and the path of the reference point', () => {
  const f = turn()
  const source = setSceneAnimationKey(f.document, f.clipId, {
    nodeId: f.id,
    channel: 'translation',
    key: { time: 0.4, value: [3, 2, 1], interpolation: 'linear' },
  })
  const changed = setScenePoseArrival(
    source,
    f.clipId,
    { nodeId: f.id, channel: 'rotation', time: 1 },
    'linear',
  )
  expect(changed.animations![0]!.tracks.find((t) => t.channel === 'translation')).toBe(
    source.animations![0]!.tracks.find((t) => t.channel === 'translation'),
  )
  const before = prepareSceneAnimation(source, f.clipId)
  const after = prepareSceneAnimation(changed, f.clipId)
  for (let i = 0; i <= 128; i++) {
    const time = i / 128
    match(
      transformPoint(after.sample(time, false).worldMatrices.get(f.id)!, f.pivot),
      transformPoint(before.sample(time, false).worldMatrices.get(f.id)!, f.pivot),
    )
  }
})

test('marking an existing rotation again preserves its independent compensation curve', () => {
  const f = turn()
  const ref = { nodeId: f.id, channel: 'rotation' as const, time: 1 }
  const source = setScenePoseArrival(f.document, f.clipId, ref, 'linear')
  const marked = markSceneAnimationChannel(source, f.clipId, ref)
  const before = prepareSceneAnimation(source, f.clipId)
  const after = prepareSceneAnimation(marked, f.clipId)
  for (let i = 0; i <= 128; i++)
    match(
      after.sample(i / 128, false).worldMatrices.get(f.id)!,
      before.sample(i / 128, false).worldMatrices.get(f.id)!,
    )
})

test('compensation interpolation is validated and metadata-only replacements are not discarded', () => {
  const f = turn()
  const clip = f.document.animations![0]!
  const rotation = clip.tracks.find((track) => track.channel === 'rotation')!
  const key = rotation.keys[1]!
  const changed = setSceneAnimationKey(f.document, f.clipId, {
    nodeId: f.id,
    channel: 'rotation',
    key: { ...key, incomingPivotInterpolation: 'linear' },
  })
  expect(changed).not.toBe(f.document)
  native(changed)
  for (const malformed of [
    { ...key, incomingPivotInterpolation: 'invalid' },
    { ...key, incomingPivot: undefined, incomingPivotInterpolation: 'linear' },
  ]) {
    expect(() =>
      readSceneAnimationClip({ ...clip, tracks: [{ ...rotation, keys: [malformed] }] }),
    ).toThrow()
  }
})

test('editing a saved clip without the new compensation field preserves its original reference curve', () => {
  const f = turn()
  const source = structuredClone(f.document)
  for (const track of source.animations![0]!.tracks)
    for (const key of track.keys) delete key.incomingPivotInterpolation
  const changed = setScenePoseArrival(
    native(source),
    f.clipId,
    { nodeId: f.id, channel: 'rotation', time: 1 },
    'linear',
  )
  const sampler = prepareSceneAnimation(native(changed), f.clipId)
  const center = transformPoint(sampler.sample(0, false).worldMatrices.get(f.id)!, f.pivot)
  for (let i = 0; i <= 128; i++)
    match(transformPoint(sampler.sample(i / 128, false).worldMatrices.get(f.id)!, f.pivot), center)
})

test('moving and retiming a complete pose preserve its separate reference curve; copying and removing retain valid interval metadata', () => {
  const f = turn()
  const changed = setScenePoseArrival(
    f.document,
    f.clipId,
    { nodeId: f.id, channel: 'rotation', time: 1 },
    'linear',
  )
  const refs = changed.animations![0]!.tracks.map((track) => ({
    nodeId: f.id,
    channel: track.channel,
    time: 1,
  }))
  const moved = editSceneAnimationPoses(changed, f.clipId, refs, 'move', 0.5)
  const retimed = retimeSceneAnimationPoses(changed, f.clipId, refs, 1.5, 0)
  const before = prepareSceneAnimation(changed, f.clipId)
  for (const next of [moved, retimed]) {
    const sampler = prepareSceneAnimation(native(next), f.clipId)
    for (let i = 0; i <= 64; i++)
      match(
        sampler.sample((i / 64) * 1.5, false).worldMatrices.get(f.id)!,
        before.sample(i / 64, false).worldMatrices.get(f.id)!,
      )
  }
  const copied = editSceneAnimationPoses(changed, f.clipId, refs, 'copy', 0.5)
  const removed = editSceneAnimationPoses(
    copied,
    f.clipId,
    refs.map((ref) => ({ ...ref, time: 1.5 })),
    'remove',
  )
  const sampler = prepareSceneAnimation(native(removed), f.clipId)
  for (let i = 0; i <= 128; i++)
    match(
      sampler.sample(i / 64, false).worldMatrices.get(f.id)!,
      before.sample(i / 64, false).worldMatrices.get(f.id)!,
    )
})

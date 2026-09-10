import { expect, test } from 'bun:test'
import { SCENE_LIMITS } from '../scene/limits'
import { readBbmodelAnimationKeyframes } from './bbmodelAnimationKeyframes'
import {
  type BbmodelAnimationScheduleClip,
  type BbmodelAnimationScheduleTrack,
  planBbmodelAnimationSchedules as plan,
} from './bbmodelAnimationSchedule'
import { readBbmodelAnimationStructure } from './bbmodelAnimationStructure'
import { prepareBbmodelAnimationTrack } from './bbmodelAnimationTrack'
import { readBbmodelEnvelope } from './bbmodelEnvelope'
import { BbmodelInputError } from './bbmodelInput'

function at<T>(items: readonly T[], index = 0): T {
  const item = items[index]
  if (item === undefined) throw new Error(`Expected fixture item ${index}`)
  return item
}
function track(times: number[], path = 'track'): BbmodelAnimationScheduleTrack {
  return {
    path,
    sampling: 'grid',
    track: {
      channel: 'position',
      reordered: false,
      migration: { pointAxes: 0, bezierValueAxes: 0 },
      keys: times.map((time, index) => ({
        index,
        time,
        path: `${path}.keyframes[${index}]`,
        interpolation: 'linear',
        points: [[index, 0, 0]],
        bezier: null,
      })),
    },
  }
}
function clip(
  tracks: BbmodelAnimationScheduleTrack[],
  overrides: Partial<BbmodelAnimationScheduleClip> = {},
): BbmodelAnimationScheduleClip {
  return { clip: 7, path: 'animations[7]', duration: 1, fps: 2, tracks, ...overrides }
}
function failure(fn: () => unknown) {
  try {
    fn()
  } catch (error) {
    if (!(error instanceof BbmodelInputError)) throw error
    return { reason: error.reason, path: error.path }
  }
  throw new Error('Expected a diagnostic')
}
function poison(target: object, field: string) {
  Object.defineProperty(target, field, {
    get() {
      throw new Error(`Unexpected read: ${field}`)
    },
  })
}

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s schedules real prepared tracks with explicit duration/FPS, not source length/snapping', (version) => {
  const envelope = readBbmodelEnvelope(
      new TextEncoder().encode(
        JSON.stringify({
          meta: { format_version: version, model_format: 'free' },
          animations: [
            {
              uuid: 'source-clip',
              length: 77,
              snapping: 200,
              animators: {
                group: {
                  keyframes: [-1, 0.25, 2].map((time) => ({
                    channel: 'position',
                    time,
                    data_points: [{ x: 1 }],
                  })),
                },
              },
            },
          ],
        }),
      ),
    ),
    structure = readBbmodelAnimationStructure(envelope),
    animator = at(at(readBbmodelAnimationKeyframes(structure).clips).animators)
  if (animator.kind !== 'transform') throw new Error('Expected a transform fixture')
  const prepared = prepareBbmodelAnimationTrack(animator, 'position', version)
  if (prepared.status !== 'ready') throw new Error('Expected a numeric fixture')
  const source = clip([{ path: animator.declaration.path, sampling: 'grid', track: prepared }]),
    before = structuredClone(source),
    result = plan([source])
  expect(result).toEqual({
    clips: [{ clip: 7, tracks: [{ track: 0, times: [0, 0.25, 0.5, 1] }] }],
    counts: { clips: 1, tracks: 1, keys: 4 },
  })
  expect(at(structure.clips).length).toBe(77)
  expect(at(structure.clips).snapping).toBe(200)
  at(at(result.clips).tracks).times[1] = 99
  expect(source).toEqual(before)
})

test('bbmodel schedules preserve near times and return separate owned arrays even for shared tracks', () => {
  const item = track([-1, 0, Number.MIN_VALUE, 0.1, 0.1 + Number.EPSILON, 1, 2]),
    source = clip([item, item]),
    before = structuredClone(source),
    result = plan([source]),
    rows = at(result.clips).tracks
  expect(at(rows).times).toEqual([0, Number.MIN_VALUE, 0.1, 0.1 + Number.EPSILON, 0.5, 1])
  expect(result.counts.keys).toBe(12)
  expect(at(rows).times).not.toBe(at(rows, 1).times)
  at(rows).times[1] = 42
  expect(at(rows, 1).times[1]).toBe(Number.MIN_VALUE)
  expect(source).toEqual(before)
})

test('bbmodel authorial schedules stay small, with explicit mixed scheduling and no curve inference', () => {
  const authorial = track([0, 0.25, 600]),
    sampled = track([0, 0.25, 600])
  authorial.sampling = 'authored'
  expect(at(at(plan([clip([authorial], { duration: 600, fps: 120 })]).clips).tracks).times).toEqual(
    [0, 0.25, 600],
  )
  const mixed = plan([clip([authorial, sampled])])
  expect(at(mixed.clips).tracks.map((entry) => entry.times)).toEqual([
    [0, 0.25, 1],
    [0, 0.25, 0.5, 1],
  ])
  expect(mixed.counts.keys).toBe(7)
  Object.defineProperty(authorial, 'sampling', { value: 'guess' })
  poison(authorial, 'track')
  expect(failure(() => plan([clip([authorial])]))).toEqual({
    reason: 'invalid',
    path: 'track.sampling',
  })
})

test('bbmodel all metadata and cardinality checks precede source time/point reads', () => {
  const item = track([0, 1])
  poison(item, 'track')
  for (const duration of [0, -1, NaN, Infinity])
    expect(failure(() => plan([clip([item]), clip([], { duration })]))).toEqual({
      reason: 'invalid',
      path: 'animations[7].duration',
    })
  for (const fps of [0, 121, 1.5, NaN, Infinity])
    expect(failure(() => plan([clip([item]), clip([], { fps })]))).toEqual({
      reason: 'invalid',
      path: 'animations[7].fps',
    })
  expect(failure(() => plan([clip([item], { duration: 601 })]))).toEqual({
    reason: 'budget',
    path: 'animations[7].duration',
  })
  expect(failure(() => plan([clip([item], { duration: 600, fps: 120 })]))).toEqual({
    reason: 'budget',
    path: 'animations',
  })
})

test('bbmodel clip and track budgets are aggregate, including exact bounds', () => {
  expect(
    plan(
      Array.from({ length: SCENE_LIMITS.animationClips }, (_, index) => clip([], { clip: index })),
    ).counts,
  ).toEqual({ clips: 64, tracks: 0, keys: 0 })
  const unread = clip([])
  poison(unread, 'duration')
  expect(failure(() => plan(Array.from({ length: 65 }, () => unread)))).toEqual({
    reason: 'budget',
    path: 'animations',
  })
  const item = track([0, 1]),
    result = plan([
      clip(
        Array.from({ length: 2048 }, () => item),
        { fps: 1 },
      ),
      clip(
        Array.from({ length: 2048 }, () => item),
        { clip: 9, fps: 1 },
      ),
    ])
  expect(result.counts).toEqual({ clips: 2, tracks: 4096, keys: 8192 })
  expect(result.clips.map((entry) => entry.clip)).toEqual([7, 9])
  poison(item, 'track')
  expect(
    failure(() =>
      plan([
        clip(Array.from({ length: 2048 }, () => item)),
        clip(Array.from({ length: 2049 }, () => item)),
      ]),
    ),
  ).toEqual({ reason: 'budget', path: 'animations[7].tracks' })
})

test('bbmodel exact sample budget is checked across all tracks before materializing the first schedule', () => {
  const first = track([0, 511], 'first'),
    rest = track([0, 511], 'rest'),
    items = [first, ...Array.from({ length: 127 }, () => rest)],
    source = clip(items, { duration: 511, fps: 1 }),
    result = plan([source])
  expect(result.counts).toEqual({ clips: 1, tracks: 128, keys: 65536 })
  expect(at(at(result.clips).tracks).times.length).toBe(512)
  let reads = 0
  Object.defineProperty(at(first.track.keys), 'time', {
    get() {
      reads++
      return 0
    },
  })
  items[127] = track([0, 0.5, 511], 'extra')
  expect(failure(() => plan([source]))).toEqual({ reason: 'budget', path: 'extra' })
  // Counting reads it once; eager materialization of the first track would read it again.
  expect(reads).toBe(1)
})

test('bbmodel schedules never read values or handles and do not turn an empty track into motion', () => {
  const item = track([-2, 0.3, 2])
  for (const key of item.track.keys) {
    poison(key, 'points')
    poison(key, 'bezier')
  }
  expect(at(at(plan([clip([item])]).clips).tracks).times).toEqual([0, 0.3, 0.5, 1])
  expect(failure(() => plan([clip([track([])])]))).toEqual({ reason: 'invalid', path: 'track' })
  expect(plan([])).toEqual({ clips: [], counts: { clips: 0, tracks: 0, keys: 0 } })
  expect(
    at(at(plan([clip([track([0])], { duration: Number.MIN_VALUE, fps: 120 })]).clips).tracks).times,
  ).toEqual([0, Number.MIN_VALUE])
})

import { expect, test } from 'bun:test'
import { readBbmodelAnimationStructure as read } from './bbmodelAnimationStructure'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import {
  BbmodelInputError,
  bbmodelList,
  bbmodelRecord,
  BBMODEL_INPUT_LIMITS as limits,
} from './bbmodelInput'

function at<T>(items: readonly T[], index = 0): T {
  const item = items[index]
  if (item === undefined) throw new Error(`Expected fixture item ${index}`)
  return item
}

function fixture(animations?: unknown, version: BbmodelVersion = '5.0') {
  return readBbmodelEnvelope(
    new TextEncoder().encode(
      JSON.stringify({ meta: { format_version: version, model_format: 'free' }, animations }),
    ),
  )
}
/** Bypass JSON serialization only for non-JSON numbers, access-order probes and exact source budgets. */
function withRaw(animations: unknown) {
  const envelope = fixture()
  envelope.json.animations = animations
  return envelope
}
function failure(run: () => unknown, reason: BbmodelInputError['reason'], path: string) {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(BbmodelInputError)
  if (!(error instanceof BbmodelInputError)) throw new Error('Expected source diagnostic')
  expect(error.reason).toBe(reason)
  expect(error.path).toBe(path)
}
function poison(target: object, key: string) {
  Object.defineProperty(target, key, {
    get() {
      throw new Error(`Unexpected value read: ${key}`)
    },
  })
}
const animatorPath = 'animations[0].animators["bone"]'

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s retains source animation metadata, literal identities and inert expressions without native coercion', (version) => {
  const clip = {
      uuid: '__proto__',
      name: '  Andar 🐢  ',
      loop: 'future-loop',
      override: true,
      selected: true,
      length: 1234.125,
      snapping: 333.25,
      scope: -2.5,
      saved: false,
      path: '../../movimentos%2f.json',
      group_name: 'constructor',
      anim_time_update: 'query.anim_time + 1',
      blend_weight: '0.75',
      start_delay: 0.125,
      loop_delay: 'javascript:never()',
      markers: [
        { time: 1.0002, color: -3, name: 'Olha!' },
        { time: 1.0003, color: 2.5, name: 0 },
        {},
      ],
      animators: Object.fromEntries([
        ['constructor', { name: '', type: 'bone', keyframes: [{ data_points: [{ x: '1' }] }] }],
        ['a"[🐢]', { name: 'Cabeça', type: 'future-kind', keyframes: [{}] }],
        ['effects', { keyframes: [{ data_points: [] }] }],
      ]),
      plugin: { code: 'never()' },
    },
    input = fixture([clip], version),
    before = structuredClone(input),
    result = read(input),
    actual = at(result.clips)
  expect(result.version).toBe(version)
  expect(actual).toMatchObject({
    index: 0,
    path: 'animations[0]',
    uuid: clip.uuid,
    name: clip.name,
    loop: 'future-loop',
    override: true,
    selected: true,
    length: 1234.125,
    snapping: 333.25,
    scope: -2.5,
    saved: false,
    filePath: clip.path,
    groupName: clip.group_name,
    timing: {
      timeUpdate: clip.anim_time_update,
      blendWeight: '0.75',
      startDelay: 0.125,
      loopDelay: clip.loop_delay,
    },
  })
  expect(actual.markers.map(({ time, color, name }) => ({ time, color, name }))).toEqual([
    { time: 1.0002, color: -3, name: 'Olha!' },
    { time: 1.0003, color: 2.5, name: 0 },
    { time: 0, color: 0, name: 0 },
  ])
  expect(actual.animators.map(({ key, name, type }) => ({ key, name, type }))).toEqual([
    { key: 'constructor', name: '', type: 'bone' },
    { key: 'a"[🐢]', name: 'Cabeça', type: 'future-kind' },
    { key: 'effects', name: null, type: null },
  ])
  expect(at(actual.animators, 1).path).toBe(`animations[0].animators[${JSON.stringify('a"[🐢]')}]`)
  expect(result.byUuid.get('__proto__')).toBe(0)
  expect(result.byUuid.get('constructor')).toBeUndefined()
  const strings = [
    clip.uuid,
    clip.name,
    clip.loop,
    clip.path,
    clip.group_name,
    clip.anim_time_update,
    clip.blend_weight,
    clip.loop_delay,
    'Olha!',
    'constructor',
    '',
    'bone',
    'a"[🐢]',
    'Cabeça',
    'future-kind',
    'effects',
  ]
  expect(result.counts).toEqual({
    clips: 1,
    animators: 3,
    keys: 3,
    dataPoints: 3,
    markers: 3,
    metadataChars: strings.reduce((sum, value) => sum + value.length, 0),
  })
  // Only raw records are shared by contract. All writable result containers are independent.
  expect(actual.source).not.toBe(clip)
  const animator = at(actual.animators),
    rawKeys = animator.source.keyframes
  expect(rawKeys).not.toBe(animator.keyframes)
  if (!Array.isArray(rawKeys)) throw new Error('Expected source key list')
  expect(at(animator.keyframes)).toBe(at(rawKeys))
  animator.keyframes.push({})
  actual.animators.pop()
  at(actual.markers).name = 'Mudou'
  actual.markers.pop()
  actual.timing.startDelay = 99
  actual.name = 'Outra'
  result.clips.pop()
  expect(input).toEqual(before)
  expect(read(input).counts).toEqual(result.counts)
})

test('animation structure defaults do not infer FPS, targets, duration, legacy aliases or effects capabilities', () => {
  const result = read(fixture([{ uuid: 'a', animators: { bone: {}, effects: {} } }]))
  expect(result.clips[0]).toMatchObject({
    name: null,
    loop: 'once',
    length: 0,
    snapping: null,
    scope: null,
    saved: null,
    filePath: null,
    groupName: null,
    override: false,
    selected: false,
    timing: { timeUpdate: '', blendWeight: '', startDelay: '', loopDelay: '' },
    markers: [],
  })
  expect(at(result.clips).animators.map(({ type, keyframes }) => ({ type, keyframes }))).toEqual([
    { type: null, keyframes: [] },
    { type: null, keyframes: [] },
  ])
  expect(result.counts.metadataChars).toBe('aboneeffects'.length)
  for (const animations of [undefined, []]) {
    const empty = read(fixture(animations))
    expect(empty.clips).toEqual([])
    expect(empty.byUuid.size).toBe(0)
    expect(empty.counts).toEqual({
      clips: 0,
      animators: 0,
      keys: 0,
      dataPoints: 0,
      markers: 0,
      metadataChars: 0,
    })
  }
  const input = fixture([{ uuid: 'a', animators: { bone: { keyframes: [{}] } }, markers: [{}] }]),
    clip = bbmodelRecord(
      at(bbmodelList(input.json.animations, 'animations', limits.animations)),
      'clip',
    ),
    animators = bbmodelRecord(clip.animators, 'animators'),
    bone = bbmodelRecord(animators.bone, 'bone'),
    key = bbmodelRecord(at(bbmodelList(bone.keyframes, 'keys', limits.animationKeys)), 'key')
  for (const field of ['bones', 'plugin', 'animation_controllers', 'elements'])
    poison(input.json, field)
  for (const field of ['bones', 'plugin']) poison(clip, field)
  for (const field of ['rotation_global', 'quaternion_interpolation', 'muted']) poison(bone, field)
  for (const field of [
    'time',
    'x',
    'y',
    'z',
    'interpolation',
    'bezier_left_value',
    'channel',
    'uuid',
  ])
    poison(key, field)
  expect(read(input).counts.keys).toBe(1)
  const point = {}
  poison(point, 'x')
  key.data_points = [point, null, 12]
  expect(read(input).counts.dataPoints).toBe(3) // Point schemas belong to the next reader.
})

test('finite source animation metadata keeps signed zero, tiny values and values outside native ranges', () => {
  for (const value of [-0, Number.MIN_VALUE, -Number.MIN_VALUE, -7.125, 1e308, -1e308]) {
    const result = at(
      read(
        withRaw([
          {
            uuid: 'a',
            length: value,
            snapping: value,
            scope: value,
            anim_time_update: value,
            blend_weight: value,
            start_delay: value,
            loop_delay: value,
            markers: [{ time: value, color: value, name: -0 }],
          },
        ]),
      ).clips,
    )
    for (const actual of [
      result.length,
      result.snapping,
      result.scope,
      ...Object.values(result.timing),
      at(result.markers).time,
      at(result.markers).color,
    ])
      expect(Object.is(actual, value)).toBe(true)
    expect(Object.is(at(result.markers).name, -0)).toBe(true)
  }
})

test('animation metadata rejects malformed declared fields, duplicate or missing clip identities and non-free projects', () => {
  const input = fixture()
  input.modelFormat = 'bedrock'
  poison(input.json, 'animations')
  failure(() => read(input), 'unsupported', 'meta.model_format')
  for (const value of [null, 1, 'once', {}])
    failure(() => read(withRaw(value)), 'invalid', 'animations')
  for (const value of [null, 1, [], 'clip'])
    failure(() => read(withRaw([value])), 'invalid', 'animations[0]')
  for (const uuid of [undefined, null, '', 1])
    failure(() => read(withRaw([{ uuid }])), 'invalid', 'animations[0].uuid')
  failure(() => read(fixture([{ uuid: 'a' }, { uuid: 'a' }])), 'invalid', 'animations[1].uuid')
  for (const field of ['name', 'path', 'group_name'])
    for (const value of [null, false, 0, [], {}])
      failure(
        () => read(withRaw([{ uuid: 'a', [field]: value }])),
        'invalid',
        `animations[0].${field}`,
      )
  for (const field of ['loop'])
    for (const value of [null, '', false, 1])
      failure(
        () => read(withRaw([{ uuid: 'a', [field]: value }])),
        'invalid',
        `animations[0].${field}`,
      )
  for (const field of ['override', 'selected', 'saved'])
    for (const value of [null, 0, 'false'])
      failure(
        () => read(withRaw([{ uuid: 'a', [field]: value }])),
        'invalid',
        `animations[0].${field}`,
      )
  for (const field of ['length', 'snapping', 'scope'])
    for (const value of [null, false, '1', NaN, Infinity, -Infinity])
      failure(
        () => read(withRaw([{ uuid: 'a', [field]: value }])),
        'invalid',
        `animations[0].${field}`,
      )
  for (const field of ['anim_time_update', 'blend_weight', 'start_delay', 'loop_delay'])
    for (const value of [null, false, [], {}, NaN, Infinity])
      failure(
        () => read(withRaw([{ uuid: 'a', [field]: value }])),
        'invalid',
        `animations[0].${field}`,
      )
})

test('animator containers and markers are strict without validating borrowed key values', () => {
  for (const value of [null, [], 1, 'bone'])
    failure(
      () => read(withRaw([{ uuid: 'a', animators: value }])),
      'invalid',
      'animations[0].animators',
    )
  for (const value of [null, [], 1, 'bone'])
    failure(
      () => read(withRaw([{ uuid: 'a', animators: { bone: value } }])),
      'invalid',
      animatorPath,
    )
  for (const field of ['name', 'type'])
    for (const value of [null, false, 0, [], {}])
      failure(
        () => read(withRaw([{ uuid: 'a', animators: { bone: { [field]: value } } }])),
        'invalid',
        `${animatorPath}.${field}`,
      )
  failure(
    () => read(fixture([{ uuid: 'a', animators: { bone: { type: '' } } }])),
    'invalid',
    `${animatorPath}.type`,
  )
  for (const value of [null, 1, {}]) {
    failure(
      () => read(withRaw([{ uuid: 'a', markers: value }])),
      'invalid',
      'animations[0].markers',
    )
    failure(
      () => read(withRaw([{ uuid: 'a', animators: { bone: { keyframes: value } } }])),
      'invalid',
      `${animatorPath}.keyframes`,
    )
    failure(
      () =>
        read(
          withRaw([{ uuid: 'a', animators: { bone: { keyframes: [{ data_points: value }] } } }]),
        ),
      'invalid',
      `${animatorPath}.keyframes[0].data_points`,
    )
  }
  for (const value of [null, [], 1, 'key'])
    failure(
      () => read(withRaw([{ uuid: 'a', animators: { bone: { keyframes: [value] } } }])),
      'invalid',
      `${animatorPath}.keyframes[0]`,
    )
  for (const value of [null, [], 1])
    failure(
      () => read(withRaw([{ uuid: 'a', markers: [value] }])),
      'invalid',
      'animations[0].markers[0]',
    )
  for (const field of ['time', 'color'])
    for (const value of [null, '0', NaN, Infinity])
      failure(
        () => read(withRaw([{ uuid: 'a', markers: [{ [field]: value }] }])),
        'invalid',
        `animations[0].markers[0].${field}`,
      )
  for (const value of [null, 1, false, {}, []])
    failure(
      () => read(withRaw([{ uuid: 'a', markers: [{ name: value }] }])),
      'invalid',
      'animations[0].markers[0].name',
    )
})

test('all animation container counts precede metadata and point fields, including counts across clips and aliases', () => {
  const first: Record<string, unknown> = { uuid: 'a' },
    key = {}
  poison(first, 'length')
  poison(key, 'data_points')
  failure(() => read(withRaw(new Array(limits.animations + 1).fill(first))), 'budget', 'animations')
  const animators = Object.fromEntries(
    Array.from({ length: limits.animationAnimators }, (_, i) => [`b${i}`, {}]),
  )
  first.animators = { bone: {} }
  failure(
    () => read(withRaw([first, { uuid: 'b', animators }])),
    'budget',
    'animations[1].animators',
  )
  first.markers = [{}]
  failure(
    () =>
      read(withRaw([first, { uuid: 'b', markers: new Array(limits.animationMarkers).fill({}) }])),
    'budget',
    'animations[1].markers',
  )
  const earlier = { uuid: 'a', animators: { bone: { keyframes: [key] } } }
  poison(earlier, 'length')
  failure(
    () =>
      read(
        withRaw([
          earlier,
          {
            uuid: 'b',
            animators: { late: { keyframes: new Array(limits.animationKeys).fill({}) } },
          },
        ]),
      ),
    'budget',
    'animations[1].animators["late"].keyframes',
  )
  const marker = {}
  poison(marker, 'time')
  const overflow = {
    uuid: 'a',
    markers: [marker],
    animators: {
      bone: { keyframes: [{ data_points: new Array(limits.animationPointsPerKey + 1).fill({}) }] },
    },
  }
  failure(() => read(withRaw([overflow])), 'budget', `${animatorPath}.keyframes[0].data_points`)
  const batch = { data_points: new Array(limits.animationPointsPerKey).fill({}) },
    keys = [...new Array(524).fill(batch), { data_points: new Array(289).fill({}) }]
  failure(
    () => read(withRaw([{ ...overflow, animators: { bone: { keyframes: keys } } }])),
    'budget',
    'animations.data_points',
  )
})

test('exact aggregate animation limits remain readable and implicit data slots count per occurrence', () => {
  const clips = Array.from({ length: limits.animations }, (_, i) => ({ uuid: `c${i}` }))
  expect(read(withRaw(clips)).counts.clips).toBe(limits.animations)
  const animators = Object.fromEntries(
    Array.from({ length: limits.animationAnimators }, (_, i) => [`b${i}`, {}]),
  )
  expect(read(withRaw([{ uuid: 'a', animators }])).counts.animators).toBe(limits.animationAnimators)
  expect(
    read(withRaw([{ uuid: 'a', markers: new Array(limits.animationMarkers).fill({}) }])).counts
      .markers,
  ).toBe(limits.animationMarkers)
  const sameKey = { data_points: [{}, {}] },
    keys = new Array(limits.animationKeys).fill(sameKey),
    result = read(withRaw([{ uuid: 'a', animators: { bone: { keyframes: keys } } }]))
  expect(result.counts.keys).toBe(limits.animationKeys)
  expect(result.counts.dataPoints).toBe(limits.animationDataPoints)
  expect(at(at(result.clips).animators).keyframes).not.toBe(keys)
  expect(at(at(at(result.clips).animators).keyframes)).toBe(sameKey)
  expect(
    read(
      fixture([
        {
          uuid: 'a',
          animators: { bone: { keyframes: [{}, { data_points: [] }, { data_points: [{}, {}] }] } },
        },
      ]),
    ).counts.dataPoints,
  ).toBe(4)
  expect(
    read(
      withRaw([
        {
          uuid: 'a',
          animators: {
            bone: {
              keyframes: [{ data_points: new Array(limits.animationPointsPerKey).fill({}) }],
            },
          },
        },
      ]),
    ).counts.dataPoints,
  ).toBe(limits.animationPointsPerKey)
})

test('source text caps count all header occurrences in UTF-16 and reject before copying key lists', () => {
  const exact = '🐢'.repeat(limits.identifierChars / 2),
    excessive = `${exact}x`
  for (const field of [
    'uuid',
    'name',
    'loop',
    'path',
    'group_name',
    'anim_time_update',
    'blend_weight',
    'start_delay',
    'loop_delay',
  ]) {
    expect(read(fixture([{ uuid: 'a', [field]: exact }])).clips.length).toBe(1)
    failure(
      () => read(fixture([{ uuid: 'a', [field]: excessive }])),
      'budget',
      `animations[0].${field}`,
    )
  }
  for (const field of ['name', 'type'])
    failure(
      () => read(fixture([{ uuid: 'a', animators: { bone: { [field]: excessive } } }])),
      'budget',
      `${animatorPath}.${field}`,
    )
  failure(
    () => read(fixture([{ uuid: 'a', markers: [{ name: excessive }] }])),
    'budget',
    'animations[0].markers[0].name',
  )
  failure(
    () => read(fixture([{ uuid: 'a', animators: { [excessive]: {} } }])),
    'budget',
    'animations[0].animators',
  )
  const clips: Record<string, unknown>[] = Array.from({ length: limits.animations }, (_, i) => {
    const uuid = `${i}`
    return { uuid, name: 'x'.repeat(limits.identifierChars - uuid.length) }
  })
  expect(read(withRaw(clips)).counts.metadataChars).toBe(limits.animationMetadataChars)
  // Reserve one character for an animator ID; array access proves no owned key list was built.
  at(clips).name = 'x'.repeat(limits.identifierChars - 2)
  const keyframes = [{}]
  let reads = 0
  Object.defineProperty(keyframes, '0', {
    get() {
      reads++
      return {}
    },
  })
  at(clips).animators = { b: { keyframes } }
  const last = at(clips, clips.length - 1)
  last.name = `${last.name}x`
  failure(() => read(withRaw(clips)), 'budget', `animations[${limits.animations - 1}].name`)
  expect(reads).toBe(1)
})

import { expect, test } from 'bun:test'
import { readBbmodelAnimationKeyframes as read } from './bbmodelAnimationKeyframes'
import { readBbmodelAnimationStructure } from './bbmodelAnimationStructure'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { BbmodelInputError, BBMODEL_INPUT_LIMITS as limits } from './bbmodelInput'

function at<T>(items: readonly T[], index = 0): T {
  const item = items[index]
  if (item === undefined) throw new Error(`Expected fixture item ${index}`)
  return item
}
/** Build canonical source fixtures; explicitly supplied channel (including undefined) is never repaired. */
function canonicalChannels(animators: Record<string, unknown>) {
  for (const animator of Object.values(animators)) {
    if (
      animator === null ||
      typeof animator !== 'object' ||
      !('keyframes' in animator) ||
      !Array.isArray(animator.keyframes)
    )
      continue
    for (const key of animator.keyframes)
      if (
        key !== null &&
        typeof key === 'object' &&
        !Array.isArray(key) &&
        !Object.hasOwn(key, 'channel')
      )
        Object.defineProperty(key, 'channel', {
          value: 'rotation',
          enumerable: true,
          configurable: true,
          writable: true,
        })
  }
}
function fixture(animators: Record<string, unknown>, version: BbmodelVersion = '5.0') {
  canonicalChannels(animators)
  const envelope = readBbmodelEnvelope(
    new TextEncoder().encode(
      JSON.stringify({
        meta: { format_version: version, model_format: 'free' },
        animations: [{ uuid: 'clip', animators }],
      }),
    ),
  )
  return readBbmodelAnimationStructure(envelope)
}
/** The envelope was validated first; direct source assignment isolates non-JSON values/access ordering. */
function rawFixture(animators: Record<string, unknown>) {
  canonicalChannels(animators)
  const envelope = readBbmodelEnvelope(
    new TextEncoder().encode('{"meta":{"format_version":"5.0","model_format":"free"}}'),
  )
  envelope.json.animations = [{ uuid: 'clip', animators }]
  return readBbmodelAnimationStructure(envelope)
}
function knownKeys(structure: ReturnType<typeof fixture>) {
  const animator = at(at(read(structure).clips).animators)
  if (animator.kind !== 'transform') throw new Error('Expected transform animator')
  return animator.keys
}
function transformKey(structure: ReturnType<typeof fixture>, index = 0) {
  const key = at(knownKeys(structure), index)
  if (key.kind !== 'transform') throw new Error('Expected transform key')
  return key
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
function poison(target: object, name: string) {
  Object.defineProperty(target, name, {
    get() {
      throw new Error(`Unexpected read: ${name}`)
    },
  })
}
const path = 'animations[0].animators["bone"].keyframes[0]'

test('missing key channel is rejected rather than inventing the constructor default that the source loader never reaches', () => {
  failure(
    () => read(fixture({ bone: { keyframes: [{ channel: undefined, x: '90' }] } })),
    'invalid',
    `${path}.channel`,
  )
})

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s preserves authored key order, all point values and curve descriptors without native interpretation', (version) => {
  const input = fixture(
      {
        bone: {
          type: 'bone',
          rotation_global: true,
          quaternion_interpolation: false,
          keyframes: [
            {
              uuid: '__proto__',
              channel: 'rotation',
              time: 4.125,
              color: 7.5,
              uniform: true,
              interpolation: 'bezier',
              bezier_linked: false,
              bezier_left_time: [-3, 0, 0.125],
              bezier_left_value: [1.25, -2.5, 4.75],
              bezier_right_time: [-1, 5, 1e308],
              bezier_right_value: [7.25, 9.125, -20],
              data_points: [
                { x: '360', y: 90.123456789, z: '-0' },
                { x: 'query.anim_time * 2', y: 1, z: 'return 3;' },
              ],
            },
            {
              uuid: '__proto__',
              channel: 'position',
              time: -2,
              interpolation: 'future-curve',
              data_points: [{ x: 1, y: 2, z: 3 }],
            },
            {
              channel: 'scale',
              time: -2,
              uniform: true,
              data_points: [{ x: '1.25', y: '2.5', z: '3.75' }],
            },
            {
              channel: 'rotation',
              interpolation: 'catmullrom',
              data_points: [{ x: 2 }, { x: 3 }, { x: 4 }],
            },
          ],
        },
      },
      version,
    ),
    before = structuredClone(input),
    output = read(input),
    animator = at(at(output.clips).animators)
  if (animator.kind !== 'transform') throw new Error('Expected transform animator')
  expect([animator.sourceType, animator.rotationGlobal, animator.quaternionInterpolation]).toEqual([
    'bone',
    true,
    false,
  ])
  expect(animator.declaration).toBe(at(at(input.clips).animators))
  expect(animator.keys.map((key) => (key.kind === 'transform' ? key.time : null))).toEqual([
    4.125, -2, -2, 0,
  ])
  const first = at(animator.keys)
  if (first.kind !== 'transform' || first.bezier === null) throw new Error('Expected Bezier key')
  expect(first).toMatchObject({
    index: 0,
    path,
    uuid: '__proto__',
    channel: 'rotation',
    time: 4.125,
    color: 7.5,
    uniform: true,
    interpolation: 'bezier',
  })
  expect(first.bezier).toEqual({
    linked: false,
    leftTime: [-3, 0, 0.125],
    leftValue: [1.25, -2.5, 4.75],
    rightTime: [-1, 5, 1e308],
    rightValue: [7.25, 9.125, -20],
  })
  expect(first.points.map((point) => point.values)).toEqual([
    ['360', 90.123456789, '-0'],
    ['query.anim_time * 2', 1, 'return 3;'],
  ])
  expect(transformKey(input, 1).interpolation).toBe('future-curve')
  expect(at(transformKey(input, 2).points).values).toEqual(['1.25', '2.5', '3.75']) // Uniform never copies X to Y/Z.
  expect(transformKey(input, 3).points.map((point) => point.values)).toEqual([
    [2, '0', '0'],
    [3, '0', '0'],
    [4, '0', '0'],
  ])
  expect(output.counts).toMatchObject({
    transformAnimators: 1,
    unresolvedAnimators: 0,
    transformKeys: 4,
    unresolvedKeys: 0,
    points: 7,
  })
  expect(input).toEqual(before)
  expect(first.source).toBe(at(animator.declaration.keyframes))
  first.bezier.leftTime[0] = 999
  first.bezier.rightValue[1] = 222
  at(first.points).values[0] = 'changed'
  first.points.pop()
  animator.keys.pop()
  output.clips.pop()
  expect(input).toEqual(before)
})

test('key defaults remain source defaults, not generated IDs, parsed numbers or playback approval', () => {
  const input = fixture({
      bone: {
        keyframes: [{}, { channel: 'scale', data_points: [{}] }, { interpolation: 'bezier' }],
      },
    }),
    key = transformKey(input)
  expect(key).toMatchObject({
    uuid: null,
    channel: 'rotation',
    time: 0,
    color: -1,
    uniform: null,
    interpolation: 'linear',
    bezier: null,
  })
  expect(at(key.points)).toMatchObject({
    path,
    layout: 'direct',
    values: ['0', '0', '0'],
    aliasSource: null,
  })
  expect(at(transformKey(input, 1).points).values).toEqual(['1', '1', '1'])
  expect(transformKey(input, 2).bezier).toEqual({
    linked: true,
    leftTime: [-0.1, -0.1, -0.1],
    leftValue: [0, 0, 0],
    rightTime: [0.1, 0.1, 0.1],
    rightValue: [0, 0, 0],
  })
  const animator = at(at(read(input).clips).animators)
  expect(animator).toMatchObject({ rotationGlobal: false, quaternionInterpolation: null })
  expect(read(input).counts.textChars).toBe('rotationscalerotationbezier'.length)
  expect(read(fixture({}))).toEqual({
    clips: [{ clip: 0, animators: [] }],
    counts: {
      transformAnimators: 0,
      unresolvedAnimators: 0,
      transformKeys: 0,
      unresolvedKeys: 0,
      points: 0,
      textChars: 0,
    },
  })
})

test('point.values legacy overlay is explicit, own and precedence-correct; direct keys do not use that alias', () => {
  const alias = { x: '12.5', z: 'query.life_time' },
    point: Record<string, unknown> = { x: 'overridden', y: 2.5, values: alias },
    direct: Record<string, unknown> = { x: 7, y: '8', z: 9, data_points: [] }
  poison(point, 'x')
  poison(alias, 'plugin')
  poison(direct, 'values')
  const input = rawFixture({ bone: { keyframes: [{ data_points: [point] }, direct] } }),
    result = transformKey(input),
    actual = at(result.points)
  expect(actual.layout).toBe('point-values')
  expect(actual.values).toEqual(['12.5', 2.5, 'query.life_time'])
  expect(actual.aliasSource).toBe(alias)
  expect(actual.source).toBe(point)
  expect(actual.path).toBe(`${path}.data_points[0]`)
  expect(at(transformKey(input, 1).points).values).toEqual([7, '8', 9])
  expect(at(transformKey(input, 1).points).layout).toBe('direct')
  actual.values[0] = 'changed'
  expect(alias.x).toBe('12.5')
  for (const value of [null, [], 12, '123'])
    failure(
      () => read(rawFixture({ bone: { keyframes: [{ data_points: [{ values: value }] }] } })),
      'invalid',
      `${path}.data_points[0].values`,
    )
  const literal = transformKey(
    fixture({
      bone: {
        keyframes: [{ data_points: [JSON.parse('{"values":{"__proto__":{"x":7}},"y":"2"}')] }],
      },
    }),
  )
  expect(at(literal.points).values).toEqual(['0', '2', '0'])
})

test('unknown animators/effects and unknown channels stay unresolved without reading their values or flags', () => {
  const opaque = { type: 'plugin', keyframes: [{}] },
    effects = { type: 'bone', keyframes: [{}] },
    unknownKey = { channel: 'particle' },
    nullRotation = { channel: 'rotation' }
  for (const animator of [opaque, effects]) {
    poison(animator, 'rotation_global')
    poison(animator, 'quaternion_interpolation')
    for (const field of ['channel', 'time', 'uuid', 'interpolation', 'x'])
      poison(at(animator.keyframes), field)
  }
  for (const key of [unknownKey, nullRotation])
    for (const field of ['time', 'uuid', 'uniform', 'interpolation', 'x', 'bezier_left_time'])
      poison(key, field)
  const input = rawFixture({
      unknown: opaque,
      effects,
      bone: { keyframes: [unknownKey] },
      null: { type: 'null_object', keyframes: [nullRotation, { channel: 'position', x: 5 }] },
      armature: { type: 'armature_bone', keyframes: [{ channel: 'scale', x: 2 }] },
    }),
    output = read(input),
    rows = at(output.clips).animators
  expect(rows.map((row) => row.kind)).toEqual([
    'unresolved',
    'unresolved',
    'transform',
    'transform',
    'transform',
  ])
  expect(at(rows).declaration.source).toBe(opaque)
  const bone = at(rows, 2),
    locator = at(rows, 3),
    armature = at(rows, 4)
  if (bone.kind !== 'transform' || locator.kind !== 'transform' || armature.kind !== 'transform')
    throw new Error('Expected known source schemas')
  expect(at(bone.keys).kind).toBe('unresolved')
  expect(locator.keys.map((key) => key.kind)).toEqual(['unresolved', 'transform'])
  expect(armature.sourceType).toBe('armature_bone')
  expect(output.counts).toEqual({
    transformAnimators: 3,
    unresolvedAnimators: 2,
    transformKeys: 2,
    unresolvedKeys: 4,
    points: 2,
    textChars: 'particlerotationpositionscale'.length,
  })
})

test('all finite key values, times, colors and handles preserve signed zero and source F64', () => {
  for (const value of [-0, Number.MIN_VALUE, -Number.MIN_VALUE, 1e308, -1e308]) {
    const key = transformKey(
      rawFixture({
        bone: {
          keyframes: [
            {
              time: value,
              color: value,
              x: value,
              y: value,
              z: value,
              interpolation: 'bezier',
              bezier_left_time: [value, value, value],
              bezier_left_value: [value, value, value],
              bezier_right_time: [value, value, value],
              bezier_right_value: [value, value, value],
            },
          ],
        },
      }),
    )
    if (key.bezier === null) throw new Error('Expected handles')
    for (const actual of [
      key.time,
      key.color,
      ...at(key.points).values,
      ...key.bezier.leftTime,
      ...key.bezier.leftValue,
      ...key.bezier.rightTime,
      ...key.bezier.rightValue,
    ])
      expect(Object.is(actual, value)).toBe(true)
  }
  for (const value of [
    ' -0 ',
    '0x10',
    'Infinity',
    'NaN',
    '',
    'return 2;',
    '1e999',
    'javascript:never()',
    'query.anim_time',
  ])
    expect(
      at(transformKey(fixture({ bone: { keyframes: [{ x: value }] } })).points).values[0],
    ).toBe(value)
})

test('known key declarations and all present handles are strict even when a curve is not Bezier', () => {
  for (const field of ['channel', 'uuid', 'interpolation'])
    for (const value of [null, '', 0, false, [], {}])
      failure(
        () => read(rawFixture({ bone: { keyframes: [{ [field]: value }] } })),
        'invalid',
        `${path}.${field}`,
      )
  for (const field of ['time', 'color'])
    for (const value of [null, '0', false, NaN, Infinity])
      failure(
        () => read(rawFixture({ bone: { keyframes: [{ [field]: value }] } })),
        'invalid',
        `${path}.${field}`,
      )
  for (const field of ['uniform', 'bezier_linked'])
    for (const value of [null, 'false', 0])
      failure(
        () => read(rawFixture({ bone: { keyframes: [{ [field]: value }] } })),
        'invalid',
        `${path}.${field}`,
      )
  for (const field of [
    'bezier_left_time',
    'bezier_left_value',
    'bezier_right_time',
    'bezier_right_value',
  ]) {
    for (const value of [null, {}, [1, 2], [1, 2, 3, 4]])
      failure(
        () => read(rawFixture({ bone: { keyframes: [{ [field]: value }] } })),
        'invalid',
        `${path}.${field}`,
      )
    for (const value of [NaN, Infinity, '0'])
      failure(
        () => read(rawFixture({ bone: { keyframes: [{ [field]: [0, value, 0] }] } })),
        'invalid',
        `${path}.${field}[1]`,
      )
  }
  for (const field of ['rotation_global', 'quaternion_interpolation'])
    for (const value of [null, 'false', 0])
      failure(
        () => read(rawFixture({ bone: { [field]: value } })),
        'invalid',
        `animations[0].animators["bone"].${field}`,
      )
  expect(
    transformKey(fixture({ bone: { keyframes: [{ bezier_left_value: [1, 2, 3] }] } })).bezier
      ?.leftValue,
  ).toEqual([1, 2, 3])
})

test('known points reject invalid scalar types at their real direct, point or alias path', () => {
  for (const value of [null, false, [], {}, NaN, Infinity]) {
    failure(() => read(rawFixture({ bone: { keyframes: [{ x: value }] } })), 'invalid', `${path}.x`)
    failure(
      () => read(rawFixture({ bone: { keyframes: [{ data_points: [{ y: value }] }] } })),
      'invalid',
      `${path}.data_points[0].y`,
    )
    failure(
      () =>
        read(rawFixture({ bone: { keyframes: [{ data_points: [{ values: { z: value } }] }] } })),
      'invalid',
      `${path}.data_points[0].values.z`,
    )
  }
  for (const value of [null, [], 1, 'point'])
    failure(
      () => read(rawFixture({ bone: { keyframes: [{ data_points: [value] }] } })),
      'invalid',
      `${path}.data_points[0]`,
    )
})

test('known key text has per-field and aggregate bounds separate from header text', () => {
  const exact = '🐢'.repeat(limits.identifierChars / 2),
    overflow = `${exact}x`
  for (const field of ['channel', 'uuid', 'interpolation', 'x', 'y', 'z']) {
    expect(read(fixture({ bone: { keyframes: [{ [field]: exact }] } })).counts.textChars).toBe(
      exact.length + (field === 'channel' ? 0 : 'rotation'.length),
    )
    failure(
      () => read(fixture({ bone: { keyframes: [{ [field]: overflow }] } })),
      'budget',
      `${path}.${field}`,
    )
  }
  const keys = Array.from(
      { length: limits.animationKeyTextChars / limits.identifierChars },
      () => ({ data_points: [{ x: exact.slice('rotation'.length) }] }),
    ),
    input = fixture({ bone: { keyframes: keys } })
  expect(read(input).counts.textChars).toBe(limits.animationKeyTextChars)
  const last = at(keys, keys.length - 1)
  Object.assign(at(last.data_points), { y: 'x' })
  failure(
    () => read(fixture({ bone: { keyframes: keys } })),
    'budget',
    `animations[0].animators["bone"].keyframes[${keys.length - 1}].data_points[0].y`,
  )
  // Overridden strings are not effective values; provenance/raw records remain available for review.
  const alias = read(
    fixture({
      bone: { keyframes: [{ x: 'not read', data_points: [{ x: overflow, values: { x: '1' } }] }] },
    }),
  )
  expect(alias.counts.textChars).toBe('rotation1'.length)
})

test('source-wide structural caps still reject before any values and extended point lists are not truncated', () => {
  const key = { data_points: new Array(limits.animationPointsPerKey + 1).fill({}) }
  poison(key, 'time')
  failure(() => read(rawFixture({ bone: { keyframes: [key] } })), 'budget', `${path}.data_points`)
  const input = fixture({
      bone: {
        keyframes: [
          {
            data_points: Array.from({ length: limits.animationPointsPerKey }, (_, i) => ({
              x: i,
              y: -i,
              z: '0',
            })),
          },
        ],
      },
    }),
    output = read(input),
    actual = transformKey(input)
  expect(output.counts.points).toBe(limits.animationPointsPerKey)
  expect(actual.points.length).toBe(limits.animationPointsPerKey)
  expect(at(actual.points, limits.animationPointsPerKey - 1).values).toEqual([999, -999, '0'])
  expect(at(actual.points).values).not.toBe(at(actual.points, 1).values)
})

test('key text and counts aggregate across clips without merging repeated animator or key identities', () => {
  const text = 'x'.repeat(limits.identifierChars - 'rotation'.length),
    keys = Array.from(
      { length: limits.animationKeyTextChars / limits.identifierChars / 2 },
      () => ({ channel: 'rotation', x: text }),
    ),
    animations = [
      { uuid: 'a', animators: { same: { keyframes: keys } } },
      { uuid: 'b', animators: { same: { keyframes: keys } } },
    ],
    parse = () =>
      readBbmodelAnimationStructure(
        readBbmodelEnvelope(
          new TextEncoder().encode(
            JSON.stringify({
              meta: { format_version: '5.0', model_format: 'free' },
              animations,
            }),
          ),
        ),
      ),
    result = read(parse())
  expect(result.clips.map((clip) => clip.clip)).toEqual([0, 1])
  expect(result.counts).toEqual({
    transformAnimators: 2,
    unresolvedAnimators: 0,
    transformKeys: 1024,
    unresolvedKeys: 0,
    points: 1024,
    textChars: limits.animationKeyTextChars,
  })
  const first = at(at(result.clips).animators),
    second = at(at(result.clips, 1).animators)
  if (first.kind !== 'transform' || second.kind !== 'transform')
    throw new Error('Expected two distinct animators')
  expect(first.keys).not.toBe(second.keys)
  expect(at(second.keys).path).toBe('animations[1].animators["same"].keyframes[0]')
  at(animations, 1).animators.same.keyframes = keys.map((key, index) =>
    index === keys.length - 1 ? { ...key, x: `${key.x}x` } : key,
  )
  failure(
    () => read(parse()),
    'budget',
    `animations[1].animators["same"].keyframes[${keys.length - 1}].x`,
  )
})

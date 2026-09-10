import { expect, test } from 'bun:test'
import { classifyBbmodelAnimationConstant as classify } from './bbmodelAnimationConstant'
import { readBbmodelAnimationConstantKey as read } from './bbmodelAnimationConstantKey'
import { readBbmodelAnimationKeyframes } from './bbmodelAnimationKeyframes'
import { readBbmodelAnimationStructure } from './bbmodelAnimationStructure'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'

function at<T>(items: readonly T[], index = 0): T {
  const item = items[index]
  if (item === undefined) throw new Error(`Expected fixture item ${index}`)
  return item
}
function fixture(key: Record<string, unknown>, version: BbmodelVersion = '5.0') {
  const envelope = readBbmodelEnvelope(
      new TextEncoder().encode(
        JSON.stringify({
          meta: { format_version: version, model_format: 'free' },
          animations: [
            {
              uuid: 'clip',
              animators: { bone: { type: 'bone', keyframes: [{ channel: 'rotation', ...key }] } },
            },
          ],
        }),
      ),
    ),
    source = readBbmodelAnimationStructure(envelope),
    keys = readBbmodelAnimationKeyframes(source),
    animator = at(at(keys.clips).animators)
  if (animator.kind !== 'transform') throw new Error('Expected transform animator')
  const value = at(animator.keys)
  if (value.kind !== 'transform') throw new Error('Expected transform key')
  return { envelope, source, keys, key: value }
}
const keyPath = 'animations[0].animators["bone"].keyframes[0]'
const tiny = `0.${'0'.repeat(324)}1`
const huge = '9'.repeat(309)

test('constant classifier recognizes only source-compatible decimal literals and finite source numbers', () => {
  const cases: [number | string, number][] = [
    [0, 0],
    [-0, -0],
    [Number.MIN_VALUE, Number.MIN_VALUE],
    [-Number.MIN_VALUE, -Number.MIN_VALUE],
    [Number.MAX_VALUE, Number.MAX_VALUE],
    [-Number.MAX_VALUE, -Number.MAX_VALUE],
    ['0', 0],
    ['-0', -0],
    ['-000.000', -0],
    ['00012', 12],
    ['-12.375', -12.375],
    [' 12.50 ', 12.5],
    ['\t-1.25\r\n', -1.25],
    ['\uFEFF3.0\u00A0', 3],
    ['1.25f', 1.25],
    ['-2.50F', -2.5],
    ['-0.0f', -0],
    [`0.${'0'.repeat(323)}5`, Number.MIN_VALUE],
    ['9007199254740993', 9007199254740992],
  ]
  for (const [input, expected] of cases) {
    const result = classify(input)
    expect(result.kind).toBe('constant')
    if (result.kind !== 'constant') throw new Error('Expected numeric literal')
    expect(Object.is(result.value, expected)).toBe(true)
  }
})

test('text outside the literal subset is never evaluated, partially parsed or replaced by zero', () => {
  for (const input of [
    '',
    ' ',
    'true',
    'false',
    'null',
    'undefined',
    'NaN',
    'Infinity',
    '-Infinity',
    '+1',
    '.5',
    '-.5',
    '1.',
    '1f',
    '1F',
    '1.0ff',
    '1e2',
    '1E-2',
    '1e999',
    '0x10',
    '0b11',
    '1 2',
    '1\n2',
    '- 1',
    '1. 5',
    '1\u00A02',
    '(1)',
    '1;',
    'return 1;',
    '1+2',
    '1/0',
    'query.anim_time',
    'math.pi',
    'variable.x=1;return variable.x;',
    'loop(1000000,{})',
    'javascript:never()',
    '<script>never()</script>',
    '001.0foo',
    '١٢',
    '１２',
    '--1',
    '-',
    '.',
  ])
    expect(classify(input)).toEqual({ kind: 'expression' })
})

test('literal overflow and underflow stay distinct from expressions and from intentional zero', () => {
  for (const value of [huge, `-${huge}`, `${huge}.0f`])
    expect(classify(value)).toEqual({ kind: 'out-of-range', reason: 'overflow' })
  for (const value of [tiny, `-${tiny}`, `${tiny}F`])
    expect(classify(value)).toEqual({ kind: 'out-of-range', reason: 'underflow' })
  for (const value of ['0'.repeat(4096), `-0.${'0'.repeat(4092)}f`]) {
    const result = classify(value)
    expect(result.kind).toBe('constant')
    if (result.kind !== 'constant') throw new Error('Expected intentional zero')
    expect(result.value === 0).toBe(true)
  }
})

test('decimal conversion agrees with independent integer-ratio arithmetic without a Molang runtime', () => {
  for (let numerator = -32768; numerator <= 32768; numerator += 17) {
    const sign = numerator < 0 ? '-' : '',
      magnitude = Math.abs(numerator),
      literal = `${sign}${Math.floor(magnitude / 100)}.${`${magnitude % 100}`.padStart(2, '0')}`,
      expected = numerator / 100
    expect(classify(literal)).toEqual({ kind: 'constant', value: expected })
    expect(classify(`${literal}f`)).toEqual({ kind: 'constant', value: expected })
  }
})

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s constant preparation owns XYZ and preserves points without migrating axes or angles', (version) => {
  const input = fixture(
      {
        channel: 'rotation',
        time: 4.25,
        interpolation: 'bezier',
        bezier_left_value: [10, 20, 30],
        data_points: [
          { x: '360', y: '-720.0f', z: '90.125' },
          { x: 1.5, y: -2.5, z: 3.5 },
          { x: '0', y: '-0', z: '-0.0' },
        ],
      },
      version,
    ),
    before = structuredClone(input),
    output = read(input.key)
  expect(output).toEqual({
    status: 'constant',
    points: [
      [360, -720, 90.125],
      [1.5, -2.5, 3.5],
      [0, -0, -0],
    ],
  })
  if (output.status !== 'constant') throw new Error('Expected constants')
  expect(Object.is(at(output.points, 2)[1], -0)).toBe(true)
  expect(at(output.points)).not.toBe(at(input.key.points).values)
  at(output.points)[0] = 20
  output.points.pop()
  expect(input).toEqual(before)
  expect(input.key.bezier?.leftValue).toEqual([10, 20, 30])
})

test('unresolved key values report every real direct/alias location and never expose partial coordinates', () => {
  const input = fixture({
      data_points: [
        { x: '1', y: 2, z: 3 },
        { x: 'overridden', y: huge, values: { x: 'query.anim_time', z: tiny } },
        { x: 4, y: 'return 5;', z: 6 },
      ],
    }),
    before = structuredClone(input),
    result = read(input.key)
  expect(result).toEqual({
    status: 'unresolved',
    issues: [
      { code: 'expression', point: 1, axis: 'x', path: `${keyPath}.data_points[1].values.x` },
      { code: 'literal-overflow', point: 1, axis: 'y', path: `${keyPath}.data_points[1].y` },
      {
        code: 'literal-underflow',
        point: 1,
        axis: 'z',
        path: `${keyPath}.data_points[1].values.z`,
      },
      { code: 'expression', point: 2, axis: 'y', path: `${keyPath}.data_points[2].y` },
    ],
  })
  expect(Object.hasOwn(result, 'points')).toBe(false)
  if (result.status !== 'unresolved') throw new Error('Expected explicit unresolved result')
  at(result.issues).path = 'edited'
  result.issues.pop()
  expect(input).toEqual(before)
  expect(read(fixture({ x: 'query.anim_time', y: 1, z: 2 }).key)).toEqual({
    status: 'unresolved',
    issues: [{ code: 'expression', point: 0, axis: 'x', path: `${keyPath}.x` }],
  })
})

test('constant preparation does not read raw scripts, handles, flags or arbitrary fields after validated descriptors', () => {
  const input = fixture({ channel: 'scale', data_points: [{ values: { x: '1.25' }, y: '2.5' }] }),
    point = at(input.key.points)
  for (const field of ['time', 'bezier', 'uniform', 'source', 'interpolation'])
    Object.defineProperty(input.key, field, {
      get() {
        throw new Error(`Unexpected key read: ${field}`)
      },
    })
  for (const field of ['x', 'values', 'script'])
    Object.defineProperty(point.source, field, {
      get() {
        throw new Error(`Unexpected point read: ${field}`)
      },
    })
  expect(read(input.key)).toEqual({ status: 'constant', points: [[1.25, 2.5, 1]] })
})

test('one key retains the full bounded set of points or all 3,000 unresolved axes, without truncation', () => {
  const points = Array.from({ length: 1000 }, (_, index) => ({ x: index, y: `${index}.5`, z: 0 })),
    constant = read(fixture({ data_points: points }).key)
  if (constant.status !== 'constant') throw new Error('Expected all source points')
  expect(constant.points.length).toBe(1000)
  expect(at(constant.points, 999)).toEqual([999, 999.5, 0])
  const unresolved = read(
    fixture({ data_points: points.map(() => ({ x: 'q.x', y: 'q.y', z: 'q.z' })) }).key,
  )
  if (unresolved.status !== 'unresolved') throw new Error('Expected all source diagnostics')
  expect(unresolved.issues.length).toBe(3000)
  expect(at(unresolved.issues, 2999)).toEqual({
    code: 'expression',
    point: 999,
    axis: 'z',
    path: `${keyPath}.data_points[999].z`,
  })
})

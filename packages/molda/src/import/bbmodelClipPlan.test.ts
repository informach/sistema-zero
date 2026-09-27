import { expect, test } from 'bun:test'
import { readSceneAnimations } from '../scene/readAnimation'
import { readBbmodelClipOptions } from './bbmodelClipOptions'
import { planBbmodelClips as plan } from './bbmodelClipPlan'
import type { BbmodelClipOptions } from './bbmodelClipPlanTypes'
import { convertBbmodelClips } from './bbmodelClips'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { readBbmodelGraph } from './bbmodelGraph'
import { BbmodelInputError } from './bbmodelInput'
import { readBbmodelNodeMetadata } from './bbmodelNodeMetadata'
import { planBbmodelSelection } from './bbmodelSelection'
import { readBbmodelTransforms } from './bbmodelTransforms'

const target = '00000001-0000-0000-0000-000000000000',
  other = '00000002-0000-0000-0000-000000000000'
const options = { adaptation: 'continuous-sampled', metadata: 'discard' } as const
function at<T>(items: readonly T[], index = 0): T {
  const item = items[index]
  if (item === undefined) throw new Error(`Expected fixture item ${index}`)
  return item
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
function clip(change: Record<string, unknown> = {}) {
  return {
    uuid: 'clip',
    name: 'Pular',
    length: 1,
    animators: {
      [target]: {
        type: 'bone',
        keyframes: [
          { channel: 'position', time: 0, data_points: [{ x: 0 }] },
          { channel: 'position', time: 1, data_points: [{ x: 8 }] },
        ],
      },
    },
    ...change,
  }
}
function fixture(
  animations: unknown[] = [clip()],
  version: BbmodelVersion = '5.0',
  model: Record<string, unknown> = {},
) {
  const group = { uuid: target, name: 'Corpo', origin: [2, 3, 4] },
    unused = { uuid: other, name: 'Outro' },
    envelope = readBbmodelEnvelope(
      new TextEncoder().encode(
        JSON.stringify({
          meta: { format_version: version, model_format: 'free' },
          animations,
          ...(version === '5.0'
            ? { groups: [group, unused], outliner: [{ uuid: target }] }
            : { outliner: [group] }),
          ...model,
        }),
      ),
    ),
    graph = readBbmodelGraph(envelope),
    metadata = readBbmodelNodeMetadata(envelope, graph),
    selection = planBbmodelSelection(envelope, graph, { unlisted: 'omit' }),
    transforms = readBbmodelTransforms(graph, selection),
    nodeIds = new Map(selection.nodes.map(({ node }) => [node, `bbmodel_node_${node}`]))
  return { envelope, graph, metadata, selection, transforms, nodeIds }
}

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s source planner feeds native clips with version migration and owned reports', (version) => {
  const input = fixture(
      [clip({ snapping: 300, loop: 'hold', blend_weight: '0.5', selected: true })],
      version,
    ),
    before = structuredClone(input),
    result = plan(input, { ...options, fps: 30 }),
    native = convertBbmodelClips(input, { ...options, fps: 30 })
  expect(readSceneAnimations(native.animations)).toEqual(native.animations)
  expect(at(result.reports)).toMatchObject({
    kind: 'prepared',
    clip: 0,
    duration: { mode: 'declared', source: 1, native: 1 },
    playback: { source: 'hold', nativeLoop: false, standalone: true },
    weight: { value: 0.5, defaulted: false, clamped: false },
    metadataFields: 2,
  })
  expect(at(result.drafts)).toMatchObject({
    fps: 30,
    duration: 1,
    loop: false,
    catmullLoopNeighbours: false,
    weight: 0.5,
  })
  expect(at(at(native.animations).tracks).keys[1]?.value).toEqual([
    2 + (version === '5.0' ? 4 : -4),
    3,
    4,
  ])
  expect(input).toEqual(before)
  at(at(result.drafts).tracks).track.keys[0]?.points[0].splice(0, 1, 999)
  expect(input).toEqual(before)
})

test('planner options are strict before any source read, including unused groups of choices', () => {
  const input = fixture()
  Object.defineProperty(input, 'envelope', {
    get() {
      throw new Error('Source was read')
    },
  })
  for (const [field, value] of [
    ['fps', 0],
    ['fps', 1.5],
    ['fps', 121],
    ['duration', null],
    ['metadata', 'guess'],
    ['unresolved', 'partial'],
    ['unmapped', null],
    ['nameReferences', 'first'],
    ['zeroScale', null],
    ['discontinuities', 'smooth'],
    ['adaptation', 'same'],
  ] as const) {
    const bad: BbmodelClipOptions = {}
    Object.defineProperty(bad, field, { value, enumerable: true })
    expect(failure(() => plan(input, bad))).toEqual({ reason: 'invalid', path: `options.${field}` })
  }
  expect(readBbmodelClipOptions({})).toEqual({
    fps: 24,
    duration: 'declared',
    unresolved: 'reject',
    metadata: 'reject',
    unmapped: 'reject',
    adaptation: 'reject',
    discontinuities: 'reject',
    zeroScale: 'reject',
    nameReferences: 'reject',
  })
  expect(failure(() => plan(fixture()))).toEqual({
    reason: 'unsupported',
    path: 'options.adaptation',
  })
})

test('blend weights distinguish source falsy defaults, zero literals, negatives and expressions without evaluation', () => {
  for (const [raw, value, defaulted, clamped] of [
    [undefined, 1, true, false],
    ['', 1, true, false],
    [0, 1, true, false],
    [-0, 1, true, false],
    ['0', 0, false, false],
    ['-0', 0, false, false],
    [-2, 0, false, true],
    ['-2.5', 0, false, true],
    ['0.25F', 0.25, false, false],
    [2, 2, false, false],
  ] as const) {
    const result = plan(fixture([clip({ blend_weight: raw })]), options)
    expect(at(result.reports)).toMatchObject({
      kind: 'prepared',
      weight: { value, defaulted, clamped },
    })
    expect(at(result.drafts).weight).toBe(value)
  }
  for (const raw of [
    'query.anim_time',
    ' ',
    '1e2',
    '1 + 2',
    'return 1;',
    '9'.repeat(400),
    `0.${'0'.repeat(400)}1`,
  ]) {
    const input = fixture([clip({ blend_weight: raw })])
    expect(failure(() => plan(input, options))).toEqual({
      reason: 'unsupported',
      path: 'animations[0].blend_weight',
    })
    const result = plan(input, { ...options, unresolved: 'omit-clip' })
    expect(result.drafts).toEqual([])
    expect(at(result.reports)).toMatchObject({ kind: 'omitted', problem: { code: 'weight' } })
  }
})

test('duration is declared or explicitly fitted to all authorial keys, never inferred from snapping', () => {
  const input = fixture([clip({ length: 0, snapping: 400, loop: 'loop' })])
  expect(failure(() => plan(input, options))).toEqual({
    reason: 'unsupported',
    path: 'animations[0].length',
  })
  const fit = plan(input, { ...options, duration: 'fit-keys', fps: 12 })
  expect(at(fit.drafts)).toMatchObject({
    duration: 1,
    fps: 12,
    loop: true,
    catmullLoopNeighbours: false,
  })
  expect(at(fit.reports)).toMatchObject({
    duration: { source: 0, native: 1, mode: 'fit-keys' },
    playback: { source: 'loop', nativeLoop: true },
  })
  const empty = fixture([clip({ length: 0, animators: {} })])
  expect(at(plan(empty, { ...options, duration: 'fit-keys', fps: 12 }).drafts).duration).toBe(
    1 / 12,
  )
  const curves = fixture([
    clip({
      length: 0,
      animators: {
        [target]: {
          keyframes: [
            { channel: 'position', time: 2, interpolation: 'catmullrom', data_points: [{ x: 2 }] },
            { channel: 'position', time: 5, interpolation: 'catmullrom', data_points: [{ x: 5 }] },
          ],
        },
      },
    }),
  ])
  expect(at(plan(curves, { ...options, duration: 'fit-keys' }).drafts).duration).toBe(5)
  expect(
    failure(() => plan(fixture([clip({ length: 601 })]), { ...options, unresolved: 'omit-clip' }))
      .reason,
  ).toBe('budget')
})

test('global/quaternion modes and omitted targets reject even empty animators; no partial motion is salvaged', () => {
  const badAnimators = [
    { [target]: { rotation_global: true } },
    { [target]: { quaternion_interpolation: true } },
    { [other]: {} },
    { effects: { type: 'effect', keyframes: [] } },
    { [target]: { keyframes: [{ channel: 'plugin', time: 'inert' }] } },
    { [target]: { keyframes: [{ channel: 'position', data_points: [{ x: 'query.time' }] }] } },
  ]
  for (const animators of badAnimators) {
    const input = fixture([clip(), clip({ uuid: 'bad', animators }), clip({ uuid: 'good' })]),
      result = plan(input, { ...options, unresolved: 'omit-clip' })
    expect(result.drafts.map((draft) => draft.clip)).toEqual([0, 2])
    expect(result.reports.map((report) => report.kind)).toEqual(['prepared', 'omitted', 'prepared'])
    expect(failure(() => plan(input, options)).reason).toBe('unsupported')
  }
  const partial = fixture([
    clip({
      animators: {
        [target]: {
          keyframes: [
            { channel: 'position', data_points: [{ x: 1 }] },
            { channel: 'scale', data_points: [{ x: 'query.time' }] },
          ],
        },
      },
    }),
  ])
  expect(plan(partial, { ...options, unresolved: 'omit-clip' }).drafts).toEqual([])
})

test('all known malformed fields are validated before an omission policy can skip their clips', () => {
  const input = fixture([
    clip({ animators: { effects: {} } }),
    clip({
      uuid: 'bad',
      animators: { [target]: { keyframes: [{ channel: 'position', time: 'invalid' }] } },
    }),
  ])
  expect(failure(() => plan(input, { ...options, unresolved: 'omit-clip' }))).toEqual({
    reason: 'invalid',
    path: `animations[1].animators["${target}"].keyframes[0].time`,
  })
})

test('timing fields, unknown loops and pre/post require support or explicit whole-clip omission', () => {
  for (const field of ['anim_time_update', 'start_delay', 'loop_delay']) {
    const result = plan(fixture([clip({ [field]: 'query.time' })]), {
      ...options,
      unresolved: 'omit-clip',
    })
    expect(at(result.reports)).toMatchObject({
      kind: 'omitted',
      problem: { code: 'timing', path: `animations[0].${field}` },
    })
  }
  expect(
    at(
      plan(fixture([clip({ loop: 'plugin-loop' })]), { ...options, unresolved: 'omit-clip' })
        .reports,
    ),
  ).toMatchObject({ kind: 'omitted', problem: { code: 'loop' } })
  const split = fixture([
    clip({
      animators: {
        [target]: { keyframes: [{ channel: 'position', data_points: [{ x: 1 }, { x: 2 }] }] },
      },
    }),
  ])
  expect(at(plan(split, { ...options, unresolved: 'omit-clip' }).reports)).toMatchObject({
    kind: 'omitted',
    problem: { code: 'pre-post' },
  })
  expect(
    convertBbmodelClips(split, { ...options, discontinuities: 'sample-pre' }).report.counts.keys,
  ).toBe(25)
})

test('metadata and unknown fields have separate choices; unknown values and discarded marker subtrees stay inert', () => {
  const input = fixture([
    clip({
      selected: false,
      markers: [{ time: 0.5, custom: { untouched: true } }],
      plugin: { nested: 'inert' },
    }),
  ])
  expect(failure(() => plan(input, { ...options, metadata: 'reject' }))).toEqual({
    reason: 'unsupported',
    path: 'animations[0]["selected"]',
  })
  expect(failure(() => plan(input, options))).toEqual({
    reason: 'unsupported',
    path: 'animations[0]["plugin"]',
  })
  const raw = input.envelope.json.animations
  if (!Array.isArray(raw)) throw new Error('Missing fixture clips')
  Object.defineProperty(raw[0], 'plugin', {
    enumerable: true,
    get() {
      throw new Error('Unknown source value was read')
    },
  })
  expect(at(plan(input, { ...options, unmapped: 'discard' }).reports)).toMatchObject({
    kind: 'prepared',
    metadataFields: 2,
    unmappedFields: 1,
    firstMetadataPath: 'animations[0]["selected"]',
    firstUnmappedPath: 'animations[0]["plugin"]',
    markers: 1,
  })
})

test('coverage tracks legacy shadowed fields and alias contents, with mixed-curve handles consumed', () => {
  const input = fixture(
    [
      clip({
        animators: {
          [target]: {
            name: 'Decorativo',
            keyframes: [
              {
                channel: 'position',
                uuid: 'key',
                x: 99,
                bezier_left_time: [-0.1, -0.1, -0.1],
                data_points: [{ x: 42, values: { x: 1, custom: 'inert' }, extra: true }],
              },
            ],
          },
        },
      }),
    ],
    '4.10',
  )
  const result = plan(input, { ...options, unmapped: 'discard' })
  expect(at(result.reports)).toMatchObject({
    kind: 'prepared',
    metadataFields: 4,
    unmappedFields: 2,
  })
  expect(at(at(result.drafts).tracks).track.keys[0]?.points[0][0]).toBe(1)
  const direct = fixture([
    clip({
      animators: { [target]: { keyframes: [{ channel: 'position', x: 1, values: { x: 8 } }] } },
    }),
  ])
  expect(failure(() => plan(direct, options)).path).toContain('["values"]')
})

test('native clip budgets apply to retained whole clips, not aliases, and never become omissions', () => {
  const exact = fixture(Array.from({ length: 64 }, (_, index) => clip({ uuid: `clip-${index}` })))
  expect(plan(exact, options).drafts.length).toBe(64)
  const tooMany = fixture(Array.from({ length: 65 }, (_, index) => clip({ uuid: `clip-${index}` })))
  expect(failure(() => plan(tooMany, { ...options, unresolved: 'omit-clip' })).reason).toBe(
    'budget',
  )
  const skipped = fixture([
    clip({ uuid: 'effect', animators: { effects: {} } }),
    ...Array.from({ length: 64 }, (_, index) => clip({ uuid: `clip-${index}` })),
  ])
  const result = plan(skipped, { ...options, unresolved: 'omit-clip' })
  expect(result.drafts.length).toBe(64)
  expect(at(result.drafts).clip).toBe(1)
})

test('name binding choices and conflicts stay explicit at the complete source conversion boundary', () => {
  const input = fixture([
    clip({
      animators: { Corpo: { keyframes: [{ channel: 'position', data_points: [{ x: 1 }] }] } },
    }),
  ])
  expect(failure(() => convertBbmodelClips(input, options)).reason).toBe('unsupported')
  const result = convertBbmodelClips(input, { ...options, nameReferences: 'unique-name' })
  expect(at(result.report.source)).toMatchObject({ kind: 'prepared', nameReferences: 1 })
  expect(at(at(result.animations).tracks).nodeId).toBe('bbmodel_node_0')
  expect(result.report.policy).toMatchObject({
    nameReferences: 'unique-name',
    adaptation: 'continuous-sampled',
  })
  const conflict = fixture([clip({ animators: { [target]: {}, Corpo: {} } })])
  expect(
    at(
      plan(conflict, { ...options, nameReferences: 'unique-name', unresolved: 'omit-clip' })
        .reports,
    ),
  ).toMatchObject({ kind: 'omitted', problem: { code: 'binding', binding: { kind: 'conflict' } } })
  const broken = fixture()
  broken.nodeIds.clear()
  expect(() => plan(broken, { ...options, unresolved: 'omit-clip' })).toThrow(
    'Missing native target/rest pose',
  )
})

test('the combined conversion report is bounded even when repeated target paths fit source text limits', () => {
  const groups = Array.from({ length: 512 }, (_, index) => ({
      uuid: `group_${index}`,
      name: `${index}_${'n'.repeat(4000)}`,
    })),
    animators = Object.fromEntries(
      groups.map((group) => [
        group.name,
        {
          keyframes: ['position', 'rotation', 'scale'].map((channel) => ({
            channel,
            data_points: [{ x: 1, y: 1, z: 1 }],
          })),
        },
      ]),
    ),
    input = fixture([clip({ animators })], '5.0', {
      groups,
      outliner: groups.map(({ uuid }) => ({ uuid })),
    })
  const prepared = plan(input, { ...options, nameReferences: 'unique-name' })
  expect(at(prepared.drafts).tracks.length).toBe(1536)
  expect(
    failure(() => convertBbmodelClips(input, { ...options, nameReferences: 'unique-name' })),
  ).toEqual({ reason: 'budget', path: 'report.text' })
})

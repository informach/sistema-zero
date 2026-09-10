import { expect, test } from 'bun:test'
import {
  bindBbmodelAnimations as bind,
  readBbmodelAnimationBindingOptions,
} from './bbmodelAnimationBindings'
import type { BbmodelAnimationBindingOptions } from './bbmodelAnimationBindingTypes'
import { readBbmodelAnimationKeyframes } from './bbmodelAnimationKeyframes'
import { readBbmodelAnimationStructure } from './bbmodelAnimationStructure'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { readBbmodelGraph } from './bbmodelGraph'
import { BbmodelInputError } from './bbmodelInput'
import { readBbmodelNodeMetadata } from './bbmodelNodeMetadata'
import { planBbmodelSelection } from './bbmodelSelection'

const uuid = (n: number) => `${n.toString(16).padStart(8, '0')}-0000-0000-0000-000000000000`
function at<T>(items: readonly T[], index = 0): T {
  const item = items[index]
  if (item === undefined) throw new Error(`Expected fixture item ${index}`)
  return item
}
function fixture(
  animations: unknown[],
  version: BbmodelVersion = '5.0',
  overrides: Record<string, unknown> = {},
) {
  const first = { uuid: uuid(1), name: 'Cabeça', origin: [0, 2, 0] },
    second = { uuid: uuid(2), name: 'Corpo' },
    envelope = readBbmodelEnvelope(
      new TextEncoder().encode(
        JSON.stringify({
          meta: { format_version: version, model_format: 'free' },
          elements: [{ uuid: uuid(0), type: 'cube', name: 'Cubo' }],
          ...(version === '5.0'
            ? {
                groups: [first, second],
                outliner: [{ uuid: first.uuid, children: [uuid(0)] }, { uuid: second.uuid }],
              }
            : { outliner: [{ ...first, children: [uuid(0)] }, second] }),
          animations,
          ...overrides,
        }),
      ),
    ),
    graph = readBbmodelGraph(envelope),
    metadata = readBbmodelNodeMetadata(envelope, graph),
    selection = planBbmodelSelection(envelope, graph, {
      unlisted: 'omit',
      unsupportedNodes: 'omit-subtree',
    }),
    structure = readBbmodelAnimationStructure(envelope),
    keys = readBbmodelAnimationKeyframes(structure)
  return { envelope, graph, metadata, selection, structure, keys }
}
function clips(animators: Record<string, unknown>) {
  return [{ uuid: 'clip', animators }]
}
const names = { nameReferences: 'unique-name' } as const
function rows(input: ReturnType<typeof fixture>, options?: BbmodelAnimationBindingOptions) {
  return at(bind(input, options).clips).animators
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
] as const)('bbmodel %s binds original group UUIDs literally and independently in each clip', (version) => {
  const input = fixture(
      [
        {
          uuid: 'one',
          animators: {
            [uuid(1)]: {
              type: 'bone',
              name: 'Corpo',
              keyframes: [{ channel: 'rotation', x: 'q.time' }],
            },
            [uuid(2)]: {},
          },
        },
        { uuid: 'two', animators: { [uuid(1)]: {} } },
      ],
      version,
    ),
    before = structuredClone(input),
    result = bind(input)
  expect(result.options).toEqual({ nameReferences: 'reject' })
  expect(result.clips).toEqual([
    {
      clip: 0,
      animators: [
        {
          animator: 0,
          reference: uuid(1),
          path: `animations[0].animators["${uuid(1)}"]`,
          kind: 'bound',
          node: 1,
          selected: true,
          via: 'uuid',
        },
        {
          animator: 1,
          reference: uuid(2),
          path: `animations[0].animators["${uuid(2)}"]`,
          kind: 'bound',
          node: 2,
          selected: true,
          via: 'uuid',
        },
      ],
    },
    {
      clip: 1,
      animators: [
        {
          animator: 0,
          reference: uuid(1),
          path: `animations[1].animators["${uuid(1)}"]`,
          kind: 'bound',
          node: 1,
          selected: true,
          via: 'uuid',
        },
      ],
    },
  ])
  expect(result.counts).toEqual({ bound: 3, unresolved: 0, conflicting: 0, omittedTargets: 0 })
  at(at(result.clips).animators).path = 'edited'
  at(result.clips).animators.pop()
  result.clips.pop()
  result.options.nameReferences = 'unique-name'
  expect(input).toEqual(before)
})

test('name matching requires explicit policy, preserves whitespace and uses key-name before decorative declared-name', () => {
  const input = fixture(clips({ CABEÇA: { name: 'Corpo' } }))
  expect(at(rows(input))).toMatchObject({
    kind: 'unresolved',
    detail: { code: 'name-reference-rejected', via: 'key-name' },
  })
  expect(at(rows(input, names))).toMatchObject({ kind: 'bound', node: 1, via: 'key-name' })
  const padded = fixture(clips({ ' Cabeça ': {} }))
  expect(at(rows(padded, names))).toMatchObject({
    kind: 'unresolved',
    detail: { code: 'missing-target' },
  })
  const fallback = fixture(clips({ antigo: { name: 'CORPO' } }))
  expect(at(rows(fallback, names))).toMatchObject({ kind: 'bound', node: 2, via: 'declared-name' })
  const orphan = fixture(clips({ [uuid(99)]: { name: 'cabeça' } }))
  expect(at(rows(orphan))).toMatchObject({
    kind: 'unresolved',
    detail: { code: 'name-reference-rejected', via: 'declared-name' },
  })
  expect(at(rows(orphan, names))).toMatchObject({ kind: 'bound', node: 1, via: 'declared-name' })
  for (const name of [undefined, '']) {
    expect(at(rows(fixture(clips({ [uuid(99)]: { name } })), names))).toMatchObject({
      kind: 'unresolved',
      detail: { code: 'missing-target' },
    })
  }
})

test('source UUID recognition is lowercase and exact, not RFC version validation or generic literal-ID matching', () => {
  const lower = uuid(10),
    upper = lower.toUpperCase(),
    group = { uuid: lower, name: 'Decimal' },
    input = fixture(clips({ [lower]: {}, [upper]: {} }), '5.0', {
      groups: [group],
      outliner: [{ uuid: lower }],
    })
  expect(at(rows(input))).toMatchObject({ kind: 'bound', via: 'uuid', node: 1 })
  expect(at(rows(input), 1)).toMatchObject({
    kind: 'unresolved',
    detail: { code: 'name-reference-rejected' },
  })
  expect(at(rows(input, names), 1)).toMatchObject({
    kind: 'unresolved',
    detail: { code: 'missing-target' },
  })
  // Arbitrary IDs remain legal in the graph; animation lookup follows the source's distinct rule.
  const own = fixture(clips(Object.fromEntries([['__proto__', {}]])), '5.0', {
    groups: [{ uuid: '__proto__', name: 'Outro' }],
    outliner: [{ uuid: '__proto__' }],
  })
  expect(at(rows(own, names))).toMatchObject({
    kind: 'unresolved',
    detail: { code: 'missing-target' },
  })
  const byName = fixture(clips(Object.fromEntries([['constructor', {}]])), '5.0', {
    groups: [{ uuid: lower, name: 'constructor' }],
    outliner: [{ uuid: lower }],
  })
  expect(at(rows(byName, names))).toMatchObject({ kind: 'bound', via: 'key-name', node: 1 })
  for (const key of [`${lower}\n`, lower.slice(1), lower.replace('-', '_')])
    expect(at(rows(fixture(clips({ [key]: {} })), names))).toMatchObject({
      kind: 'unresolved',
      detail: { code: 'missing-target' },
    })
})

test('ambiguous source names include omitted groups and never fall back to a different declared name', () => {
  const input = fixture(clips({ CABEÇA: { name: 'Corpo' } }), '5.0', {
    groups: [
      { uuid: uuid(1), name: 'Cabeça' },
      { uuid: uuid(2), name: 'Corpo' },
      { uuid: uuid(3), name: 'cabeça' },
    ],
  })
  expect(input.selection.nodes.some((node) => node.node === 3)).toBe(false)
  expect(at(rows(input, names))).toMatchObject({
    kind: 'unresolved',
    detail: { code: 'ambiguous-name', via: 'key-name', count: 2 },
  })
  const declared = fixture(clips({ [uuid(99)]: { name: 'CABEÇA' } }), '5.0', {
    groups: [
      { uuid: uuid(1), name: 'Cabeça' },
      { uuid: uuid(2), name: 'cabeça' },
    ],
  })
  expect(at(rows(declared, names))).toMatchObject({
    kind: 'unresolved',
    detail: { code: 'ambiguous-name', via: 'declared-name', count: 2 },
  })
})

test('colliding UUID/name aliases are all marked conflicting, including empty animators and omitted targets', () => {
  const input = fixture(
      clips({
        [uuid(1)]: { keyframes: [{ channel: 'rotation', x: 1 }] },
        Cabeça: {},
        [uuid(99)]: { name: 'CABEÇA' },
      }),
    ),
    output = bind(input, names)
  expect(at(output.clips).animators.map((row) => row.kind)).toEqual([
    'conflict',
    'conflict',
    'conflict',
  ])
  expect(at(output.clips).animators.map((row) => ('count' in row ? row.count : null))).toEqual([
    3, 3, 3,
  ])
  expect(output.counts).toEqual({ bound: 0, unresolved: 0, conflicting: 3, omittedTargets: 0 })
  const omitted = fixture(clips({ [uuid(2)]: {}, Corpo: {} }), '5.0', {
      outliner: [{ uuid: uuid(1), children: [uuid(0)] }],
    }),
    result = bind(omitted, names)
  expect(result.counts).toEqual({ bound: 0, unresolved: 0, conflicting: 2, omittedTargets: 2 })
  for (const row of at(result.clips).animators)
    expect(row).toMatchObject({ kind: 'conflict', node: 2, selected: false })
})

test('missing, excluded, incompatible and unsupported animator targets remain distinct', () => {
  const input = fixture(
      clips({
        [uuid(0)]: { name: 'Cabeça' },
        [uuid(2)]: {},
        [uuid(99)]: {},
        effects: { type: 'bone' },
        armature: { type: 'armature_bone' },
        locator: { type: 'null_object' },
        plugin: { type: 'custom' },
      }),
      '5.0',
      { outliner: [{ uuid: uuid(1), children: [uuid(0)] }] },
    ),
    result = bind(input, names),
    actual = at(result.clips).animators
  expect(at(actual)).toMatchObject({ kind: 'unresolved', detail: { code: 'target-type', node: 0 } })
  expect(at(actual, 1)).toMatchObject({ kind: 'bound', node: 2, selected: false })
  expect(at(actual, 2)).toMatchObject({ kind: 'unresolved', detail: { code: 'missing-target' } })
  for (let i = 3; i < actual.length; i++)
    expect(at(actual, i)).toMatchObject({ kind: 'unresolved', detail: { code: 'animator-type' } })
  expect(result.counts).toEqual({ bound: 1, unresolved: 6, conflicting: 0, omittedTargets: 1 })
})

test('binding options are strict before reading graph, metadata or keys, including empty inputs', () => {
  const input = fixture([])
  for (const field of ['graph', 'metadata', 'keys', 'selection']) poison(input, field)
  for (const value of [
    null,
    [],
    false,
    { extra: true },
    { nameReferences: null },
    { nameReferences: 'first' },
  ]) {
    let error: unknown
    try {
      bind(input, value as BbmodelAnimationBindingOptions)
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(BbmodelInputError)
    if (!(error instanceof BbmodelInputError)) throw new Error('Expected option validation')
    expect(error.reason).toBe('invalid')
  }
  expect(readBbmodelAnimationBindingOptions({})).toEqual({ nameReferences: 'reject' })
  expect(bind(fixture([]))).toEqual({
    options: { nameReferences: 'reject' },
    clips: [],
    counts: { bound: 0, unresolved: 0, conflicting: 0, omittedTargets: 0 },
  })
})

test('binding never reads raw key values and builds a single name index per invocation, not per animator', () => {
  const input = fixture(
    clips(
      Object.fromEntries(
        Array.from({ length: 200 }, (_, i) => [
          uuid(i + 100),
          { name: i % 2 ? 'Cabeça' : 'Corpo', keyframes: [{ channel: 'rotation', x: 'q.time' }] },
        ]),
      ),
    ),
  )
  for (const clip of input.keys.clips)
    for (const animator of clip.animators) {
      poison(animator.declaration, 'source')
      poison(animator.declaration, 'keyframes')
      if (animator.kind === 'transform') poison(animator, 'keys')
    }
  let nameReads = 0
  for (const row of input.metadata)
    if (row.kind === 'group') {
      const name = row.name
      Object.defineProperty(row, 'name', {
        get() {
          nameReads++
          return name
        },
      })
    }
  expect(bind(input).counts.unresolved).toBe(200)
  expect(nameReads).toBe(0)
  expect(bind(input, names).counts.conflicting).toBe(200)
  expect(nameReads).toBe(2)
})

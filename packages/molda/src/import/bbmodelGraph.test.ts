import { expect, test } from 'bun:test'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { type BbmodelGraph, readBbmodelGraph } from './bbmodelGraph'
import { BBMODEL_INPUT_LIMITS, BbmodelInputError } from './bbmodelInput'

function envelope(source: Record<string, unknown>, version: BbmodelVersion = '5.0') {
  return readBbmodelEnvelope(
    new TextEncoder().encode(
      JSON.stringify({
        meta: { format_version: version, model_format: 'free' },
        ...source,
      }),
    ),
  )
}
function read(source: Record<string, unknown>, version: BbmodelVersion = '5.0') {
  return readBbmodelGraph(envelope(source, version))
}
const names = (graph: BbmodelGraph, indices: readonly number[]) =>
  indices.map((index) => graph.nodes[index]!.uuid)

function failure(
  source: Record<string, unknown>,
  reason: BbmodelInputError['reason'],
  path: string,
  version: BbmodelVersion = '5.0',
) {
  let error: unknown
  try {
    read(source, version)
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(BbmodelInputError)
  expect((error as BbmodelInputError).reason).toBe(reason)
  expect((error as BbmodelInputError).path).toBe(path)
}

test('reads equivalent authored forests in 4.9, 4.10 and 5.0, preserving sibling order and parent identity', () => {
  for (const version of ['4.9', '4.10', '5.0'] as const) {
    const outer = { uuid: 'outer', name: 'Mesmo nome', origin: [2, 3, 4] }
    const inner = { uuid: 'inner', name: 'Mesmo nome', rotation: [10, -20, 0] }
    const graph = read(
      {
        elements: [
          { uuid: 'a', type: 'cube' },
          { uuid: 'b', type: 'mesh' },
          { uuid: 'c', type: 'locator' },
        ],
        ...(version === '5.0' ? { groups: [inner, outer] } : {}),
        outliner: [
          'c',
          {
            ...(version === '5.0' ? { uuid: 'outer' } : outer),
            children: [
              'b',
              { ...(version === '5.0' ? { uuid: 'inner' } : inner), children: ['a'] },
            ],
          },
        ],
      },
      version,
    )
    expect(names(graph, graph.roots)).toEqual(['c', 'outer'])
    expect(names(graph, graph.order)).toEqual(['c', 'outer', 'b', 'inner', 'a'])
    expect(graph.unlisted).toEqual([])
    const index = (uuid: string) => graph.byUuid.get(uuid)!
    expect(graph.nodes[index('a')]!.parent).toBe(index('inner'))
    expect(graph.nodes[index('inner')]!.parent).toBe(index('outer'))
    expect(graph.nodes[index('c')]!.parent).toBeNull()
    expect(graph.nodes[index('outer')]!.kind).toBe('group')
    expect(names(graph, graph.nodes[index('outer')]!.children)).toEqual(['b', 'inner'])
    expect(graph.nodes[index('inner')]!.source.data.rotation).toEqual([10, -20, 0])
    expect(graph.nodes[index('a')]!.outliner!.data).toBeNull()
    expect(graph.nodes[index('a')]!.outliner!.path).toBe('outliner[1].children[1].children[0]')
  }
})

test('separates unlisted definitions from authored roots; no insertion, deletion or name-based merging', () => {
  const source = {
    elements: [
      { uuid: 'unused1', name: 'same' },
      { uuid: 'shown', name: 'same' },
      { uuid: 'unused2' },
    ],
    groups: [{ uuid: 'group2' }, { uuid: 'group1' }],
    outliner: ['shown'],
  }
  const graph = read(source)
  expect(names(graph, graph.roots)).toEqual(['shown'])
  expect(names(graph, graph.order)).toEqual(['shown'])
  expect(names(graph, graph.unlisted)).toEqual(['group2', 'group1', 'unused1', 'unused2'])
  expect(graph.nodes).toHaveLength(5)
  for (const index of graph.unlisted) {
    expect(graph.nodes[index]!.parent).toBeNull()
    expect(graph.nodes[index]!.outliner).toBeNull()
  }
  for (const outliner of [undefined, []]) {
    const empty = read({ ...source, outliner })
    expect(empty.roots).toEqual([])
    expect(empty.order).toEqual([])
    expect(empty.unlisted).toHaveLength(5)
  }
  for (const version of ['4.9', '4.10', '5.0'] as const) {
    expect(read({}, version).nodes).toEqual([])
    expect(read({ elements: [], groups: [], outliner: [] }, version).roots).toEqual([])
  }
})

test('retains raw metadata without interpreting transforms, child-type restrictions or geometry', () => {
  const parsed = envelope({
    elements: [
      { uuid: 'rig', type: 'armature', children: ['joint'], position: [1, 2, 3] },
      { uuid: 'joint', type: 'armature_bone', children: [], expression: 'query.life_time' },
      { uuid: 'plugin', type: 'unknown_plugin', faces: 'not-validated-here' },
    ],
    groups: [{ uuid: 'group', origin: [1, 2, 3], custom: { kept: true } }],
    outliner: [
      { uuid: 'rig', isOpen: false, children: [{ uuid: 'joint', children: [] }] },
      { uuid: 'group', origin: [99, 0, 0], children: ['plugin'], future: { preserved: true } },
    ],
  })
  const before = structuredClone(parsed.json)
  const graph = readBbmodelGraph(parsed)
  const group = graph.nodes[graph.byUuid.get('group')!]!
  expect(group.source.data).toBe((parsed.json.groups as Record<string, unknown>[])[0]!)
  expect(group.outliner!.data).toBe((parsed.json.outliner as Record<string, unknown>[])[1]!)
  expect(group.source.data.origin).toEqual([1, 2, 3])
  expect(group.outliner!.data!.origin).toEqual([99, 0, 0])
  expect(graph.nodes[0]!.source.data).toBe((parsed.json.elements as Record<string, unknown>[])[0]!)
  expect(graph.nodes[1]!.kind).toBe('element')
  expect(names(graph, graph.order)).toEqual(['rig', 'group', 'joint', 'plugin'])
  graph.nodes[0]!.children.length = 0
  graph.roots.length = 0
  expect(parsed.json).toEqual(before)
  // This reader does not resolve conflicting transforms or guarantee native armature support.
  const reread = readBbmodelGraph(parsed)
  expect(names(reread, reread.roots)).toEqual(['rig', 'group'])
})

test('rejects duplicate definitions, missing references, repeated placement and cycles across the entire outliner', () => {
  failure({ elements: [{ uuid: 'a' }, { uuid: 'a' }] }, 'invalid', 'elements[1].uuid')
  failure({ elements: [{ uuid: 'a' }], groups: [{ uuid: 'a' }] }, 'invalid', 'groups[0].uuid')
  failure({ groups: [{ uuid: 'a' }, { uuid: 'a' }] }, 'invalid', 'groups[1].uuid')
  failure({ outliner: ['missing'] }, 'invalid', 'outliner[0]')
  failure({ outliner: [{ uuid: 'missing', children: [] }] }, 'invalid', 'outliner[0]')
  failure({ elements: [{ uuid: 'a' }], outliner: ['a', 'a'] }, 'invalid', 'outliner[1]')
  const groups = [{ uuid: 'g1' }, { uuid: 'g2' }]
  failure(
    { groups, outliner: [{ uuid: 'g1', children: ['g1'] }] },
    'invalid',
    'outliner[0].children[0]',
  )
  failure(
    { groups, outliner: [{ uuid: 'g1', children: [{ uuid: 'g2', children: ['g1'] }] }] },
    'invalid',
    'outliner[0].children[0].children[0]',
  )
  failure(
    {
      groups,
      elements: [{ uuid: 'a' }],
      outliner: [
        { uuid: 'g1', children: ['a'] },
        { uuid: 'g2', children: ['a'] },
      ],
    },
    'invalid',
    'outliner[1].children[0]',
  )
  for (const version of ['4.9', '4.10'] as const) {
    failure(
      { elements: [{ uuid: 'a' }], outliner: [{ uuid: 'a', children: [] }] },
      'invalid',
      'outliner[0].uuid',
      version,
    )
    failure(
      { outliner: [{ uuid: 'g', children: [{ uuid: 'g', children: [] }] }] },
      'invalid',
      'outliner[0].children[0].uuid',
      version,
    )
    failure({ groups }, 'unsupported', 'groups', version)
  }
})

test('requires typed lists and explicit bounded ids; prototype-like ids are ordinary map keys', () => {
  for (const path of ['elements', 'groups', 'outliner'])
    for (const value of [null, 0, {}, 'a']) failure({ [path]: value }, 'invalid', path)
  for (const value of [null, [], 'a', 1]) failure({ elements: [value] }, 'invalid', 'elements[0]')
  for (const value of [null, [], true, 1]) failure({ outliner: [value] }, 'invalid', 'outliner[0]')
  for (const uuid of [undefined, null, 0, '', {}, []]) {
    failure({ elements: [{ uuid }] }, 'invalid', 'elements[0].uuid')
    failure({ outliner: [{ uuid }] }, 'invalid', 'outliner[0].uuid')
  }
  const ids = [
    '__proto__',
    'constructor',
    'toString',
    'a',
    'A',
    '雪 🚀',
    'x'.repeat(BBMODEL_INPUT_LIMITS.identifierChars),
  ]
  const graph = read({ elements: ids.map((uuid) => ({ uuid })), outliner: ids })
  expect(names(graph, graph.roots)).toEqual(ids)
  const large = 'x'.repeat(BBMODEL_INPUT_LIMITS.identifierChars + 1)
  failure({ elements: [{ uuid: large }] }, 'budget', 'elements[0].uuid')
  failure({ outliner: [large] }, 'budget', 'outliner[0]')
  for (const children of [null, {}, 'a', false])
    failure(
      { groups: [{ uuid: 'g' }], outliner: [{ uuid: 'g', children }] },
      'invalid',
      'outliner[0].children',
    )
  for (const version of ['4.9', '4.10', '5.0'] as const)
    failure(
      {
        ...(version === '5.0' ? { groups: [{ uuid: 'g' }] } : {}),
        outliner: [{ uuid: 'g', content: [] }],
      },
      'unsupported',
      'outliner[0].content',
      version,
    )
})

test('preflights combined definitions and aggregate references before visiting excess rows', () => {
  const count = BBMODEL_INPUT_LIMITS.nodes
  const elements = Array.from({ length: count }, (_, i) => ({ uuid: `e${i}` }))
  const graph = read({ elements, outliner: elements.map((row) => row.uuid) })
  expect(graph.nodes).toHaveLength(count)
  expect(graph.order).toHaveLength(count)
  expect(graph.order[0]).toBe(0)
  expect(graph.order[count - 1]).toBe(count - 1)
  const nested = read({
    elements: elements.slice(1),
    groups: [{ uuid: 'g' }],
    outliner: [{ uuid: 'g', children: elements.slice(1).map((row) => row.uuid) }],
  })
  expect(nested.order).toHaveLength(count)
  expect(nested.nodes[nested.byUuid.get('g')!]!.children).toHaveLength(count - 1)
  const legacy = read({ outliner: elements.map((row) => ({ ...row, children: [] })) }, '4.9')
  expect(legacy.nodes).toHaveLength(count)
  expect(legacy.roots).toHaveLength(count)
  failure({ elements: [...elements, null] }, 'budget', 'elements')
  failure({ elements, groups: [null] }, 'budget', 'nodes')
  failure(
    { outliner: new Array(BBMODEL_INPUT_LIMITS.outlinerEntries + 1).fill(null) },
    'budget',
    'outliner',
  )
  failure(
    {
      groups: [{ uuid: 'g' }],
      outliner: [
        { uuid: 'g', children: new Array(BBMODEL_INPUT_LIMITS.outlinerEntries).fill(null) },
      ],
    },
    'budget',
    'outliner',
  )
  failure({ elements, outliner: [{ uuid: 'extra', children: [] }] }, 'budget', 'nodes', '4.9')
  const mixed = read(
    { elements: elements.slice(1), outliner: [{ uuid: 'g', children: [] }] },
    '4.10',
  )
  expect(mixed.nodes).toHaveLength(count)
  expect(mixed.unlisted).toHaveLength(count - 1)
})

test('walks deep graphs iteratively with a separate guard for callers holding already parsed JSON', () => {
  const make = (depth: number) => {
    let root: Record<string, unknown> = { uuid: `g${depth - 1}`, children: [] }
    for (let i = depth - 2; i >= 0; i--) root = { uuid: `g${i}`, children: [root] }
    return [root]
  }
  const parsed = envelope({}, '4.9')
  // Direct parsed input exercises the graph gate independently of the earlier JSON depth gate.
  parsed.json.outliner = make(BBMODEL_INPUT_LIMITS.outlinerDepth)
  const graph = readBbmodelGraph(parsed)
  expect(graph.order).toHaveLength(BBMODEL_INPUT_LIMITS.outlinerDepth)
  expect(graph.nodes[127]!.parent).toBe(126)
  parsed.json.outliner = make(BBMODEL_INPUT_LIMITS.outlinerDepth + 1)
  expect(() => readBbmodelGraph(parsed)).toThrow('grupos aninhados demais')
  const cycle: Record<string, unknown> = { uuid: 'cycle' }
  cycle.children = [cycle]
  parsed.json.outliner = [cycle]
  expect(() => readBbmodelGraph(parsed)).toThrow('mesmo identificador')
})

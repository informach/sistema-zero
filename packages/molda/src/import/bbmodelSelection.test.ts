import { expect, test } from 'bun:test'
import { SCENE_LIMITS } from '../scene/limits'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { readBbmodelGraph } from './bbmodelGraph'
import { BbmodelInputError } from './bbmodelInput'
import { planBbmodelSelection, readBbmodelSelectionOptions } from './bbmodelSelection'

function source(
  json: Record<string, unknown>,
  version: BbmodelVersion = '5.0',
  modelFormat = 'free',
) {
  const bytes = new TextEncoder().encode(
    JSON.stringify({ meta: { format_version: version, model_format: modelFormat }, ...json }),
  )
  const envelope = readBbmodelEnvelope(bytes)
  return { envelope, graph: readBbmodelGraph(envelope) }
}
function failure(run: () => unknown, reason: BbmodelInputError['reason'], path: string) {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(BbmodelInputError)
  expect((error as BbmodelInputError).reason).toBe(reason)
  expect((error as BbmodelInputError).path).toBe(path)
}

test('bbmodel selection preserves original roots, sibling order and hierarchy across published layouts without using names', () => {
  for (const version of ['4.9', '4.10', '5.0'] as const) {
    const { envelope, graph } = source(
      {
        elements: [
          { uuid: 'cube', type: 'cube', name: 'Same', visibility: false, export: false },
          { uuid: 'mesh', type: 'mesh', name: 'Same' },
        ],
        ...(version === '5.0'
          ? {
              groups: [
                { uuid: 'outer', name: 'Same' },
                { uuid: '__proto__', name: 'Same' },
              ],
            }
          : {}),
        outliner: [
          { uuid: 'outer', children: ['mesh', { uuid: '__proto__', children: ['cube'] }] },
        ],
      },
      version,
    )
    const before = structuredClone(graph)
    const result = planBbmodelSelection(envelope, graph)
    expect(result.nodes.map(({ node }) => graph.nodes[node]!.uuid)).toEqual([
      'outer',
      'mesh',
      '__proto__',
      'cube',
    ])
    expect(result.nodes.map(({ kind }) => kind)).toEqual(['group', 'mesh', 'group', 'cube'])
    for (const selected of result.nodes)
      expect(selected.parent).toBe(graph.nodes[selected.node]!.parent)
    expect(result.roots).toEqual(graph.roots)
    expect(result.geometries.map((node) => graph.nodes[node]!.uuid)).toEqual(['mesh', 'cube'])
    expect(result.issues).toEqual([])
    expect(graph).toEqual(before)
    result.roots.push(999)
    result.nodes[0]!.parent = 999
    result.geometries.reverse()
    expect(graph).toEqual(before)
  }
})

test('bbmodel unlisted definitions require an explicit choice and appending preserves groups-first declaration order as roots', () => {
  const { envelope, graph } = source({
    elements: [
      { uuid: 'c', type: 'cube' },
      { uuid: 'm', type: 'mesh' },
      { uuid: 'used', type: 'mesh' },
    ],
    groups: [{ uuid: 'used-group' }, { uuid: 'unused-group-1' }, { uuid: 'unused-group-2' }],
    outliner: [{ uuid: 'used-group', children: ['used'] }],
  })
  failure(() => planBbmodelSelection(envelope, graph), 'unsupported', 'outliner')
  const appended = planBbmodelSelection(envelope, graph, { unlisted: 'append' })
  expect(appended.roots.map((node) => graph.nodes[node]!.uuid)).toEqual([
    'used-group',
    'unused-group-1',
    'unused-group-2',
    'c',
    'm',
  ])
  expect(appended.nodes.map(({ node }) => graph.nodes[node]!.uuid)).toEqual([
    'used-group',
    'unused-group-1',
    'unused-group-2',
    'c',
    'm',
    'used',
  ])
  expect(appended.issues).toEqual([{ code: 'unlisted-nodes-appended', path: 'outliner', count: 4 }])
  const omitted = planBbmodelSelection(envelope, graph, { unlisted: 'omit' })
  expect(omitted.nodes.map(({ node }) => graph.nodes[node]!.uuid)).toEqual(['used-group', 'used'])
  expect(omitted.issues).toEqual([{ code: 'unlisted-nodes-omitted', path: 'outliner', count: 4 }])
  const empty = source({ elements: [{ uuid: 'c', type: 'cube' }] })
  expect(planBbmodelSelection(empty.envelope, empty.graph, { unlisted: 'omit' })).toEqual({
    nodes: [],
    roots: [],
    geometries: [],
    issues: [{ code: 'unlisted-nodes-omitted', path: 'outliner', count: 1 }],
  })
})

test('bbmodel omits only explicitly chosen unsupported subtrees, never promotes descendants or reinterprets containers', () => {
  const { envelope, graph } = source({
    elements: [
      { uuid: 'rig', type: 'armature' },
      { uuid: 'child', type: 'mesh' },
      { uuid: 'grandchild', type: 'cube' },
      { uuid: 'keep', type: 'mesh' },
    ],
    groups: [{ uuid: 'root' }, { uuid: 'joint-group' }],
    outliner: [
      {
        uuid: 'root',
        children: [
          { uuid: 'rig', children: ['child', { uuid: 'joint-group', children: ['grandchild'] }] },
          'keep',
        ],
      },
    ],
  })
  failure(() => planBbmodelSelection(envelope, graph), 'unsupported', 'elements[0].type')
  const before = structuredClone(graph)
  const result = planBbmodelSelection(envelope, graph, { unsupportedNodes: 'omit-subtree' })
  expect(result.nodes.map(({ node }) => graph.nodes[node]!.uuid)).toEqual(['root', 'keep'])
  expect(result.nodes[1]!.parent).toBe(result.nodes[0]!.node)
  expect(result.issues).toEqual([
    {
      code: 'unsupported-subtree-omitted',
      node: 0,
      type: 'armature',
      reason: 'element-type',
      path: 'elements[0].type',
      count: 4,
    },
  ])
  expect(graph).toEqual(before)
  for (const type of ['cube', 'mesh']) {
    const invalidContainer = source({
      elements: [
        { uuid: 'parent', type },
        { uuid: 'child', type: 'mesh' },
      ],
      outliner: [{ uuid: 'parent', children: ['child'] }],
    })
    failure(
      () => planBbmodelSelection(invalidContainer.envelope, invalidContainer.graph),
      'unsupported',
      'outliner[0].children',
    )
    const omitted = planBbmodelSelection(invalidContainer.envelope, invalidContainer.graph, {
      unsupportedNodes: 'omit-subtree',
    })
    expect(omitted.nodes).toEqual([])
    expect(omitted.roots).toEqual([])
    expect(omitted.issues).toEqual([
      {
        code: 'unsupported-subtree-omitted',
        node: 0,
        type,
        reason: 'element-children',
        path: 'outliner[0].children',
        count: 2,
      },
    ])
  }
})

test('bbmodel selection does not infer missing types or accept Minecraft/plugin semantics as generic', () => {
  for (const modelFormat of ['bedrock', 'java_block', 'custom-plugin', 'Free']) {
    const input = source({}, '5.0', modelFormat)
    failure(
      () =>
        planBbmodelSelection(input.envelope, input.graph, {
          unsupportedNodes: 'omit-subtree',
          unlisted: 'omit',
        }),
      'unsupported',
      'meta.model_format',
    )
  }
  for (const row of [
    { uuid: 'x' },
    { uuid: 'x', type: 'locator' },
    { uuid: 'x', type: '__proto__' },
    { uuid: 'x', type: 'group' },
  ]) {
    const input = source({ elements: [row], outliner: ['x'] })
    failure(
      () => planBbmodelSelection(input.envelope, input.graph),
      'unsupported',
      'elements[0].type',
    )
    const selected = planBbmodelSelection(input.envelope, input.graph, {
      unsupportedNodes: 'omit-subtree',
    })
    expect(selected.nodes).toEqual([])
    expect(selected.issues).toEqual([
      {
        code: 'unsupported-subtree-omitted',
        node: 0,
        type: 'type' in row ? (row.type ?? null) : null,
        reason: 'element-type',
        path: 'elements[0].type',
        count: 1,
      },
    ])
  }
  for (const type of [null, 42, true, '', []]) {
    const input = source({ elements: [{ uuid: 'x', type }], outliner: ['x'] })
    failure(
      () => planBbmodelSelection(input.envelope, input.graph, { unsupportedNodes: 'omit-subtree' }),
      'invalid',
      'elements[0].type',
    )
  }
})

test('bbmodel selection options are strict and omissions are never the default', () => {
  expect(readBbmodelSelectionOptions({})).toEqual({
    unlisted: 'reject',
    unsupportedNodes: 'reject',
  })
  for (const [value, path] of [
    [null, 'options'],
    [[], 'options'],
    [1, 'options'],
    [{ unlisted: null }, 'options.unlisted'],
    [{ unlisted: 'auto' }, 'options.unlisted'],
    [{ unsupportedNodes: 'promote-children' }, 'options.unsupportedNodes'],
    [{ ignored: true }, 'options.ignored'],
  ] as const)
    failure(() => readBbmodelSelectionOptions(JSON.parse(JSON.stringify(value))), 'invalid', path)
})

test('bbmodel preflights exact native node and geometry limits without reading geometry, pixels or transforms', () => {
  const groups = Array.from({ length: SCENE_LIMITS.nodes + 1 }, (_, i) => ({ uuid: `g${i}` }))
  const exact = source({
    groups: groups.slice(0, -1),
    outliner: groups.slice(0, -1).map(({ uuid }) => ({ uuid })),
  })
  expect(planBbmodelSelection(exact.envelope, exact.graph).nodes.length).toBe(SCENE_LIMITS.nodes)
  const over = source({ groups, outliner: groups.map(({ uuid }) => ({ uuid })) })
  for (const entry of over.graph.nodes)
    Object.defineProperty(entry.source.data, 'origin', {
      get() {
        throw new Error('Coordinates must not be read by structural preflight')
      },
    })
  failure(() => planBbmodelSelection(over.envelope, over.graph), 'budget', 'nodes')
  const elements = Array.from({ length: SCENE_LIMITS.geometries + 1 }, (_, i) => ({
    uuid: `m${i}`,
    type: 'mesh',
    visibility: false,
    export: false,
  }))
  const meshExact = source({
    elements: elements.slice(0, -1),
    outliner: elements.slice(0, -1).map(({ uuid }) => uuid),
  })
  expect(planBbmodelSelection(meshExact.envelope, meshExact.graph).geometries.length).toBe(
    SCENE_LIMITS.geometries,
  )
  const meshOver = source({ elements, outliner: elements.map(({ uuid }) => uuid) })
  for (const entry of meshOver.graph.nodes)
    Object.defineProperty(entry.source.data, 'vertices', {
      get() {
        throw new Error('Geometry must not be read by structural preflight')
      },
    })
  failure(() => planBbmodelSelection(meshOver.envelope, meshOver.graph), 'budget', 'geometries')
})

test('explicitly omitted wide subtrees and unlisted groups do not consume native node budgets', () => {
  const count = SCENE_LIMITS.nodes + 1
  const elements = [
    { uuid: 'root', type: 'armature' },
    ...Array.from({ length: count }, (_, i) => ({ uuid: `m${i}`, type: 'mesh' })),
    { uuid: 'keep', type: 'cube' },
  ]
  const input = source({
    elements,
    outliner: [{ uuid: 'root', children: elements.slice(1, -1).map(({ uuid }) => uuid) }, 'keep'],
  })
  const result = planBbmodelSelection(input.envelope, input.graph, {
    unsupportedNodes: 'omit-subtree',
  })
  expect(result.nodes).toEqual([{ node: count + 1, parent: null, kind: 'cube' }])
  expect(result.issues[0]).toEqual({
    code: 'unsupported-subtree-omitted',
    node: 0,
    type: 'armature',
    reason: 'element-type',
    path: 'elements[0].type',
    count: count + 1,
  })
  const unlisted = source({ groups: Array.from({ length: count }, (_, i) => ({ uuid: `g${i}` })) })
  expect(
    planBbmodelSelection(unlisted.envelope, unlisted.graph, { unlisted: 'omit' }).nodes,
  ).toEqual([])
  failure(
    () => planBbmodelSelection(unlisted.envelope, unlisted.graph, { unlisted: 'append' }),
    'budget',
    'nodes',
  )
})

test('nested omitted structures count every descendant once and leave supported sibling subtrees connected', () => {
  const depth = 48
  const groups = Array.from({ length: depth }, (_, i) => ({ uuid: `g${i}` }))
  let child: unknown = 'leaf'
  for (let i = depth - 1; i >= 0; i--) child = { uuid: `g${i}`, children: [child] }
  const input = source({
    groups: [...groups, { uuid: 'sibling' }],
    elements: [
      { uuid: 'unknown', type: 'armature' },
      { uuid: 'leaf', type: 'cube' },
      { uuid: 'keep', type: 'mesh' },
    ],
    outliner: [
      { uuid: 'unknown', children: [child] },
      { uuid: 'sibling', children: ['keep'] },
    ],
  })
  const result = planBbmodelSelection(input.envelope, input.graph, {
    unsupportedNodes: 'omit-subtree',
  })
  expect(result.issues).toEqual([
    {
      code: 'unsupported-subtree-omitted',
      node: 0,
      type: 'armature',
      reason: 'element-type',
      path: 'elements[0].type',
      count: depth + 2,
    },
  ])
  expect(result.nodes.map(({ node }) => input.graph.nodes[node]!.uuid)).toEqual(['sibling', 'keep'])
  expect(result.nodes[1]!.parent).toBe(result.nodes[0]!.node)
  expect(result.roots).toEqual([result.nodes[0]!.node])
})

test('unlisted append and unsupported-subtree choices are independent and both appear in the report', () => {
  const input = source({
    elements: [
      { uuid: 'unknown', type: 'locator' },
      { uuid: 'keep', type: 'cube' },
    ],
  })
  failure(
    () => planBbmodelSelection(input.envelope, input.graph, { unlisted: 'append' }),
    'unsupported',
    'elements[0].type',
  )
  const result = planBbmodelSelection(input.envelope, input.graph, {
    unlisted: 'append',
    unsupportedNodes: 'omit-subtree',
  })
  expect(result.nodes).toEqual([{ node: 1, parent: null, kind: 'cube' }])
  expect(result.issues).toEqual([
    { code: 'unlisted-nodes-appended', path: 'outliner', count: 2 },
    {
      code: 'unsupported-subtree-omitted',
      node: 0,
      type: 'locator',
      reason: 'element-type',
      path: 'elements[0].type',
      count: 1,
    },
  ])
})

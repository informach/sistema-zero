import { expect, test } from 'bun:test'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { readBbmodelGeometry } from './bbmodelGeometry'
import { BBMODEL_CUBE_DIRECTIONS } from './bbmodelGeometryTypes'
import { readBbmodelGraph } from './bbmodelGraph'
import { BBMODEL_INPUT_LIMITS, BbmodelInputError } from './bbmodelInput'
import { readBbmodelNodeMetadata } from './bbmodelNodeMetadata'
import { planBbmodelSelection } from './bbmodelSelection'
import { readBbmodelTransforms } from './bbmodelTransforms'
import type { BbmodelVec3 } from './bbmodelValues'

function source(
  json: Record<string, unknown> | string,
  version: BbmodelVersion = '5.0',
  modelFormat = 'free',
) {
  const bytes = new TextEncoder().encode(
    typeof json === 'string'
      ? json
      : JSON.stringify({ meta: { format_version: version, model_format: modelFormat }, ...json }),
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

test('common free node metadata preserves source identity, names and flags in all published layouts without native interpretation', () => {
  for (const version of ['4.9', '4.10', '5.0'] as const) {
    const group = {
      uuid: '__proto__',
      name: '  Meu grupo 🐢  ',
      origin: [1.25, -3, 7] satisfies BbmodelVec3,
      rotation: [45.125, 0, -90] satisfies BbmodelVec3,
      visibility: false,
      locked: true,
      export: false,
      scope: 4,
      custom: { script: 'javascript:never()' },
    }
    const input = source(
      {
        elements: [
          { uuid: 'cube', type: 'cube', name: group.name },
          { uuid: 'mesh', type: 'mesh', name: '' },
        ],
        ...(version === '5.0' ? { groups: [group] } : {}),
        outliner: [
          { ...(version === '5.0' ? { uuid: group.uuid } : group), children: ['cube', 'mesh'] },
        ],
      },
      version,
    )
    const before = structuredClone(input)
    const rows = readBbmodelNodeMetadata(input.envelope, input.graph)
    expect(rows.map((row) => [row.node, row.kind])).toEqual([
      [0, 'cube'],
      [1, 'mesh'],
      [2, 'group'],
    ])
    const actual = rows[2]!
    if (actual.kind === 'unresolved') throw new Error('Expected known group metadata')
    expect(actual.name).toBe(group.name)
    expect(actual.visible).toBe(false)
    expect(actual.export).toBe(false)
    expect(actual.locked).toBe(true)
    expect(actual.origin).toEqual(group.origin)
    expect(actual.rotation).toEqual(group.rotation)
    expect(actual.sourcePath).toBe(version === '5.0' ? 'groups[0]' : 'outliner[0]')
    expect(actual.source).toBe(input.graph.nodes[2]!.source.data)
    expect(actual.source.scope).toBe(4)
    expect(actual.source.custom).toEqual(group.custom)
    expect(input).toEqual(before)
    actual.origin[0] = 999
    actual.rotation[0] = 888
    expect(input).toEqual(before)
    const cube = rows[0]!
    if (cube.kind === 'unresolved') throw new Error('Expected known cube metadata')
    expect(cube.origin).toEqual([0, 0, 0])
    expect(cube.rotation).toEqual([0, 0, 0])
    expect([cube.visible, cube.export, cube.locked]).toEqual([true, true, false])
    expect(cube.name).toBe(group.name)
    const mesh = rows[1]!
    if (mesh.kind === 'unresolved') throw new Error('Expected known mesh metadata')
    expect(mesh.name).toBe('')
  }
})

test('metadata validates known unlisted groups and known descendants of omitted subtrees independently of selection', () => {
  const unlisted = source({ groups: [{ uuid: 'g', origin: ['bad', 0, 0] }] })
  expect(
    planBbmodelSelection(unlisted.envelope, unlisted.graph, { unlisted: 'omit' }).nodes,
  ).toEqual([])
  failure(
    () => readBbmodelNodeMetadata(unlisted.envelope, unlisted.graph),
    'invalid',
    'groups[0].origin[0]',
  )
  const subtree = source({
    elements: [
      { uuid: 'rig', type: 'armature' },
      { uuid: 'mesh', type: 'mesh', locked: 'no' },
    ],
    outliner: [{ uuid: 'rig', children: ['mesh'] }],
  })
  expect(
    planBbmodelSelection(subtree.envelope, subtree.graph, { unsupportedNodes: 'omit-subtree' })
      .nodes,
  ).toEqual([])
  failure(
    () => readBbmodelNodeMetadata(subtree.envelope, subtree.graph),
    'invalid',
    'elements[1].locked',
  )
})

test('unknown node schemas stay unresolved and inert, not guessed from group-like fields', () => {
  const input = source({
    elements: [
      {
        uuid: 'unknown',
        type: 'plugin',
        name: { opaque: true },
        origin: { plugin: 'origin' },
        locked: ['plugin-lock'],
      },
      { uuid: 'missing', origin: [0, 0] },
      { uuid: 'group-like', type: 'group', children: [] },
    ],
  })
  const result = readBbmodelNodeMetadata(input.envelope, input.graph)
  expect(result.map((row) => ({ ...row, source: undefined }))).toEqual([
    { kind: 'unresolved', node: 0, sourcePath: 'elements[0]', type: 'plugin', source: undefined },
    { kind: 'unresolved', node: 1, sourcePath: 'elements[1]', type: null, source: undefined },
    { kind: 'unresolved', node: 2, sourcePath: 'elements[2]', type: 'group', source: undefined },
  ])
  for (let i = 0; i < result.length; i++)
    expect(result[i]!.source).toBe(input.graph.nodes[i]!.source.data)
})

test('common values are independently owned and consistent with the established geometry reader', () => {
  const input = source({
    elements: [
      {
        uuid: 'cube',
        type: 'cube',
        origin: [1, 2, 3],
        rotation: [4, 5, 6],
        visibility: false,
        export: false,
        from: [0, 0, 0],
        to: [1, 1, 1],
        faces: Object.fromEntries(
          BBMODEL_CUBE_DIRECTIONS.map((direction) => [
            direction,
            { uv: [0, 0, 1, 1], texture: false },
          ]),
        ),
      },
    ],
  })
  const metadata = readBbmodelNodeMetadata(input.envelope, input.graph)[0]!
  const geometry = readBbmodelGeometry(input.graph)[0]!
  if (metadata.kind === 'unresolved' || geometry.kind === 'unresolved')
    throw new Error('Expected known cube')
  expect(geometry.origin).toEqual(metadata.origin)
  expect(geometry.rotation).toEqual(metadata.rotation)
  expect([geometry.visible, geometry.export, geometry.sourcePath]).toEqual([
    metadata.visible,
    metadata.export,
    metadata.sourcePath,
  ])
  geometry.origin[0] = 99
  expect(metadata.origin[0]).toBe(1)
  expect(input.graph.nodes[0]!.source.data.origin).toEqual([1, 2, 3])
})

test('known node names, boolean flags, tuples and type identifiers reject malformed values with source provenance', () => {
  for (const [field, value, suffix] of [
    ['name', null, 'name'],
    ['name', 42, 'name'],
    ['locked', 1, 'locked'],
    ['visibility', 'false', 'visibility'],
    ['export', null, 'export'],
    ['origin', null, 'origin'],
    ['origin', [1, 2], 'origin'],
    ['origin', [1, null, 3], 'origin[1]'],
    ['rotation', [0, '90', 0], 'rotation[1]'],
  ] as const) {
    for (const group of [true, false]) {
      const input = source(
        group
          ? { groups: [{ uuid: 'g', [field]: value }] }
          : { elements: [{ uuid: 'c', type: 'cube', [field]: value }] },
      )
      failure(
        () => readBbmodelNodeMetadata(input.envelope, input.graph),
        'invalid',
        `${group ? 'groups' : 'elements'}[0].${suffix}`,
      )
    }
  }
  for (const type of ['', null, 1, []]) {
    const input = source({ elements: [{ uuid: 'x', type }] })
    failure(
      () => readBbmodelNodeMetadata(input.envelope, input.graph),
      'invalid',
      'elements[0].type',
    )
  }
  const nonFinite = source(
    '{"meta":{"format_version":"5.0","model_format":"free"},"groups":[{"uuid":"g","rotation":[0,1e400,0]}]}',
  )
  failure(
    () => readBbmodelNodeMetadata(nonFinite.envelope, nonFinite.graph),
    'invalid',
    'groups[0].rotation[1]',
  )
})

test('metadata bounds text without trimming or generating names, and preserves missing names distinctly', () => {
  const exact = source({
    groups: [
      { uuid: 'missing' },
      { uuid: 'empty', name: '' },
      { uuid: 'spaces', name: '  ' },
      { uuid: 'max', name: 'X'.repeat(BBMODEL_INPUT_LIMITS.identifierChars) },
    ],
  })
  const rows = readBbmodelNodeMetadata(exact.envelope, exact.graph)
  expect(rows.map((row) => (row.kind === 'unresolved' ? 'unexpected' : row.name))).toEqual([
    null,
    '',
    '  ',
    'X'.repeat(BBMODEL_INPUT_LIMITS.identifierChars),
  ])
  const over = source({
    groups: [{ uuid: 'g', name: 'X'.repeat(BBMODEL_INPUT_LIMITS.identifierChars + 1) }],
  })
  failure(() => readBbmodelNodeMetadata(over.envelope, over.graph), 'budget', 'groups[0].name')
})

test('source metadata keeps finite Float64 coordinates, signed zero and full source node limits separate from native conversion', () => {
  const input = source(
    '{"meta":{"format_version":"5.0","model_format":"free"},"groups":[{"uuid":"g","origin":[-0,1e-50,1e308],"rotation":[-0,0,0]}],"outliner":[{"uuid":"g"}]}',
  )
  const row = readBbmodelNodeMetadata(input.envelope, input.graph)[0]!
  if (row.kind === 'unresolved') throw new Error('Expected known group')
  expect(Object.is(row.origin[0], -0)).toBe(true)
  expect(Object.is(row.rotation[0], -0)).toBe(true)
  expect(row.origin).toEqual([-0, 1e-50, 1e308])
  const selected = planBbmodelSelection(input.envelope, input.graph)
  failure(() => readBbmodelTransforms(input.graph, selected), 'unsupported', 'groups[0]')
  const groups = Array.from({ length: BBMODEL_INPUT_LIMITS.nodes }, (_, i) => ({ uuid: `g${i}` }))
  const maximum = source({ groups })
  const rows = readBbmodelNodeMetadata(maximum.envelope, maximum.graph)
  expect(rows.length).toBe(BBMODEL_INPUT_LIMITS.nodes)
  expect(rows[rows.length - 1]!.node).toBe(BBMODEL_INPUT_LIMITS.nodes - 1)
  expect(rows[rows.length - 1]!.sourcePath).toBe(`groups[${BBMODEL_INPUT_LIMITS.nodes - 1}]`)
  expect(maximum.graph.unlisted.length).toBe(BBMODEL_INPUT_LIMITS.nodes)
})

test('free group defaults are not applied to formats with different or unknown semantics', () => {
  for (const modelFormat of ['bedrock', 'java_block', 'plugin', 'Free']) {
    const input = source({ groups: [{ uuid: 'g' }] }, '5.0', modelFormat)
    failure(
      () => readBbmodelNodeMetadata(input.envelope, input.graph),
      'unsupported',
      'meta.model_format',
    )
  }
})

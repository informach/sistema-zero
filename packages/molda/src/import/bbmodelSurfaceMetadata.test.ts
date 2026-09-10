import { expect, test } from 'bun:test'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { readBbmodelGraph } from './bbmodelGraph'
import { BBMODEL_INPUT_LIMITS, BbmodelInputError } from './bbmodelInput'
import { readBbmodelNodeMetadata } from './bbmodelNodeMetadata'
import { readBbmodelSurfaceMetadata } from './bbmodelSurfaceMetadata'

function fixture(
  elements: Record<string, unknown>[] = [
    { uuid: 'cube', type: 'cube' },
    { uuid: 'mesh', type: 'mesh' },
  ],
  version: BbmodelVersion = '5.0',
  group: Record<string, unknown> = {},
) {
  const root = { uuid: 'group', ...group },
    envelope = readBbmodelEnvelope(
      new TextEncoder().encode(
        JSON.stringify({
          meta: { format_version: version, model_format: 'free' },
          elements,
          ...(version === '5.0'
            ? {
                groups: [root],
                outliner: [
                  { uuid: 'group', children: elements.slice(0, 2).map((row) => row.uuid) },
                ],
              }
            : { outliner: [{ ...root, children: elements.slice(0, 2).map((row) => row.uuid) }] }),
        }),
      ),
    ),
    graph = readBbmodelGraph(envelope),
    metadata = readBbmodelNodeMetadata(envelope, graph)
  return { metadata, graph }
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
function poison(target: object, key: string) {
  Object.defineProperty(target, key, {
    get() {
      throw new Error(`Unexpected read: ${key}`)
    },
  })
}

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s reads source surface descriptors without guessing marker RGB or discarding literal seam identities', (version) => {
  const input = fixture(
      [
        { uuid: 'cube', type: 'cube', name: 'Caixa', color: 7.5, shade: false },
        {
          uuid: 'mesh',
          type: 'mesh',
          color: -12.5,
          shading: 'plugin-shading',
          render_order: 'plugin-order',
          seams: Object.fromEntries([
            ['__proto__', 'join'],
            ['a_b_c', 'divide'],
          ]),
        },
        { uuid: 'unlisted', type: 'cube', color: 1e308 },
        { uuid: 'opaque', type: 'plugin', color: 'not-a-number', seams: null },
      ],
      version,
      { color: 5 },
    ),
    before = structuredClone(input),
    result = readBbmodelSurfaceMetadata(input.metadata)
  expect(input.graph.unlisted).toEqual([2, 3])
  expect(result).toEqual([
    {
      kind: 'cube',
      node: 0,
      name: 'Caixa',
      sourcePath: 'elements[0]',
      markerColor: 7.5,
      shade: false,
    },
    {
      kind: 'mesh',
      node: 1,
      name: null,
      sourcePath: 'elements[1]',
      markerColor: -12.5,
      shading: 'plugin-shading',
      renderOrder: 'plugin-order',
      seams: new Map([
        ['__proto__', 'join'],
        ['a_b_c', 'divide'],
      ]),
    },
    {
      kind: 'cube',
      node: 2,
      name: null,
      sourcePath: 'elements[2]',
      markerColor: 1e308,
      shade: true,
    },
    { kind: 'unresolved', node: 3, sourcePath: 'elements[3]' },
    {
      kind: 'group',
      node: 4,
      name: null,
      sourcePath: version === '5.0' ? 'groups[0]' : 'outliner[0]',
      markerColor: 5,
    },
  ])
  const mesh = result[1]!
  if (mesh.kind !== 'mesh' || !(mesh.seams instanceof Map))
    throw new Error('Owned seam map expected')
  mesh.seams.set('a_b_c', 'edited')
  expect(input).toEqual(before)
  const reread = readBbmodelSurfaceMetadata(input.metadata)[1]!
  if (reread.kind !== 'mesh') throw new Error('Mesh expected')
  expect(reread.seams.get('a_b_c')).toBe('divide')
})

test('bbmodel surface defaults keep missing marker indices explicit and do not read geometry, UV or opaque plugin fields', () => {
  const input = fixture([
    { uuid: 'cube', type: 'cube' },
    { uuid: 'mesh', type: 'mesh' },
    { uuid: 'plugin', type: 'plugin' },
  ])
  for (const row of input.metadata)
    for (const key of ['faces', 'vertices', 'from', 'to', 'uv_offset']) poison(row.source, key)
  poison(input.metadata[2]!, 'source')
  const result = readBbmodelSurfaceMetadata(input.metadata)
  expect(result[0]).toEqual({
    kind: 'cube',
    node: 0,
    name: null,
    sourcePath: 'elements[0]',
    markerColor: null,
    shade: true,
  })
  expect(result[1]).toEqual({
    kind: 'mesh',
    node: 1,
    name: null,
    sourcePath: 'elements[1]',
    markerColor: null,
    shading: 'flat',
    renderOrder: 'default',
    seams: new Map(),
  })
  expect(result[2]).toEqual({ kind: 'unresolved', node: 2, sourcePath: 'elements[2]' })
})

test('bbmodel known surface fields are strict even for unlisted or hidden pieces', () => {
  for (const color of [null, true, '0', [], {}]) {
    const input = fixture([
      { uuid: 'cube', type: 'cube' },
      { uuid: 'mesh', type: 'mesh' },
      { uuid: 'unlisted', type: 'cube', visibility: false, color },
    ])
    failure(() => readBbmodelSurfaceMetadata(input.metadata), 'invalid', 'elements[2].color')
  }
  for (const shade of [null, 0, 'false'])
    failure(
      () => readBbmodelSurfaceMetadata(fixture([{ uuid: 'cube', type: 'cube', shade }]).metadata),
      'invalid',
      'elements[0].shade',
    )
  for (const field of ['shading', 'render_order'])
    for (const value of [null, true, 0, ''])
      failure(
        () =>
          readBbmodelSurfaceMetadata(
            fixture([{ uuid: 'mesh', type: 'mesh', [field]: value }]).metadata,
          ),
        'invalid',
        `elements[0].${field}`,
      )
  for (const seams of [null, [], true, 'none'])
    failure(
      () => readBbmodelSurfaceMetadata(fixture([{ uuid: 'mesh', type: 'mesh', seams }]).metadata),
      'invalid',
      'elements[0].seams',
    )
  for (const value of [null, false, 1, ''])
    failure(
      () =>
        readBbmodelSurfaceMetadata(
          fixture([{ uuid: 'mesh', type: 'mesh', seams: { a_b: value } }]).metadata,
        ),
      'invalid',
      'elements[0].seams["a_b"]',
    )
})

test('bbmodel surface metadata retains signed zero and rejects numeric overflow from JSON', () => {
  for (const literal of ['-0', '1e-308', '1e400']) {
    const envelope = readBbmodelEnvelope(
        new TextEncoder().encode(
          `{"meta":{"format_version":"5.0","model_format":"free"},"elements":[{"uuid":"cube","type":"cube","color":${literal}}]}`,
        ),
      ),
      metadata = readBbmodelNodeMetadata(envelope, readBbmodelGraph(envelope))
    if (literal === '1e400') {
      failure(() => readBbmodelSurfaceMetadata(metadata), 'invalid', 'elements[0].color')
      continue
    }
    const result = readBbmodelSurfaceMetadata(metadata)[0]!
    if (result.kind === 'unresolved') throw new Error('Known source expected')
    expect(Object.is(result.markerColor, Number(literal))).toBe(true)
  }
})

test('bbmodel surface seam budget is aggregate across all known meshes before marker values or output maps', () => {
  const half = BBMODEL_INPUT_LIMITS.geometrySeams / 2,
    seams = Object.fromEntries(Array.from({ length: half }, (_, i) => [`edge_${i}`, 'divide'])),
    input = fixture([
      { uuid: 'a', type: 'mesh', seams },
      { uuid: 'b', type: 'mesh', seams },
    ]),
    result = readBbmodelSurfaceMetadata(input.metadata)
  for (const row of result.slice(0, 2)) {
    if (row.kind !== 'mesh') throw new Error('Mesh expected')
    expect(row.seams.size).toBe(half)
    expect(row.seams.get(`edge_${half - 1}`)).toBe('divide')
  }
  // Instrument matching private JSON to prove the gate precedes any numeric read.
  poison(input.metadata[0]!.source, 'color')
  const sourceSeams = input.metadata[1]!.source.seams as Record<string, unknown>
  sourceSeams.excess = 'join'
  failure(() => readBbmodelSurfaceMetadata(input.metadata), 'budget', 'elements[1].seams')
  failure(
    () => readBbmodelSurfaceMetadata(Array(BBMODEL_INPUT_LIMITS.nodes + 1).fill(input.metadata[0])),
    'budget',
    'nodes',
  )
})

test('bbmodel surface labels and seam keys obey bounded literal-string contracts', () => {
  const long = 'x'.repeat(BBMODEL_INPUT_LIMITS.identifierChars + 1)
  for (const field of ['shading', 'render_order'])
    failure(
      () =>
        readBbmodelSurfaceMetadata(
          fixture([{ uuid: 'mesh', type: 'mesh', [field]: long }]).metadata,
        ),
      'budget',
      `elements[0].${field}`,
    )
  failure(
    () =>
      readBbmodelSurfaceMetadata(
        fixture([{ uuid: 'mesh', type: 'mesh', seams: { [long]: 'divide' } }]).metadata,
      ),
    'budget',
    'elements[0].seams',
  )
  failure(
    () =>
      readBbmodelSurfaceMetadata(
        fixture([{ uuid: 'mesh', type: 'mesh', seams: { a: long } }]).metadata,
      ),
    'budget',
    'elements[0].seams["a"]',
  )
})

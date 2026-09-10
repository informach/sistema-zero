import { expect, test } from 'bun:test'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { readBbmodelGeometry } from './bbmodelGeometry'
import { planBbmodelGeometry } from './bbmodelGeometryPlan'
import {
  BBMODEL_CUBE_DIRECTIONS,
  type BbmodelCube,
  type BbmodelMesh,
  type BbmodelTextureReference,
} from './bbmodelGeometryTypes'
import { readBbmodelGraph } from './bbmodelGraph'
import { BBMODEL_INPUT_LIMITS, BbmodelInputError } from './bbmodelInput'

function cube(overrides: Record<string, unknown> = {}) {
  return {
    uuid: 'cube',
    type: 'cube',
    from: [-2, 0, 1],
    to: [3, 6, 4],
    faces: Object.fromEntries(
      BBMODEL_CUBE_DIRECTIONS.map((direction) => [direction, { uv: [0, 0, 16, 16] }]),
    ),
    ...overrides,
  }
}
function mesh(overrides: Record<string, unknown> = {}) {
  return {
    uuid: 'mesh',
    type: 'mesh',
    vertices: { a: [0, 0, 0], b: [2, 0, 0], c: [0, 2, 0], unused: [99, -3, 4] },
    faces: {
      triangle: {
        vertices: ['a', 'b', 'c'],
        uv: { a: [0, 0], b: [16, 0], c: [0, 16] },
        texture: 0,
      },
    },
    ...overrides,
  }
}
function graph(elements: Record<string, unknown>[], version: BbmodelVersion = '5.0') {
  const parsed = readBbmodelEnvelope(
    new TextEncoder().encode(
      JSON.stringify({
        meta: { format_version: version, model_format: 'free' },
        elements,
        outliner: elements.map((entry) => entry.uuid),
      }),
    ),
  )
  return readBbmodelGraph(parsed)
}
/** Direct stage fixture: independent of the earlier file/JSON structure budget. */
function rawGraph(elements: Record<string, unknown>[]) {
  const parsed = readBbmodelEnvelope(
    new TextEncoder().encode('{"meta":{"format_version":"5.0","model_format":"free"}}'),
  )
  parsed.json.elements = elements
  return readBbmodelGraph(parsed)
}
function errorOf(run: () => unknown, reason: BbmodelInputError['reason'], path?: string) {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(BbmodelInputError)
  expect((error as BbmodelInputError).reason).toBe(reason)
  if (path !== undefined) expect((error as BbmodelInputError).path).toBe(path)
}
const failure = (
  row: Record<string, unknown>,
  reason: BbmodelInputError['reason'],
  path?: string,
) => errorOf(() => readBbmodelGeometry(rawGraph([row])), reason, path)

test('reads the same cube and mesh source in all three revisions without applying transforms or UV conversion', () => {
  for (const version of ['4.9', '4.10', '5.0'] as const) {
    const source = graph(
      [
        cube({
          origin: [2, 3, 4],
          rotation: [17, -28, 361],
          inflate: -0.5,
          stretch: [2, 0, -1],
          rescale: true,
          mirror_uv: true,
          uv_offset: [-3.5, 20],
          box_uv: true,
          visibility: false,
          export: false,
        }),
        mesh({
          origin: [8, 9, 10],
          rotation: [11, 12, 13],
          shading: 'smooth',
          seams: { a_b: 'divide' },
        }),
      ],
      version,
    )
    const before = structuredClone(source)
    const shapes = readBbmodelGeometry(source)
    const c = shapes[0] as BbmodelCube
    expect(c.kind).toBe('cube')
    expect(c.node).toBe(0)
    expect(c.from).toEqual([-2, 0, 1])
    expect(c.to).toEqual([3, 6, 4])
    expect(c.origin).toEqual([2, 3, 4])
    expect(c.rotation).toEqual([17, -28, 361])
    expect(c.stretch).toEqual([2, 0, -1])
    expect(c.inflate).toBe(-0.5)
    expect([c.rescale, c.mirrorUv, c.boxUv, c.visible, c.export]).toEqual([
      true,
      true,
      true,
      false,
      false,
    ])
    expect(c.uvOffset).toEqual([-3.5, 20])
    expect(c.faces.map((face) => face.direction)).toEqual([...BBMODEL_CUBE_DIRECTIONS])
    expect(c.faces[0]!.uv).toEqual([0, 0, 16, 16])
    const m = shapes[1] as BbmodelMesh
    expect(m.kind).toBe('mesh')
    expect(m.vertexIds).toEqual(['a', 'b', 'c', 'unused'])
    expect([...m.positions]).toEqual([0, 0, 0, 2, 0, 0, 0, 2, 0, 99, -3, 4])
    expect(m.origin).toEqual([8, 9, 10])
    expect(m.rotation).toEqual([11, 12, 13])
    expect([...m.faces[0]!.vertices]).toEqual([0, 1, 2])
    expect(m.faces[0]!.uv.get('c')).toEqual([0, 16])
    expect(source).toEqual(before)
  }
})

test('distinguishes absent, false, null, index zero and UUID textures, without resolving or decoding resources', () => {
  const refs = [undefined, false, null, 0, 9007199254740991, 'texture-uuid']
  const expected: BbmodelTextureReference[] = [
    { kind: 'default' },
    { kind: 'none' },
    { kind: 'disabled' },
    { kind: 'index', index: 0 },
    { kind: 'index', index: 9007199254740991 },
    { kind: 'uuid', uuid: 'texture-uuid' },
  ]
  const faces = Object.fromEntries(
    BBMODEL_CUBE_DIRECTIONS.map((direction, i) => [
      direction,
      { uv: [16, -2, -3, 18], rotation: i * 90, texture: refs[i] },
    ]),
  )
  const c = readBbmodelGeometry(graph([cube({ faces })]))[0] as BbmodelCube
  expect(c.faces.map((face) => face.texture)).toEqual(expected)
  expect(c.faces[5]!.rotation).toBe(450)
  expect(c.faces[0]!.uv).toEqual([16, -2, -3, 18])
  const m = readBbmodelGeometry(
    graph([
      mesh({
        faces: Object.fromEntries(
          refs.map((texture, i) => [`f${i}`, { vertices: ['a', 'b', 'c'], texture }]),
        ),
      }),
    ]),
  )[0] as BbmodelMesh
  expect(m.faces.map((face) => face.texture)).toEqual(expected)
  for (const face of m.faces) expect(face.uv.size).toBe(0)
  for (const texture of [true, -1, 0.5, Infinity, NaN, 9007199254740992, {}, [], ''])
    failure(
      mesh({ faces: { face: { vertices: ['a'], texture } } }),
      'invalid',
      'elements[0].faces["face"].texture',
    )
})

test('preserves all mesh vertices, face arities/order/repetitions, missing UV and surplus UV without inventing values', () => {
  const source = graph([
    mesh({
      faces: {
        none: { vertices: [] },
        point: { vertices: ['unused'] },
        edge: { vertices: ['b', 'a'] },
        repeated: { vertices: ['a', 'b', 'c', 'a'], uv: { a: [-2, 5], stale: [77, 88] } },
        many: { vertices: new Array(64).fill('a'), texture: null },
      },
    }),
  ])
  const m = readBbmodelGeometry(source)[0] as BbmodelMesh
  expect(m.faces.map((face) => face.vertices.length)).toEqual([0, 1, 2, 4, 64])
  expect([...m.faces[2]!.vertices]).toEqual([1, 0])
  expect([...m.faces[3]!.vertices]).toEqual([0, 1, 2, 0])
  expect(m.faces[3]!.uv.get('b')).toBeUndefined()
  expect(m.faces[3]!.uv.get('a')).toEqual([-2, 5])
  expect(m.faces[3]!.uv.get('stale')).toEqual([77, 88])
  expect(m.positions).toHaveLength(12)
  const empty = readBbmodelGeometry(graph([mesh({ vertices: {}, faces: {} })]))[0] as BbmodelMesh
  expect(empty.positions).toHaveLength(0)
  expect(empty.faces).toEqual([])
  failure(
    mesh({ faces: { f: { vertices: ['missing'] } } }),
    'invalid',
    'elements[0].faces["f"].vertices[0]',
  )
  failure(
    mesh({ faces: { f: { vertices: new Array(65).fill('a') } } }),
    'budget',
    'elements[0].faces["f"].vertices',
  )
})

test('treats dictionary ids literally and keeps prototype-like names out of object-indexed derived state', () => {
  const ids = ['__proto__', 'constructor', 'toString', 'a.b["x"]\n']
  const vertices = Object.fromEntries(ids.map((id, i) => [id, [i, i + 1, i + 2]]))
  const uv = Object.fromEntries(ids.map((id, i) => [id, [i, -i]]))
  const faces = Object.fromEntries([['__proto__', { vertices: ids, uv }]])
  const m = readBbmodelGeometry(graph([mesh({ vertices, faces })]))[0] as BbmodelMesh
  expect(m.vertexIds).toEqual(ids)
  expect(m.faces[0]!.id).toBe('__proto__')
  expect([...m.faces[0]!.vertices]).toEqual([0, 1, 2, 3])
  expect(m.faces[0]!.uv.get('__proto__')).toEqual([0, 0])
  expect(m.faces[0]!.uv.get(ids[3]!)).toEqual([3, -3])
  expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false)
  vertices[ids[3]!] = [0, Infinity, 0]
  failure(
    mesh({ vertices, faces }),
    'invalid',
    `elements[0].vertices[${JSON.stringify(ids[3])}][1]`,
  )
})

test('owns numeric output and defaults, preserves signed zero/subnormals/extreme finite values and keeps raw semantics separate', () => {
  const source = rawGraph([
    cube(),
    mesh({
      vertices: { a: [-0, Number.MIN_VALUE, 1e308] },
      faces: { f: { vertices: ['a'], uv: { a: [-0, 1e308] }, custom: 'inert' } },
    }),
  ])
  const [c, m] = readBbmodelGeometry(source) as [BbmodelCube, BbmodelMesh]
  expect(Object.is(m.positions[0], -0)).toBe(true)
  expect(m.positions[1]).toBe(Number.MIN_VALUE)
  expect(m.positions[2]).toBe(1e308)
  expect(Object.is(m.faces[0]!.uv.get('a')![0], -0)).toBe(true)
  expect(c.boxUv).toBeNull()
  expect(c.origin).toEqual([0, 0, 0])
  expect(c.rotation).toEqual([0, 0, 0])
  expect(c.stretch).toEqual([1, 1, 1])
  expect([c.inflate, c.rescale, c.mirrorUv, c.visible, c.export]).toEqual([
    0,
    false,
    false,
    true,
    true,
  ])
  c.origin[0] = 8
  c.from[0] = 55
  m.positions.fill(9)
  m.faces[0]!.vertices.fill(7)
  m.faces[0]!.uv.get('a')![1] = 4
  m.vertexIds[0] = 'changed'
  const again = readBbmodelGeometry(source) as [BbmodelCube, BbmodelMesh]
  expect(again[0].origin).toEqual([0, 0, 0])
  expect(again[0].from).toEqual([-2, 0, 1])
  expect(again[1].vertexIds).toEqual(['a'])
  expect(Object.is(again[1].positions[0], -0)).toBe(true)
  expect(again[1].faces[0]!.uv.get('a')).toEqual([-0, 1e308])
  expect(m.faces[0]!.source).toBe(again[1].faces[0]!.source)
})

test('never substitutes cube for unknown/missing element types and leaves groups to their own reader', () => {
  const source = graph([
    { uuid: 'missing' },
    { uuid: 'plugin', type: 'plugin_cube', faces: 'not-read' },
    { uuid: 'locator', type: 'locator' },
  ])
  expect(readBbmodelGeometry(source)).toEqual([
    { kind: 'unresolved', node: 0, sourcePath: 'elements[0]', type: null },
    { kind: 'unresolved', node: 1, sourcePath: 'elements[1]', type: 'plugin_cube' },
    { kind: 'unresolved', node: 2, sourcePath: 'elements[2]', type: 'locator' },
  ])
  const grouped = readBbmodelGraph(
    readBbmodelEnvelope(
      new TextEncoder().encode(
        '{"meta":{"format_version":"5.0","model_format":"free"},"groups":[{"uuid":"g","faces":false}],"outliner":[{"uuid":"g","children":[]}]}',
      ),
    ),
  )
  expect(readBbmodelGeometry(grouped)).toEqual([])
  for (const type of [null, '', 0, true, {}]) failure(mesh({ type }), 'invalid', 'elements[0].type')
  const incomplete = cube()
  delete incomplete.faces.north
  failure(incomplete, 'unsupported', 'elements[0].faces')
  failure(
    cube({ faces: { ...cube().faces, extra: { uv: [0, 0, 1, 1] } } }),
    'unsupported',
    'elements[0].faces',
  )
})

test('rejects malformed numeric fields, sparse arrays and booleans even when shapes/faces are hidden', () => {
  for (const bad of [null, false, '1', NaN, Infinity, -Infinity, {}, []]) {
    failure(cube({ inflate: bad }), 'invalid', 'elements[0].inflate')
    failure(
      mesh({ visibility: false, vertices: { a: [0, bad, 0] }, faces: {} }),
      'invalid',
      'elements[0].vertices["a"][1]',
    )
    failure(
      mesh({ faces: { f: { texture: null, uv: { unused: [bad, 0] } } } }),
      'invalid',
      'elements[0].faces["f"].uv["unused"][0]',
    )
  }
  for (const field of ['from', 'to', 'origin', 'rotation', 'stretch']) {
    for (const bad of [null, [0, 0], [0, 0, 0, 0], new Array(3)])
      failure(cube({ [field]: bad }), 'invalid')
  }
  for (const field of ['visibility', 'export', 'box_uv', 'rescale', 'mirror_uv'])
    for (const bad of [null, 0, 'false', {}])
      failure(cube({ [field]: bad }), 'invalid', `elements[0].${field}`)
  for (const bad of [null, {}, ['a', null], new Array(2)])
    failure(mesh({ faces: { f: { vertices: bad } } }), 'invalid')
  for (const bad of [null, [], false]) {
    failure(mesh({ vertices: bad }), 'invalid', 'elements[0].vertices')
    failure(mesh({ faces: bad }), 'invalid', 'elements[0].faces')
    failure(mesh({ faces: { f: { uv: bad } } }), 'invalid', 'elements[0].faces["f"].uv')
  }
})

test('bounds aggregate mesh corners and UV records before any coordinate materialization', () => {
  const count = BBMODEL_INPUT_LIMITS.geometryCorners / BBMODEL_INPUT_LIMITS.faceCorners
  const corners = new Array(64).fill('a')
  const rows = Object.fromEntries(
    Array.from({ length: count }, (_, i) => [`f${i}`, { vertices: corners }]),
  )
  const source = rawGraph([cube({ from: 'must-not-read' }), mesh({ faces: rows })])
  expect(planBbmodelGeometry(source)).toHaveLength(2)
  rows.extra = { vertices: ['a'] }
  errorOf(() => readBbmodelGeometry(source), 'budget')
  const uv = Object.fromEntries(Array.from({ length: 64 }, (_, i) => [`v${i}`, 'must-not-read']))
  const uvRows: Record<string, unknown> = Object.fromEntries(
    Array.from({ length: BBMODEL_INPUT_LIMITS.geometryUvPoints / 64 }, (_, i) => [`f${i}`, { uv }]),
  )
  const uvSource = rawGraph([cube({ from: 'must-not-read' }), mesh({ faces: uvRows })])
  expect(planBbmodelGeometry(uvSource)).toHaveLength(2)
  uvRows.extra = { uv: { extra: [0, 0] } }
  errorOf(() => readBbmodelGeometry(uvSource), 'budget')
})

test('preflights aggregate vertex/face counts and bounded dictionary keys before invalid numeric rows', () => {
  const vertices: Record<string, unknown> = Object.fromEntries(
    Array.from({ length: BBMODEL_INPUT_LIMITS.geometryVertices }, (_, i) => [
      `v${i}`,
      'must-not-read',
    ]),
  )
  const source = rawGraph([mesh({ vertices, faces: {} })])
  expect(planBbmodelGeometry(source)).toHaveLength(1)
  const excess = rawGraph([
    mesh({ uuid: 'first', vertices, faces: {} }),
    mesh({ uuid: 'second', vertices: { extra: [0, 0, 0] }, faces: {} }),
  ])
  errorOf(() => readBbmodelGeometry(excess), 'budget', 'elements[1].vertices')
  const faces: Record<string, unknown> = Object.fromEntries(
    Array.from({ length: BBMODEL_INPUT_LIMITS.geometryFaces - 6 }, (_, i) => [`f${i}`, {}]),
  )
  const facesSource = rawGraph([cube({ from: 'must-not-read' }), mesh({ vertices: {}, faces })])
  expect(planBbmodelGeometry(facesSource)).toHaveLength(2)
  faces.extra = {}
  errorOf(() => readBbmodelGeometry(facesSource), 'budget', 'elements[1].faces')
  failure(mesh({ vertices: { '': [0, 0, 0] }, faces: {} }), 'invalid', 'elements[0].vertices')
  failure(
    mesh({
      vertices: { ['x'.repeat(BBMODEL_INPUT_LIMITS.identifierChars + 1)]: [0, 0, 0] },
      faces: {},
    }),
    'budget',
    'elements[0].vertices',
  )
})

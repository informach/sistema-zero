import { expect, test } from 'bun:test'
import { SCENE_LIMITS } from '../scene/limits'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { readBbmodelGeometry } from './bbmodelGeometry'
import { BBMODEL_CUBE_DIRECTIONS, type BbmodelCube, type BbmodelMesh } from './bbmodelGeometryTypes'
import { readBbmodelGraph } from './bbmodelGraph'
import { BbmodelInputError } from './bbmodelInput'
import {
  planBbmodelNativeGeometry,
  readBbmodelNativeGeometryOptions,
} from './bbmodelNativeGeometryPlan'
import { planBbmodelSelection } from './bbmodelSelection'

function cube(overrides: Record<string, unknown> = {}) {
  return {
    uuid: 'cube',
    type: 'cube',
    from: [-2, 3, 4],
    to: [5, 6, 7],
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
    vertices: Object.fromEntries([
      ['__proto__', [0, 0, 0]],
      ['with space', [2, 0, 0]],
      ['c', [2, 2, 0]],
      ['d', [0, 2, 1]],
      ['unused', [99, 1, 2]],
    ]),
    faces: { quad: { vertices: ['__proto__', 'with space', 'c', 'd'] } },
    ...overrides,
  }
}
function fixture(
  elements: Record<string, unknown>[],
  version: BbmodelVersion = '5.0',
  outliner = elements.map((row) => row.uuid),
) {
  const envelope = readBbmodelEnvelope(
    new TextEncoder().encode(
      JSON.stringify({
        meta: { format_version: version, model_format: 'free' },
        elements,
        outliner,
      }),
    ),
  )
  const graph = readBbmodelGraph(envelope)
  return {
    source: readBbmodelGeometry(graph),
    selection: planBbmodelSelection(envelope, graph, { unlisted: 'omit' }),
  }
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
function poison(target: object, ...keys: string[]) {
  for (const key of keys)
    Object.defineProperty(target, key, {
      get() {
        throw new Error(`Unexpected value read: ${key}`)
      },
    })
}

test('bbmodel topology keeps cube surface cycles and source-corner mappings in all supported revisions', () => {
  // Independently specified outward cube cycles, binary XYZ vertex indices, TL/BL/BR/TR UV order.
  const cycles = [
    [6, 4, 0, 2],
    [7, 5, 4, 6],
    [3, 1, 5, 7],
    [2, 0, 1, 3],
    [2, 3, 7, 6],
    [1, 0, 4, 5],
  ]
  for (const version of ['4.9', '4.10', '5.0'] as const) {
    const { source, selection } = fixture(
      [cube({ visibility: false, export: false }), mesh()],
      version,
    )
    const before = structuredClone(source)
    const result = planBbmodelNativeGeometry(source, selection)
    expect(result.costs).toEqual({ vertices: 13, triangles: 14, looseEdges: 0 })
    expect(result.plans.map((plan) => [plan.node, plan.kind, plan.geometryId])).toEqual([
      [0, 'cube', 'bbmodel_geometry_0'],
      [1, 'mesh', 'bbmodel_geometry_1'],
    ])
    const plan = result.plans[0]!
    expect(plan.sourcePath).toBe('elements[0]')
    expect(plan.vertexCount).toBe(8)
    expect(plan.faces).toEqual(
      cycles.map((indices, sourceFace) => ({
        id: `f_${sourceFace}_0`,
        sourceFace,
        corners: indices.map((vertex, sourceCorner) => ({ vertex, sourceCorner })),
      })),
    )
    expect(plan.looseEdges).toEqual([])
    expect(result.issues).toEqual([
      { code: 'quads-to-source-triangles', node: 1, path: 'elements[1]', count: 1 },
    ])
    expect(source).toEqual(before)
  }
})

test('bbmodel quads keep the source diagonal by default; editable quad adaptation is explicit and corner ownership is independent', () => {
  const { source, selection } = fixture([mesh()])
  const before = structuredClone(source)
  const split = planBbmodelNativeGeometry(source, selection)
  expect(split.plans[0]!.faces).toEqual([
    {
      id: 'f_0_0',
      sourceFace: 0,
      corners: [
        { vertex: 0, sourceCorner: 0 },
        { vertex: 1, sourceCorner: 1 },
        { vertex: 2, sourceCorner: 2 },
      ],
    },
    {
      id: 'f_0_1',
      sourceFace: 0,
      corners: [
        { vertex: 0, sourceCorner: 0 },
        { vertex: 2, sourceCorner: 2 },
        { vertex: 3, sourceCorner: 3 },
      ],
    },
  ])
  const editable = planBbmodelNativeGeometry(source, selection, { quads: 'editable-quads' })
  expect(editable.plans[0]!.faces[0]!.corners.map((corner) => corner.sourceCorner)).toEqual([
    0, 1, 2, 3,
  ])
  expect(editable.issues).toEqual([
    { code: 'editable-quad-adaptation', node: 0, path: 'elements[0]', count: 1 },
  ])
  expect(editable.costs).toEqual(split.costs)
  split.plans[0]!.faces[0]!.corners[0]!.vertex = 999
  expect(split.plans[0]!.faces[1]!.corners[0]!.vertex).toBe(0)
  expect(editable.plans[0]!.faces[0]!.corners[0]!.vertex).toBe(0)
  expect(source).toEqual(before)
})

test('bbmodel unsupported surfaces require omission consent, preserve every point and report exact literal face paths', () => {
  for (const vertices of [
    ['__proto__', 'with space', 'c', 'd', 'unused'],
    ['__proto__', 'with space', 'c', '__proto__'],
  ]) {
    const { source, selection } = fixture([
      mesh({ faces: Object.fromEntries([['bad " face', { vertices }]]) }),
    ])
    failure(
      () => planBbmodelNativeGeometry(source, selection),
      'unsupported',
      `elements[0].faces[${JSON.stringify('bad " face')}]`,
    )
    const result = planBbmodelNativeGeometry(source, selection, { unsupportedFaces: 'omit' })
    expect(result.costs).toEqual({ vertices: 5, triangles: 0, looseEdges: 0 })
    expect(result.plans[0]!.faces).toEqual([])
    expect(result.issues).toEqual([
      { code: 'unsupported-faces-omitted', node: 0, path: 'elements[0]', count: 1 },
    ])
  }
})

test('bbmodel topology reads no coordinates, UV or pose and does not plan unselected geometry', () => {
  const { source, selection } = fixture([cube(), mesh(), mesh({ uuid: 'omitted' })], '5.0', [
    'mesh',
    'cube',
  ])
  poison(source[0]!, 'from', 'to', 'inflate', 'stretch', 'origin', 'rotation')
  poison(source[1]!, 'positions', 'origin', 'rotation')
  for (const shape of source.slice(0, 2)) {
    if (shape.kind === 'unresolved') throw new Error('fixture')
    for (const face of shape.faces) poison(face, 'uv', 'rotation')
  }
  poison(source[2]!, 'vertexIds', 'positions', 'faces')
  const result = planBbmodelNativeGeometry(source, selection)
  expect(result.plans.map((plan) => plan.node)).toEqual([1, 0])
  expect(result.costs).toEqual({ vertices: 13, triangles: 14, looseEdges: 0 })
  expect(
    planBbmodelNativeGeometry([], { nodes: [], roots: [], geometries: [], issues: [] }),
  ).toEqual({ plans: [], issues: [], costs: { vertices: 0, triangles: 0, looseEdges: 0 } })
})

test('bbmodel vertex limits include disabled and unused points across parts, before any face planning', () => {
  // Direct typed-stage fixtures isolate native budgets from earlier JSON/source work budgets.
  const { source, selection } = fixture([cube(), mesh({ faces: {} })])
  const shape = source[1] as BbmodelMesh
  shape.vertexIds = Array.from({ length: SCENE_LIMITS.vertices - 8 }, (_, i) => `v${i}`)
  shape.positions = new Float64Array(shape.vertexIds.length * 3)
  poison(shape, 'positions')
  expect(planBbmodelNativeGeometry(source, selection).costs.vertices).toBe(SCENE_LIMITS.vertices)
  poison(source[0]!, 'faces')
  shape.vertexIds.push('excess')
  failure(() => planBbmodelNativeGeometry(source, selection), 'budget', 'elements[1].vertices')
})

test('bbmodel native part and triangle budgets are aggregate and exact under either quad policy', () => {
  const rows = Array.from({ length: SCENE_LIMITS.geometries }, (_, i) => cube({ uuid: `cube${i}` }))
  const many = fixture(rows)
  expect(planBbmodelNativeGeometry(many.source, many.selection).plans.length).toBe(
    SCENE_LIMITS.geometries,
  )
  // The selection reader already enforces this ceiling; independently check this stage's boundary.
  many.selection.geometries.push(999)
  poison(many.source[0]!, 'faces')
  failure(() => planBbmodelNativeGeometry(many.source, many.selection), 'budget', 'geometries')
  for (const quads of ['source-triangles', 'editable-quads'] as const) {
    const { source, selection } = fixture([cube(), mesh()])
    const shape = source[1] as BbmodelMesh
    const quad = shape.faces[0]!
    shape.faces = Array.from({ length: (SCENE_LIMITS.triangles - 12) / 2 }, (_, i) => ({
      ...quad,
      id: `q${i}`,
      vertices: quad.vertices.slice(),
      uv: new Map(quad.uv),
    }))
    const result = planBbmodelNativeGeometry(source, selection, { quads })
    expect(result.costs.triangles).toBe(SCENE_LIMITS.triangles)
    expect(result.plans[1]!.faces.length).toBe(
      shape.faces.length * (quads === 'source-triangles' ? 2 : 1),
    )
    expect(result.issues[0]!.count).toBe(shape.faces.length)
    shape.faces.push({ ...quad, id: 'overflow' })
    failure(
      () => planBbmodelNativeGeometry(source, selection, { quads }),
      'budget',
      'elements[1].faces["overflow"]',
    )
  }
})

test('bbmodel loose-edge budget includes hidden cube cages and deduplication precedes accounting', () => {
  // Direct typed-stage fixture: 12 cube edges plus distinct pairs over 1024 mesh points.
  const { source, selection } = fixture([
    cube({
      faces: Object.fromEntries(
        BBMODEL_CUBE_DIRECTIONS.map((direction) => [
          direction,
          { uv: [0, 0, 16, 16], texture: null },
        ]),
      ),
    }),
    mesh(),
  ])
  const shape = source[1] as BbmodelMesh
  shape.vertexIds = Array.from({ length: 1024 }, (_, i) => `v${i}`)
  shape.positions = new Float64Array(3072)
  const face = shape.faces[0]!
  shape.faces = []
  let next: [number, number] = [0, 1]
  pairs: for (let a = 0; a < 1024; a++)
    for (let b = a + 1; b < 1024; b++) {
      if (shape.faces.length === SCENE_LIMITS.looseEdges - 12) {
        next = [a, b]
        break pairs
      }
      shape.faces.push({ ...face, id: `e${shape.faces.length}`, vertices: new Uint32Array([a, b]) })
    }
  const duplicate = { ...face, id: 'reverse', vertices: new Uint32Array([1, 0]) }
  shape.faces.push(duplicate)
  const result = planBbmodelNativeGeometry(source, selection)
  expect(result.costs).toEqual({
    vertices: 1032,
    triangles: 0,
    looseEdges: SCENE_LIMITS.looseEdges,
  })
  expect(result.issues.find((issue) => issue.code === 'duplicate-construction-edges')?.count).toBe(
    1,
  )
  shape.faces.push({ ...face, id: 'excess', vertices: new Uint32Array(next) })
  failure(() => planBbmodelNativeGeometry(source, selection), 'budget', 'elements[1]')
})

test('bbmodel topology options reject null, unknown fields and arbitrary policies; matching source is required', () => {
  expect(readBbmodelNativeGeometryOptions({})).toEqual({
    quads: 'source-triangles',
    unsupportedFaces: 'reject',
  })
  for (const value of [null, [], 3, 'quads'])
    failure(() => readBbmodelNativeGeometryOptions(value as never), 'invalid', 'options')
  for (const quads of [null, 'fan', 1])
    failure(() => readBbmodelNativeGeometryOptions({ quads } as never), 'invalid', 'options.quads')
  failure(
    () => readBbmodelNativeGeometryOptions({ unsupportedFaces: null } as never),
    'invalid',
    'options.unsupportedFaces',
  )
  failure(
    () => readBbmodelNativeGeometryOptions({ weld: true } as never),
    'invalid',
    'options.weld',
  )
  const { source, selection } = fixture([cube()])
  failure(() => planBbmodelNativeGeometry([], selection), 'invalid', 'geometries')
  failure(
    () =>
      planBbmodelNativeGeometry(
        [{ kind: 'unresolved', node: 0, sourcePath: 'elements[0]', type: null }],
        selection,
      ),
    'invalid',
    'geometries',
  )
  const own = planBbmodelNativeGeometry(source, selection)
  own.plans[0]!.faces.pop()
  expect((source[0] as BbmodelCube).faces.length).toBe(6)
})

test('bbmodel disabled cube faces retain exactly the uncovered wire cage, without filling absent surfaces', () => {
  for (const enabled of [[], ['north'], ['north', 'south'], [...BBMODEL_CUBE_DIRECTIONS]]) {
    const { source, selection } = fixture([
      cube({
        faces: Object.fromEntries(
          BBMODEL_CUBE_DIRECTIONS.map((direction) => [
            direction,
            { uv: [0, 0, 16, 16], texture: enabled.includes(direction) ? false : null },
          ]),
        ),
      }),
    ])
    const result = planBbmodelNativeGeometry(source, selection)
    const plan = result.plans[0]!
    const edges = new Set<string>()
    const key = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`)
    for (const face of plan.faces)
      for (let i = 0; i < face.corners.length; i++)
        edges.add(key(face.corners[i]!.vertex, face.corners[(i + 1) % face.corners.length]!.vertex))
    const covered = edges.size
    for (const [a, b] of plan.looseEdges) {
      expect(edges.has(key(a, b))).toBe(false)
      edges.add(key(a, b))
    }
    expect(edges.size).toBe(12)
    expect(plan.looseEdges.length).toBe(12 - covered)
    expect(plan.costs).toEqual({
      vertices: 8,
      triangles: enabled.length * 2,
      looseEdges: 12 - covered,
    })
    expect(result.costs).toEqual(plan.costs)
    expect(result.issues).toEqual(
      enabled.length === 6
        ? []
        : [{ code: 'disabled-faces', node: 0, path: 'elements[0]', count: 6 - enabled.length }],
    )
  }
})

test('bbmodel construction faces keep edge-only null textures and deduplicate identities, not coincident coordinates', () => {
  const { source, selection } = fixture([
    mesh({
      vertices: { a: [0, 0, 0], b: [1, 0, 0], c: [0, 0, 0] },
      faces: {
        empty: {},
        point: { vertices: ['a'] },
        edge: { vertices: ['a', 'b'], texture: null },
        reverse: { vertices: ['b', 'a'] },
        self: { vertices: ['a', 'a'] },
        coincident: { vertices: ['c', 'b'] },
        disabled: { vertices: ['a', 'b', 'c'], texture: null },
        triangle: { vertices: ['a', 'b', 'c'], texture: false },
      },
    }),
  ])
  const before = structuredClone(source)
  const result = planBbmodelNativeGeometry(source, selection)
  expect(result.costs).toEqual({ vertices: 3, triangles: 1, looseEdges: 2 })
  expect(result.plans[0]!.looseEdges).toEqual([
    [0, 1],
    [2, 1],
  ])
  expect(result.plans[0]!.faces[0]!.sourceFace).toBe(7)
  expect(result.issues).toEqual([
    { code: 'construction-faces', node: 0, path: 'elements[0]', count: 6 },
    { code: 'duplicate-construction-edges', node: 0, path: 'elements[0]', count: 2 },
    { code: 'disabled-faces', node: 0, path: 'elements[0]', count: 1 },
  ])
  result.plans[0]!.looseEdges[0]![0] = 999
  expect(source).toEqual(before)
})

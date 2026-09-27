import { expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import { encodeSceneGlb } from '../export/sceneGlb'
import type { MoldaSceneDocument } from '../scene/document'
import { buildSceneGeometry } from '../scene/geometry'
import { SCENE_LIMITS } from '../scene/limits'
import { readSceneDocument } from '../scene/readDocument'
import { readSceneGeometry } from '../scene/readGeometry'
import { readAccessor, readGlb } from '../testing/glbRead'
import { expectValidGlb } from '../testing/gltfValidation'
import { readBbmodelAppearance } from './bbmodelAppearance'
import { readBbmodelEnvelope } from './bbmodelEnvelope'
import { convertBbmodelFaceUvs } from './bbmodelFaceUvs'
import { convertBbmodelGeometries } from './bbmodelGeometries'
import { readBbmodelGeometry } from './bbmodelGeometry'
import { BBMODEL_CUBE_DIRECTIONS } from './bbmodelGeometryTypes'
import { readBbmodelGraph } from './bbmodelGraph'
import { BbmodelInputError } from './bbmodelInput'
import {
  type BbmodelNativeGeometryOptions,
  planBbmodelNativeGeometry,
} from './bbmodelNativeGeometryPlan'
import { convertBbmodelNativeUvs } from './bbmodelNativeUvs'
import { readBbmodelNodeMetadata } from './bbmodelNodeMetadata'
import { convertBbmodelPositions } from './bbmodelPositions'
import { planBbmodelSelection } from './bbmodelSelection'
import { bindBbmodelTextures } from './bbmodelTextureBinding'
import { readBbmodelTransforms } from './bbmodelTransforms'
import { importDocumentBase } from './importDocumentBase'

function cube(extra: Record<string, unknown> = {}) {
  return {
    uuid: 'cube',
    type: 'cube',
    from: [2, 4, 6],
    to: [4, 6, 8],
    origin: [1, 1, 1],
    faces: Object.fromEntries(
      BBMODEL_CUBE_DIRECTIONS.map((face) => [face, { uv: [0, 0, 16, 16], texture: false }]),
    ),
    ...extra,
  }
}
function mesh(extra: Record<string, unknown> = {}) {
  return {
    uuid: 'mesh',
    type: 'mesh',
    vertices: Object.fromEntries([
      ['__proto__', [-0.25, 0, 0]],
      ['b', [2, 0, 0]],
      ['c', [2, 2, 0]],
      ['d', [-0.25, 2, 0]],
      ['unused', [99, 0, 0]],
      ['coincident', [99, 0, 0]],
    ]),
    faces: {
      quad: {
        vertices: ['__proto__', 'b', 'c', 'd'],
        uv: Object.fromEntries([
          ['__proto__', [2, 2]],
          ['b', [12, 2]],
          ['c', [12, 12]],
          ['d', [2, 12]],
        ]),
        texture: 0,
      },
      seam: {
        vertices: ['__proto__', 'c', 'b'],
        uv: Object.fromEntries([
          ['__proto__', [4, 4]],
          ['b', [8, 4]],
          ['c', [4, 8]],
        ]),
        texture: 'other',
      },
      edge: { vertices: ['unused', 'coincident'], texture: null },
    },
    ...extra,
  }
}
function fixture(
  elements: Record<string, unknown>[] = [cube(), mesh()],
  version = '5.0',
  options: BbmodelNativeGeometryOptions = {},
) {
  const envelope = readBbmodelEnvelope(
      new TextEncoder().encode(
        JSON.stringify({
          meta: { format_version: version, model_format: 'free' },
          elements,
          outliner: elements.map((row) => row.uuid),
          textures: [{ uuid: 'paint' }, { uuid: 'other' }],
        }),
      ),
    ),
    graph = readBbmodelGraph(envelope),
    metadata = readBbmodelNodeMetadata(envelope, graph),
    source = readBbmodelGeometry(graph),
    appearance = readBbmodelAppearance(envelope),
    selection = planBbmodelSelection(envelope, graph),
    plans = planBbmodelNativeGeometry(source, selection, options).plans,
    transforms = readBbmodelTransforms(graph, selection),
    positions = convertBbmodelPositions(source, plans, transforms, {
      nonPositiveCubes: 'preserve',
    }).geometries,
    authorial = convertBbmodelFaceUvs(source, plans, appearance).geometries,
    uvs = convertBbmodelNativeUvs(
      source,
      plans,
      authorial,
      bindBbmodelTextures(source, appearance),
      appearance,
    ).geometries,
    materials = new Map([
      [0, 'paint'],
      [1, 'other'],
    ])
  return { source, metadata, plans, transforms, positions, uvs, materials }
}
function convert(input: ReturnType<typeof fixture>) {
  return convertBbmodelGeometries(input.plans, input.positions, input.uvs, input.materials)
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
function documentOf(input: ReturnType<typeof fixture>): MoldaSceneDocument {
  return {
    ...importDocumentBase({ id: 'bb-geometry', name: 'Geometria', createdAt: 1, updatedAt: 2 }),
    geometries: convert(input).geometries,
    nodes: input.plans.map((plan) => ({
      id: `node_${plan.node}`,
      name: `Peça ${plan.node}`,
      parentId: null,
      kind: 'mesh',
      geometryId: plan.geometryId,
      materialId: 'solid',
      transform: input.transforms.get(plan.node)!.local,
      hidden: false,
      locked: false,
    })),
    materials: ['solid', 'paint', 'other'].map((id) => ({
      id,
      name: id,
      baseColor: { kind: 'rgba', value: [0.25, 0.5, 1, 1] },
      roughness: 1,
      metalness: 0,
      doubleSided: false,
    })),
  }
}

test.each([
  '4.9',
  '4.10',
  '5.0',
])('bbmodel %s assembles owned native geometry with exact coordinates, seams, source diagonal and loose vertex identity', (version) => {
  const input = fixture(undefined, version),
    before = structuredClone(input),
    result = convert(input),
    [box, mesh] = result.geometries
  expect(result.issues).toEqual([])
  expect(box!.vertices.v_0).toEqual([1, 3, 5])
  expect(box!.vertices.v_7).toEqual([3, 5, 7])
  expect(Object.keys(box!.faces)).toHaveLength(6)
  expect(Object.keys(mesh!.vertices)).toHaveLength(6)
  expect(Object.keys(mesh!.vertices)).toEqual(['v_0', 'v_1', 'v_2', 'v_3', 'v_4', 'v_5'])
  expect(mesh!.vertices.v_0).toEqual([-0.25, 0, 0])
  expect(mesh!.looseEdges).toEqual([['v_4', 'v_5']])
  expect(mesh!.vertices.v_4).toEqual(mesh!.vertices.v_5)
  expect(mesh!.vertices.v_4).not.toBe(mesh!.vertices.v_5)
  expect(mesh!.faces.f_0_0).toEqual({
    materialId: 'paint',
    corners: [
      { vertexId: 'v_0', uv: [0.125, 0.875] },
      { vertexId: 'v_1', uv: [0.75, 0.875] },
      { vertexId: 'v_2', uv: [0.75, 0.25] },
    ],
  })
  expect(mesh!.faces.f_0_1!.corners.map((corner) => corner.vertexId)).toEqual(['v_0', 'v_2', 'v_3'])
  expect(mesh!.faces.f_1_0).toEqual({
    materialId: 'other',
    corners: [
      { vertexId: 'v_0', uv: [0.25, 0.75] },
      { vertexId: 'v_2', uv: [0.25, 0.5] },
      { vertexId: 'v_1', uv: [0.5, 0.75] },
    ],
  })
  for (const geometry of result.geometries) expect(readSceneGeometry(geometry)).toEqual(geometry)
  expect(input).toEqual(before)
  mesh!.vertices.v_0![0] = 700
  mesh!.faces.f_0_0!.corners[0]!.uv[0] = 700
  mesh!.looseEdges[0]![0] = 'v_0'
  expect(mesh!.faces.f_0_1!.corners[0]!.uv).toEqual([0.125, 0.875])
  expect(input).toEqual(before)
  expect(convert(input).geometries[1]!.vertices.v_0![0]).toBe(-0.25)
})

test('bbmodel native geometry retains no-texture inheritance and never substitutes an unmapped textured material', () => {
  const input = fixture(),
    result = convert(input)
  expect(
    Object.values(result.geometries[0]!.faces).every((face) => !Object.hasOwn(face, 'materialId')),
  ).toBe(true)
  expect(buildSceneGeometry(result.geometries[0]!).materialIds).toEqual(Array(12).fill(null))
  expect(readSceneDocument(documentOf(input)).status).toBe('valid')
  input.materials.delete(1)
  failure(() => convert(input), 'invalid', 'materials[1]')
  for (const value of ['', 'material with spaces', 'bad\n']) {
    input.materials.set(1, value)
    failure(() => convert(input), 'invalid', 'materials[1]')
  }
  input.materials = new Map([[-1, 'bad']])
  failure(() => convert(input), 'invalid', 'materials[-1]')
})

test('bbmodel native geometry enters GLB with its own corner UV, material groups and unbaked local coordinates', async () => {
  const input = fixture(),
    document = documentOf(input),
    before = structuredClone(document),
    bytes = encodeSceneGlb(document, { allowLosses: true }).bytes
  await expectValidGlb(bytes)
  const glb = readGlb(bytes),
    meshes = glb.json.meshes as Array<{
      primitives: Array<{ attributes: { POSITION: number; TEXCOORD_0: number }; material: number }>
    }>
  expect(meshes).toHaveLength(2)
  expect(meshes[1]!.primitives).toHaveLength(2)
  const primitive = meshes[1]!.primitives[0]!,
    expected = buildSceneGeometry(document.geometries[1]!)
  expect(readAccessor(glb, primitive.attributes.POSITION)).toEqual(expected.positions)
  expect([...readAccessor(glb, primitive.attributes.TEXCOORD_0)]).toEqual(
    [...expected.uvs].map((value, i) => (i % 2 ? 1 - value : value)),
  )
  expect(document).toEqual(before)
})

test('bbmodel draw diagnostics retain authorial polygons and exact coordinates, including Float32 collapse', () => {
  const cases: Array<{ code: 'degenerate' | 'self-intersection' | 'precision'; points: Vec3[] }> = [
    {
      code: 'degenerate',
      points: [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
      ],
    },
    {
      code: 'self-intersection',
      points: [
        [0, 0, 0],
        [2, 2, 0],
        [0, 2, 0],
        [2, 0, 0],
      ],
    },
    {
      code: 'precision',
      points: [
        [0, 0, 0],
        [1e-50, 0, 0],
        [0, 1e-50, 0],
      ],
    },
  ]
  for (const { code, points } of cases) {
    const vertices = Object.fromEntries(points.map((point, i) => [`source_${i}`, point])),
      input = fixture(
        [
          mesh({
            vertices,
            faces: {
              face: {
                vertices: Object.keys(vertices),
                uv: Object.fromEntries(Object.keys(vertices).map((key) => [key, [0, 0]])),
                texture: false,
              },
            },
          }),
        ],
        '5.0',
        { quads: 'editable-quads' },
      ),
      before = structuredClone(input),
      result = convert(input),
      geometry = result.geometries[0]!
    expect(result.issues).toEqual([
      {
        code: `undrawn-${code}-faces`,
        node: 0,
        geometryId: 'bbmodel_geometry_0',
        path: 'elements[0]',
        count: 1,
      },
    ])
    expect(Object.values(geometry.vertices)).toEqual(points)
    expect(Object.values(geometry.faces)).toHaveLength(1)
    expect(geometry.faces.f_0_0!.corners).toHaveLength(points.length)
    expect(buildSceneGeometry(geometry).positions).toHaveLength(0)
    expect(readSceneGeometry(geometry)).toEqual(geometry)
    expect(readSceneDocument(documentOf(input)).status).toBe('valid')
    expect(input).toEqual(before)
  }
})

test('bbmodel zero-width cube remains a zero-width editable cage with four undrawn faces', () => {
  const input = fixture([cube({ from: [0, 0, 0], to: [0, 2, 2], origin: [0, 0, 0] })]),
    result = convert(input),
    geometry = result.geometries[0]!
  expect(Object.values(geometry.vertices)).toHaveLength(8)
  expect(Object.values(geometry.vertices).every((point) => point[0] === 0)).toBe(true)
  expect(Object.keys(geometry.faces)).toHaveLength(6)
  expect(buildSceneGeometry(geometry).faceIds).toHaveLength(4)
  expect(result.issues).toEqual([
    {
      code: 'undrawn-degenerate-faces',
      node: 0,
      geometryId: 'bbmodel_geometry_0',
      path: 'elements[0]',
      count: 4,
    },
  ])
  expect(readSceneDocument(documentOf(input)).status).toBe('valid')
})

test('bbmodel disabled cube surfaces retain twelve loose cage edges and empty meshes stay editable', () => {
  const input = fixture([
      cube({
        faces: Object.fromEntries(
          BBMODEL_CUBE_DIRECTIONS.map((key) => [
            key,
            {
              uv: [0, 0, 16, 16],
              texture: null,
            },
          ]),
        ),
      }),
      mesh({ vertices: {}, faces: {} }),
    ]),
    result = convert(input)
  expect(result.issues).toEqual([])
  expect(Object.keys(result.geometries[0]!.vertices)).toHaveLength(8)
  expect(result.geometries[0]!.faces).toEqual({})
  expect(result.geometries[0]!.looseEdges).toHaveLength(12)
  expect(result.geometries[1]).toEqual({
    id: 'bbmodel_geometry_1',
    kind: 'mesh',
    vertices: {},
    faces: {},
    looseEdges: [],
  })
  expect(readSceneDocument(documentOf(input)).status).toBe('valid')
})

function forbidCoordinates(input: ReturnType<typeof fixture>) {
  for (const row of input.positions)
    row.positions = new Proxy(row.positions, {
      get(target, key) {
        if (typeof key === 'string' && /^\d+$/.test(key))
          throw new Error('Unexpected coordinate read')
        return Reflect.get(target, key, target)
      },
    })
}

test('bbmodel native geometry checks aggregate private plan budgets before coordinates', () => {
  for (const kind of ['vertices', 'triangles', 'looseEdges'] as const) {
    const input = fixture()
    forbidCoordinates(input)
    // Inject a derived private cost, not a claim of parsing external plans.
    input.plans[0]!.costs[kind] = SCENE_LIMITS[kind]
    input.plans[1]!.costs[kind] = 1
    failure(() => convert(input), 'budget', 'geometries')
  }
  const input = fixture()
  forbidCoordinates(input)
  input.plans = Array(SCENE_LIMITS.geometries + 1).fill(input.plans[0])
  failure(() => convert(input), 'budget', 'geometries')
  input.materials = new Map(
    Array.from({ length: SCENE_LIMITS.materials + 1 }, (_, i) => [i, `material_${i}`]),
  )
  failure(() => convert(input), 'budget', 'materials')
})

test('bbmodel native geometry matches every stage before reading coordinates and rejects invalid material IDs first', () => {
  for (const stage of ['positions', 'uvs'] as const) {
    const input = fixture()
    forbidCoordinates(input)
    input[stage][1]!.geometryId = 'different_geometry'
    expect(() => convert(input)).toThrow('Mismatched bbmodel native geometry stages')
  }
  for (const stage of ['positions', 'uvs'] as const) {
    const input = fixture()
    forbidCoordinates(input)
    input[stage].pop()
    expect(() => convert(input)).toThrow('Mismatched bbmodel native geometry stages')
  }
  const input = fixture()
  forbidCoordinates(input)
  input.materials.set(0, 'not a native ID')
  failure(() => convert(input), 'invalid', 'materials[0]')
})

test('bbmodel native geometry never zero-fills missing private face or corner UVs', () => {
  const face = fixture()
  face.uvs[1]!.faces = new Map()
  expect(() => convert(face)).toThrow('Missing bbmodel native face UV')
  const corner = fixture()
  corner.uvs[1]!.faces.get(0)!.corners.pop()
  expect(() => convert(corner)).toThrow('Missing bbmodel native corner UV')
})

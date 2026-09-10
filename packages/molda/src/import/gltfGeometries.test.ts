import { expect, test } from 'bun:test'
import { encodeSceneGlb } from '../export/sceneGlb'
import { buildSceneGeometry } from '../scene/geometry'
import { SCENE_LIMITS } from '../scene/limits'
import { readSceneGeometry } from '../scene/readGeometry'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import type { GltfAccessorType } from './gltfAccessorLayout'
import { type GltfAccessor, readGltfAccessors } from './gltfAccessors'
import { readGltfBuffers } from './gltfBuffers'
import { readGltfEnvelope } from './gltfEnvelope'
import { convertGltfGeometries } from './gltfGeometries'
import type { GltfGeometryMaterials, GltfGeometryRequest } from './gltfGeometryPlan'
import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'
import { readGltfMeshes } from './gltfMeshes'

function attribute(values: number[] | Float64Array, type: GltfAccessorType = 'VEC3'): GltfAccessor {
  const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }[type]
  const min = Array<number>(width).fill(Infinity),
    max = Array<number>(width).fill(-Infinity)
  values.forEach((value, i) => {
    min[i % width] = Math.min(min[i % width]!, value)
    max[i % width] = Math.max(max[i % width]!, value)
  })
  return {
    type,
    componentType: type === 'SCALAR' ? 5125 : 5126,
    count: values.length / width,
    normalized: false,
    values: Float64Array.from(values),
    min,
    max,
    layout: null,
    sparseViews: null,
  }
}
const positions = () => attribute([0.125, 0, 0, 1.5, 0, 0, 0.125, 2.25, 0, 1.5, 2.25, 0])
const materials: GltfGeometryMaterials = {
  ids: new Map([
    [0, 'red'],
    [1, 'blue'],
  ]),
  defaultId: 'default',
}
const requests: GltfGeometryRequest[] = [{ meshIndex: 0, geometryId: 'shape' }]
function convert(
  input: unknown,
  accessors: GltfAccessor[],
  variants = requests,
  links = materials,
) {
  const meshes = readGltfMeshes(input, accessors, Math.max(-1, ...links.ids.keys()) + 1).meshes
  return convertGltfGeometries(meshes, accessors, variants, links)
}
function failure(run: () => unknown, reason: GltfInputError['reason']) {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  expect((error as GltfInputError).reason).toBe(reason)
}

test('keeps exact positions, corner UVs, winding and material boundaries without welding primitives', () => {
  const accessors = [
    positions(),
    attribute([0.1, -0.25, 2, 0.5, 0.1, 1.75, 2, 1.75], 'VEC2'),
    attribute([0, 1, 2], 'SCALAR'),
    attribute([1, 3, 2], 'SCALAR'),
  ]
  const input = [
    {
      primitives: [
        { attributes: { POSITION: 0, TEXCOORD_0: 1 }, indices: 2, material: 0 },
        { attributes: { POSITION: 0, TEXCOORD_0: 1 }, indices: 3, material: 1 },
      ],
    },
  ]
  const before = structuredClone({ input, accessors })
  const result = convert(input, accessors),
    geometry = result.geometries[0]!
  expect(result.issues).toEqual([])
  expect(Object.keys(geometry.vertices)).toHaveLength(8)
  expect(geometry.vertices.p_0_v_0).toEqual([0.125, 0, 0])
  expect(geometry.vertices.p_1_v_0).toEqual(geometry.vertices.p_0_v_0)
  expect(geometry.vertices.p_1_v_0).not.toBe(geometry.vertices.p_0_v_0)
  expect(geometry.faces.p_0_f_0).toEqual({
    materialId: 'red',
    corners: [
      { vertexId: 'p_0_v_0', uv: [0.1, 1.25] },
      { vertexId: 'p_0_v_1', uv: [2, 0.5] },
      { vertexId: 'p_0_v_2', uv: [0.1, -0.75] },
    ],
  })
  expect(geometry.faces.p_1_f_0!.materialId).toBe('blue')
  expect(readSceneGeometry(geometry)).toEqual(geometry)
  const draw = buildSceneGeometry(geometry)
  expect(draw.materialIds).toEqual(['red', 'blue'])
  expect(draw.normals.every((value, i) => value === (i % 3 === 2 ? 1 : 0))).toBe(true)
  expect(result.sources[0]!.primitives[1]!.vertexIds).toEqual([
    'p_1_v_0',
    'p_1_v_1',
    'p_1_v_2',
    'p_1_v_3',
  ])
  geometry.vertices.p_0_v_0![0] = 77
  geometry.faces.p_0_f_0!.corners[0]!.uv[0] = 88
  result.sources[0]!.primitives[0]!.attributes.clear()
  expect({ input, accessors }).toEqual(before)
  expect(result.sources[0]!.primitives[1]!.attributes.size).toBe(2)
})

test.each([5, 6])('mode %s retains topology order through native triangulation', (mode) => {
  const points = mode === 5 ? positions() : attribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0])
  const geometry = convert([{ primitives: [{ attributes: { POSITION: 0 }, mode }] }], [points])
    .geometries[0]!
  const expected = mode === 5 ? [0, 1, 2, 1, 3, 2] : [1, 2, 0, 2, 3, 0]
  expect(
    Object.values(geometry.faces).flatMap((face) => face.corners.map((corner) => corner.vertexId)),
  ).toEqual(expected.map((i) => `p_0_v_${i}`))
  const built = buildSceneGeometry(geometry)
  expect(Array.from(built.positions)).toEqual(
    expected.flatMap((i) => Array.from(points.values.subarray(i * 3, i * 3 + 3))),
  )
  expect(built.normals.every((value, i) => value === (i % 3 === 2 ? 1 : 0))).toBe(true)
  expect(built.uvs.every((v) => v === 0)).toBe(true)
  expect(built.materialIds).toEqual(['default', 'default'])
})

test('keeps construction vertices/edges, omits repeated-index elements and reports absent positions', () => {
  const accessors = [
    positions(),
    attribute([0, 0, 1, 2, 1, 3], 'SCALAR'),
    attribute([1, 1, 1, 1, 1, 1, 1, 1], 'VEC2'),
  ]
  const result = convert(
    [
      {
        primitives: [
          { attributes: { POSITION: 0 }, indices: 1, mode: 1 },
          { attributes: { POSITION: 0 }, mode: 0 },
          { attributes: { TEXCOORD_0: 2 }, mode: 0 },
          { attributes: { POSITION: 0 }, indices: 1 },
        ],
      },
    ],
    accessors,
  )
  const geometry = result.geometries[0]!
  expect(geometry.looseEdges).toEqual([
    ['p_0_v_1', 'p_0_v_2'],
    ['p_0_v_1', 'p_0_v_3'],
  ])
  expect(Object.keys(geometry.vertices)).toHaveLength(12)
  expect(Object.keys(geometry.faces)).toEqual(['p_3_f_1'])
  expect(result.sources[0]!.primitives[2]!.vertexIds).toEqual([])
  expect(result.issues.map(({ code, count }) => [code, count])).toEqual([
    ['construction-lines', 3],
    ['repeated-indices-omitted', 1],
    ['construction-points', 4],
    ['missing-position', 1],
    ['repeated-indices-omitted', 1],
  ])
  expect(readSceneGeometry(geometry)).toEqual(geometry)
})

test('bakes selected morph weights into positions and the requested UV set, with independent variants', () => {
  const accessors = [
    positions(),
    attribute([1, 0, 0, 2, 0, 0, 3, 0, 0, 4, 0, 0]),
    attribute(Array(8).fill(0.5), 'VEC2'),
    attribute(Array(8).fill(0.25), 'VEC2'),
  ]
  const input = [
    {
      weights: [0.5, -2],
      primitives: [
        {
          attributes: { POSITION: 0, TEXCOORD_0: 2, TEXCOORD_1: 2 },
          mode: 5,
          material: 1,
          targets: [{ POSITION: 1 }, { TEXCOORD_1: 3 }],
        },
      ],
    },
  ]
  const before = structuredClone({ input, accessors })
  const result = convert(
    input,
    accessors,
    [requests[0]!, { meshIndex: 0, geometryId: 'other', weights: [0, 1] }],
    { ...materials, uvSetByMaterial: new Map([[1, 1]]) },
  )
  expect(result.geometries[0]!.vertices.p_0_v_0).toEqual([0.625, 0, 0])
  expect(result.geometries[1]!.vertices.p_0_v_0).toEqual([0.125, 0, 0])
  expect(result.geometries[0]!.faces.p_0_f_0!.corners[0]!.uv).toEqual([0, 1])
  expect(result.geometries[1]!.faces.p_0_f_0!.corners[0]!.uv).toEqual([0.75, 0.25])
  expect(result.issues.map(({ code, count, geometryId }) => [code, count, geometryId])).toEqual([
    ['morph-controls-baked', 2, 'shape'],
    ['extra-uv-sets-omitted', 1, 'shape'],
    ['morph-controls-baked', 2, 'other'],
    ['extra-uv-sets-omitted', 1, 'other'],
  ])
  expect({ input, accessors }).toEqual(before)
  result.geometries[0]!.vertices.p_0_v_0![0] = 200
  expect(result.geometries[1]!.vertices.p_0_v_0![0]).toBe(0.125)
})

test('distinguishes authored zero UVs from absent UVs and reflects only after baking morph deltas', () => {
  const accessors = [
      positions(),
      attribute([0.25, 0.125, 0.5, 0.25, 0.75, 0.375, 1, 0.5], 'VEC2'),
      attribute(Array(8).fill(0), 'VEC2'),
    ],
    input = [
      {
        primitives: [
          { attributes: { POSITION: 0, TEXCOORD_0: 2 }, mode: 5, targets: [{ TEXCOORD_0: 1 }] },
        ],
      },
    ],
    before = structuredClone({ input, accessors })
  for (const weight of [0, -2]) {
    const geometry = convert(input, accessors, [{ ...requests[0]!, weights: [weight] }])
      .geometries[0]!
    expect(geometry.faces.p_0_f_0!.corners.map((corner) => corner.uv)).toEqual(
      [
        [0.25, 0.125],
        [0.5, 0.25],
        [0.75, 0.375],
      ].map(([u, v]) => [u! * weight, 1 - v! * weight]),
    )
  }
  const absent = convert([{ primitives: [{ attributes: { POSITION: 0 }, mode: 5 }] }], accessors)
    .geometries[0]!
  expect(
    Object.values(absent.faces).every((face) =>
      face.corners.every(({ uv }) => uv[0] === 0 && uv[1] === 0),
    ),
  ).toBe(true)
  failure(
    () =>
      convert(
        [{ primitives: [{ attributes: { POSITION: 0 }, mode: 5, targets: [{ TEXCOORD_0: 1 }] }] }],
        accessors,
      ),
    'invalid',
  )
  expect({ input, accessors }).toEqual(before)
})

test('reports shading and attribute differences without claiming a complete skin conversion', () => {
  const accessors = [
    positions(),
    attribute(Array.from({ length: 4 }, () => [0, 0, 1]).flat()),
    attribute(Array.from({ length: 4 }, () => [1, 0, 0, -1]).flat(), 'VEC4'),
    attribute(Array(8).fill(0.5), 'VEC2'),
    attribute(Array(16).fill(0.25), 'VEC4'),
    { ...attribute(Array(16).fill(0), 'VEC4'), componentType: 5121 as const },
  ]
  const attributes = {
    POSITION: 0,
    NORMAL: 1,
    TANGENT: 2,
    TEXCOORD_0: 3,
    TEXCOORD_1: 3,
    COLOR_0: 4,
    COLOR_1: 4,
    _EXTRA: 1,
    JOINTS_0: 5,
    WEIGHTS_0: 4,
  }
  const result = convert([{ primitives: [{ attributes, mode: 5 }] }], accessors)
  expect(result.issues.map(({ code, count }) => [code, count])).toEqual([
    ['flat-normals', 1],
    ['tangents-omitted', 1],
    ['colors-omitted', 2],
    ['extra-uv-sets-omitted', 1],
    ['custom-attributes-omitted', 1],
  ])
  expect(result.sources[0]!.primitives[0]!.attributes).toEqual(new Map(Object.entries(attributes)))
  expect(
    result.issues.every(
      (issue) => Object.keys(issue).sort().join() === 'code,count,geometryId,path',
    ),
  ).toBe(true)
})

test('retains collinear and Float32-collapsed authored faces with aggregated draw issues', () => {
  const base = attribute([0, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 1, 1, 0, 1, 2, 0])
  const delta = attribute([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0])
  const result = convert(
    [
      {
        weights: [1e-10],
        primitives: [{ attributes: { POSITION: 0 }, targets: [{ POSITION: 1 }] }],
      },
    ],
    [base, delta],
  )
  expect(Object.keys(result.geometries[0]!.faces)).toHaveLength(2)
  expect(result.geometries[0]!.vertices.p_0_v_4).toEqual([1 + 1e-10, 1, 0])
  expect(result.issues.map(({ code, count }) => [code, count])).toEqual([
    ['morph-controls-baked', 1],
    ['undrawn-degenerate-faces', 1],
    ['undrawn-precision-faces', 1],
  ])
  expect(readSceneGeometry(result.geometries[0])).toEqual(result.geometries[0]!)
})

test('refuses unrepresentable morph values instead of clamping, rounding to zero or returning partial geometry', () => {
  const input = [
    { primitives: [{ attributes: { POSITION: 0 }, mode: 5, targets: [{ POSITION: 1 }] }] },
  ]
  for (const weight of [1e40, 1e-50, Number.MAX_VALUE]) {
    const base = attribute(Array(12).fill(0)),
      delta = attribute(Array(12).fill(2))
    failure(
      () => convert(input, [base, delta], [{ ...requests[0]!, weights: [weight] }]),
      'unsupported',
    )
  }
  const uvInput = [
    {
      primitives: [
        { attributes: { POSITION: 0, TEXCOORD_0: 1 }, mode: 5, targets: [{ TEXCOORD_0: 2 }] },
      ],
    },
  ]
  failure(
    () =>
      convert(
        uvInput,
        [positions(), attribute(Array(8).fill(0), 'VEC2'), attribute(Array(8).fill(1), 'VEC2')],
        [{ ...requests[0]!, weights: [1e40] }],
      ),
    'unsupported',
  )
})

test('validates variant IDs, morph overrides and explicit material/UV references', () => {
  const accessors = [positions()],
    input = [{ primitives: [{ attributes: { POSITION: 0 }, mode: 5 }] }]
  for (const variants of [
    [requests[0]!, requests[0]!],
    [{ meshIndex: -1, geometryId: 'shape' }],
    [{ meshIndex: 1, geometryId: 'shape' }],
    [{ ...requests[0]!, weights: [1] }],
  ])
    failure(() => convert(input, accessors, variants), 'invalid')
  for (const geometryId of ['', 'with space', 'a'.repeat(129)])
    expect(() => convert(input, accessors, [{ ...requests[0]!, geometryId }])).toThrow()
  failure(
    () =>
      convert(input, accessors, requests, { ...materials, uvSetByMaterial: new Map([[null, 0]]) }),
    'invalid',
  )
  failure(
    () => convert(input, accessors, requests, { ...materials, uvSetByMaterial: new Map([[2, 0]]) }),
    'invalid',
  )
  failure(
    () =>
      convert(input, accessors, requests, { ...materials, uvSetByMaterial: new Map([[null, -1]]) }),
    'invalid',
  )
  const parsed = readGltfMeshes(
    [{ primitives: [{ attributes: { POSITION: 0 }, material: 1, mode: 5 }] }],
    accessors,
    2,
  ).meshes
  failure(
    () =>
      convertGltfGeometries(parsed, accessors, requests, { ids: new Map(), defaultId: 'default' }),
    'invalid',
  )
  expect(convert(input, accessors, []).geometries).toEqual([])
})

test('preflights native budgets across variants before reading any position values', () => {
  const large = attribute(new Float64Array((SCENE_LIMITS.vertices / 2 + 1) * 3))
  const accessors = [large, attribute([0, 1, 2], 'SCALAR')]
  const meshes = readGltfMeshes(
    [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    accessors,
  ).meshes
  Object.defineProperty(large, 'values', {
    get() {
      throw new Error('No position reads before aggregate budgets')
    },
  })
  failure(
    () =>
      convertGltfGeometries(
        meshes,
        accessors,
        [requests[0]!, { meshIndex: 0, geometryId: 'second' }],
        materials,
      ),
    'budget',
  )
  failure(
    () =>
      convertGltfGeometries(
        meshes,
        accessors,
        Array.from({ length: SCENE_LIMITS.geometries + 1 }, (_, i) => ({
          meshIndex: 0,
          geometryId: `g_${i}`,
        })),
        materials,
      ),
    'budget',
  )
})

test('rejects sparse variant weights and identifiers with a terminal line break', () => {
  const accessors = [positions(), attribute(Array(8).fill(0.5), 'VEC2')]
  // The target changes an unselected UV set; a missing weight must not pass unnoticed.
  const input = [
    {
      primitives: [
        {
          attributes: { POSITION: 0, TEXCOORD_0: 1, TEXCOORD_1: 1 },
          mode: 5,
          targets: [{ TEXCOORD_1: 1 }],
        },
      ],
    },
  ]
  for (const weights of [Array<number>(1), [NaN], [Infinity]])
    failure(() => convert(input, accessors, [{ ...requests[0]!, weights }]), 'invalid')
  for (const value of ['shape\n', 'shape\r', 'shape\u2028', 'shape\u2029']) {
    expect(() => convert(input, accessors, [{ ...requests[0]!, geometryId: value }])).toThrow()
    expect(() => convert(input, accessors, requests, { ...materials, defaultId: value })).toThrow()
    expect(() =>
      convert(input, accessors, requests, { ...materials, ids: new Map([[0, value]]) }),
    ).toThrow()
  }
})

test('budgets faces, edges and repeated primitive variants without charging unrequested meshes', () => {
  const accessors = [
    positions(),
    attribute(
      Array.from({ length: SCENE_LIMITS.triangles / 2 + 1 }, () => [0, 1, 2]).flat(),
      'SCALAR',
    ),
    attribute(
      Array.from({ length: SCENE_LIMITS.looseEdges / 2 + 1 }, () => [0, 1]).flat(),
      'SCALAR',
    ),
  ]
  const variants = [requests[0]!, { meshIndex: 0, geometryId: 'other' }]
  for (const [indices, mode] of [
    [1, 4],
    [2, 1],
  ]) {
    const input = [{ primitives: [{ attributes: { POSITION: 0 }, indices, mode }] }]
    failure(() => convert(input, accessors, variants), 'budget')
    expect(convert(input, accessors, []).geometries).toEqual([])
  }
  const primitives = Array.from({ length: GLTF_INPUT_LIMITS.primitives / 2 + 1 }, () => ({
    attributes: { _CUSTOM: 0 },
    mode: 0,
  }))
  failure(() => convert([{ primitives }], [attribute([1])], variants), 'budget')
})

test('accepts exact native vertex and face budgets without quantization', () => {
  const values = new Float64Array(SCENE_LIMITS.vertices * 3)
  values.set([0.125, 0, 0, 1.5, 0, 0, 0.125, 2.25, 0])
  const accessors = [
    attribute(values),
    attribute(Array.from({ length: SCENE_LIMITS.triangles }, () => [0, 1, 2]).flat(), 'SCALAR'),
  ]
  const result = convert([{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }], accessors)
  expect(Object.keys(result.geometries[0]!.vertices)).toHaveLength(SCENE_LIMITS.vertices)
  expect(Object.keys(result.geometries[0]!.faces)).toHaveLength(SCENE_LIMITS.triangles)
  expect(result.issues).toEqual([])
  expect(readSceneGeometry(result.geometries[0])).toEqual(result.geometries[0]!)
})

test('bounds topology work across repeated variants even when every triangle has repeated indices', () => {
  const count = Math.floor(GLTF_INPUT_LIMITS.topologyIndices / 6) * 3
  const accessors = [attribute([0, 0, 0]), attribute(new Float64Array(count), 'SCALAR')]
  const meshes = readGltfMeshes(
    [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    accessors,
  ).meshes
  failure(
    () =>
      convertGltfGeometries(
        meshes,
        accessors,
        Array.from({ length: 3 }, (_, i) => ({ meshIndex: 0, geometryId: `g_${i}` })),
        materials,
      ),
    'budget',
  )
})

test('real GLB export round-trips positions, UVs and per-face materials through all import stages', () => {
  const document = makeSceneGlbFixture(2, 2, 3, 2),
    before = structuredClone(document)
  const envelope = readGltfEnvelope(encodeSceneGlb(document, { allowLosses: true }).bytes)
  const resources = readGltfBuffers(envelope)
  if (resources.status !== 'ready') throw new Error('Self-contained GLB expected')
  const accessors = readGltfAccessors(envelope.json.accessors, resources)
  const ids = Array.from(
    { length: (envelope.json.materials as unknown[]).length },
    (_, i) => `material_${i}`,
  )
  const meshes = readGltfMeshes(envelope.json.meshes, accessors, ids.length).meshes
  const result = convertGltfGeometries(
    meshes,
    accessors,
    meshes.map((_, i) => ({ meshIndex: i, geometryId: `geometry_${i}` })),
    { ids: new Map(ids.map((id, i) => [i, id])), defaultId: 'default' },
  )
  for (const [m, mesh] of meshes.entries()) {
    const actual = buildSceneGeometry(result.geometries[m]!),
      expectedPositions: number[] = [],
      expectedUvs: number[] = [],
      expectedMaterials: string[] = []
    for (const primitive of mesh.primitives) {
      const point = accessors[primitive.attributes.get('POSITION')!]!.values
      const uv = accessors[primitive.attributes.get('TEXCOORD_0')!]!.values
      for (const v of primitive.topology.indices) {
        expectedPositions.push(...point.subarray(v * 3, v * 3 + 3))
        expectedUvs.push(uv[v * 2]!, 1 - uv[v * 2 + 1]!)
      }
      expectedMaterials.push(
        ...Array<string>(primitive.topology.indices.length / 3).fill(ids[primitive.material!]!),
      )
    }
    expect(actual.positions).toEqual(Float32Array.from(expectedPositions))
    expect(actual.uvs).toEqual(Float32Array.from(expectedUvs))
    expect(actual.materialIds).toEqual(expectedMaterials)
    expect(readSceneGeometry(result.geometries[m])).toEqual(result.geometries[m]!)
  }
  expect(result.issues.every((issue) => issue.code === 'flat-normals')).toBe(true)
  expect(document).toEqual(before)
})

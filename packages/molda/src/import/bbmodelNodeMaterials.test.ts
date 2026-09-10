import { expect, test } from 'bun:test'
import { encodeSceneGlb } from '../export/sceneGlb'
import type { MoldaSceneDocument } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import { readSceneDocument } from '../scene/readDocument'
import { expectValidGlb } from '../testing/gltfValidation'
import { readBbmodelAppearance } from './bbmodelAppearance'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { convertBbmodelFaceUvs } from './bbmodelFaceUvs'
import { convertBbmodelGeometries } from './bbmodelGeometries'
import { readBbmodelGeometry } from './bbmodelGeometry'
import { BBMODEL_CUBE_DIRECTIONS } from './bbmodelGeometryTypes'
import { readBbmodelGraph } from './bbmodelGraph'
import { convertBbmodelHierarchy } from './bbmodelHierarchy'
import { BbmodelInputError } from './bbmodelInput'
import { planBbmodelNativeGeometry } from './bbmodelNativeGeometryPlan'
import { convertBbmodelNativeUvs } from './bbmodelNativeUvs'
import {
  type BbmodelNodeMaterialOptions,
  convertBbmodelNodeMaterials,
  readBbmodelNodeMaterialOptions,
} from './bbmodelNodeMaterials'
import { readBbmodelNodeMetadata } from './bbmodelNodeMetadata'
import { convertBbmodelPositions } from './bbmodelPositions'
import { planBbmodelSelection } from './bbmodelSelection'
import { readBbmodelSurfaceMetadata } from './bbmodelSurfaceMetadata'
import { bindBbmodelTextures } from './bbmodelTextureBinding'
import { readBbmodelTransforms } from './bbmodelTransforms'
import { importDocumentBase } from './importDocumentBase'

function fixture(
  cube: Record<string, unknown> = {},
  mesh: Record<string, unknown> = {},
  version: BbmodelVersion = '5.0',
) {
  const envelope = readBbmodelEnvelope(
      new TextEncoder().encode(
        JSON.stringify({
          meta: { format_version: version, model_format: 'free' },
          elements: [
            {
              uuid: 'cube',
              type: 'cube',
              name: 'Cubinho',
              color: 7,
              from: [0, 0, 0],
              to: [2, 2, 2],
              origin: [1, 1, 1],
              faces: Object.fromEntries(
                BBMODEL_CUBE_DIRECTIONS.map((face) => [
                  face,
                  { uv: [0, 0, 16, 16], texture: false },
                ]),
              ),
              ...cube,
            },
            {
              uuid: 'mesh',
              type: 'mesh',
              name: 'Asa',
              color: 2,
              vertices: { a: [0, 0, 0], b: [2, 0, 0], c: [2, 2, 0], d: [0, 2, 0] },
              faces: {
                quad: {
                  vertices: ['a', 'b', 'c', 'd'],
                  texture: false,
                  uv: { a: [0, 0], b: [16, 0], c: [16, 16], d: [0, 16] },
                },
              },
              ...mesh,
            },
          ],
          outliner: ['cube', 'mesh'],
          textures: [{ uuid: 'paint' }],
        }),
      ),
    ),
    graph = readBbmodelGraph(envelope),
    nodes = readBbmodelNodeMetadata(envelope, graph),
    metadata = readBbmodelSurfaceMetadata(nodes),
    source = readBbmodelGeometry(graph),
    selection = planBbmodelSelection(envelope, graph),
    appearance = readBbmodelAppearance(envelope),
    plans = planBbmodelNativeGeometry(source, selection).plans,
    transforms = readBbmodelTransforms(graph, selection),
    positions = convertBbmodelPositions(source, plans, transforms).geometries,
    authorial = convertBbmodelFaceUvs(source, plans, appearance).geometries,
    uvs = convertBbmodelNativeUvs(
      source,
      plans,
      authorial,
      bindBbmodelTextures(source, appearance),
      appearance,
    ).geometries
  return { graph, nodes, metadata, selection, plans, transforms, positions, uvs }
}
function convert(input: ReturnType<typeof fixture>, options: BbmodelNodeMaterialOptions = {}) {
  return convertBbmodelNodeMaterials(input.metadata, input.plans, input.uvs, options)
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
] as const)('bbmodel %s gives each untextured piece its own chosen default material with original-face counts and native/GLB validation', async (version) => {
  const input = fixture({}, {}, version),
    before = structuredClone(input),
    options: BbmodelNodeMaterialOptions = {
      untextured: 'uniform',
      color: [0.25, 0.5, 0.75, 0.125],
      doubleSided: false,
    },
    optionsBefore = structuredClone(options)
  failure(() => convert(input), 'unsupported', 'elements[0]')
  const result = convert(input, options)
  expect(result.materials).toEqual([
    {
      id: 'bbmodel_node_material_0',
      name: 'Cubinho',
      baseColor: { kind: 'rgba', value: [0.25, 0.5, 0.75, 0.125] },
      roughness: 1,
      metalness: 0,
      doubleSided: false,
    },
    {
      id: 'bbmodel_node_material_1',
      name: 'Asa',
      baseColor: { kind: 'rgba', value: [0.25, 0.5, 0.75, 0.125] },
      roughness: 1,
      metalness: 0,
      doubleSided: false,
    },
  ])
  expect([...result.byNode]).toEqual([
    [0, 'bbmodel_node_material_0'],
    [1, 'bbmodel_node_material_1'],
  ])
  expect(result.issues).toEqual(
    [6, 1].map((count, node) => ({
      code: 'untextured-appearance-adapted',
      node,
      path: `elements[${node}]`,
      targetId: `bbmodel_node_material_${node}`,
      count,
      markerColor: node === 0 ? 7 : 2,
      color: [0.25, 0.5, 0.75, 0.125],
      doubleSided: false,
    })),
  )
  const hierarchy = convertBbmodelHierarchy(
      input.graph,
      input.nodes,
      input.selection,
      input.transforms,
      {
        geometries: input.plans,
        defaultMaterials: result.byNode,
      },
    ),
    geometries = convertBbmodelGeometries(
      input.plans,
      input.positions,
      input.uvs,
      new Map(),
    ).geometries,
    document: MoldaSceneDocument = {
      ...importDocumentBase({
        id: 'uniform',
        name: 'Cores escolhidas',
        createdAt: 1,
        updatedAt: 2,
      }),
      nodes: hierarchy.nodes,
      geometries,
      materials: result.materials,
    }
  expect(readSceneDocument(document).status).toBe('valid')
  await expectValidGlb(encodeSceneGlb(document).bytes)
  const first = result.materials[0]!.baseColor
  if (first.kind !== 'rgba') throw new Error('RGBA expected')
  first.value[0] = 1
  expect(result.materials[1]!.baseColor).toEqual({ kind: 'rgba', value: [0.25, 0.5, 0.75, 0.125] })
  const issue = result.issues[0]!
  if (issue.code !== 'untextured-appearance-adapted') throw new Error('Adaptation expected')
  expect(issue.color).toEqual([0.25, 0.5, 0.75, 0.125])
  issue.color[0] = 0
  expect(result.issues[1]).toEqual({
    ...issue,
    node: 1,
    path: 'elements[1]',
    targetId: 'bbmodel_node_material_1',
    count: 1,
    markerColor: 2,
    color: [0.25, 0.5, 0.75, 0.125],
  })
  expect(input).toEqual(before)
  expect(options).toEqual(optionsBefore)
})

test('bbmodel fully textured or surface-free geometry gets a required default without treating it as a visible approximation', () => {
  const input = fixture(
      {
        faces: Object.fromEntries(
          BBMODEL_CUBE_DIRECTIONS.map((face) => [face, { uv: [0, 0, 16, 16], texture: 0 }]),
        ),
      },
      { faces: {} },
    ),
    result = convert(input)
  expect(result.issues).toEqual([])
  expect(result.materials).toHaveLength(2)
  expect(result.materials[0]!.baseColor).toEqual({ kind: 'rgba', value: [1, 1, 1, 1] })
  const geometry = convertBbmodelGeometries(
    input.plans,
    input.positions,
    input.uvs,
    new Map([[0, 'paint']]),
  ).geometries[0]!
  expect(Object.values(geometry.faces).every((face) => face.materialId === 'paint')).toBe(true)
})

test('bbmodel uniform fallback does not interpret marker indices, mesh shading, draw order, UV coordinates or seam labels', () => {
  const input = fixture(
    { color: 1e308, name: '' },
    { color: -12.5, name: `${'x'.repeat(127)}🎨tail` },
  )
  for (const row of input.metadata)
    for (const key of ['shading', 'renderOrder', 'seams', 'shade']) poison(row, key)
  for (const row of input.uvs) for (const face of row.faces.values()) poison(face, 'corners')
  for (const plan of input.plans) for (const face of plan.faces) poison(face, 'corners')
  const result = convert(input, { untextured: 'uniform' })
  expect(result.materials.map((row) => row.name)).toEqual(['Cor da peça 1', 'x'.repeat(127)])
  expect(
    result.issues
      .filter((issue) => issue.code === 'untextured-appearance-adapted')
      .map((issue) => issue.markerColor),
  ).toEqual([1e308, -12.5])
  expect(
    result.issues
      .filter((issue) => issue.code.startsWith('name-'))
      .map((issue) => [issue.code, issue.path]),
  ).toEqual([
    ['name-generated', 'elements[0].name'],
    ['name-shortened', 'elements[1].name'],
  ])
})

test('bbmodel node material options are strict and own their finite RGBA channels', () => {
  expect(readBbmodelNodeMaterialOptions({})).toEqual({
    untextured: 'reject',
    color: [1, 1, 1, 1],
    doubleSided: true,
  })
  const invalid: [unknown, string][] = [
    [null, 'options'],
    [[], 'options'],
    [true, 'options'],
    [{ guess: true }, 'options.guess'],
    [{ untextured: null }, 'options.untextured'],
    [{ untextured: 'marker' }, 'options.untextured'],
    [{ doubleSided: null }, 'options.doubleSided'],
    [{ doubleSided: 'false' }, 'options.doubleSided'],
    ...[null, {}, [1, 1, 1], [1, 1, 1, 1, 1], new Float32Array(4)].map(
      (color): [unknown, string] => [{ color }, 'options.color'],
    ),
  ]
  for (let axis = 0; axis < 4; axis++) {
    for (const value of [-0.1, 1.1, Number.NaN, Infinity, -Infinity, '1', null]) {
      const color: unknown[] = [1, 1, 1, 1]
      color[axis] = value
      invalid.push([{ color }, `options.color[${axis}]`])
    }
  }
  for (const [options, path] of invalid)
    failure(
      () => readBbmodelNodeMaterialOptions(options as BbmodelNodeMaterialOptions),
      'invalid',
      path,
    )
  const options: BbmodelNodeMaterialOptions = {
      untextured: 'uniform',
      color: [-0, 0.1, 0.5, 1],
      doubleSided: false,
    },
    parsed = readBbmodelNodeMaterialOptions(options)
  expect(Object.is(parsed.color[0], -0)).toBe(true)
  parsed.color[1] = 0.8
  expect(options.color).toEqual([-0, 0.1, 0.5, 1])
})

test('bbmodel node material count is bounded before metadata or UV bindings are read', () => {
  const input = fixture(),
    tooMany = Array.from({ length: SCENE_LIMITS.geometries + 1 }, () => input.plans[0]!)
  poison(input.metadata, '0')
  poison(input.uvs, '0')
  failure(
    () => convertBbmodelNodeMaterials(input.metadata, tooMany, input.uvs),
    'budget',
    'nodeMaterials',
  )
})

test('bbmodel node materials match every private stage before the first face binding', () => {
  const mutations: ((input: ReturnType<typeof fixture>) => void)[] = [
    (input) => {
      input.metadata[1]!.node = 42
    },
    (input) => {
      input.metadata[1] = {
        kind: 'group',
        node: 1,
        sourcePath: 'elements[1]',
        name: null,
        markerColor: null,
      }
    },
    (input) => {
      input.metadata[1]!.sourcePath = 'elements[42]'
    },
    (input) => {
      input.metadata.pop()
    },
    (input) => {
      input.uvs.pop()
    },
    (input) => {
      input.uvs[1]!.geometryId = 'wrong'
    },
  ]
  for (const mutate of mutations) {
    const input = fixture()
    mutate(input)
    poison(input.uvs[0]!, 'faces')
    poison(input.plans[0]!, 'faces')
    expect(() => convert(input, { untextured: 'uniform' })).toThrow(
      'Mismatched bbmodel node material stages',
    )
  }
})

test('bbmodel missing private face bindings are programming errors, not untextured defaults', () => {
  const input = fixture()
  input.uvs[0] = { ...input.uvs[0]!, faces: new Map() }
  expect(() => convert(input, { untextured: 'uniform' })).toThrow(
    'Missing bbmodel node material face binding',
  )
})

test('bbmodel node material subsets do not read unrelated surface metadata', () => {
  const input = fixture({ color: undefined })
  poison(input.metadata, '1')
  expect(convertBbmodelNodeMaterials(input.metadata, [], [])).toEqual({
    materials: [],
    byNode: new Map(),
    issues: [],
  })
  const result = convertBbmodelNodeMaterials(
    input.metadata,
    input.plans.slice(0, 1),
    input.uvs.slice(0, 1),
    { untextured: 'uniform' },
  )
  expect(result.materials).toHaveLength(1)
  expect(result.issues).toEqual([
    {
      code: 'untextured-appearance-adapted',
      node: 0,
      path: 'elements[0]',
      targetId: 'bbmodel_node_material_0',
      count: 6,
      markerColor: null,
      color: [1, 1, 1, 1],
      doubleSided: true,
    },
  ])
})

test('bbmodel disabled surfaces and construction edges need no visible fallback; mixed faces count once', () => {
  const disabled = fixture(
    {
      faces: Object.fromEntries(
        BBMODEL_CUBE_DIRECTIONS.map((face) => [face, { uv: [0, 0, 16, 16], texture: null }]),
      ),
    },
    { faces: { edge: { vertices: ['a', 'b'], texture: null, uv: {} } } },
  )
  expect(convert(disabled).issues).toEqual([])
  expect(disabled.plans[1]!.looseEdges).toHaveLength(1)
  const vertices = ['a', 'b', 'c', 'd'],
    uv = { a: [0, 0], b: [16, 0], c: [16, 16], d: [0, 16] },
    mixed = fixture(
      {},
      {
        faces: {
          painted: { vertices, uv, texture: 0 },
          plain: { vertices, uv, texture: false },
          disabled: { vertices, uv, texture: null },
        },
      },
    ),
    result = convert(mixed, { untextured: 'uniform' })
  expect(mixed.plans[1]!.faces).toHaveLength(4)
  expect(
    result.issues
      .filter((issue) => issue.code === 'untextured-appearance-adapted')
      .map((issue) => issue.count),
  ).toEqual([6, 1])
})

import { expect, test } from 'bun:test'
import { encodeSceneGlb } from '../export/sceneGlb'
import type { MoldaSceneDocument } from '../scene/document'
import { indexSceneDocument } from '../scene/documentIndex'
import { evaluateSceneNodeFlags } from '../scene/evaluate'
import { SCENE_LIMITS } from '../scene/limits'
import { readSceneDocument } from '../scene/readDocument'
import { readGlb } from '../testing/glbRead'
import { expectValidGlb } from '../testing/gltfValidation'
import { readBbmodelAppearance } from './bbmodelAppearance'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { convertBbmodelFaceUvs } from './bbmodelFaceUvs'
import { convertBbmodelGeometries } from './bbmodelGeometries'
import { readBbmodelGeometry } from './bbmodelGeometry'
import { BBMODEL_CUBE_DIRECTIONS } from './bbmodelGeometryTypes'
import { readBbmodelGraph } from './bbmodelGraph'
import {
  type BbmodelHierarchyOptions,
  convertBbmodelHierarchy,
  readBbmodelHierarchyOptions,
} from './bbmodelHierarchy'
import { BbmodelInputError } from './bbmodelInput'
import { planBbmodelNativeGeometry } from './bbmodelNativeGeometryPlan'
import { convertBbmodelNativeUvs } from './bbmodelNativeUvs'
import { readBbmodelNodeMetadata } from './bbmodelNodeMetadata'
import { convertBbmodelPositions } from './bbmodelPositions'
import { planBbmodelSelection } from './bbmodelSelection'
import { bindBbmodelTextures } from './bbmodelTextureBinding'
import { readBbmodelTransforms } from './bbmodelTransforms'
import { importDocumentBase } from './importDocumentBase'

function fixture(
  version: BbmodelVersion = '5.0',
  overrides: Partial<
    Record<'root' | 'inner' | 'empty' | 'cube' | 'mesh', Record<string, unknown>>
  > = {},
) {
  const root = {
      uuid: 'root',
      name: 'Raiz',
      origin: [3, 4, 5],
      rotation: [0, 45, 0],
      ...overrides.root,
    },
    inner = {
      uuid: 'inner',
      name: 'Repetido',
      origin: [-2, 1, 4],
      rotation: [0, 0, 90],
      ...overrides.inner,
    },
    empty = { uuid: 'empty', name: 'Sem peças', ...overrides.empty },
    bytes = new TextEncoder().encode(
      JSON.stringify({
        meta: { format_version: version, model_format: 'free' },
        elements: [
          {
            uuid: '__proto__',
            type: 'cube',
            name: 'Repetido',
            from: [4, 5, 6],
            to: [6, 7, 8],
            origin: [4, 5, 6],
            rotation: [15, 25, 35],
            faces: Object.fromEntries(
              BBMODEL_CUBE_DIRECTIONS.map((face) => [face, { uv: [0, 0, 16, 16], texture: false }]),
            ),
            ...overrides.cube,
          },
          {
            uuid: 'constructor',
            type: 'mesh',
            name: 'Repetido',
            origin: [4, 8, 6],
            rotation: [45, 0, 15],
            vertices: { a: [0, 0, 0], b: [2, 0, 0], c: [0, 2, 0] },
            faces: {
              face: {
                vertices: ['a', 'b', 'c'],
                uv: { a: [0, 0], b: [16, 0], c: [0, 16] },
                texture: false,
              },
            },
            ...overrides.mesh,
          },
        ],
        ...(version === '5.0'
          ? {
              groups: [root, inner, empty],
              outliner: [
                {
                  uuid: 'root',
                  children: ['__proto__', { uuid: 'inner', children: ['constructor'] }],
                },
                { uuid: 'empty', children: [] },
              ],
            }
          : {
              outliner: [
                { ...root, children: ['__proto__', { ...inner, children: ['constructor'] }] },
                { ...empty, children: [] },
              ],
            }),
      }),
    ),
    envelope = readBbmodelEnvelope(bytes),
    graph = readBbmodelGraph(envelope),
    metadata = readBbmodelNodeMetadata(envelope, graph),
    selection = planBbmodelSelection(envelope, graph),
    transforms = readBbmodelTransforms(graph, selection),
    source = readBbmodelGeometry(graph),
    appearance = readBbmodelAppearance(envelope),
    plans = planBbmodelNativeGeometry(source, selection).plans,
    positions = convertBbmodelPositions(source, plans, transforms).geometries,
    authorial = convertBbmodelFaceUvs(source, plans, appearance).geometries,
    uvs = convertBbmodelNativeUvs(
      source,
      plans,
      authorial,
      bindBbmodelTextures(source, appearance),
      appearance,
    ).geometries,
    resources = {
      geometries: plans,
      defaultMaterials: new Map([
        [0, 'cube_material'],
        [1, 'mesh_material'],
      ]),
    }
  return { graph, metadata, selection, transforms, positions, uvs, resources }
}
function convert(input: ReturnType<typeof fixture>, options: BbmodelHierarchyOptions = {}) {
  return convertBbmodelHierarchy(
    input.graph,
    input.metadata,
    input.selection,
    input.transforms,
    input.resources,
    options,
  )
}
function documentOf(
  input: ReturnType<typeof fixture>,
  options: BbmodelHierarchyOptions = {},
): MoldaSceneDocument {
  return {
    ...importDocumentBase({ id: 'hierarchy', name: 'Organização', createdAt: 1, updatedAt: 2 }),
    nodes: convert(input, options).nodes,
    geometries: convertBbmodelGeometries(
      input.resources.geometries,
      input.positions,
      input.uvs,
      new Map(),
    ).geometries,
    materials: ['cube_material', 'mesh_material'].map((id) => ({
      id,
      name: id,
      baseColor: { kind: 'rgba', value: [0.25, 0.5, 1, 1] },
      roughness: 1,
      metalness: 0,
      doubleSided: false,
    })),
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
] as const)('bbmodel %s keeps authored groups, sibling order, literal identity and owned local transforms through native hierarchy and GLB', async (version) => {
  const input = fixture(version),
    before = structuredClone(input),
    result = convert(input)
  expect(result.issues).toEqual([])
  expect(result.nodes.map((node) => [node.id, node.parentId, node.kind])).toEqual([
    ['bbmodel_node_2', null, 'group'],
    ['bbmodel_node_4', null, 'group'],
    ['bbmodel_node_0', 'bbmodel_node_2', 'mesh'],
    ['bbmodel_node_3', 'bbmodel_node_2', 'group'],
    ['bbmodel_node_1', 'bbmodel_node_3', 'mesh'],
  ])
  expect(result.nodes.filter((node) => node.name === 'Repetido')).toHaveLength(3)
  expect(result.byUuid.get('__proto__')).toBe('bbmodel_node_0')
  expect(result.byUuid.get('constructor')).toBe('bbmodel_node_1')
  expect([...result.nodeIds.keys()]).toEqual([2, 4, 0, 3, 1])
  const document = documentOf(input),
    index = indexSceneDocument(document)
  expect(readSceneDocument(document).status).toBe('valid')
  for (const [source, nodeId] of result.nodeIds) {
    const original = input.transforms.get(source)!,
      native = index.scene.nodes.get(nodeId)!
    expect(native.transform).toEqual(original.local)
    expect(native.transform).not.toBe(original.local)
    for (let i = 0; i < 12; i++)
      expect(
        Math.abs(index.scene.worldMatrices.get(nodeId)![i]! - original.world[i]!),
      ).toBeLessThan(1e-12)
  }
  const glbBytes = encodeSceneGlb(document).bytes
  await expectValidGlb(glbBytes)
  expect(readGlb(glbBytes).json.nodes).toHaveLength(5)
  expect(input).toEqual(before)
  const transform = result.nodes[0]!.transform
  if (transform.kind !== 'trs') throw new Error('TRS expected')
  transform.translation[0] = 123
  transform.rotation[0] = 123
  transform.scale[0] = 123
  expect(input).toEqual(before)
  expect(result.nodes[1]!.transform).toEqual(input.transforms.get(4)!.local)
})

test('bbmodel group visibility and locks require consent before native inheritance affects descendants', () => {
  for (const [field, code] of [
    ['visibility', 'group-visibility-inherited'],
    ['locked', 'group-lock-inherited'],
  ] as const) {
    const input = fixture('5.0', { root: { [field]: field === 'locked' } }),
      before = structuredClone(input)
    failure(() => convert(input), 'unsupported', `groups[0].${field}`)
    const result = convert(input, { groupFlags: 'inherit' }),
      document = documentOf(input, { groupFlags: 'inherit' }),
      flags = evaluateSceneNodeFlags(indexSceneDocument(document).scene)
    expect(result.issues).toEqual([
      { code, path: `groups[0].${field}`, node: 2, nodeId: 'bbmodel_node_2' },
    ])
    for (const index of [0, 1, 2, 3])
      expect(flags.get(`bbmodel_node_${index}`)![field === 'locked' ? 'locked' : 'hidden']).toBe(
        true,
      )
    expect(flags.get('bbmodel_node_4')).toEqual({ hidden: false, locked: false })
    expect(input).toEqual(before)
  }
})

test('bbmodel element flags stay local and export false needs an explicit discarded-flag report', () => {
  const local = fixture('5.0', { cube: { visibility: false, locked: true } }),
    result = convert(local),
    flags = evaluateSceneNodeFlags(indexSceneDocument(documentOf(local)).scene)
  expect(result.issues).toEqual([])
  expect(flags.get('bbmodel_node_0')).toEqual({ hidden: true, locked: true })
  expect(flags.get('bbmodel_node_1')).toEqual({ hidden: false, locked: false })
  for (const version of ['4.9', '4.10', '5.0'] as const) {
    const input = fixture(version, { root: { export: false }, mesh: { export: false } }),
      path = version === '5.0' ? 'groups[0].export' : 'outliner[0].export'
    failure(() => convert(input), 'unsupported', path)
    const converted = convert(input, { exportFlags: 'discard' })
    expect(converted.nodes).toHaveLength(5)
    expect(converted.issues).toEqual([
      { code: 'export-flag-discarded', path, node: 2, nodeId: 'bbmodel_node_2' },
      {
        code: 'export-flag-discarded',
        path: 'elements[1].export',
        node: 1,
        nodeId: 'bbmodel_node_1',
      },
    ])
    expect(converted.nodes.every((node) => !Object.hasOwn(node, 'export'))).toBe(true)
    expect(readSceneDocument(documentOf(input, { exportFlags: 'discard' })).status).toBe('valid')
  }
})

test('bbmodel hierarchy adapts only names that need it and keeps omitted selection out of the native graph', () => {
  const input = fixture('5.0', {
      root: { name: '' },
      inner: { name: '   ' },
      empty: { name: undefined },
      cube: { name: `${'a'.repeat(127)}🎨tail` },
      mesh: { name: 'e\u0301' },
    }),
    result = convert(input)
  expect(result.nodes.map((node) => node.name)).toEqual([
    'Grupo 3',
    'Grupo 5',
    'a'.repeat(127),
    '   ',
    'e\u0301',
  ])
  expect(result.issues.map((issue) => [issue.code, issue.path])).toEqual([
    ['name-generated', 'groups[0].name'],
    ['name-generated', 'groups[2].name'],
    ['name-shortened', 'elements[0].name'],
  ])
  // This private subset preserves the original parentage; all-node metadata remains required.
  input.selection.nodes = input.selection.nodes.filter(({ node }) => node !== 4)
  input.selection.roots = input.selection.roots.filter((node) => node !== 4)
  const subset = convert(input)
  expect(subset.byUuid.has('empty')).toBe(false)
  expect(subset.nodes).toHaveLength(4)
})

test('bbmodel hierarchy checks all private identities and default materials before local transform copying', () => {
  for (const mismatch of ['metadata', 'node', 'kind', 'parent', 'transform', 'geometry'] as const) {
    const input = fixture()
    poison(input.transforms.get(2)!.local, 'translation')
    if (mismatch === 'metadata') input.metadata.pop()
    else if (mismatch === 'node') input.metadata[1]!.node = 99
    else if (mismatch === 'kind') input.metadata[1]!.kind = 'group'
    else if (mismatch === 'parent') input.selection.nodes.find((row) => row.node === 1)!.parent = 4
    else if (mismatch === 'transform')
      input.transforms = new Map([...input.transforms].filter(([node]) => node !== 1))
    else input.resources.geometries[1]!.sourcePath = 'other'
    expect(() => convert(input)).toThrow(
      mismatch === 'metadata'
        ? 'Incomplete bbmodel hierarchy metadata stage'
        : 'Mismatched bbmodel hierarchy stages',
    )
  }
  const missing = fixture()
  poison(missing.transforms.get(2)!.local, 'translation')
  missing.resources.defaultMaterials.delete(1)
  failure(() => convert(missing), 'invalid', 'nodeMaterials[1]')
  for (const value of ['', 'not an ID', 'newline\n']) {
    const input = fixture()
    poison(input.transforms.get(2)!.local, 'translation')
    input.resources.defaultMaterials.set(1, value)
    failure(() => convert(input), 'invalid', 'nodeMaterials[1]')
  }
})

test('bbmodel hierarchy checks native cardinality before metadata or transform values and accepts exactly 512 empty groups', () => {
  for (const kind of ['nodes', 'geometries'] as const) {
    const input = fixture()
    poison(input.metadata, '0')
    if (kind === 'nodes')
      input.selection.nodes = Array(SCENE_LIMITS.nodes + 1).fill(input.selection.nodes[0])
    else
      input.resources.geometries = Array(SCENE_LIMITS.geometries + 1).fill(
        input.resources.geometries[0],
      )
    failure(() => convert(input), 'budget', 'nodes')
  }
  const groups = Array.from({ length: SCENE_LIMITS.nodes }, (_, index) => ({
      uuid: `group-${index}`,
      name: `Grupo ${index}`,
    })),
    envelope = readBbmodelEnvelope(
      new TextEncoder().encode(
        JSON.stringify({
          meta: { format_version: '5.0', model_format: 'free' },
          groups,
          outliner: groups.map((group) => ({ uuid: group.uuid, children: [] })),
        }),
      ),
    ),
    graph = readBbmodelGraph(envelope),
    metadata = readBbmodelNodeMetadata(envelope, graph),
    selection = planBbmodelSelection(envelope, graph),
    transforms = readBbmodelTransforms(graph, selection),
    result = convertBbmodelHierarchy(graph, metadata, selection, transforms, {
      geometries: [],
      defaultMaterials: new Map(),
    })
  expect(result.nodes).toHaveLength(SCENE_LIMITS.nodes)
  expect(result.issues).toEqual([])
  expect(
    readSceneDocument({
      ...importDocumentBase({ id: 'groups', name: 'Grupos', createdAt: 1, updatedAt: 2 }),
      nodes: result.nodes,
    }).status,
  ).toBe('valid')
})

test('bbmodel hierarchy keeps unconsumed metadata inert and validates options before conversion', () => {
  const input = fixture()
  for (const row of input.metadata) poison(row, 'source')
  for (const row of input.graph.nodes) poison(row.source, 'data')
  expect(convert(input).nodes).toHaveLength(5)
  expect(readBbmodelHierarchyOptions({})).toEqual({ groupFlags: 'reject', exportFlags: 'reject' })
  for (const value of [null, [], true, 'inherit'])
    failure(
      () => readBbmodelHierarchyOptions(value as BbmodelHierarchyOptions),
      'invalid',
      'options',
    )
  for (const key of ['groupFlags', 'exportFlags'])
    for (const value of [null, true, 'unknown'])
      failure(() => readBbmodelHierarchyOptions({ [key]: value }), 'invalid', `options.${key}`)
  failure(
    () => readBbmodelHierarchyOptions({ unexpected: true } as BbmodelHierarchyOptions),
    'invalid',
    'options.unexpected',
  )
})

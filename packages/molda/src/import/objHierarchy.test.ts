import { expect, test } from 'bun:test'
import { encodeSceneGlb } from '../export/sceneGlb'
import type { MoldaSceneDocument } from '../scene/document'
import { indexSceneNodes } from '../scene/graph'
import { SCENE_LIMITS } from '../scene/limits'
import { identityMatrix } from '../scene/matrix'
import { readSceneDocument } from '../scene/readDocument'
import { SceneValidationError } from '../scene/validation'
import { expectValidGlb } from '../testing/gltfValidation'
import { animatedScene } from '../testing/sceneAnimation'
import { readGltfDocument } from './gltfDocument'
import { readObjDocument } from './objDocument'
import { convertObjGeometries } from './objGeometries'
import { planObjGeometries } from './objGeometryPlan'
import { convertObjHierarchy, type ObjHierarchyOptions } from './objHierarchy'
import { ObjInputError } from './objInput'

const triangle = 'v 0 0 0\nv 1 0 0\nv 0 1 0\n',
  material = { defaultId: 'material' },
  read = (text: string) => readObjDocument(new TextEncoder().encode(text))
function convert(source: ReturnType<typeof read>, options: ObjHierarchyOptions = {}) {
  return convertObjHierarchy(
    source,
    planObjGeometries(source, material),
    material.defaultId,
    options,
  )
}
function native(source: ReturnType<typeof read>, result = convert(source)): MoldaSceneDocument {
  return {
    ...animatedScene(),
    nodes: result.nodes,
    geometries: convertObjGeometries(source, material).parts.map((part) => part.geometry),
    materials: [
      {
        id: material.defaultId,
        name: 'Material',
        baseColor: { kind: 'rgba', value: [1, 1, 1, 1] },
        roughness: 1,
        metalness: 0,
        doubleSided: false,
      },
    ],
    images: [],
    animations: [],
    skins: [],
    mirrors: [],
  }
}
function fails(run: () => unknown, reason: ObjInputError['reason'], path: string) {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(ObjInputError)
    if (!(error instanceof ObjInputError)) throw error
    expect(error.reason).toBe(reason)
    expect(error.path).toBe(path)
    return error
  }
  throw new Error('Expected failure')
}

test('OBJ hierarchy keeps declaration order, repeated names, empty and implicit objects and separate unused points without inventing parents', async () => {
  const source = read(
      `${triangle}v 9 8 7\nf 1 2 3\no Same\ng front team\nf 1 2 3\no Empty\no Same\ng team\nl 1 2\no\n`,
    ),
    before = structuredClone(source),
    result = convert(source),
    document = native(source, result)
  expect(result.nodes.map((node) => [node.id, node.name, node.kind, node.parentId])).toEqual([
    ['obj_node_0', 'Objeto inicial', 'mesh', null],
    ['obj_node_6', 'Same', 'mesh', null],
    ['obj_node_9', 'Empty', 'group', null],
    ['obj_node_10', 'Same', 'mesh', null],
    ['obj_node_13', 'Objeto 13', 'group', null],
    ['obj_node_unused', 'Pontos sem uso', 'mesh', null],
  ])
  expect([...result.objectNodeIds.keys()]).toEqual([0, 6, 9, 10, 13])
  expect(result.unusedNodeId).toBe('obj_node_unused')
  expect(result.issues).toContainEqual({
    code: 'group-memberships-omitted',
    path: 'groups',
    sets: 2,
    names: 2,
    elements: 2,
    memberships: 3,
  })
  expect(result.issues.filter((issue) => issue.code === 'empty-object-preserved')).toHaveLength(2)
  const index = indexSceneNodes(result.nodes)
  expect(index.roots).toEqual(result.nodes.map((node) => node.id))
  for (const matrix of index.worldMatrices.values()) expect(matrix).toEqual(identityMatrix())
  expect(readSceneDocument(document)).toMatchObject({ status: 'valid' })
  expect(source).toEqual(before)
  const exported = encodeSceneGlb(document, { allowLosses: true }).bytes
  await expectValidGlb(exported)
  const reopened = readGltfDocument(exported)
  if (reopened.status !== 'ready') throw new Error('Self-contained export expected')
  const names = reopened.document.graph.nodes.map((node) => node.name)
  expect(names.filter((name) => name === 'Same')).toHaveLength(2)
  expect(names).toContain('Empty')
  expect(names).toContain('Objeto 13')
})

test('OBJ empty declarations are preserved by default and omitted only with a counted choice; absence of an implicit part creates no ghost node', () => {
  const source = read(`o First\ns 1\no First\ng team\no\n`),
    result = convert(source)
  expect(result.nodes.map((node) => node.name)).toEqual(['First', 'First', 'Objeto 5'])
  expect(result.nodes.every((node) => node.kind === 'group')).toBe(true)
  expect(result.objectNodeIds.has(0)).toBe(false)
  expect(result.unusedNodeId).toBeNull()
  expect(result.issues.some((issue) => issue.code === 'group-memberships-omitted')).toBe(false)
  const omitted = convert(source, { emptyObjects: 'omit' })
  expect(omitted.nodes).toEqual([])
  expect(omitted.issues).toEqual([{ code: 'empty-objects-omitted', path: 'objects', count: 3 }])
  expect(convert(read('')).nodes).toEqual([])
  const occupied = read(`${triangle}o Empty\no Full\nf 1 2 3\n`),
    reduced = convert(occupied, { emptyObjects: 'omit' })
  expect(reduced.nodes.map((node) => [node.name, node.kind])).toEqual([['Full', 'mesh']])
  expect(reduced.issues).toContainEqual({
    code: 'empty-objects-omitted',
    path: 'objects',
    count: 1,
  })
})

test('OBJ node budget accepts 512 empty objects and rejects 513 before names or element metadata; omitting empty declarations is explicit', () => {
  const statements = Array.from({ length: SCENE_LIMITS.nodes + 1 }, (_, i) => `o A${i}\n`),
    source = read(statements.join('')),
    unread = {
      ...source,
      get elements(): typeof source.elements {
        throw new Error('Elements read before node budget')
      },
    }
  Object.defineProperty(source.states[1]!, 'object', {
    get() {
      throw new Error('Name adapted before node budget')
    },
  })
  fails(() => convertObjHierarchy(unread, [], material.defaultId), 'budget', 'nodes')
  const exactSource = read(statements.slice(0, SCENE_LIMITS.nodes).join('')),
    exact = convert(exactSource)
  expect(exact.nodes).toHaveLength(SCENE_LIMITS.nodes)
  expect(indexSceneNodes(exact.nodes).roots).toHaveLength(SCENE_LIMITS.nodes)
  expect(readSceneDocument(native(exactSource, exact))).toMatchObject({ status: 'valid' })
  const omitted = convert(read(statements.join('')), { emptyObjects: 'omit' })
  expect(omitted.nodes).toEqual([])
  expect(omitted.issues).toEqual([{ code: 'empty-objects-omitted', path: 'objects', count: 513 }])
})

test('OBJ node preflight reserves the unused-position part and hierarchy never reads coordinate buffers', () => {
  const statements = Array.from({ length: SCENE_LIMITS.nodes }, (_, i) => `o A${i}\n`),
    source = read(`${statements.join('')}v 1 2 3\n`),
    plans = planObjGeometries(source, material),
    unread = {
      ...source,
      get positions(): Float64Array {
        throw new Error('Positions opened in hierarchy')
      },
      get texcoords(): Float64Array {
        throw new Error('UV opened in hierarchy')
      },
      get corners(): Int32Array {
        throw new Error('Corners opened in hierarchy')
      },
    }
  fails(() => convertObjHierarchy(unread, plans, material.defaultId), 'budget', 'nodes')
  const onlyUnused = convertObjHierarchy(unread, plans, material.defaultId, {
    emptyObjects: 'omit',
  })
  expect(onlyUnused.nodes.map((node) => node.id)).toEqual(['obj_node_unused'])
  const exactSource = read(`${statements.slice(0, -1).join('')}v 1 2 3\n`),
    exact = convert(exactSource)
  expect(exact.nodes).toHaveLength(SCENE_LIMITS.nodes)
  expect(readSceneDocument(native(exactSource, exact))).toMatchObject({ status: 'valid' })
})

test('OBJ group reporting expands shared used lists once per call, counts memberships without duplicate names and ignores unused/default lists', () => {
  const source = read(
      `${triangle}g team face face default\n${'s 1\nf 1 2 3\n'.repeat(1000)}g unused\n`,
    ),
    groups = source.states[source.elements[0]!.state]!.groups,
    unused = source.states[source.states.length - 1]!.groups,
    plans = planObjGeometries(source, material)
  let expanded = 0
  Object.defineProperty(groups, 'filter', {
    value(callback: (value: string, index: number, array: string[]) => unknown) {
      expanded++
      return Array.prototype.filter.call(this, callback)
    },
  })
  Object.defineProperty(unused, 'filter', {
    get() {
      throw new Error('Unused list expanded')
    },
  })
  const result = convertObjHierarchy(source, plans, material.defaultId)
  expect(result.issues).toContainEqual({
    code: 'group-memberships-omitted',
    path: 'groups',
    sets: 1,
    names: 2,
    elements: 1000,
    memberships: 2000,
  })
  expect(expanded).toBe(1)
  expect(result.nodes).toHaveLength(1)
  convertObjHierarchy(source, plans, material.defaultId)
  expect(expanded).toBe(2)
  expect(
    convert(read(`${triangle}g default\nf 1 2 3\n`)).issues.some(
      (issue) => issue.code === 'group-memberships-omitted',
    ),
  ).toBe(false)
})

test('OBJ hierarchy owns transforms and maps, retains literal safe names, and shortens surrogate pairs only at the native name boundary', () => {
  const source = read(`o ${'a'.repeat(127)}😀tail\no __proto__\no constructor\n`),
    result = convert(source),
    before = structuredClone(source)
  expect(result.nodes.map((node) => node.name)).toEqual([
    'a'.repeat(127),
    '__proto__',
    'constructor',
  ])
  expect(result.issues).toContainEqual({
    code: 'name-shortened',
    path: 'lines[1]',
    nodeId: 'obj_node_1',
  })
  const first = result.nodes[0]!,
    second = result.nodes[1]!
  if (first.transform.kind !== 'trs' || second.transform.kind !== 'trs')
    throw new Error('Identity TRS expected')
  first.transform.translation[0] = 100
  expect(second.transform.translation).toEqual([0, 0, 0])
  expect(convert(source).nodes[0]!.transform).toEqual({
    kind: 'trs',
    translation: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
  })
  result.objectNodeIds.clear()
  expect(convert(source).objectNodeIds.size).toBe(3)
  expect(source).toEqual(before)
})

test('OBJ hierarchy validates policy and resource references before source, with exact part limit and native error causes', () => {
  const source = read(''),
    unread = {
      ...source,
      get states(): typeof source.states {
        throw new Error('Source opened')
      },
    }
  for (const options of [
    null,
    [],
    { emptyObjects: null },
    { emptyObjects: 'automatic' },
    { other: true },
  ]) {
    const path =
      options === null || Array.isArray(options)
        ? 'options'
        : 'emptyObjects' in options
          ? 'options.emptyObjects'
          : 'options.other'
    fails(
      () => convertObjHierarchy(unread, [], material.defaultId, options as ObjHierarchyOptions),
      'invalid',
      path,
    )
  }
  fails(
    () => convertObjHierarchy(unread, new Array(SCENE_LIMITS.geometries + 1), material.defaultId),
    'budget',
    'geometries',
  )
  const error = fails(
    () => convertObjHierarchy(unread, [], 'invalid id'),
    'invalid',
    'materials.defaultId',
  )
  expect(error.cause).toBeInstanceOf(SceneValidationError)
  for (const parts of [
    [{ objectLine: 0.5, geometryId: 'shape' }],
    [{ objectLine: -1, geometryId: 'shape' }],
  ])
    fails(
      () => convertObjHierarchy(unread, parts, material.defaultId),
      'invalid',
      'geometries[0].objectLine',
    )
  fails(
    () =>
      convertObjHierarchy(unread, [{ objectLine: 0, geometryId: 'bad id' }], material.defaultId),
    'invalid',
    'geometries[0].geometryId',
  )
  fails(
    () =>
      convertObjHierarchy(
        unread,
        [
          { objectLine: 0, geometryId: 'a' },
          { objectLine: 0, geometryId: 'b' },
        ],
        material.defaultId,
      ),
    'invalid',
    'geometries[1]',
  )
  fails(
    () =>
      convertObjHierarchy(
        unread,
        [
          { objectLine: 0, geometryId: 'a' },
          { objectLine: 1, geometryId: 'a' },
        ],
        material.defaultId,
      ),
    'invalid',
    'geometries[1].geometryId',
  )
  fails(
    () =>
      convertObjHierarchy(source, [{ objectLine: 999, geometryId: 'shape' }], material.defaultId),
    'invalid',
    'geometries.objectLine',
  )
  const exact = read(
    `${triangle}${Array.from({ length: SCENE_LIMITS.geometries }, (_, i) => `o A${i}\nf 1 2 3\n`).join('')}`,
  )
  expect(convert(exact).nodes).toHaveLength(SCENE_LIMITS.geometries)
})

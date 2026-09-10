import { expect, test } from 'bun:test'
import { encodeSceneGlb } from '../export/sceneGlb'
import type { ModelSceneNode, MoldaSceneDocument, SceneMaterial } from '../scene/document'
import { buildSceneGeometry } from '../scene/geometry'
import { sceneImageTexel } from '../scene/imageCoordinates'
import { SCENE_LIMITS } from '../scene/limits'
import { readSceneDocument } from '../scene/readDocument'
import { expectValidGlb } from '../testing/gltfValidation'
import { animatedScene } from '../testing/sceneAnimation'
import { type ObjDocument, readObjDocument } from './objDocument'
import { convertObjGeometries, type ObjGeometryIssue } from './objGeometries'
import { planObjGeometries } from './objGeometryPlan'
import { ObjInputError } from './objInput'

const material = { defaultId: 'material' },
  read = (text: string) => readObjDocument(new TextEncoder().encode(text)),
  triangle = 'v 0 0 0\nv 2 0 0\nv 0 3 0\n'
function noCoordinateReads(source: ObjDocument): ObjDocument {
  return {
    ...source,
    positions: new Proxy(source.positions, {
      get(target, key) {
        if (typeof key === 'string' && /^\d+$/.test(key))
          throw new Error('Coordinates read before preflight')
        return Reflect.get(target, key, target)
      },
    }),
  }
}
function fails(run: () => unknown, reason: ObjInputError['reason'], path?: string) {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(ObjInputError)
    if (!(error instanceof ObjInputError)) throw error
    expect(error.reason).toBe(reason)
    if (path) expect(error.path).toBe(path)
    return
  }
  throw new Error('Expected an explicit conversion failure')
}
function native(result: ReturnType<typeof convertObjGeometries>): MoldaSceneDocument {
  const ids = new Set([material.defaultId])
  for (const part of result.parts)
    for (const face of Object.values(part.geometry.faces))
      if (face.materialId) ids.add(face.materialId)
  return {
    ...animatedScene(),
    animations: [],
    skins: [],
    images: [],
    mirrors: [],
    nodes: result.parts.map(
      (part, i): ModelSceneNode => ({
        id: `part_${i}`,
        name: `Parte ${i}`,
        kind: 'mesh',
        parentId: null,
        hidden: false,
        locked: false,
        transform: {
          kind: 'trs',
          translation: [0, 0, 0],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        },
        geometryId: part.geometry.id,
        materialId: material.defaultId,
      }),
    ),
    geometries: result.parts.map((part) => part.geometry),
    materials: [...ids].map(
      (id): SceneMaterial => ({
        id,
        name: id,
        baseColor: { kind: 'rgba', value: [1, 1, 1, 1] },
        roughness: 1,
        metalness: 0,
        doubleSided: false,
      }),
    ),
  }
}

test('OBJ geometry keeps same-name declarations separate, shares source vertices only inside each object and preserves unused points', () => {
  const source = read(
      `${triangle}v 9 8 7\no Same\ng one two\nf 1 2 3\ns 1\nf 3 2 1\no Same\nf 1 2 3\n`,
    ),
    before = structuredClone(source),
    result = convertObjGeometries(source, material)
  expect(result.parts.map((part) => part.objectLine)).toEqual([5, 10, null])
  expect(result.parts.map((part) => part.geometry.id)).toEqual([
    'obj_geometry_5',
    'obj_geometry_10',
    'obj_geometry_unused',
  ])
  expect(result.costs).toEqual({ vertices: 7, triangles: 3, looseEdges: 0 })
  expect(result.parts[0]!.geometry.vertices.v_0).toEqual([0, 0, 0])
  expect(result.parts[0]!.geometry.vertices.v_0 === result.parts[1]!.geometry.vertices.v_0).toBe(
    false,
  )
  expect(result.parts[2]!.geometry.vertices).toEqual({ v_3: [9, 8, 7] })
  expect(result.issues).toContainEqual({
    code: 'unreferenced-vertices',
    geometryId: 'obj_geometry_unused',
    path: 'vertices.unused',
    count: 1,
  })
  expect(source).toEqual(before)
  result.parts[0]!.geometry.vertices.v_0![0] = 22
  expect(source.positions[0]).toBe(0)
  expect(result.parts[1]!.geometry.vertices.v_0![0]).toBe(0)
})

test('OBJ polygons retain authored concavity, winding and seams; only exact redundant closing references are removed', async () => {
  const source = read(
      'v 0 0 0\nv 3 0 0\nv 1 1 0\nv 3 3 0\nv 0 3 0\nf 1 2 3 4 5 1 1\nf 5 4 3 2 1\n',
    ),
    result = convertObjGeometries(source, material),
    geometry = result.parts[0]!.geometry,
    faces = Object.values(geometry.faces),
    drawn = buildSceneGeometry(geometry)
  expect(faces.map((face) => face.corners.map((corner) => corner.vertexId))).toEqual([
    ['v_0', 'v_1', 'v_2', 'v_3', 'v_4'],
    ['v_4', 'v_3', 'v_2', 'v_1', 'v_0'],
  ])
  expect(result.costs.triangles).toBe(6)
  expect(result.issues).toEqual([
    { code: 'closing-corners-removed', geometryId: geometry.id, path: 'objects.default', count: 2 },
  ])
  const area = new Map<string, number>()
  for (let i = 0; i < drawn.faceIds.length; i++) {
    const p = drawn.positions,
      k = i * 9,
      signed =
        ((p[k + 3]! - p[k]!) * (p[k + 7]! - p[k + 1]!) -
          (p[k + 4]! - p[k + 1]!) * (p[k + 6]! - p[k]!)) /
        2
    area.set(drawn.faceIds[i]!, (area.get(drawn.faceIds[i]!) ?? 0) + signed)
  }
  expect([...area.values()]).toEqual([6, -6])
  const document = native(result)
  expect(readSceneDocument(document).status).toBe('valid')
  await expectValidGlb(encodeSceneGlb(document).bytes)
  fails(
    () => convertObjGeometries(read(`${triangle}f 1 2 1 3\n`), material),
    'unsupported',
    'lines[4]',
  )
  fails(
    () => convertObjGeometries(read(`${triangle}vt 0 0\nvt 1 1\nf 1/1 2/1 3/1 1/2\n`), material),
    'unsupported',
    'lines[6]',
  )
})

test('OBJ UV preserves upward native coordinates without rounding seams or changing source weights and normals', () => {
  const source = read(
      'v -0 0 0 .5\nv 1 0 0\nv 0 1 0\nvt 0 0\nvt 0 1 .3\nvt .2 .7\nvn 0 0 2\ns 2\nf 1/1/1 2/2/1 3/3/1\nf 1/2/1 3/3/1 2/1/1\nf 1 2 3\n',
    ),
    before = structuredClone(source),
    result = convertObjGeometries(source, material),
    [first, second, absent] = Object.values(result.parts[0]!.geometry.faces)
  expect(first!.corners.map((corner) => corner.uv)).toEqual([
    [0, 0],
    [0, 1],
    [0.2, 0.7],
  ])
  expect(first!.corners[0]!.vertexId).toBe(second!.corners[0]!.vertexId)
  expect(second!.corners[0]!.uv).toEqual([0, 1])
  expect(absent!.corners.map((corner) => corner.uv)).toEqual([
    [0, 0],
    [0, 0],
    [0, 0],
  ])
  expect(sceneImageTexel({ width: 2, height: 2 }, first!.corners[0]!.uv)).toEqual([0, 0])
  expect(sceneImageTexel({ width: 2, height: 2 }, first!.corners[1]!.uv)).toEqual([0, 1])
  expect(result.parts[0]!.geometry.vertices.v_0).toEqual([0, 0, 0])
  expect(Object.fromEntries(result.issues.map((issue) => [issue.code, issue.count]))).toEqual({
    'rational-weight-omitted': 1,
    'third-uv-coordinate-omitted': 2,
    'flat-normals': 2,
    'smoothing-groups-omitted': 3,
  })
  expect(source).toEqual(before)
})

test('OBJ points and polylines stay construction geometry; duplicate positions are not welded and repeated-index segments are reported', () => {
  const source = read(
      'v 0 0 0\nv 0 0 0\nv 1 0 0\nvt .2 .3\nusemtl Wire\np 1 1 2\nl 1/1 2 2/1 3/1 1\n',
    ),
    result = convertObjGeometries(source, material),
    geometry = result.parts[0]!.geometry
  expect(geometry.looseEdges).toEqual([
    ['v_0', 'v_1'],
    ['v_1', 'v_2'],
    ['v_2', 'v_0'],
  ])
  expect(Object.keys(geometry.vertices)).toEqual(['v_0', 'v_1', 'v_2'])
  expect(geometry.faces).toEqual({})
  expect(result.costs).toEqual({ vertices: 3, triangles: 0, looseEdges: 3 })
  expect(Object.fromEntries(result.issues.map((issue) => [issue.code, issue.count]))).toEqual({
    'construction-material-omitted': 2,
    'construction-points': 3,
    'construction-lines': 4,
    'line-uv-omitted': 3,
    'repeated-line-indices-omitted': 1,
  })
  expect(readSceneDocument(native(result)).status).toBe('valid')
})

test('OBJ material bindings are checked per face, allowing two interpretations of one authored material state', () => {
  const source = read(`${triangle}vt 0 0\np 1\nusemtl Paint\nf 1/1 2/1 3/1\nf 1 2 3\n`),
    byFace = new Map([
      [1, 'textured'],
      [2, 'without_map'],
    ]),
    result = convertObjGeometries(source, { ...material, byFace })
  expect(Object.values(result.parts[0]!.geometry.faces).map((face) => face.materialId)).toEqual([
    'textured',
    'without_map',
  ])
  byFace.set(1, 'changed')
  expect(Object.values(result.parts[0]!.geometry.faces)[0]!.materialId).toBe('textured')
  expect(readSceneDocument(native(result)).status).toBe('valid')
  for (const index of [-1, 0.5, 0, 3, Number.NaN])
    fails(
      () =>
        convertObjGeometries(noCoordinateReads(source), {
          ...material,
          byFace: new Map([[index, 'material']]),
        }),
      'invalid',
    )
  fails(
    () => convertObjGeometries(noCoordinateReads(source), material),
    'invalid',
    'lines[7].material',
  )
  fails(
    () => convertObjGeometries(noCoordinateReads(source), { defaultId: '../bad' }),
    'invalid',
    'materials.defaultId',
  )
  fails(
    () =>
      convertObjGeometries(noCoordinateReads(source), {
        ...material,
        byFace: new Map([[1, 'bad id']]),
      }),
    'invalid',
    'materials.byFace[1]',
  )
})

test('OBJ empty objects remain source metadata, while unreferenced positions survive as owned construction geometry', () => {
  const empty = read('o Empty\ng one two\nusemtl NotUsed\n')
  expect(convertObjGeometries(empty, material)).toEqual({
    parts: [],
    issues: [],
    costs: { vertices: 0, triangles: 0, looseEdges: 0 },
  })
  expect(empty.states.at(-1)).toMatchObject({ object: 'Empty', objectLine: 1, material: 'NotUsed' })
  const result = convertObjGeometries(read('v .123456789123 0 0 -1\nv 2 3 4\n'), material)
  expect(result.parts.length).toBe(1)
  expect(result.parts[0]!.objectLine).toBeNull()
  expect(result.parts[0]!.geometry.vertices.v_0).toEqual([0.123456789123, 0, 0])
  expect(result.costs).toEqual({ vertices: 2, triangles: 0, looseEdges: 0 })
  expect(readSceneDocument(native(result)).status).toBe('valid')
  fails(
    () =>
      convertObjGeometries(
        noCoordinateReads(read(`${triangle}vn 0 0 1\nvn 0 0 1\nf 1//1 2//1 3//1 1//2\n`)),
        material,
      ),
    'unsupported',
    'lines[6]',
  )
})

test('OBJ retains undrawn authorial polygons with real renderer diagnostics and rejects numerical draw overflow', () => {
  const cases: Array<{ text: string; code: ObjGeometryIssue['code'] }> = [
    { text: 'v 0 0 0\nv 1 0 0\nv 2 0 0\nf 1 2 3\n', code: 'undrawn-degenerate-faces' },
    {
      text: 'v 0 0 0\nv 2 2 0\nv 0 2 0\nv 2 0 0\nf 1 2 3 4\n',
      code: 'undrawn-self-intersection-faces',
    },
    { text: 'v 0 0 0\nv 1e-50 0 0\nv 0 1e-50 0\nf 1 2 3\n', code: 'undrawn-precision-faces' },
  ]
  for (const fixture of cases) {
    const result = convertObjGeometries(read(fixture.text), material)
    expect(Object.keys(result.parts[0]!.geometry.faces).length).toBe(1)
    expect(result.issues).toContainEqual({
      code: fixture.code,
      geometryId: 'obj_geometry_0',
      path: 'objects.default',
      count: 1,
    })
    expect(buildSceneGeometry(result.parts[0]!.geometry).faceIds).toEqual([])
  }
  fails(
    () => convertObjGeometries(read('v 1e40 0 0\nv 0 1e40 0\nv 0 0 1e40\nf 1 2 3\n'), material),
    'unsupported',
    'native.geometries.obj_geometry_0.vertices.v_0',
  )
})

test('OBJ native corner and triangle budgets precede coordinate reads, and exact redundant closure fits the corner limit', () => {
  const ring = (count: number) =>
      Array.from(
        { length: count },
        (_, i) =>
          `v ${Math.cos((i * Math.PI * 2) / count)} ${Math.sin((i * Math.PI * 2) / count)} 0\n`,
      ).join(''),
    refs = (count: number) => Array.from({ length: count }, (_, i) => i + 1).join(' '),
    exact = read(`${ring(64)}f ${refs(64)} 1\n`)
  expect(convertObjGeometries(exact, material).costs.triangles).toBe(62)
  fails(
    () => convertObjGeometries(noCoordinateReads(read(`${ring(65)}f ${refs(65)}\n`)), material),
    'unsupported',
    'lines[66]',
  )
  const triangles = `${triangle}${'f 1 2 3\n'.repeat(SCENE_LIMITS.triangles)}`
  expect(planObjGeometries(noCoordinateReads(read(triangles)), material)[0]!.cost.triangles).toBe(
    SCENE_LIMITS.triangles,
  )
  fails(
    () => convertObjGeometries(noCoordinateReads(read(`${triangles}f 1 2 3\n`)), material),
    'budget',
  )
})

test('OBJ part, duplicated-vertex and edge budgets include all objects and unreferenced positions before materialization', () => {
  const vertices = 'v 0 0 0\n'.repeat(1_024),
    refs = Array.from({ length: 1_024 }, (_, i) => i + 1).join(' '),
    objects = Array.from(
      { length: 128 },
      (_, i) => `o Same\np ${refs}${i === 0 ? ' EXTRA' : ''}\n`,
    ).join(''),
    exact = read(`${vertices}${objects.replace(' EXTRA', '')}`),
    plans = planObjGeometries(noCoordinateReads(exact), material)
  expect(plans.length).toBe(SCENE_LIMITS.geometries)
  expect(plans.reduce((sum, plan) => sum + plan.cost.vertices, 0)).toBe(SCENE_LIMITS.vertices)
  fails(
    () =>
      convertObjGeometries(
        noCoordinateReads(read(`${vertices}v 1 0 0\n${objects.replace('EXTRA', '1025')}`)),
        material,
      ),
    'budget',
  )
  fails(
    () =>
      convertObjGeometries(
        noCoordinateReads(read(`${vertices}${objects.replace(' EXTRA', '')}o Extra\np 1\n`)),
        material,
      ),
    'budget',
  )
  fails(
    () =>
      convertObjGeometries(
        noCoordinateReads(read('v 0 0 0\n'.repeat(SCENE_LIMITS.vertices + 1))),
        material,
      ),
    'budget',
    'vertices',
  )
  const edges = `v 0 0 0\nv 1 0 0\n${'l 1 2\n'.repeat(SCENE_LIMITS.looseEdges)}`
  expect(planObjGeometries(noCoordinateReads(read(edges)), material)[0]!.cost.looseEdges).toBe(
    SCENE_LIMITS.looseEdges,
  )
  fails(() => convertObjGeometries(noCoordinateReads(read(`${edges}l 1 2\n`)), material), 'budget')
}, 30_000)

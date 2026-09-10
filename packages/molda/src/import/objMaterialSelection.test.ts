import { expect, test } from 'bun:test'
import { SCENE_LIMITS } from '../scene/limits'
import type { MtlMaterial } from './mtlTypes'
import { readObjBundle } from './objBundle'
import { convertObjGeometries } from './objGeometries'
import { ObjInputError } from './objInput'
import { planObjMaterials } from './objMaterialSelection'

const bytes = (text: string) => new TextEncoder().encode(text),
  vertices = 'v 0 0 0\nv 1 0 0\nv 0 1 0\n',
  face = 'f 1 2 3\n',
  uvFace = 'f 1/1 2/1 3/1\n'
function bundle(text: string, files: Array<[string, string]> = []) {
  const result = readObjBundle(
    bytes(text),
    files.map(([path, text]) => ({ path, bytes: bytes(text) })),
  )
  if (result.status !== 'ready') throw new Error(`Missing files: ${result.paths.join(', ')}`)
  return result
}
function failure(run: () => unknown, reason: ObjInputError['reason'], path?: string) {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(ObjInputError)
    if (!(error instanceof ObjInputError)) throw error
    expect(error.reason).toBe(reason)
    if (path) expect(error.path).toBe(path)
    return
  }
  throw new Error(`Expected ${reason}`)
}

test('OBJ material lookup uses exact names and first matching library in one ordered mtllib list', () => {
  const source = bundle(
      `mtllib a.mtl b.mtl\n${vertices}p 1\nusemtl Shared\n${face}usemtl __proto__\n${face}usemtl Azul  claro\n${face}usemtl\n${face}`,
      [
        ['a.mtl', 'newmtl Shared\nKd .2\nnewmtl __proto__\nKd .3\n'],
        ['b.mtl', 'newmtl Shared\nKd .9\nnewmtl Azul  claro\nKd .4\nnewmtl Unused\n'],
      ],
    ),
    original = structuredClone(source),
    selected = planObjMaterials(source)
  expect(selected.materials.map(({ library, material }) => [library, material])).toEqual([
    [0, 0],
    [0, 1],
    [1, 1],
  ])
  expect(selected.needsDefault).toBe(true)
  expect(selected.issues).toEqual([])
  expect([...selected.geometry.byFace!.keys()]).toEqual([1, 2, 3, 4])
  const geometries = convertObjGeometries(source.source, selected.geometry)
  expect(
    Object.values(geometries.parts[0]!.geometry.faces).map(({ materialId }) => materialId),
  ).toEqual([...selected.geometry.byFace!.values()])
  expect(source).toEqual(original)
  selected.materials[0]!.material = 99
  for (const id of selected.geometry.byFace!.values()) expect(id.length).toBeLessThan(128)
  expect(source.libraries[0]!.source.materials[0]!.name).toBe('Shared')
})

test('OBJ multiple mtllib declarations require an explicit scoped/global policy; a single library list is unambiguous even when declared late', () => {
  const source = bundle(`mtllib a.mtl\n${vertices}usemtl Shared\n${face}mtllib b.mtl\n${face}`, [
    ['a.mtl', 'newmtl Shared\nKd .2\n'],
    ['b.mtl', 'newmtl Shared\nKd .9\n'],
  ])
  failure(() => planObjMaterials(source), 'unsupported', 'lines[6].material')
  const positional = planObjMaterials(source, { libraryMode: 'declaration' }),
    global = planObjMaterials(source, { libraryMode: 'all' })
  expect(positional.materials.map(({ library }) => library)).toEqual([0, 1])
  expect(global.materials.map(({ library }) => library)).toEqual([0])
  expect(positional.issues).toEqual([{ code: 'library-scope-selected', policy: 'declaration' }])
  expect(global.issues).toEqual([{ code: 'library-scope-selected', policy: 'all' }])
  const late = bundle(`${vertices}usemtl Shared\n${face}mtllib a.mtl\n`, [
    ['a.mtl', 'newmtl Shared\n'],
  ])
  expect(planObjMaterials(late).materials.length).toBe(1)
  failure(
    () => planObjMaterials(late, { libraryMode: 'declaration' }),
    'unsupported',
    'lines[5].material',
  )
})

test('OBJ duplicate declarations within the selected library are not silently overwritten or bypassed by another library', () => {
  const source = bundle(`mtllib a.mtl b.mtl\n${vertices}usemtl Repeat\n${face}${face}`, [
    ['a.mtl', 'newmtl Repeat\nKd .1\nnewmtl Repeat\nKd .9\nnewmtl Unused\nnewmtl Unused\n'],
    ['b.mtl', 'newmtl Repeat\nKd .5\n'],
  ])
  failure(() => planObjMaterials(source), 'unsupported')
  for (const policy of ['first', 'last'] as const) {
    const result = planObjMaterials(source, { duplicateMaterials: policy }),
      material = policy === 'first' ? 0 : 1
    expect(result.materials.map(({ library, material }) => [library, material])).toEqual([
      [0, material],
    ])
    expect(result.issues).toEqual([
      {
        code: 'duplicate-material-selected',
        library: 0,
        material,
        name: 'Repeat',
        policy,
        ignored: 1,
      },
    ])
  }
})

test('OBJ missing-material fallback is opt-in, counted per lookup scope, and construction does not require render materials', () => {
  const source = bundle(`${vertices}usemtl Missing\n${face}${face}usemtl missing\n${face}`)
  failure(() => planObjMaterials(source), 'unsupported', 'lines[5].material')
  const result = planObjMaterials(source, { missingMaterials: 'default' })
  expect(result.materials).toEqual([])
  expect(result.geometry.defaultId).toBe('obj_material_default')
  expect([...result.geometry.byFace!.values()]).toEqual([
    'obj_material_default',
    'obj_material_default',
    'obj_material_default',
  ])
  expect(result.issues).toEqual([
    { code: 'missing-material-default', name: 'Missing', scope: { kind: 'none' }, faces: 2 },
    { code: 'missing-material-default', name: 'missing', scope: { kind: 'none' }, faces: 1 },
  ])
  expect(convertObjGeometries(source.source, result.geometry).parts.length).toBe(1)
  for (const input of ['', `${vertices}usemtl Missing\np 1\nl 2 3\n`]) {
    const construction = planObjMaterials(bundle(input))
    expect(construction).toEqual({
      materials: [],
      needsDefault: true,
      geometry: { defaultId: 'obj_material_default', byFace: new Map() },
      issues: [],
    })
  }
})

test('OBJ UV variants exist only for mapped materials; selection reads neither numeric attributes, material values nor resource bytes', () => {
  const source = bundle(
    `mtllib a.mtl\n${vertices}vt .25 .75\nusemtl Mapped\n${face}${uvFace}usemtl Solid\n${face}${uvFace}`,
    [
      ['a.mtl', 'newmtl Mapped\nmap_Kd t.png\nnewmtl Solid\nKd .5\n'],
      ['t.png', 'not decoded here'],
    ],
  )
  const guarded = {
      ...source,
      source: {
        ...source.source,
        get positions(): never {
          throw new Error('Read positions')
        },
        get texcoords(): never {
          throw new Error('Read UV values')
        },
        get corners(): never {
          throw new Error('Read indices')
        },
      },
      get resources(): never {
        throw new Error('Read resource bytes')
      },
      libraries: source.libraries.map((library) => ({
        ...library,
        source: {
          ...library.source,
          materials: library.source.materials.map((material) => ({
            ...material,
            properties: material.properties.map((property) => ({
              ...property,
              get value(): never {
                throw new Error('Read material values')
              },
            })),
          })),
        },
      })),
    },
    result = planObjMaterials(guarded)
  expect(result.materials.map(({ material, useUvTextures }) => [material, useUvTextures])).toEqual([
    [0, false],
    [0, true],
    [1, false],
  ])
  expect(result.needsDefault).toBe(false)
  expect(result.geometry.defaultId).toBe(result.materials[0]!.id)
  expect(result.geometry.byFace!.get(2)).toBe(result.geometry.byFace!.get(3))
  expect(result.geometry.byFace!.get(0)).not.toBe(result.geometry.byFace!.get(1))
})

test('OBJ environment reflection alone does not require per-face UV variants', () => {
  const source = bundle(`mtllib a.mtl\n${vertices}vt 0 0\nusemtl Reflective\n${face}${uvFace}`, [
    ['a.mtl', 'newmtl Reflective\nrefl -type sphere environment.png\n'],
    ['environment.png', 'bytes only'],
  ])
  const result = planObjMaterials(source)
  expect(result.materials.length).toBe(1)
  expect(result.geometry.byFace!.get(0)).toBe(result.geometry.byFace!.get(1))
})

test('OBJ mapped-property classification is shared across lookup scopes for the same declaration', () => {
  const source = bundle(
      `${vertices}${Array.from({ length: 100 }, () => `mtllib a.mtl\nusemtl Shared\n${face}`).join('')}`,
      [['a.mtl', 'newmtl Shared\nNs 50\n']],
    ),
    original = source.libraries[0]!.source.materials[0]!
  let reads = 0
  const definition: MtlMaterial = {
      ...original,
      get properties() {
        reads++
        return original.properties
      },
    },
    guarded = {
      ...source,
      libraries: [
        {
          ...source.libraries[0]!,
          source: { ...source.libraries[0]!.source, materials: [definition] },
        },
      ],
    },
    result = planObjMaterials(guarded, { libraryMode: 'declaration' })
  expect(result.materials.length).toBe(1)
  expect(result.geometry.byFace!.size).toBe(100)
  expect(reads).toBe(1)
  planObjMaterials(guarded, { libraryMode: 'declaration' })
  expect(reads).toBe(2) // no cache survives an import/selection call
})

test('OBJ material selection counts UV variants/default at the native limit without allocating by a high source index', () => {
  const n = SCENE_LIMITS.materials,
    declarations = Array.from({ length: n }, (_, i) => `newmtl M${i}\n`).join(''),
    faces = Array.from({ length: n }, (_, i) => `usemtl M${i}\n${face}`).join(''),
    exact = bundle(`mtllib a.mtl\n${vertices}${faces}`, [['a.mtl', declarations]])
  expect(planObjMaterials(exact).materials.length).toBe(n)
  failure(
    () =>
      planObjMaterials(
        bundle(`mtllib a.mtl\n${vertices}${faces}usemtl\n${face}`, [['a.mtl', declarations]]),
      ),
    'budget',
    'materials',
  )
  const high = bundle(`mtllib a.mtl\n${vertices}usemtl Selected\n${face}`, [
      ['a.mtl', `${'newmtl Unused\n'.repeat(65535)}newmtl Selected\n`],
    ]),
    selected = planObjMaterials(high)
  expect(selected.materials).toEqual([
    { id: 'obj_material_0_65535_plain', library: 0, material: 65535, useUvTextures: false },
  ])
  const mapped = `${declarations}map_Kd t.png\n`,
    uv = bundle(`mtllib a.mtl\n${vertices}vt 0 0\n${faces}${uvFace}`, [
      ['a.mtl', mapped],
      ['t.png', 'bytes only'],
    ])
  failure(() => planObjMaterials(uv), 'budget', 'materials')
}, 30_000)

test('OBJ selection options are strict and validated before metadata work', () => {
  const source = bundle(''),
    guarded = {
      ...source,
      get libraries(): never {
        throw new Error('Read metadata before option validation')
      },
    }
  for (const text of [
    'null',
    '[]',
    '1',
    '{"unknown":true}',
    '{"libraryMode":null}',
    '{"libraryMode":"guess"}',
    '{"duplicateMaterials":"merge"}',
    '{"missingMaterials":false}',
  ])
    failure(() => planObjMaterials(guarded, JSON.parse(text)), 'invalid')
})

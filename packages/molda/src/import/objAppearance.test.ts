import { expect, test } from 'bun:test'
import { encodePng } from '../export/png'
import { planMtlBase } from './mtlBase'
import { readMtlDocument } from './mtlDocument'
import { type ObjAppearanceOptions, planObjAppearance } from './objAppearance'
import { readObjBundle } from './objBundle'
import { convertObjGeometries } from './objGeometries'
import { ObjInputError } from './objInput'
import { planObjMaterials } from './objMaterialSelection'
import { decodeObjRasters } from './objRasters'

const bytes = (text: string) => new TextEncoder().encode(text),
  options: ObjAppearanceOptions = {
    base: { rgbSpace: 'linear' },
    textures: { colorSpace: 'srgb', scalarSpace: 'linear' },
  },
  vertices = 'v 0 0 0\nv 1 0 0\nv 0 1 0\nvt .25 .5\n',
  uvFace = 'usemtl A\nf 1/1 2/1 3/1\n'
function bundle(mtl: string, plain = false, geometry = `${uvFace}${plain ? 'f 1 2 3\n' : ''}`) {
  const result = readObjBundle(bytes(`mtllib a.mtl\n${vertices}${geometry}`), [
    { path: 'a.mtl', bytes: bytes(`newmtl A\n${mtl}`) },
    { path: 'image.png', bytes: encodePng(Uint8Array.of(32, 64, 128, 255), 1, 1) },
  ])
  if (result.status !== 'ready') throw new Error('Fixture missing')
  return result
}
function failure(run: () => unknown, reason: ObjInputError['reason'], path: string) {
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

test('OBJ appearance composes actual selected PBR map factors, no-UV solid variants, geometry transforms and exact raster references', () => {
  const source = bundle('Ns 250\nmap_Pr -o .25 0 image.png\nmap_Pm -o .25 0 image.png', true),
    original = structuredClone(source),
    selection = planObjMaterials(source),
    result = planObjAppearance(source, selection, {
      ...options,
      base: { ...options.base, phongRoughness: 'blender' },
    })
  expect(
    result.materials.map((material) => [
      material.useUvTextures,
      material.base.roughness,
      material.base.metalness,
    ]),
  ).toEqual([
    [true, 1, 1],
    [false, 0.5, 0],
  ])
  expect(result.materials[0]!.base.issues).toContainEqual({
    code: 'parameter-omitted',
    line: 2,
    keyword: 'Ns',
  })
  expect(
    result.materials[0]!.base.issues.some((issue) => issue.code === 'phong-roughness-approximated'),
  ).toBe(false)
  expect(result.materials[1]!.base.issues).toContainEqual({
    code: 'phong-roughness-approximated',
    line: 2,
    method: 'blender',
  })
  expect(result.references).toEqual([
    { library: 0, material: 0, property: 1 },
    { library: 0, material: 0, property: 2 },
  ])
  expect(result.geometry.uvTransforms!.size).toBe(1)
  expect(result.needsDefault).toBe(false)
  const geometry = convertObjGeometries(source.source, result.geometry).parts[0]!.geometry,
    faces = Object.values(geometry.faces),
    rasters = decodeObjRasters(source, result.references)
  expect(faces[0]!.corners.map((corner) => corner.uv)).toEqual([
    [0.5, 0.5],
    [0.5, 0.5],
    [0.5, 0.5],
  ])
  expect(faces[1]!.corners.map((corner) => corner.uv)).toEqual([
    [0, 0],
    [0, 0],
    [0, 0],
  ])
  expect(rasters.rasters.length).toBe(1)
  expect(rasters.pixelBytes).toBe(4)
  expect(source).toEqual(original)
  const bindings = selection.geometry.byFace
  if (!(bindings instanceof Map)) throw new Error('Fixture bindings missing')
  bindings.clear()
  expect(result.geometry.byFace!.size).toBe(2)
  result.materials[0]!.base.propertyIndices.fill(99)
  expect(result.materials[1]!.base.propertyIndices).toEqual([0, 1, 2])
  result.materials[0]!.textures.uv!.offset[0] = 90
  expect(result.geometry.uvTransforms!.get(result.materials[0]!.id)!.offset).toEqual([0.25, 0])
  expect(source).toEqual(original)
})

test('OBJ texture-aware appearance omits unused legacy Ns without validating its value, but does not hide a plain variant that still needs it', () => {
  const textured = bundle('Ns -9999\nmap_Pr image.png'),
    selection = planObjMaterials(textured),
    exponent = textured.libraries[0]!.source.materials[0]!.properties[0]!
  Object.defineProperty(exponent, 'value', {
    get() {
      throw new Error('Discarded Ns must not be evaluated')
    },
  })
  const result = planObjAppearance(textured, selection, options)
  expect(result.materials[0]!.base.roughness).toBe(1)
  expect(result.materials[0]!.base.issues).toContainEqual({
    code: 'parameter-omitted',
    line: 2,
    keyword: 'Ns',
  })
  const withPlain = bundle('Ns -9999\nmap_Pr image.png', true)
  failure(
    () =>
      planObjAppearance(withPlain, planObjMaterials(withPlain), {
        ...options,
        base: { ...options.base, phongRoughness: 'blender' },
      }),
    'unsupported',
    'files["a.mtl"].lines[2]',
  )
})

test('OBJ explicit PBR factors still contribute to maps and are validated; absent metallic factors differ from solid defaults', () => {
  const source = bundle('Ns -100\nPr .2\nPm .3\nmap_Pr image.png\nmap_Pm image.png', true),
    result = planObjAppearance(source, planObjMaterials(source), options)
  expect(
    result.materials.map((material) => [material.base.roughness, material.base.metalness]),
  ).toEqual([
    [0.2, 0.3],
    [0.2, 0.3],
  ])
  for (const field of ['Pr', 'Pm']) {
    const invalid = bundle(`${field} -1\nmap_Pr image.png\nmap_Pm image.png`)
    failure(
      () => planObjAppearance(invalid, planObjMaterials(invalid), options),
      'unsupported',
      'files["a.mtl"].lines[2]',
    )
  }
  const unspecified = bundle('map_Pm image.png', true),
    defaults = planObjAppearance(unspecified, planObjMaterials(unspecified), options)
  expect(defaults.materials.map((material) => material.base.metalness)).toEqual([1, 0])
})

test('OBJ interpreted map_Ns uses PBR map context only after explicit role policy, without silently discarding source options', () => {
  const source = bundle('Ns 9000\nmap_Ns image.png')
  failure(
    () => planObjAppearance(source, planObjMaterials(source), options),
    'unsupported',
    'files["a.mtl"].lines[3]',
  )
  const result = planObjAppearance(source, planObjMaterials(source), {
    ...options,
    textures: { ...options.textures, specularMap: 'roughness' },
  })
  expect(result.materials[0]!.base.roughness).toBe(1)
  expect(result.materials[0]!.textures.issues[0]).toMatchObject({
    code: 'map-interpreted',
    as: 'roughness',
  })
  const conflicting = bundle('map_Ns -t 1 image.png\nmap_Pr image.png')
  failure(
    () => planObjAppearance(conflicting, planObjMaterials(conflicting), options),
    'unsupported',
    'files["a.mtl"].lines[3]',
  )
  const last = planObjAppearance(conflicting, planObjMaterials(conflicting), {
    ...options,
    textures: { ...options.textures, roleConflicts: 'last' },
  })
  expect(last.references).toEqual([{ library: 0, material: 0, property: 1 }])
})

test('OBJ effective property selection is shared across UV variants only within one call, and raster/coordinate resources are not touched', () => {
  const source = bundle('map_Pm image.png\nmap_Pm image.png', true),
    selection = planObjMaterials(source),
    properties = source.libraries[0]!.source.materials[0]!.properties,
    originalForEach = properties.forEach.bind(properties)
  let selections = 0
  Object.defineProperty(properties, 'forEach', {
    value: (callback: Parameters<typeof properties.forEach>[0], thisArg?: unknown) => {
      selections++
      return originalForEach(callback, thisArg)
    },
  })
  Object.defineProperty(source.resources, 'get', {
    value() {
      throw new Error('Pixels accessed during appearance planning')
    },
  })
  Object.defineProperty(source.source, 'positions', {
    get() {
      throw new Error('Coordinates accessed during appearance planning')
    },
  })
  const chosen: ObjAppearanceOptions = {
      ...options,
      base: { ...options.base, repeatedProperties: 'last' },
    },
    first = planObjAppearance(source, selection, chosen)
  expect(selections).toBe(1)
  expect(first.references).toEqual([{ library: 0, material: 0, property: 1 }])
  expect(first.materials[0]!.base.issues[0]).toMatchObject({
    code: 'property-redeclared',
    slot: 'map_Pm',
    ignored: 1,
  })
  expect(planObjAppearance(source, selection, chosen).materials.length).toBe(2)
  expect(selections).toBe(2)
})

test('OBJ empty/default appearance preserves geometry bindings and does not open unused malformed material appearance', () => {
  const source = bundle('Ns -1\nKd xyz 1\nmap_Kd image.png', false, 'f 1 2 3'),
    selection = planObjMaterials(source),
    result = planObjAppearance(source, selection, options)
  expect(result.materials).toEqual([])
  expect(result.references).toEqual([])
  expect(result.needsDefault).toBe(true)
  expect(result.geometry.defaultId).toBe(selection.geometry.defaultId)
  expect(result.geometry.uvTransforms!.size).toBe(0)
  expect(convertObjGeometries(source.source, result.geometry).costs.triangles).toBe(1)
})

test('OBJ appearance policy errors retain their nested options path before any selected source is inspected', () => {
  const source = bundle('map_Pm image.png'),
    selection = planObjMaterials(source)
  Object.defineProperty(source, 'libraries', {
    get() {
      throw new Error('Source inspected before options')
    },
  })
  for (const [value, path] of [
    [null, 'options'],
    [[], 'options'],
    [{ ...options, unknown: true }, 'options.unknown'],
    [{ textures: options.textures }, 'options.base'],
    [{ ...options, base: { rgbSpace: 'auto' } }, 'options.base.rgbSpace'],
    [{ base: options.base }, 'options.textures'],
    [
      { ...options, textures: { ...options.textures, scalarSpace: null } },
      'options.textures.scalarSpace',
    ],
  ] as const)
    failure(
      () => planObjAppearance(source, selection, JSON.parse(JSON.stringify(value))),
      'invalid',
      path,
    )
})

test('MTL scalar map context is strict, source-independent, and does not silently assume the presence of an authored factor', () => {
  const material = readMtlDocument(bytes('newmtl A\nNs 250')).materials[0]!
  expect(planMtlBase(material, options.base, { roughness: true, metalness: true }).metalness).toBe(
    1,
  )
  failure(() => planMtlBase(material, options.base), 'unsupported', 'lines[2]')
  Object.defineProperty(material, 'properties', {
    get() {
      throw new Error('Read source before map context')
    },
  })
  for (const value of [
    null,
    [],
    {},
    { roughness: true },
    { roughness: 1, metalness: false },
    { roughness: true, metalness: false, unknown: true },
  ])
    failure(
      () => planMtlBase(material, options.base, JSON.parse(JSON.stringify(value))),
      'invalid',
      value !== null && typeof value === 'object' && 'unknown' in value ? 'maps.unknown' : 'maps',
    )
})

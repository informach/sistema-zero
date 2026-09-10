import { expect, test } from 'bun:test'
import { encodePng } from '../export/png'
import { encodeSceneGlb } from '../export/sceneGlb'
import { indexSceneDocument } from '../scene/documentIndex'
import { SCENE_LIMITS } from '../scene/limits'
import { readSceneDocument } from '../scene/readDocument'
import { SceneValidationError } from '../scene/validation'
import { expectValidGlb } from '../testing/gltfValidation'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { gltfConversionCosts } from './gltfConversionCosts'
import { readGltfDocument } from './gltfDocument'
import { GltfInputError } from './gltfInput'
import { planObjAppearance } from './objAppearance'
import { readObjBundle } from './objBundle'
import { objConversionCosts } from './objConversionCosts'
import { collectObjConversionIssues, OBJ_CONVERSION_REPORT_LIMITS } from './objConversionReport'
import { ObjInputError } from './objInput'
import { planObjMaterials } from './objMaterialSelection'
import { convertObjDocument } from './objNativeDocument'
import { type ObjNativeOptions, readObjNativeOptions } from './objNativeOptions'

const bytes = (text: string) => new TextEncoder().encode(text),
  identity = { id: 'obj-import', name: 'Minha criação', createdAt: 1, updatedAt: 2 },
  options: ObjNativeOptions = {
    appearance: {
      base: { rgbSpace: 'linear' },
      textures: { colorSpace: 'srgb', scalarSpace: 'linear' },
    },
    images: { colorAlpha: 'multiply', normalY: 'positive', doubleSided: false },
  },
  triangle = 'v 0 0 0\nv 1 0 0\nv 0 1 0\n',
  uvs = 'vt 0 0\nvt 1 0\nvt 0 1\n',
  png = encodePng(Uint8Array.of(64, 124, 231, 64, 255, 20, 0, 0), 2, 1)

function bundle(obj: string, companions: Array<{ path: string; bytes: Uint8Array }> = []) {
  const result = readObjBundle(bytes(obj), companions, 'project/model.obj')
  if (result.status !== 'ready') throw new Error(`Missing ${result.paths.join(', ')}`)
  return result
}
function textured(
  mtl = 'newmtl A\nKd .2 1 .7\nd .5\nmap_Kd image.png\n',
  geometry = 'usemtl A\nf 1/1 2/2 3/3\n',
) {
  return bundle(`mtllib mats/a.mtl\n${triangle}${uvs}${geometry}`, [
    { path: 'project/mats/a.mtl', bytes: bytes(mtl) },
    { path: 'project/mats/image.png', bytes: png },
  ])
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

function noResourceBytes(resources: Map<string, Uint8Array>) {
  return new Proxy(resources, {
    get(target, key) {
      if (key === 'get') throw new Error('Resource bytes read before preflight')
      const value = Reflect.get(target, key, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

test('OBJ rejects stored construction points outside drawing precision before opening raster bytes', () => {
  const source = textured(undefined, 'usemtl A\nf 1/1 2/2 3/3\nv 1e308 0 0\n'),
    before = structuredClone(source.source.positions)
  source.resources = noResourceBytes(source.resources)
  failure(
    () => convertObjDocument(source, identity, options),
    'unsupported',
    'native.geometries.obj_geometry_unused.vertices.v_3',
  )
  expect(source.source.positions).toEqual(before)
})

test('complete OBJ conversion assembles hierarchy, textures and source decisions under explicit host identity with exact native costs and GLB', async () => {
  const source = textured(
      'newmtl A\nKd .2 1 .7\nd .5\nPr .4\nPm .6\nmap_Kd image.png\nnorm image.png\nmap_Pr -imfchan g image.png\nmap_Pm -imfchan b image.png\nnewmtl Unused\nNs 9000\n',
      'o Caixa\ng front team\nusemtl A\nf 1/1 2/2 3/3\nf 1 2 3\no Vazia\n',
    ),
    before = structuredClone(source),
    result = convertObjDocument(source, identity, options),
    { document, report } = result,
    index = indexSceneDocument(document)
  expect(document).toMatchObject({ ...identity, formatVersion: 2, kind: 'model' })
  expect(document.nodes.map((node) => [node.name, node.kind])).toEqual([
    ['Caixa', 'mesh'],
    ['Vazia', 'group'],
  ])
  expect(document.materials).toHaveLength(2)
  expect(document.images).toHaveLength(4)
  expect(report.review).toBe('required')
  expect(report.source).toEqual({
    format: 'obj',
    entryPath: 'project/model.obj',
    libraries: ['project/mats/a.mtl'],
    materialDeclarations: 2,
    usedMaterialDeclarations: 1,
    unusedMaterialDeclarations: 1,
    materialVariants: 2,
    companionFiles: 2,
    companionBytes: source.resourceBytes,
    originalFile: 'not-retained',
    auxiliaryMetadata: 'not-stored',
  })
  expect(report.costs).toEqual({
    nodes: 2,
    instances: 1,
    geometries: 1,
    vertices: 3,
    looseEdges: 0,
    storedTriangles: 2,
    drawTriangles: 2,
    materials: 2,
    images: 4,
    pixelBytes: 32,
    skins: 0,
    weightedVertices: 0,
    clips: 0,
    tracks: 0,
    keys: 0,
  })
  expect(index.triangleCount).toBe(report.costs.drawTriangles)
  expect(
    report.issues.some(
      (issue) => issue.stage === 'hierarchy' && issue.detail.code === 'group-memberships-omitted',
    ),
  ).toBe(true)
  expect(
    report.issues.some(
      (issue) =>
        issue.stage === 'textures' &&
        issue.detail.code === 'map-omitted' &&
        issue.detail.reason === 'no-uv',
    ),
  ).toBe(true)
  expect(
    report.issues.some(
      (issue) => issue.stage === 'materials' && issue.detail.code === 'normal-y-interpreted',
    ),
  ).toBe(true)
  expect(
    report.issues
      .filter((issue) => issue.stage === 'base' || issue.stage === 'textures')
      .every(
        (issue) =>
          issue.library === 0 &&
          issue.material === 0 &&
          document.materials.some((material) => material.id === issue.targetId),
      ),
  ).toBe(true)
  expect(readSceneDocument(document).status).toBe('valid')
  expect(source).toEqual(before)
  const exported = encodeSceneGlb(document, { allowLosses: true }).bytes
  await expectValidGlb(exported, ['MESH_PRIMITIVE_GENERATED_TANGENT_SPACE'])
  const reopened = readGltfDocument(exported)
  expect(reopened.status).toBe('ready')
})

test('complete OBJ output and report are owned per call and do not inherit thumbnail, palette or arbitrary host fields', () => {
  const source = textured(),
    before = structuredClone(source),
    host = {
      ...identity,
      thumb: 'data:image/png;base64,old',
      paletteId: 'unrelated',
      nodes: [{ name: 'Not imported' }],
    },
    first = convertObjDocument(source, host, options),
    second = convertObjDocument(source, host, options)
  expect(first).toEqual(second)
  expect(first.document.thumb).toBeUndefined()
  expect(first.document.nodes.some((node) => node.name === 'Not imported')).toBe(false)
  first.document.images[0]!.layers[0]!.pixels.fill(0)
  first.document.nodes[0]!.name = 'Edited'
  first.report.source.libraries[0] = 'Changed'
  first.report.issues.length = 0
  expect(second.document.images[0]!.layers[0]!.pixels.some(Boolean)).toBe(true)
  expect(second.document.nodes[0]!.name).not.toBe('Edited')
  expect(second.report.source.libraries).toEqual(['project/mats/a.mtl'])
  expect(second.report.issues.length).toBeGreaterThan(0)
  expect(source).toEqual(before)
})

test('complete OBJ supports empty files, explicit empty groups, construction and globally unused positions without pretending they are drawn triangles', () => {
  for (const [obj, expected] of [
    ['', { nodes: 0, geometries: 0, vertices: 0, looseEdges: 0 }],
    ['o Empty\no Empty\n', { nodes: 2, geometries: 0, vertices: 0, looseEdges: 0 }],
    [`${triangle}p 1\nl 1 2\n`, { nodes: 2, geometries: 2, vertices: 3, looseEdges: 1 }],
  ] as const) {
    const result = convertObjDocument(bundle(obj), identity, options)
    expect(result.report.costs).toMatchObject({
      ...expected,
      storedTriangles: 0,
      drawTriangles: 0,
      materials: 1,
      images: 0,
    })
    expect(result.report.review).toBe('required')
    expect(readSceneDocument(result.document).status).toBe('valid')
  }
  const omitted = convertObjDocument(bundle('o Empty\n'), identity, {
    ...options,
    hierarchy: { emptyObjects: 'omit' },
  })
  expect(omitted.document.nodes).toEqual([])
  expect(omitted.report.issues).toContainEqual({
    stage: 'hierarchy',
    detail: { code: 'empty-objects-omitted', path: 'objects', count: 1 },
  })
})

test('complete OBJ validates identity and every nested policy before source metadata, keeping option paths and source-independent errors', () => {
  const source = bundle(''),
    unread = {
      ...source,
      get libraries(): typeof source.libraries {
        throw new Error('Source opened before input validation')
      },
    }
  for (const [key, value] of [
    ['id', 'bad/id'],
    ['name', ''],
    ['createdAt', NaN],
    ['updatedAt', Infinity],
  ] as const)
    failure(
      () => convertObjDocument(unread, { ...identity, [key]: value }, options),
      'invalid',
      `identity.${key}`,
    )
  const invalidOptions: Array<[unknown, string]> = [
    [null, 'options'],
    [{ ...options, extra: true }, 'options.extra'],
    [{ ...options, materials: null }, 'options.materials'],
    [{ ...options, hierarchy: { emptyObjects: null } }, 'options.hierarchy.emptyObjects'],
    [{ ...options, images: { ...options.images, normalY: 'automatic' } }, 'options.images.normalY'],
    [
      { ...options, appearance: { ...options.appearance, base: { rgbSpace: 'automatic' } } },
      'options.appearance.base.rgbSpace',
    ],
    [
      {
        ...options,
        appearance: { ...options.appearance, textures: { colorSpace: 'srgb', scalarSpace: null } },
      },
      'options.appearance.textures.scalarSpace',
    ],
  ]
  for (const [value, path] of invalidOptions)
    failure(() => convertObjDocument(unread, identity, value as ObjNativeOptions), 'invalid', path)
  const normalized = readObjNativeOptions(options)
  normalized.appearance.base.rgbSpace = 'srgb'
  normalized.images.normalY = 'negative'
  expect(options.appearance.base.rgbSpace).toBe('linear')
  expect(options.images.normalY).toBe('positive')
})

test('complete OBJ checks node and triangle budgets before geometry values and encoded raster resources', () => {
  const source = textured(
      undefined,
      `${Array.from({ length: SCENE_LIMITS.nodes + 1 }, (_, i) => `o Empty${i}\n`).join('')}usemtl A\nf 1/1 2/2 3/3\n`,
    ),
    guarded = {
      ...source,
      get resources(): typeof source.resources {
        throw new Error('Pixels opened before hierarchy gate')
      },
      source: {
        ...source.source,
        positions: new Proxy(source.source.positions, {
          get(target, key) {
            if (typeof key === 'string' && /^\d+$/.test(key))
              throw new Error('Coordinates opened before hierarchy gate')
            return Reflect.get(target, key, target)
          },
        }),
      },
    }
  failure(
    () => convertObjDocument(guarded, identity, options),
    'budget',
    'files["project/model.obj"].nodes',
  )
  const triangles = textured(
      undefined,
      `usemtl A\n${'f 1/1 2/2 3/3\n'.repeat(SCENE_LIMITS.triangles + 1)}`,
    ),
    noPixels = {
      ...triangles,
      get resources(): typeof source.resources {
        throw new Error('Pixels opened before triangle gate')
      },
    }
  failure(
    () => convertObjDocument(noPixels, identity, options),
    'budget',
    `files["project/model.obj"].lines[${9 + SCENE_LIMITS.triangles}]`,
  )
})

test('complete OBJ preserves material source errors and rejects derived UV overflow before raster decoding', () => {
  const incompatible = textured('newmtl A\nNs 9000\n')
  const error = failure(
    () => convertObjDocument(incompatible, identity, options),
    'unsupported',
    'files["project/mats/a.mtl"].lines[2]',
  )
  expect(error.cause).toBeInstanceOf(ObjInputError)
  const overflow = textured('newmtl A\nmap_Kd -s 1e308 1 image.png\n'),
    guarded = {
      ...overflow,
      resources: noResourceBytes(overflow.resources),
    }
  failure(() => convertObjDocument(guarded, identity, options), 'unsupported', 'native.geometry')
})

test('complete OBJ gathers selection policy, base defaults, omitted maps and native material decisions instead of replacing one report with another', () => {
  const source = bundle(`${triangle}${uvs}usemtl Absent\nf 1/1 2/2 3/3\n`),
    result = convertObjDocument(source, identity, {
      ...options,
      materials: { missingMaterials: 'default' },
    })
  expect(result.report.issues).toContainEqual({
    stage: 'selection',
    detail: {
      code: 'missing-material-default',
      name: 'Absent',
      scope: { kind: 'none' },
      faces: 1,
    },
  })
  const mapped = convertObjDocument(
    textured('newmtl A\nmap_Kd image.png\n', 'usemtl A\nf 1/1 2/2 3/3\nf 1 2 3\n'),
    identity,
    options,
  )
  const stages = new Set(mapped.report.issues.map((issue) => issue.stage))
  for (const stage of ['base', 'textures', 'hierarchy', 'materials'] as const)
    expect(stages.has(stage)).toBe(true)
  expect(mapped.report.source.usedMaterialDeclarations).toBe(1)
  expect(mapped.report.source.materialVariants).toBe(2)
})

test('OBJ report collector permits exactly its own issue limit and rejects another issue without truncating an earlier report', () => {
  const source = bundle(''),
    appearance = planObjAppearance(source, planObjMaterials(source), options.appearance),
    collector = collectObjConversionIssues(source, appearance),
    detail = { code: 'empty-objects-omitted' as const, path: 'objects' as const, count: 1 }
  for (let i = 0; i < OBJ_CONVERSION_REPORT_LIMITS.issues; i++)
    collector.add({ stage: 'hierarchy', detail })
  const report = collector.finish(convertObjDocument(source, identity, options).document)
  expect(report.issues.length).toBe(OBJ_CONVERSION_REPORT_LIMITS.issues)
  failure(() => collector.add({ stage: 'hierarchy', detail }), 'budget', 'report.issues')
  expect(report.issues.length).toBe(OBJ_CONVERSION_REPORT_LIMITS.issues)
})

test('OBJ full pipeline rejects excessive known review decisions before reading any coordinate or raster pixel', () => {
  const count = 10_000,
    mtl = Array.from({ length: count }, (_, i) => `newmtl M${i}\nmap_Kd image.png\n`).join(''),
    geometry = Array.from({ length: count }, (_, i) => `usemtl M${i}\nf 1/1 2/2 3/3\n`).join(''),
    source = textured(mtl, geometry),
    guarded = {
      ...source,
      resources: noResourceBytes(source.resources),
      source: {
        ...source.source,
        positions: new Proxy(source.source.positions, {
          get(target, key) {
            if (typeof key === 'string' && /^\d+$/.test(key))
              throw new Error('Coordinates opened before report gate')
            return Reflect.get(target, key, target)
          },
        }),
      },
    }
  failure(() => convertObjDocument(guarded, identity, options), 'budget', 'report.text')
})

test('shared import costs retain actual mesh/instance/image/animation counts while each format preserves its error family and cause', () => {
  const source = makeSceneGlbFixture(2, 2, 3, 2),
    obj = convertObjDocument(textured(), identity, options).document
  expect(objConversionCosts(obj)).toEqual(gltfConversionCosts(obj))
  expect(objConversionCosts(source)).toEqual(gltfConversionCosts(source))
  const invalid = {
    ...source,
    geometries: [
      {
        id: 'box',
        kind: 'box' as const,
        from: [0, 0, 0] as [number, number, number],
        to: [1, 1, 1] as [number, number, number],
        surfaces: {},
      },
    ],
  }
  const error = failure(() => objConversionCosts(invalid), 'invalid', 'native.geometries')
  expect(error.cause).toBeInstanceOf(SceneValidationError)
  expect(() => gltfConversionCosts(invalid)).toThrow(GltfInputError)
  const sentinel = new Error('Unrelated failure'),
    broken = {
      ...obj,
      get images(): typeof obj.images {
        throw sentinel
      },
    }
  expect(() => objConversionCosts(broken)).toThrow(sentinel)
  expect(() => gltfConversionCosts(broken)).toThrow(sentinel)
})

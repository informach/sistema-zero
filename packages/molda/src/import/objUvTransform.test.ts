import { expect, test } from 'bun:test'
import { sceneImageTexel } from '../scene/imageCoordinates'
import { SCENE_LIMITS } from '../scene/limits'
import { planMtlBase } from './mtlBase'
import { planMtlTextures } from './mtlTextures'
import { readObjBundle } from './objBundle'
import { type ObjDocument, readObjDocument } from './objDocument'
import { convertObjGeometries } from './objGeometries'
import { planObjGeometries } from './objGeometryPlan'
import { ObjInputError } from './objInput'
import { planObjMaterials } from './objMaterialSelection'
import { type ObjUvTransform, readObjUvTransforms } from './objUvTransform'

const bytes = (text: string) => new TextEncoder().encode(text),
  vertices = 'v 0 0 0\nv 1 0 0\nv 0 1 0\n',
  read = (text: string) => readObjDocument(bytes(text))
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
  throw new Error('Expected failure')
}
function withoutCoordinateReads(source: ObjDocument): ObjDocument {
  const guard = (array: Float64Array) =>
    new Proxy(array, {
      get(target, key) {
        if (typeof key === 'string' && /^\d+$/.test(key))
          throw new Error('Coordinates read before metadata gate')
        return Reflect.get(target, key, target)
      },
    })
  return { ...source, positions: guard(source.positions), texcoords: guard(source.texcoords) }
}

test('OBJ bundle → material selection → scalar/maps → geometry applies each material UV transform, preserving no-UV variants and seams', () => {
  const bundle = readObjBundle(
    bytes(
      `${vertices}vt 0 0\nvt 1 0\nvt 0 1\nmtllib scene.mtl\nusemtl A\nf 1/1 2/2 3/3\nusemtl B\nf 1/1 2/2 3/3\nusemtl A\nf 1 2 3\n`,
    ),
    [
      {
        path: 'scene.mtl',
        bytes: bytes(
          'newmtl A\nmap_Kd -s .5 .5 -o .25 .125 a.png\nnewmtl B\nmap_Kd -s -1 1 -o 1 0 b.png\n',
        ),
      },
      // Deliberately not rasters: metadata/UV stages must never decode these bytes.
      { path: 'a.png', bytes: bytes('not an image') },
      { path: 'b.png', bytes: bytes('not an image either') },
    ],
  )
  if (bundle.status !== 'ready') throw new Error('Fixture missing resources')
  const original = structuredClone(bundle),
    selected = planObjMaterials(bundle),
    uvTransforms = new Map<string, ObjUvTransform>()
  for (const variant of selected.materials) {
    const source = bundle.libraries[variant.library]!.source.materials[variant.material]!,
      scalar = planMtlBase(source, { rgbSpace: 'linear' }),
      textures = planMtlTextures(source, scalar, variant.useUvTextures, {
        colorSpace: 'srgb',
        scalarSpace: 'linear',
      })
    if (textures.uv) uvTransforms.set(variant.id, textures.uv)
  }
  expect(selected.materials.map((entry) => entry.useUvTextures)).toEqual([true, true, false])
  expect(uvTransforms.size).toBe(2)
  const result = convertObjGeometries(bundle.source, { ...selected.geometry, uvTransforms }),
    geometry = result.parts[0]!.geometry,
    faces = Object.values(geometry.faces)
  expect(result.costs.vertices).toBe(3)
  expect(faces.map((face) => face.corners.map((corner) => corner.uv))).toEqual([
    [
      [0.25, 0.125],
      [0.75, 0.125],
      [0.25, 0.625],
    ],
    [
      [1, 0],
      [0, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [0, 0],
      [0, 0],
    ],
  ])
  expect(sceneImageTexel({ width: 4, height: 8 }, faces[0]!.corners[0]!.uv)).toEqual([1, 1])
  expect(sceneImageTexel({ width: 4, height: 8 }, faces[0]!.corners[2]!.uv)).toEqual([1, 5])
  expect(bundle).toEqual(original)
  for (const transform of uvTransforms.values()) transform.scale.fill(0)
  expect(faces[0]!.corners[1]!.uv).toEqual([0.75, 0.125])
  expect(result.issues).toEqual([])
})

test('OBJ texture-transform metadata is strict and budgeted before positions or UV coordinates are inspected', () => {
  const source = withoutCoordinateReads(read(`${vertices}vt 0 0\nf 1/1 2/1 3/1`))
  for (const invalid of [
    null,
    [],
    {},
    { offset: [0, 0] },
    { scale: [1, 1] },
    { offset: [0], scale: [1, 1] },
    { offset: [0, 0], scale: [1, 1, 1] },
    { offset: [null, 0], scale: [1, 1] },
    { offset: [0, 0], scale: ['1', 1] },
    { offset: [0, 0], scale: [1, 1], rotation: 0 },
  ]) {
    const uvTransforms = new Map([['mat', JSON.parse(JSON.stringify(invalid))]])
    failure(() => convertObjGeometries(source, { defaultId: 'mat', uvTransforms }), 'invalid')
  }
  for (const badMap of [null, [], {}])
    failure(
      () =>
        convertObjGeometries(source, {
          defaultId: 'mat',
          uvTransforms: JSON.parse(JSON.stringify(badMap)),
        }),
      'invalid',
      'materials.uvTransforms',
    )
  const identity: ObjUvTransform = { offset: [0, 0], scale: [1, 1] }
  failure(
    () =>
      convertObjGeometries(source, {
        defaultId: 'mat',
        uvTransforms: new Map([['other', identity]]),
      }),
    'invalid',
    'materials.uvTransforms.other',
  )
  failure(
    () =>
      convertObjGeometries(source, {
        defaultId: 'mat',
        uvTransforms: new Map([['bad id', identity]]),
      }),
    'invalid',
    'materials.uvTransforms.bad id',
  )
  const transforms = new Map<string, ObjUvTransform>(
      Array.from(
        { length: SCENE_LIMITS.materials },
        (_, index) => [`mat_${index}`, identity] as const,
      ),
    ),
    allowed = new Set(transforms.keys())
  expect(readObjUvTransforms(transforms, allowed).size).toBe(SCENE_LIMITS.materials)
  transforms.set('extra', identity)
  Object.defineProperty(identity, 'offset', {
    get() {
      throw new Error('Over-budget transforms must not be opened')
    },
  })
  failure(() => readObjUvTransforms(transforms, allowed), 'budget', 'materials.uvTransforms')
})

test('OBJ plans snapshot UV transforms before coordinates and do not retain author-provided arrays', () => {
  const transform: ObjUvTransform = { offset: [0.123456789123, -0.25], scale: [2, -0.5] },
    source = withoutCoordinateReads(read(`${vertices}vt 0 0\nf 1/1 2/1 3/1`)),
    input = { defaultId: 'mat', uvTransforms: new Map([['mat', transform]]) },
    prepared = planObjGeometries(source, input)
  expect(prepared[0]!.elements[0]!.uvTransform).toEqual(transform)
  transform.offset[0] = 90
  transform.scale[1] = 80
  expect(prepared[0]!.elements[0]!.uvTransform).toEqual({
    offset: [0.123456789123, -0.25],
    scale: [2, -0.5],
  })
  expect(planObjGeometries(source, input)[0]!.elements[0]!.uvTransform).toEqual(transform)
})

test('OBJ texture transform refuses absent UV instead of sampling a fabricated corner, and reports numeric overflow at the source face', () => {
  const uvTransforms = new Map<string, ObjUvTransform>([['mat', { offset: [0, 0], scale: [2, 1] }]])
  failure(
    () =>
      convertObjGeometries(withoutCoordinateReads(read(`${vertices}f 1 2 3`)), {
        defaultId: 'mat',
        uvTransforms,
      }),
    'invalid',
    'lines[4].uv',
  )
  failure(
    () =>
      convertObjGeometries(read(`${vertices}vt 1e308 .5\nf 1/1 2/1 3/1`), {
        defaultId: 'mat',
        uvTransforms,
      }),
    'unsupported',
    'lines[5].uv',
  )
  // Construction lines/points do not gain made-up texture coordinates or fail on absent UV.
  expect(
    convertObjGeometries(read(`${vertices}l 1 2\np 3`), { defaultId: 'mat', uvTransforms }).costs
      .looseEdges,
  ).toBe(1)
})

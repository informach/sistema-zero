import { expect, test } from 'bun:test'
import { zlibSync } from 'fflate'
import sharp from 'sharp'
import { encodePng } from '../export/png'
import { SCENE_LIMITS } from '../scene/limits'
import { makePngFixture, pngChunk, pngParts } from '../testing/pngFixture'
import { GltfInputError } from './gltfInput'
import { decodeGltfJpeg } from './gltfJpeg'
import { withGltfRasterErrors } from './gltfRasterError'
import { decodeGltfRasters } from './gltfRasters'
import { planMtlBase } from './mtlBase'
import { MTL_TEXTURE_ROLES } from './mtlTexturePlanTypes'
import { planMtlTextures } from './mtlTextures'
import { readObjBundle } from './objBundle'
import { ObjInputError } from './objInput'
import { planObjMaterials } from './objMaterialSelection'
import { decodeObjRasters, type ObjRasterReference } from './objRasters'
import { decodeRasterBatch } from './rasterBatch'
import { RasterInputError } from './rasterInput'
import { decodeRasterPng } from './rasterPng'

const bytes = (text: string) => new TextEncoder().encode(text),
  tiny = () => encodePng(Uint8Array.of(13, 72, 129, 0), 1, 1)
function complete(text: string, files: Array<[string, Uint8Array]>) {
  const result = readObjBundle(
    bytes(text),
    files.map(([path, bytes]) => ({ path, bytes })),
  )
  if (result.status !== 'ready') throw new Error(`Missing fixtures: ${result.paths.join(', ')}`)
  return result
}
function imageBundle(images: Uint8Array[]) {
  return complete('mtllib images.mtl', [
    [
      'images.mtl',
      bytes(images.map((_, i) => `newmtl Image_${i}\nmap_Kd image_${i}.png`).join('\n')),
    ],
    ...images.map((data, i): [string, Uint8Array] => [`image_${i}.png`, data]),
  ])
}
const reference = (material: number): ObjRasterReference => ({ library: 0, material, property: 0 })
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
function large16(valid: boolean) {
  const header = new Uint8Array(13),
    view = new DataView(header.buffer)
  view.setUint32(0, 1024)
  view.setUint32(4, 1024)
  header[8] = 16
  header[9] = 6
  return pngParts([
    pngChunk('IHDR', header),
    pngChunk('IDAT', valid ? zlibSync(new Uint8Array(1024 * (1024 * 8 + 1))) : Uint8Array.of(0)),
    pngChunk('IEND', new Uint8Array(0)),
  ])
}

test('OBJ raster references come from retained maps and resolve literal paths relative to each library, without decoding omitted maps', () => {
  const source = complete(
      'mtllib materials/a.mtl other/b.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nvt 0 0\nusemtl A\nf 1/1 2/1 3/1\nusemtl B\nf 1/1 2/1 3/1',
      [
        [
          'materials/a.mtl',
          bytes(
            'newmtl A\nmap_Kd ../images/color%20 a.png\nmap_Ke ../omitted.png\nnewmtl Unused\nmap_Kd ../unused.png',
          ),
        ],
        ['other/b.mtl', bytes('newmtl B\nmap_Kd ../images/./color%20 a.png')],
        ['images/color%20 a.png', tiny()],
        ['omitted.png', Uint8Array.of(0)],
        ['unused.png', Uint8Array.of(0)],
      ],
    ),
    original = structuredClone(source),
    selection = planObjMaterials(source),
    refs: ObjRasterReference[] = []
  for (const variant of selection.materials) {
    const material = source.libraries[variant.library]!.source.materials[variant.material]!,
      scalar = planMtlBase(material, { rgbSpace: 'linear' }),
      maps = planMtlTextures(material, scalar, variant.useUvTextures, {
        colorSpace: 'srgb',
        scalarSpace: 'linear',
        unsupportedMaps: 'omit',
      }).maps
    for (const map of maps)
      refs.push({ library: variant.library, material: variant.material, property: map.property })
  }
  expect(refs).toEqual([
    { library: 0, material: 0, property: 0 },
    { library: 1, material: 0, property: 0 },
  ])
  const decoded = decodeObjRasters(source, refs)
  expect([...decoded.images]).toEqual([['images/color%20 a.png', 0]])
  expect(decoded.pixelBytes).toBe(4)
  expect(Array.from(decoded.rasters[0]!.rgba)).toEqual([13, 72, 129, 0])
  expect(source).toEqual(original)
  decoded.rasters[0]!.rgba[0] = 88
  expect(decodeObjRasters(source, refs).rasters[0]!.rgba[0]).toBe(13)
})

test('OBJ raster dispatch uses signatures, preserves 16-bit samples and matches the established JPEG decoding path', async () => {
  const png = makePngFixture({
      width: 5,
      height: 3,
      colorType: 6,
      depth: 16,
      interlaced: true,
      filter: 4,
    }),
    jpeg = new Uint8Array(
      await sharp({
        create: { width: 17, height: 9, channels: 3, background: { r: 80, g: 160, b: 240 } },
      })
        .jpeg({ quality: 100 })
        .toBuffer(),
    ),
    source = imageBundle([png.bytes, jpeg]),
    result = decodeObjRasters(source, [reference(0), reference(1)])
  expect(result.rasters[0]!.depth).toBe(16)
  expect(result.rasters[0]!.rgba).toBeInstanceOf(Uint16Array)
  expect(Array.from(result.rasters[0]!.rgba)).toEqual(png.rgba)
  expect(result.rasters[1]).toEqual(decodeGltfJpeg(jpeg))
  expect(result.pixelBytes).toBe(5 * 3 * 8 + 17 * 9 * 4)
  expect([...result.images.keys()]).toEqual(['image_0.png', 'image_1.png'])
  // The neutral PNG core is a direct producer; the format adapter is not its implementation.
  expect(decodeRasterPng(png.bytes)).toEqual(result.rasters[0]!)
})

test('shared raster batch reuses only exact intervals, checks MIME on aliases, and returns independent owned pixels for other intervals', () => {
  const png = tiny(),
    storage = new Uint8Array(png.length * 2 + 17)
  storage.fill(222)
  storage.set(png, 7)
  storage.set(png, png.length + 7)
  const a = storage.subarray(7, png.length + 7),
    b = new Uint8Array(storage.buffer, 7, png.length),
    c = storage.subarray(png.length + 7, png.length * 2 + 7),
    before = new Uint8Array(storage),
    result = decodeRasterBatch([
      { key: 'a', path: 'a', bytes: a },
      { key: 'b', path: 'b', bytes: b, mimeTypes: [null, 'image/png'] },
      { key: 'c', path: 'c', bytes: c },
      { key: 'd', path: 'd', bytes: new Uint8Array(png) },
    ])
  expect([...result.images]).toEqual([
    ['a', 0],
    ['b', 0],
    ['c', 1],
    ['d', 2],
  ])
  expect(result.pixelBytes).toBe(12)
  expect(result.rasters.length).toBe(3)
  for (const raster of result.rasters) {
    expect(Array.from(raster.rgba)).toEqual([13, 72, 129, 0])
    expect(raster.rgba.buffer === storage.buffer).toBe(false)
  }
  result.rasters[0]!.rgba[0] = 33
  expect(result.rasters[1]!.rgba[0]).toBe(13)
  expect(storage).toEqual(before)
  expect(() =>
    decodeRasterBatch([
      { key: 'a', path: 'a', bytes: a },
      { key: 'b', path: 'b', bytes: b, mimeTypes: ['image/jpeg'] },
    ]),
  ).toThrow(RasterInputError)
  const bundle = imageBundle([tiny(), tiny()])
  bundle.resources.set('image_1.png', bundle.resources.get('image_0.png')!)
  expect([...decodeObjRasters(bundle, [reference(1), reference(0), reference(1)]).images]).toEqual([
    ['image_1.png', 0],
    ['image_0.png', 0],
  ])
})

test('OBJ budgets all selected pixels before any compressed stream is decoded, counting 16-bit RGBA twice and accepting the exact ceiling', () => {
  const broken = large16(false),
    bad = imageBundle([broken, broken, broken, broken, tiny()]),
    four = [reference(0), reference(1), reference(2), reference(3)]
  failure(() => decodeObjRasters(bad, four), 'invalid', 'files["image_0.png"]')
  failure(() => decodeObjRasters(bad, [...four, reference(4)]), 'budget', 'files["image_4.png"]')
  const valid = large16(true),
    exact = decodeObjRasters(imageBundle([valid, valid, valid, valid]), four)
  expect(exact.pixelBytes).toBe(SCENE_LIMITS.pixelBytes)
  expect(exact.rasters.length).toBe(4)
  for (const raster of exact.rasters) {
    expect(raster.depth).toBe(16)
    expect(raster.rgba.byteLength).toBe(8 * 1024 * 1024)
    expect(raster.rgba[0]).toBe(0)
    expect(raster.rgba[raster.rgba.length - 1]).toBe(0)
  }
})

test('OBJ selected image references have strict indices/fields and a preflight work ceiling; empty selection reads no source metadata', () => {
  const bundle = imageBundle([tiny()])
  for (const [value, field] of [
    [{ library: -1, material: 0, property: 0 }, 'library'],
    [{ library: 1, material: 0, property: 0 }, 'library'],
    [{ library: 0, material: 1, property: 0 }, 'material'],
    [{ library: 0, material: 0, property: 0.5 }, 'property'],
    [{ library: 0, material: 0, property: 1 }, 'property'],
    [{ library: '0', material: 0, property: 0 }, 'library'],
    [{ library: 0, material: 0, property: 0, filename: 'x' }, 'filename'],
  ] as const)
    failure(
      () => decodeObjRasters(bundle, [JSON.parse(JSON.stringify(value))]),
      'invalid',
      `images.references[0].${field}`,
    )
  for (const value of [null, [], 1])
    failure(
      () => decodeObjRasters(bundle, [JSON.parse(JSON.stringify(value))]),
      'invalid',
      'images.references[0]',
    )
  failure(() => decodeObjRasters(bundle, Array(1)), 'invalid', 'images.references[0]')
  const solid = complete('mtllib a.mtl', [['a.mtl', bytes('newmtl A\nKd .5')]])
  failure(() => decodeObjRasters(solid, [reference(0)]), 'invalid', 'images.references[0].property')
  bundle.resources.delete('image_0.png')
  failure(() => decodeObjRasters(bundle, [reference(0)]), 'invalid', 'files["image_0.png"]')
  Object.defineProperty(bundle, 'libraries', {
    get() {
      throw new Error('No metadata reads before work preflight')
    },
  })
  expect(decodeObjRasters(bundle, [])).toEqual({ images: new Map(), rasters: [], pixelBytes: 0 })
  failure(() => decodeObjRasters(bundle, JSON.parse('null')), 'invalid', 'images.references')
  failure(
    () => decodeObjRasters(bundle, Array(SCENE_LIMITS.materials * MTL_TEXTURE_ROLES.length + 1)),
    'budget',
    'images.references',
  )
})

test('raster format adapters preserve resource paths, reasons and causes while unrelated exceptions propagate unchanged', () => {
  const invalid = tiny()
  invalid[invalid.length - 1] = invalid[invalid.length - 1]! ^ 1
  const original = new Uint8Array(invalid),
    objError = failure(
      () => decodeObjRasters(imageBundle([invalid]), [reference(0)]),
      'invalid',
      'files["image_0.png"]',
    )
  expect(objError.cause).toBeInstanceOf(RasterInputError)
  expect(invalid).toEqual(original)
  try {
    decodeGltfRasters([{ bytes: invalid, name: null, mimeType: null, uriMimeType: null }], [0])
    throw new Error('Expected glTF failure')
  } catch (error) {
    expect(error).toBeInstanceOf(GltfInputError)
    if (!(error instanceof GltfInputError)) throw error
    expect(error.path).toBe('images[0]')
    expect(error.reason).toBe('invalid')
    expect(error.cause).toBeInstanceOf(RasterInputError)
  }
  const sentinel = new Error('Unexpected decoder/programming failure')
  try {
    withGltfRasterErrors(() => {
      throw sentinel
    })
    throw new Error('Expected propagation')
  } catch (error) {
    expect(error).toBe(sentinel)
  }
  const bundle = imageBundle([tiny()])
  Object.defineProperty(bundle.resources, 'get', {
    value() {
      throw sentinel
    },
  })
  try {
    decodeObjRasters(bundle, [reference(0)])
    throw new Error('Expected propagation')
  } catch (error) {
    expect(error).toBe(sentinel)
  }
  failure(
    () => decodeObjRasters(imageBundle([Uint8Array.of(0)]), [reference(0)]),
    'unsupported',
    'files["image_0.png"]',
  )
  const shared = new Uint8Array(new SharedArrayBuffer(tiny().length)),
    sharedBundle = imageBundle([tiny()])
  shared.set(tiny())
  sharedBundle.resources.set('image_0.png', shared)
  failure(
    () => decodeObjRasters(sharedBundle, [reference(0)]),
    'unsupported',
    'files["image_0.png"]',
  )
})

test('shared raster source-count ceiling is checked before the extra source bytes and before pixel decoding', () => {
  const png = tiny(),
    sources = Array.from({ length: SCENE_LIMITS.images }, (_, key) => ({
      key,
      path: `images[${key}]`,
      bytes: png,
    })),
    result = decodeRasterBatch(sources)
  expect(result.images.size).toBe(SCENE_LIMITS.images)
  expect(result.rasters.length).toBe(1)
  expect(result.pixelBytes).toBe(4)
  try {
    decodeRasterBatch([
      ...sources,
      {
        key: SCENE_LIMITS.images,
        path: 'extra',
        get bytes(): Uint8Array {
          throw new Error('Over-budget bytes read')
        },
      },
    ])
    throw new Error('Expected budget failure')
  } catch (error) {
    expect(error).toBeInstanceOf(RasterInputError)
    if (!(error instanceof RasterInputError)) throw error
    expect(error.reason).toBe('budget')
    expect(error.path).toBe('images')
  }
})
